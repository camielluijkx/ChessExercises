import { BankItem } from './mastery.types';
import { Puzzle } from './puzzle.types';

export interface VerificationMeta {
  kind: string;
  ply?: number;
  objective?: { kind: string; gain?: number };
  defenceReviewed?: boolean;
  lines?: string[][];
}

export interface AssessmentItem extends BankItem {
  fen: string;
  verification: VerificationMeta | null;
  conflictingClassification?: boolean;
}

export interface PuzzleInput {
  id: string;
  turn: 'w' | 'b';
  pieces: { sq: string; piece: string }[];
  solution: string[];
  castling?: string;
  ep?: string | null;
  themes?: string[];
  type?: string;
  rating?: number;
  candidateIds?: string[];
  sourceId?: string;
  level?: number;
  curriculum?: Record<string, unknown>;
}

export interface CandidatesPort {
  byId: Record<string, { ply: number }>;
  candidates(puzzle: Puzzle | PuzzleInput): string[];
}

export interface GradeResult {
  outcome: 'correct' | 'wrong' | 'unknown';
  reason: string;
}

export interface EngineCompareResult {
  depth: number;
  type: string;
  value: number;
  bound?: boolean;
}

export interface EnginePort {
  compare(fen: string, uci: string): Promise<[EngineCompareResult | null, EngineCompareResult | null]>;
}
