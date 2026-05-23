#!/usr/bin/env python3
"""Build curated puzzles.js for chess_exercises.html from the Lichess open puzzle DB.

Lichess puzzle DB (CC0): https://database.lichess.org/#puzzles

CSV columns:
  PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags

Each row's FEN is the position *before* the opponent makes a setup move. The first
UCI move in Moves is the opponent's setup; the remaining moves form the solution
the player must find. So our app's starting position = parse_fen + apply(move0),
and the side-to-move flips to the player.
"""

import zstandard, io, csv, json, random, os, sys
from collections import defaultdict

INPUT  = r'D:\Workspace\chess-exercises\lichess_db_puzzle.csv.zst'
OUTPUT = r'D:\Workspace\chess-exercises\puzzles.js'

random.seed(20260523)

PER_BUCKET = 20  # puzzles per (level, type) bucket

# Stap level x applicable theme buckets (mirrors LEVEL_THEMES in chess_exercises.html)
LEVEL_THEMES = {
    1: ['winst_materiaal', 'mat_in_1'],
    2: ['winst_materiaal', 'mat_in_1', 'mat_in_2', 'tweevoudige_aanval', 'aftrekschaak'],
    3: ['mat_in_1', 'mat_in_2', 'tweevoudige_aanval', 'aftrekschaak', 'dubbel_schaak', 'penning', 'promotie'],
    4: ['mat_in_2', 'tweevoudige_aanval', 'aftrekschaak', 'dubbel_schaak', 'penning', 'rontgen_aanval', 'afleiding', 'promotie', 'tussenspel'],
    5: ['mat_in_2', 'penning', 'rontgen_aanval', 'afleiding', 'overbelasting', 'zuivering', 'tussenspel', 'schaak_en_win', 'promotie'],
    6: ['mat_in_2', 'penning', 'rontgen_aanval', 'afleiding', 'overbelasting', 'zuivering', 'tussenspel', 'schaak_en_win', 'promotie'],
}

# Stappenmethode type -> set of Lichess themes that qualify (ANY match counts)
TYPE_TO_THEMES = {
    'winst_materiaal':    {'hangingPiece'},
    'mat_in_1':           {'mateIn1'},
    'mat_in_2':           {'mateIn2'},
    'tweevoudige_aanval': {'fork'},
    'aftrekschaak':       {'discoveredAttack', 'discoveredCheck'},
    'dubbel_schaak':      {'doubleCheck'},
    'penning':            {'pin'},
    'rontgen_aanval':     {'xRayAttack', 'skewer'},
    'afleiding':          {'attraction'},   # luring a piece to a bad square
    'overbelasting':      {'deflection'},   # exploiting an overloaded defender
    'promotie':           {'promotion', 'underPromotion'},
    'tussenspel':         {'intermezzo'},
    'zuivering':          {'capturingDefender', 'clearance'},
    'schaak_en_win':      {'discoveredCheck'},  # check that wins material
}

def rating_to_level(r):
    if r < 1100: return 1
    if r < 1300: return 2
    if r < 1500: return 3
    if r < 1700: return 4
    if r < 1900: return 5
    return 6

# Per-(level,type) quality filters on solution length
def passes(t, level, sol_count):
    if t == 'mat_in_1':   return sol_count == 1
    if t == 'mat_in_2':   return sol_count == 3
    if t == 'winst_materiaal': return sol_count == 1
    if t == 'tweevoudige_aanval': return sol_count <= 3
    if t == 'penning':    return sol_count <= 3
    if t == 'aftrekschaak': return sol_count <= 3
    if t == 'dubbel_schaak': return sol_count <= 3
    if t == 'rontgen_aanval': return sol_count <= 3
    if t == 'afleiding':  return sol_count <= 5
    if t == 'overbelasting': return sol_count <= 5
    if t == 'promotie':   return sol_count <= 3
    if t == 'tussenspel': return sol_count <= 5
    if t == 'zuivering':  return sol_count <= 5
    if t == 'schaak_en_win': return sol_count <= 3
    # default
    return sol_count <= 5

# ─── FEN / move helpers ────────────────────────────────────────────────────────

FILES = 'abcdefgh'

def sq_idx(name):
    return (ord(name[0]) - ord('a')) + (int(name[1]) - 1) * 8

def sq_name(idx):
    return FILES[idx % 8] + str(idx // 8 + 1)

def parse_fen(fen):
    parts = fen.split()
    placement, turn, castling, ep = parts[0], parts[1], parts[2], parts[3]
    board = [None] * 64
    rank, file = 7, 0
    for c in placement:
        if c == '/':
            rank -= 1
            file = 0
        elif c.isdigit():
            file += int(c)
        else:
            color = 'w' if c.isupper() else 'b'
            board[rank * 8 + file] = color + c.upper()
            file += 1
    return board, turn, castling, (None if ep == '-' else sq_idx(ep))

def apply_uci(board, turn, castling, ep, uci):
    fs = sq_idx(uci[:2])
    ts = sq_idx(uci[2:4])
    promo = uci[4].upper() if len(uci) > 4 else None
    piece = board[fs]
    if piece is None:
        raise ValueError(f'no piece on {uci[:2]}')
    color, ptype = piece[0], piece[1]

    # en passant capture
    if ptype == 'P' and ep == ts and (fs % 8) != (ts % 8):
        opp_dir = -8 if color == 'w' else 8
        board[ts + opp_dir] = None

    # castling rook move
    if ptype == 'K' and abs((ts % 8) - (fs % 8)) == 2:
        r = fs // 8
        if ts % 8 == 6:
            board[r * 8 + 5] = board[r * 8 + 7]
            board[r * 8 + 7] = None
        else:
            board[r * 8 + 3] = board[r * 8 + 0]
            board[r * 8 + 0] = None

    board[ts] = piece
    board[fs] = None
    if promo:
        board[ts] = color + promo

    # update castling rights
    if ptype == 'K':
        if color == 'w':
            castling = castling.replace('K', '').replace('Q', '')
        else:
            castling = castling.replace('k', '').replace('q', '')
    for sq in (fs, ts):
        if sq == 0:  castling = castling.replace('Q', '')
        if sq == 7:  castling = castling.replace('K', '')
        if sq == 56: castling = castling.replace('q', '')
        if sq == 63: castling = castling.replace('k', '')
    castling = castling or '-'

    new_ep = None
    if ptype == 'P' and abs(ts - fs) == 16:
        new_ep = (fs + ts) // 2

    new_turn = 'b' if turn == 'w' else 'w'
    return board, new_turn, castling, new_ep

# ─── Stream-process the CSV with reservoir sampling per bucket ────────────────

buckets = defaultdict(list)   # (level, type) -> list of row dicts
counters = defaultdict(int)   # (level, type) -> total candidates seen

valid_keys = {(lvl, t) for lvl, types in LEVEL_THEMES.items() for t in types}
print(f'Targeting {len(valid_keys)} (level,type) buckets x {PER_BUCKET} = {len(valid_keys)*PER_BUCKET} puzzles', flush=True)

def maybe_add(key, row):
    counters[key] += 1
    bucket = buckets[key]
    if len(bucket) < PER_BUCKET:
        bucket.append(row)
    else:
        j = random.randint(0, counters[key] - 1)
        if j < PER_BUCKET:
            bucket[j] = row

with open(INPUT, 'rb') as f:
    dctx = zstandard.ZstdDecompressor()
    with dctx.stream_reader(f) as reader:
        text = io.TextIOWrapper(reader, encoding='utf-8')
        rdr = csv.DictReader(text)
        n = 0
        for row in rdr:
            n += 1
            if n % 500000 == 0:
                full = sum(1 for k in valid_keys if len(buckets[k]) >= PER_BUCKET)
                print(f'... {n:,} rows, {full}/{len(valid_keys)} buckets at quota', flush=True)

            try:
                rating = int(row['Rating'])
            except Exception:
                continue
            level = rating_to_level(rating)
            applicable = LEVEL_THEMES.get(level, [])
            if not applicable:
                continue

            themes = set(row['Themes'].split())
            sol_count = len(row['Moves'].split()) - 1
            if sol_count < 1:
                continue

            for t in applicable:
                want = TYPE_TO_THEMES.get(t)
                if not want:
                    continue
                if not (want & themes):
                    continue
                if not passes(t, level, sol_count):
                    continue
                maybe_add((level, t), row)
                break  # one type per puzzle to keep variety

print(f'Total rows scanned: {n:,}', flush=True)

# ─── Convert kept rows to our JSON puzzle objects ──────────────────────────────

def convert(row, level, t):
    fen = row['FEN']
    moves = row['Moves'].split()
    board, turn, castling, ep = parse_fen(fen)
    board, turn, castling, ep = apply_uci(board, turn, castling, ep, moves[0])
    pieces = [{'sq': sq_name(i), 'piece': p} for i, p in enumerate(board) if p]
    return {
        'id': 'lichess_' + row['PuzzleId'],
        'level': level,
        'type': t,
        'turn': turn,
        'pieces': pieces,
        'solution': moves[1:],
        'castling': castling,
        'ep': sq_name(ep) if ep is not None else None,
        'rating': int(row['Rating']),
        'themes': row['Themes'].split(),
        'url': row.get('GameUrl', ''),
    }

import chess  # type: ignore

def pieces_to_fen(pieces, turn, castling, ep):
    board = [None] * 64
    for p in pieces:
        idx = (ord(p['sq'][0]) - ord('a')) + (int(p['sq'][1]) - 1) * 8
        board[idx] = p['piece']
    rows = []
    for r in range(7, -1, -1):
        row, gap = '', 0
        for f in range(8):
            pc = board[r * 8 + f]
            if pc is None:
                gap += 1
            else:
                if gap:
                    row += str(gap)
                    gap = 0
                row += pc[1] if pc[0] == 'w' else pc[1].lower()
        if gap:
            row += str(gap)
        rows.append(row)
    return f"{'/'.join(rows)} {turn} {castling} {ep or '-'} 0 1"

def validate(p):
    """Return True if the puzzle is fully legal & the solution actually mates / wins (for mateIn* puzzles)."""
    try:
        fen = pieces_to_fen(p['pieces'], p['turn'], p['castling'], p['ep'])
        b = chess.Board(fen)
    except Exception:
        return False
    if not b.is_valid():
        return False
    for mv in p['solution']:
        try:
            move = chess.Move.from_uci(mv)
        except Exception:
            return False
        if move not in b.legal_moves:
            return False
        b.push(move)
    # Type-specific endpoint check
    if p['type'] in ('mat_in_1', 'mat_in_2'):
        # After the player's last move, position should be checkmate.
        # Solution alternates player/opp; player moves at even indices (0,2,...).
        # Last move in solution is always the player's mating move.
        if not b.is_checkmate():
            return False
    return True

all_puzzles = []
bucket_counts = {}
dropped = 0
for key in sorted(valid_keys):
    rows = buckets[key]
    converted = []
    for row in rows:
        try:
            p = convert(row, key[0], key[1])
        except Exception as e:
            dropped += 1
            continue
        # Drop puzzles whose solution requires non-queen promotion (UI auto-queens)
        if any(len(m) > 4 and m[4].lower() != 'q' for m in p['solution']):
            dropped += 1
            continue
        if not validate(p):
            dropped += 1
            continue
        converted.append(p)
    bucket_counts[key] = len(converted)
    all_puzzles.extend(converted)

print(f'Dropped {dropped} puzzles during validation', flush=True)

print('\nPuzzles per bucket:')
for key in sorted(valid_keys):
    lvl, t = key
    print(f'  Stap {lvl} / {t:22s} {bucket_counts[key]:3d}')
print(f'\nTotal converted: {len(all_puzzles)}')

# Sort for stable output: level, type, id
all_puzzles.sort(key=lambda p: (p['level'], p['type'], p['id']))

with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write('// Auto-generated from the Lichess open puzzle database (CC0).\n')
    f.write('// Source: https://database.lichess.org/#puzzles\n')
    f.write('// Each puzzle: { id, level (1-6 Stappenmethode), type, turn, pieces[], solution[], rating, themes[], url }\n')
    f.write('window.LICHESS_PUZZLES = ')
    json.dump(all_puzzles, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')

size_kb = os.path.getsize(OUTPUT) / 1024
print(f'\nWrote {OUTPUT}  ({size_kb:.1f} KB)')
