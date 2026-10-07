import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { bank } from '../domain/assessment';
import { AssessmentItem } from '../domain/assessment.types';
import { Puzzle } from '../domain/puzzle.types';

import { CurriculumService } from './curriculum.service';
import { PuzzleBankService } from './puzzle-bank.service';

@Injectable({ providedIn: 'root' })
export class AssessmentBankService {
  private readonly curriculum = inject(CurriculumService);
  private readonly puzzleBank = inject(PuzzleBankService);
  private readonly bankSignal = signal<AssessmentItem[] | null>(null);
  private built = false;

  readonly ready = computed(() => this.bankSignal() !== null);
  readonly items = computed(() => this.bankSignal() ?? []);

  constructor() {
    effect(() => {
      if (!this.curriculum.ready() || !this.puzzleBank.ready() || this.built) return;
      const port = this.curriculum.asPort();
      const puzzles = this.puzzleBank.all();
      if (!port || !puzzles) return;
      const candidatesPort = {
        byId: port.byId,
        candidates: (p: Puzzle) => this.curriculum.candidates(p),
      };
      this.bankSignal.set(bank(puzzles, candidatesPort));
      this.built = true;
    });
  }
}
