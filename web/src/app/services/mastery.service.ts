import { Injectable, computed, inject, signal } from '@angular/core';

import { createTacticalMastery, TacticalMasteryApi } from '../domain/mastery';
import { MasteryProfile } from '../domain/mastery.types';
import { Skill } from '../domain/curriculum.types';

import { CurriculumService } from './curriculum.service';
import { ProfileStore } from './profile-store.service';

@Injectable({ providedIn: 'root' })
export class MasteryService {
  private readonly curriculum = inject(CurriculumService);
  private readonly store = inject(ProfileStore);
  private readonly profileSignal = signal<MasteryProfile | null>(null);
  private readonly availableSignal = signal(true);
  private readonly damagedSignal = signal(false);
  private api: TacticalMasteryApi | null = null;
  private bootstrapping = false;

  readonly profile = this.profileSignal.asReadonly();
  readonly storageAvailable = this.availableSignal.asReadonly();
  readonly damagedProgress = this.damagedSignal.asReadonly();

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

  readonly storageNotice = computed(() => {
    const parts: string[] = [];
    if (!this.storageAvailable()) {
      parts.push('Opslaan niet beschikbaar: voortgang blijft alleen in deze sessie.');
    }
    if (this.damagedProgress()) {
      parts.push(
        'Opgeslagen voortgang was beschadigd. Een kopie is bewaard; beheersing is opnieuw gestart.'
      );
    }
    return parts.join(' ');
  });

  init(): void {
    if (this.api || this.bootstrapping) return;
    const port = this.curriculum.asPort();
    if (!port) return;
    this.api = createTacticalMastery(port);
    this.bootstrapping = true;
    void this.bootstrap();
  }

  /** Schrijft het huidige profiel naar IndexedDB (no-op als niet ready). */
  async persist(): Promise<boolean> {
    const profile = this.profile();
    if (!profile) return false;
    const ok = await this.store.save(profile);
    this.availableSignal.set(ok);
    return ok;
  }

  private async bootstrap(): Promise<void> {
    const api = this.api!;
    try {
      const outcome = await this.store.load(api.valid.bind(api));
      this.availableSignal.set(outcome.available);
      this.damagedSignal.set(outcome.damaged);
      const profile =
        outcome.profile ?? api.create(outcome.legacy);
      this.profileSignal.set(profile);
      if (outcome.available) {
        const ok = await this.store.save(profile);
        this.availableSignal.set(ok);
      }
    } catch {
      this.availableSignal.set(false);
      this.profileSignal.set(api.create());
    } finally {
      this.bootstrapping = false;
    }
  }
}
