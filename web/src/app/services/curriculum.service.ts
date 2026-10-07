import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';

import { CurriculumData, Skill } from '../domain/curriculum.types';
import { Puzzle } from '../domain/puzzle.types';
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

  candidates(puzzle: Puzzle): string[] {
    const skills = this.skills();
    const byId = Object.fromEntries(skills.map((s) => [s.id, s]));
    if (Array.isArray(puzzle.candidateIds)) {
      const depthException = puzzle.curriculum?.['depthException'];
      return puzzle.candidateIds.filter(
        (id) =>
          byId[id] &&
          (byId[id].ply === puzzle.solution?.length ||
            (typeof depthException === 'string' && depthException.trim().length > 10))
      );
    }
    const tags = new Set(puzzle.themes ?? []);
    const legacy: Record<string, string> = {
      mat_in_1: 'mateIn1',
      mat_in_2: 'mateIn2',
      winst_materiaal: 'hangingPiece',
      tweevoudige_aanval: 'fork',
      penning: 'pin',
      aftrekschaak: 'discoveredCheck',
      dubbel_schaak: 'doubleCheck',
      rontgen_aanval: 'xRayAttack',
      afleiding: 'attraction',
      overbelasting: 'deflection',
      tussenspel: 'intermezzo',
      zuivering: 'clearance',
    };
    if (legacy[puzzle.type]) tags.add(legacy[puzzle.type]);
    return skills
      .filter(
        (s) =>
          s.ply === puzzle.solution?.length &&
          s.tags.length &&
          (['s4.pinattraction', 's4.magnet'].includes(s.id)
            ? s.tags.every((t) => tags.has(t))
            : s.tags.some((t) => tags.has(t)))
      )
      .map((s) => s.id);
  }
}
