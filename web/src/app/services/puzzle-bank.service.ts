import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';

import { Puzzle } from '../domain/puzzle.types';

@Injectable({ providedIn: 'root' })
export class PuzzleBankService {
  private readonly http = inject(HttpClient);
  private readonly puzzles = signal<Puzzle[] | null>(null);
  private readonly loadError = signal<string | null>(null);
  private requested = false;

  readonly ready = computed(() => this.puzzles() !== null);
  readonly count = computed(() => this.puzzles()?.length ?? 0);
  readonly error = this.loadError.asReadonly();

  all(): Puzzle[] | null {
    return this.puzzles();
  }

  load(): void {
    if (this.requested) return;
    this.requested = true;
    this.http
      .get<Puzzle[]>('data/puzzles.json')
      .pipe(
        tap((bank) => {
          this.puzzles.set(bank);
          this.loadError.set(null);
        }),
        catchError(() => {
          this.loadError.set('Puzzelbank kon niet worden geladen.');
          this.requested = false;
          return of(null);
        })
      )
      .subscribe();
  }
}
