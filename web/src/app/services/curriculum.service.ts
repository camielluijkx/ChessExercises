import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';

import { CurriculumData, Skill } from '../domain/curriculum.types';

@Injectable({ providedIn: 'root' })
export class CurriculumService {
  private readonly http = inject(HttpClient);
  private readonly data = signal<CurriculumData | null>(null);
  private readonly loadError = signal<string | null>(null);
  private requested = false;

  readonly ready = computed(() => this.data() !== null);
  readonly error = this.loadError.asReadonly();

  load(): void {
    if (this.requested) return;
    this.requested = true;
    this.http
      .get<CurriculumData>('data/curriculum.json')
      .pipe(
        tap((payload) => {
          this.data.set(payload);
          this.loadError.set(null);
        }),
        catchError(() => {
          this.loadError.set('Curriculum kon niet worden geladen.');
          this.requested = false;
          return of(null);
        })
      )
      .subscribe();
  }

  stepSkills(step: number): Skill[] {
    const skills = this.data()?.skills ?? [];
    return skills.filter((s) => s.step === step);
  }
}
