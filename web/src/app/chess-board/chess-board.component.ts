import {
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { Chess, Color, Move, Square } from 'chess.js';

const FILES = 'abcdefgh';
const UNICODE: Record<string, string> = {
  wK: '♔',
  wQ: '♕',
  wR: '♖',
  wB: '♗',
  wN: '♘',
  wP: '♙',
  bK: '♚',
  bQ: '♛',
  bR: '♜',
  bB: '♝',
  bN: '♞',
  bP: '♟',
};

export interface BoardSquare {
  idx: number;
  rank: number;
  file: number;
  isLight: boolean;
  rankLabel: string | null;
  fileLabel: string | null;
}

@Component({
  selector: 'app-chess-board',
  standalone: true,
  templateUrl: './chess-board.component.html',
  styleUrl: './chess-board.component.css',
})
export class ChessBoardComponent {
  readonly fen = input.required<string>();
  readonly orientation = input<Color>('w');
  readonly interactive = input(true);

  readonly moveMade = output<string>();

  private readonly chess = signal<Chess | null>(null);
  readonly selectedSq = signal<number | null>(null);
  readonly lastMove = signal<{ from: number; to: number } | null>(null);
  readonly legalTargets = signal<Set<number>>(new Set());
  readonly squares = signal<BoardSquare[]>([]);

  constructor() {
    effect(() => {
      const fenValue = this.fen();
      const orient = this.orientation();
      this.resetBoard(fenValue, orient);
    });
  }

  pieceAt(idx: number): string | null {
    const chess = this.chess();
    if (!chess) return null;
    const sq = this.idxToSquare(idx);
    const piece = chess.get(sq);
    if (!piece) return null;
    const key = piece.color + piece.type.toUpperCase();
    return UNICODE[key] ?? null;
  }

  squareClass(idx: number): string {
    const sq = this.squares().find((s) => s.idx === idx);
    const classes = ['sq', sq?.isLight ? 'light' : 'dark'];
    if (this.selectedSq() === idx) classes.push('selected');
    const last = this.lastMove();
    if (last?.from === idx) classes.push('last-from');
    if (last?.to === idx) classes.push('last-to');
    const targets = this.legalTargets();
    if (targets.has(idx)) {
      classes.push(this.pieceAt(idx) ? 'can-capture' : 'can-move');
    }
    return classes.join(' ');
  }

  onSquareClick(idx: number): void {
    if (!this.interactive()) return;
    const chess = this.chess();
    if (!chess) return;
    const selected = this.selectedSq();
    if (selected === null) {
      const sq = this.idxToSquare(idx);
      const piece = chess.get(sq);
      if (piece?.color === chess.turn()) {
        this.selectedSq.set(idx);
        this.updateLegalTargets(idx);
      }
      return;
    }
    if (selected === idx) {
      this.clearSelection();
      return;
    }
    const targets = this.legalTargets();
    if (!targets.has(idx)) {
      const sq = this.idxToSquare(idx);
      const piece = chess.get(sq);
      if (piece?.color === chess.turn()) {
        this.selectedSq.set(idx);
        this.updateLegalTargets(idx);
      } else {
        this.clearSelection();
      }
      return;
    }
    const from = this.idxToSquare(selected);
    const to = this.idxToSquare(idx);
    const promoMoves = chess.moves({ square: from, verbose: true }).filter((m) => m.to === to);
    const move = promoMoves.find((m) => m.promotion === 'q') ?? promoMoves[0];
    if (!move) {
      this.clearSelection();
      return;
    }
    const uci = `${move.from}${move.to}${move.promotion ?? ''}`;
    this.clearSelection();
    this.moveMade.emit(uci);
  }

  applyMove(move: Move): void {
    const chess = this.chess();
    if (!chess) return;
    chess.move(move);
    this.lastMove.set({ from: this.squareToIdx(move.from), to: this.squareToIdx(move.to) });
    this.clearSelection();
  }

  applyUci(uci: string): boolean {
    const chess = this.chess();
    if (!chess) return false;
    try {
      const move = chess.move({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        promotion: (uci.slice(4).toLowerCase() || undefined) as 'q' | 'r' | 'b' | 'n' | undefined,
      });
      if (!move) return false;
      this.lastMove.set({ from: this.squareToIdx(move.from), to: this.squareToIdx(move.to) });
      this.clearSelection();
      return true;
    } catch {
      return false;
    }
  }

  currentFen(): string {
    return this.chess()?.fen() ?? this.fen();
  }

  isCheckmate(): boolean {
    return this.chess()?.isCheckmate() ?? false;
  }

  turn(): Color {
    return this.chess()?.turn() ?? 'w';
  }

  private resetBoard(fenValue: string, orient: Color): void {
    const chess = new Chess(fenValue);
    this.chess.set(chess);
    this.selectedSq.set(null);
    this.lastMove.set(null);
    this.legalTargets.set(new Set());
    this.squares.set(this.buildSquares(orient === 'b'));
  }

  private buildSquares(flipped: boolean): BoardSquare[] {
    const result: BoardSquare[] = [];
    for (let visRow = 0; visRow < 8; visRow++) {
      for (let visCol = 0; visCol < 8; visCol++) {
        const rank = flipped ? visRow : 7 - visRow;
        const file = flipped ? 7 - visCol : visCol;
        const idx = rank * 8 + file;
        result.push({
          idx,
          rank,
          file,
          isLight: (file + rank) % 2 === 1,
          rankLabel: visCol === 0 ? String(rank + 1) : null,
          fileLabel: visRow === 7 ? FILES[file] : null,
        });
      }
    }
    return result;
  }

  private updateLegalTargets(fromIdx: number): void {
    const chess = this.chess();
    if (!chess) return;
    const from = this.idxToSquare(fromIdx);
    const moves = chess.moves({ square: from, verbose: true });
    this.legalTargets.set(new Set(moves.map((m) => this.squareToIdx(m.to))));
  }

  private clearSelection(): void {
    this.selectedSq.set(null);
    this.legalTargets.set(new Set());
  }

  private idxToSquare(idx: number): Square {
    return `${FILES[idx % 8]}${Math.floor(idx / 8) + 1}` as Square;
  }

  private squareToIdx(sq: Square): number {
    return (Number(sq[1]) - 1) * 8 + sq.charCodeAt(0) - 97;
  }
}
