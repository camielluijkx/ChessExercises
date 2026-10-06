/** Raw puzzle / toetsmateriaal-kandidaat from the exported bank. */
export interface Puzzle {
  id: string;
  level: number;
  type: string;
  turn: 'w' | 'b';
  pieces: { sq: string; piece: string }[];
  solution: string[];
  castling: string;
  ep: string | null;
  fen: string;
  rating: number;
  themes: string[];
  url: string;
  candidateIds: string[];
  classification: string;
  curriculum?: Record<string, unknown>;
}
