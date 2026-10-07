import { Chess, Color, Square } from 'chess.js';

import { AssessmentItem, CandidatesPort, PuzzleInput, VerificationMeta } from './assessment.types';
import { Puzzle } from './puzzle.types';

const value: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function fen(p: PuzzleInput): string {
  const board = Array<string | null>(64).fill(null);
  if (!Array.isArray(p.pieces) || !['w', 'b'].includes(p.turn)) throw Error('Invalid puzzle');
  for (const piece of p.pieces) {
    if (!/^[a-h][1-8]$/.test(piece.sq) || !/^[wb][KQRBNP]$/.test(piece.piece)) {
      throw Error('Invalid piece');
    }
    const index = (Number(piece.sq[1]) - 1) * 8 + piece.sq.charCodeAt(0) - 97;
    if (board[index]) throw Error('Duplicate square');
    board[index] = piece.piece;
  }
  const rows: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = '';
    let gap = 0;
    for (let file = 0; file < 8; file++) {
      const pc = board[rank * 8 + file];
      if (!pc) gap++;
      else {
        if (gap) row += gap;
        gap = 0;
        row += pc[0] === 'w' ? pc[1] : pc[1].toLowerCase();
      }
    }
    if (gap) row += gap;
    rows.push(row);
  }
  return new Chess(`${rows.join('/')} ${p.turn} ${p.castling || '-'} ${p.ep || '-'} 0 1`).fen();
}

export function identity(p: PuzzleInput): string {
  return fen(p).split(' ').slice(0, 4).join(' ');
}

export function play(chess: Chess, uci: string) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(uci)) throw Error('Invalid move');
  return chess.move({
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: (uci.slice(4).toLowerCase() || undefined) as 'q' | 'r' | 'b' | 'n' | undefined,
  });
}

export function material(chess: Chess, color: Color): number {
  return chess
    .board()
    .flat()
    .filter(Boolean)
    .reduce((n, p) => n + (p!.color === color ? 1 : -1) * value[p!.type], 0);
}

export function safeCapture(start: string, uci: string): boolean {
  const chess = new Chess(start);
  const color = chess.turn();
  const baseline = material(chess, chess.turn());
  const move = play(chess, uci);
  if (!move.captured || move.promotion || chess.isAttacked(move.to, chess.turn())) return false;
  for (const reply of chess.moves({ verbose: true })) {
    chess.move(reply);
    const unsafe = chess.isCheckmate() || material(chess, color) <= baseline;
    chess.undo();
    if (unsafe) return false;
  }
  return material(chess, color) > material(new Chess(start), color);
}

export function safeEscape(start: string, uci: string): boolean {
  const chess = new Chess(start);
  const color = chess.turn();
  const baseline = material(chess, color);
  if (!chess.isCheck()) return false;
  try {
    play(chess, uci);
  } catch {
    return false;
  }
  if (chess.isCheck()) return false;
  for (const reply of chess.moves({ verbose: true })) {
    chess.move(reply);
    const unsafe = chess.isCheckmate() || material(chess, color) < baseline;
    chess.undo();
    if (unsafe) return false;
  }
  return true;
}

export function describe(p: PuzzleInput, C: CandidatesPort): AssessmentItem | null {
  try {
    if (
      typeof p.id !== 'string' ||
      !p.id ||
      !Array.isArray(p.solution) ||
      !p.solution.length ||
      p.solution.length > 15
    ) {
      return null;
    }
    const initial = fen(p);
    const chess = new Chess(initial);
    const enemy = chess.turn() === 'w' ? 'b' : 'w';
    const enemyKing = chess
      .board()
      .flat()
      .find((pc) => pc?.color === enemy && pc.type === 'k');
    if (!enemyKing || chess.isAttacked(enemyKing.square, chess.turn())) return null;
    for (const uci of p.solution) play(chess, uci);
    const candidates = C.candidates(p as Puzzle);
    let skills: string[] = [];
    let eligible = false;
    let verification: VerificationMeta | null = null;
    if (p.solution.length === 1 && chess.isCheckmate() && !new Chess(initial).isCheck()) {
      skills = ['s1.mate'];
      eligible = true;
      verification = { kind: 'mate', ply: 1 };
    } else if (
      p.solution.length === 1 &&
      (p.themes || []).includes('hangingPiece') &&
      !new Chess(initial).isCheck() &&
      safeCapture(initial, p.solution[0])
    ) {
      skills = ['s1.capture'];
      eligible = true;
      verification = { kind: 'safeCapture', ply: 1 };
    } else if (
      p.solution.length === 1 &&
      new Chess(initial).isCheck() &&
      safeEscape(initial, p.solution[0])
    ) {
      skills = ['s1.escape'];
      eligible = true;
      verification = { kind: 'safeEscape', ply: 1 };
    }
    const meta = p.curriculum;
    if (
      meta?.['reviewed'] === true &&
      typeof meta['reviewSource'] === 'string' &&
      meta['reviewSource'] &&
      Array.isArray(meta['skillIds']) &&
      meta['skillIds'].length &&
      (meta['skillIds'] as string[]).every((id) => C.byId[id])
    ) {
      const skillIds = meta['skillIds'] as string[];
      const depthException = meta['depthException'];
      const compatible = skillIds.every(
        (id) =>
          C.byId[id].ply === p.solution.length ||
          (typeof depthException === 'string' && depthException.trim().length > 10)
      );
      const v = meta['verification'] as VerificationMeta | undefined;
      const supported =
        v &&
        (v.kind === 'mate' ||
          v.kind === 'safeCapture' ||
          v.kind === 'safeEscape' ||
          (v.kind === 'engine' && ['mate', 'material'].includes(v.objective?.kind ?? '')) ||
          (v.kind === 'tree' &&
            v.defenceReviewed === true &&
            Array.isArray(v.lines) &&
            v.lines.length));
      if (
        compatible &&
        supported &&
        ((v!.kind !== 'safeCapture' && v!.kind !== 'safeEscape') || p.solution.length === 1) &&
        (v!.kind !== 'mate' || (chess.isCheckmate() && chess.turn() !== p.turn))
      ) {
        skills = skillIds;
        verification = v!;
        eligible = true;
      }
    }
    return {
      puzzle: p,
      position: identity(p),
      fen: initial,
      candidates,
      skills,
      eligible,
      verification,
    };
  } catch {
    return null;
  }
}

export function bank(puzzles: Puzzle[], C: CandidatesPort): AssessmentItem[] {
  const result: AssessmentItem[] = [];
  for (const puzzle of puzzles) {
    const original = describe(puzzle, C);
    if (!original) continue;
    result.push(original);
    if (puzzle.solution.length > 1 && (puzzle.themes || []).includes('hangingPiece')) {
      const initial = new Chess(original.fen);
      try {
        const leaf = new Chess(original.fen);
        play(leaf, puzzle.solution[0]);
        if (
          !initial.isCheck() &&
          !leaf.isCheckmate() &&
          safeCapture(original.fen, puzzle.solution[0])
        ) {
          const scoped: PuzzleInput = {
            ...puzzle,
            id: puzzle.id + '_capture',
            sourceId: puzzle.id,
            solution: [puzzle.solution[0]],
            candidateIds: ['s1.capture'],
            level: 1,
            type: 'winst_materiaal',
          };
          delete scoped.curriculum;
          const item = describe(scoped, C);
          if (item?.eligible) result.push(item);
        }
      } catch {
        /* uncertain positions remain original training candidates */
      }
    }
    if (puzzle.solution.length > 1) {
      try {
        const initial = new Chess(original.fen);
        if (initial.isCheck() && safeEscape(original.fen, puzzle.solution[0])) {
          const scoped: PuzzleInput = {
            ...puzzle,
            id: puzzle.id + '_escape',
            sourceId: puzzle.id,
            solution: [puzzle.solution[0]],
            candidateIds: ['s1.escape'],
            level: 1,
            type: 'schaak_opheffen',
          };
          delete scoped.curriculum;
          const item = describe(scoped, C);
          if (item?.eligible) result.push(item);
        }
      } catch {
        /* uncertain positions remain original training candidates */
      }
    }
  }
  const owners = new Map<string, Set<string>>();
  for (const item of result.filter((b) => b.eligible)) {
    if (!owners.has(item.position)) owners.set(item.position, new Set());
    item.skills.forEach((id) => owners.get(item.position)!.add(id));
  }
  for (const item of result) {
    if ((owners.get(item.position)?.size || 0) > 1) {
      item.eligible = false;
      item.conflictingClassification = true;
    }
  }
  return result.sort((a, b) => a.puzzle.id.localeCompare(b.puzzle.id));
}
