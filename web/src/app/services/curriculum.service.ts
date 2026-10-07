import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';

import { CurriculumData, Skill } from '../domain/curriculum.types';
import { CurriculumPort } from '../domain/mastery.types';

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

  skills(): Skill[] {
    return this.data()?.skills ?? [];
  }

  byId(id: string): Skill | undefined {
    return this.data()?.skills.find((s) => s.id === id);
  }

  asPort(): CurriculumPort | null {
    const data = this.data();
    if (!data) return null;
    const byId: Record<string, Skill> = {};
    for (const skill of data.skills) byId[skill.id] = skill;
    return {
      skills: data.skills,
      byId,
      stepSkills: (step) => data.skills.filter((s) => s.step === step),
    };
  }

  stepSkills(step: number): Skill[] {
    return this.skills().filter((s) => s.step === step);
  }
}
