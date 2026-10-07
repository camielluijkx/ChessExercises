import { Chess } from 'chess.js';

import {
  bank,
  describe as assessDescribe,
  fen,
  identity,
  safeCapture,
  safeEscape,
} from './assessment';
import { CandidatesPort } from './assessment.types';

function puzzle(
  fenStr: string,
  solution: string[],
  meta: Record<string, unknown> | null = null
) {
  const c = new Chess(fenStr);
  return {
    id: fenStr,
    turn: c.turn(),
    pieces: c
      .board()
      .flat()
      .filter(Boolean)
      .map((p) => ({
        sq: p!.square,
        piece: (p!.color === 'w' ? 'w' : 'b') + p!.type.toUpperCase(),
      })),
    castling: fenStr.split(' ')[2],
    ep: null,
    solution,
    themes: [] as string[],
    curriculum: meta ?? undefined,
  };
}

const stubCurriculum: CandidatesPort = {
  byId: {
    's1.mate': { ply: 1 },
    's1.capture': { ply: 1 },
    's1.escape': { ply: 1 },
    's1.defend': { ply: 1 },
  },
  candidates: () => ['s1.mate'],
};

describe('assessment', () => {
  it('describe markeert eenvoudige mat-in-één als eligible', () => {
    const mate = puzzle('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', ['f7g7']);
    const d = assessDescribe(mate, stubCurriculum);
    expect(d).not.toBeNull();
    expect(d!.eligible).toBe(true);
    expect(d!.skills).toEqual(['s1.mate']);
    expect(d!.fen).toBe(fen(mate));
  });

  it('identity negeert zet-tellers', () => {
    const mate = puzzle('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', ['f7g7']);
    const id = identity(mate);
    expect(id.split(' ').length).toBe(4);
  });

  it('safeCapture weigert onveilige winning', () => {
    const unsafe = puzzle('7k/8/8/3np3/8/8/r7/Q2RK3 w - - 0 1', ['d1d5']);
    expect(safeCapture(fen(unsafe), 'd1d5')).toBe(false);
    const safe = puzzle('6k1/8/8/3n4/8/8/8/3RK3 w - - 0 1', ['d1d5']);
    expect(safeCapture(fen(safe), 'd1d5')).toBe(true);
  });

  it('bank scoped escape uit langere lijn in schaak', () => {
    const multi = puzzle('k3r3/8/8/8/8/8/8/4K3 w - - 0 1', ['e1d2', 'e8e2']);
    multi.id = 'escape_multi';
    const C: CandidatesPort = {
      byId: { 's1.escape': { ply: 1 } },
      candidates: (p) => (p.solution.length === 1 ? ['s1.escape'] : []),
    };
    const items = bank([multi as never], C);
    const scoped = items.find((b) => b.puzzle.id === 'escape_multi_escape');
    expect(scoped).toBeDefined();
    expect(scoped!.eligible).toBe(true);
    expect(scoped!.skills).toEqual(['s1.escape']);
  });

  it('safeEscape accepteert veilige ontsnapping', () => {
    const safe = puzzle('k3r3/8/8/8/8/8/8/4K3 w - - 0 1', ['e1d2']);
    expect(safeEscape(fen(safe), 'e1d2')).toBe(true);
    expect(
      assessDescribe(safe, { ...stubCurriculum, candidates: () => ['s1.escape'] })!.skills
    ).toEqual([
      's1.escape',
    ]);
  });
});
