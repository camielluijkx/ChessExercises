#!/usr/bin/env python3
"""Stream the official CC0 Lichess CSV into curriculum candidates.

Tags/depth propose learning goals; they never grant reviewed classification.
Provide a separate, explicit review manifest for non-elementary assessments.
"""
import argparse
import csv
import io
import json
from pathlib import Path
import random
import subprocess


def load_curriculum(path):
    result = subprocess.run(['node', '-e', 'console.log(JSON.stringify(require(process.argv[1]).skills))', str(path.resolve())], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def candidates(tags, ply, skills):
    """Tag/ply proposals only — never reviewed classification."""
    return [s['id'] for s in skills if s['tags'] and (s['ply'] == ply or (s['id'] == 's1.capture' and 'hangingPiece' in tags)) and
            (all(tag in tags for tag in s['tags']) if s['id'] in ('s4.pinattraction', 's4.magnet') else any(tag in tags for tag in s['tags']))]


def convert(row, skill_ids):
    import chess
    moves = row['Moves'].split()
    board = chess.Board(row['FEN'])
    if not board.is_valid() or len(moves) < 2:
        return None
    for index, uci in enumerate(moves):
        move = chess.Move.from_uci(uci)
        if move not in board.legal_moves:
            return None
        board.push(move)
        if index == 0:
            initial = board.copy()
    solution = moves[1:]
    if len(solution) % 2 != 1:
        return None
    themes = row['Themes'].split()
    if any(t in themes for t in ('mateIn1', 'mateIn2', 'mateIn3')) and not board.is_checkmate():
        return None
    return {
        'id': 'lichess_' + row['PuzzleId'],
        'level': min(int(s[1]) for s in skill_ids),  # proposal for legacy display only
        'type': 'candidate',
        'turn': 'w' if initial.turn else 'b',
        'pieces': [{'sq': chess.square_name(sq), 'piece': ('w' if pc.color else 'b') + pc.symbol().upper()} for sq, pc in sorted(initial.piece_map().items())],
        'solution': solution,
        'castling': initial.castling_xfen(),
        'ep': chess.square_name(initial.ep_square) if initial.ep_square is not None else None,
        'fen': initial.fen(),
        'rating': int(row['Rating']),
        'themes': themes,
        'url': row.get('GameUrl', ''),
        'candidateIds': skill_ids,
        'classification': 'candidate'
    }


def build(args):
    import zstandard
    skills = load_curriculum(args.curriculum)
    rng = random.Random(args.seed)
    buckets = {s['id']: [] for s in skills}
    counts = {s['id']: 0 for s in skills}
    reviews = json.loads(args.reviews.read_text()) if args.reviews else {}
    if not isinstance(reviews, dict):
        raise ValueError('Review manifest must map puzzle IDs to curriculum metadata')
    wanted = set(reviews)
    reviewed_rows = {}
    n = 0
    with args.input.open('rb') as compressed:
        stream = zstandard.ZstdDecompressor().stream_reader(compressed)
        with io.TextIOWrapper(stream, encoding='utf-8') as text:
            for n, row in enumerate(csv.DictReader(text), 1):
                tags = set(row['Themes'].split())
                ids = candidates(tags, len(row['Moves'].split()) - 1, skills)
                puzzle_id = 'lichess_' + row['PuzzleId']
                if puzzle_id in wanted:
                    reviewed_rows[puzzle_id] = (row, ids)
                for skill in ids:
                    counts[skill] += 1
                    bucket = buckets[skill]
                    if len(bucket) < args.per_skill:
                        bucket.append((row, ids))
                    else:
                        index = rng.randrange(counts[skill])
                        if index < args.per_skill:
                            bucket[index] = (row, ids)
                if n % 500000 == 0:
                    print(f'Scanned {n:,} rows', flush=True)
                if args.max_rows and n >= args.max_rows:
                    break
    unique = dict(reviewed_rows)
    for bucket in buckets.values():
        for row, ids in bucket:
            unique['lichess_' + row['PuzzleId']] = (row, ids)
    puzzles, dropped, positions = [], 0, set()
    for puzzle_id, (row, ids) in sorted(unique.items()):
        meta = reviews.get(puzzle_id)
        if meta:
            ids = meta.get('skillIds', [])
            if not ids or not all(any(s['id'] == k for s in skills) for k in ids):
                raise ValueError(f'Unknown reviewed skill for {puzzle_id}')
        if not ids:
            continue
        try:
            puzzle = convert(row, ids)
        except (ValueError, KeyError):
            puzzle = None
        if not puzzle:
            dropped += 1
            continue
        position = ' '.join(puzzle['fen'].split()[:4])
        if position in positions:
            continue
        positions.add(position)
        if meta:
            if not all(any(s['id']==skill and (s['ply']==len(puzzle['solution']) or len(meta.get('depthException','').strip())>10) for s in skills) for skill in ids):
                raise ValueError(f'Unexplained depth exception for {puzzle_id}')
            if meta.get('reviewed') is not True or not meta.get('reviewSource') or not meta.get('verification'):
                raise ValueError(f'Incomplete review for {puzzle_id}')
            puzzle['curriculum'] = meta
            puzzle['classification'] = 'reviewed'
        puzzles.append(puzzle)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('w', encoding='utf-8') as out:
        out.write('// Lichess CC0: https://database.lichess.org/#puzzles\n// Candidate labels are not reviewed curriculum assignments.\nwindow.LICHESS_PUZZLES = ')
        json.dump(puzzles, out, ensure_ascii=False, separators=(',', ':'))
        out.write(';\n')
    report = {'rows': n, 'puzzles': len(puzzles), 'dropped': dropped, 'seed': args.seed, 'perSkill': args.per_skill,
              'source': 'https://database.lichess.org/#puzzles',
              'candidates': {s['id']: sum(s['id'] in p['candidateIds'] for p in puzzles) for s in skills},
              'reviewed': sum(p.get('classification') == 'reviewed' for p in puzzles)}
    args.output.with_suffix('.coverage.json').write_text(json.dumps(report, indent=2) + '\n')
    print(f'Wrote {len(puzzles):,} legal, distinct candidate positions; {report["reviewed"]} explicitly reviewed', flush=True)
    missing = [k for k, value in report['candidates'].items() if value < 40]
    print('Candidate pools below 40:', ', '.join(missing), flush=True)


def main():
    root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=root / 'lichess_db_puzzle.csv.zst')
    parser.add_argument('--output', type=Path, default=root / 'puzzles.js')
    parser.add_argument('--curriculum', type=Path, default=root / 'curriculum.js')
    parser.add_argument('--reviews', type=Path)
    parser.add_argument('--per-skill', type=int, default=150)
    parser.add_argument('--seed', type=int, default=20261005)
    parser.add_argument('--max-rows', type=int, default=0, help='0 scans the complete database')
    args = parser.parse_args()
    if args.per_skill < 40:
        parser.error('--per-skill must be >= 40 to leave room for training and independent assessment')
    build(args)


if __name__ == '__main__':
    main()
