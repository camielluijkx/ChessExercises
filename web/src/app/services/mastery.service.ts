import { Injectable, computed, inject, signal } from '@angular/core';

import { createTacticalMastery, TacticalMasteryApi } from '../domain/mastery';
import { MasteryProfile } from '../domain/mastery.types';
import { Skill } from '../domain/curriculum.types';

import { CurriculumService } from './curriculum.service';

@Injectable({ providedIn: 'root' })
export class MasteryService {
  private readonly curriculum = inject(CurriculumService);
  private readonly profileSignal = signal<MasteryProfile | null>(null);
  private api: TacticalMasteryApi | null = null;

  readonly profile = this.profileSignal.asReadonly();

  readonly ready = computed(() => this.profile() !== null);

  readonly activeStep = computed(() => {
    const api = this.api;
    const profile = this.profile();
    return api && profile ? api.activeStep(profile) : 1;
  });

  readonly activeStepSkills = computed((): Skill[] => {
    const step = this.activeStep();
    return this.curriculum.stepSkills(step);
  });

  readonly masteredCount = computed(() => {
    const api = this.api;
    const profile = this.profile();
    const skills = this.activeStepSkills();
    if (!api || !profile) return 0;
    return skills.filter((s) => api.mastered(profile, s.id)).length;
  });

  readonly skillCount = computed(() => this.activeStepSkills().length);

  readonly progressLabel = computed(() => {
    const step = this.activeStep();
    const mastered = this.masteredCount();
    const total = this.skillCount();
    return `Stap ${step} · ${mastered}/${total} beheerst`;
  });

  init(): void {
    if (this.api) return;
    const port = this.curriculum.asPort();
    if (!port) return;
    this.api = createTacticalMastery(port);
    this.profileSignal.set(this.api.create());
  }
}
