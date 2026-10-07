import { Injectable, computed, inject, signal } from '@angular/core';

import { createTacticalMastery, TacticalMasteryApi } from '../domain/mastery';
import { BankItem, MasteryProfile } from '../domain/mastery.types';
import { Skill } from '../domain/curriculum.types';

import { CurriculumService } from './curriculum.service';
import { ProfileStore } from './profile-store.service';

@Injectable({ providedIn: 'root' })
export class MasteryService {
  private readonly curriculum = inject(CurriculumService);
  private readonly store = inject(ProfileStore);
  private readonly profileSignal = signal<MasteryProfile | null>(null);
  private readonly profileTick = signal(0);
  private readonly availableSignal = signal(true);
  private readonly damagedSignal = signal(false);
  private api: TacticalMasteryApi | null = null;
  private bootstrapping = false;

  readonly profile = computed(() => {
    this.profileTick();
    return this.profileSignal();
  });
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

  getApi(): TacticalMasteryApi | null {
    return this.api;
  }

  hasOpenToets(): boolean {
    return Boolean(this.profile()?.pending);
  }

  skillLabel(id: string): string {
    return this.curriculum.byId(id)?.label.nl ?? id;
  }

  mastered(id: string): boolean {
    const api = this.api;
    const profile = this.profileSignal();
    return Boolean(api && profile && api.mastered(profile, id));
  }

  blockers(id: string): string[] {
    const api = this.api;
    const profile = this.profileSignal();
    return api && profile ? api.blockers(profile, id) : [];
  }

  choosePractice(
    bankItems: BankItem[],
    skillId?: string | null
  ): { item: BankItem; skill: string; maintenance: boolean } | null {
    const api = this.api;
    const profile = this.profileSignal();
    if (!api || !profile) return null;
    const pick = api.choosePractice(profile, bankItems, skillId ?? null);
    if (pick) this.touchProfile();
    return pick;
  }

  recordPracticeResult(skillId: string, score: number): void {
    const api = this.api;
    const profile = this.profileSignal();
    if (!api || !profile) return;
    api.practiceResult(profile, skillId, score);
    this.touchProfile();
    void this.persist();
  }

  private touchProfile(): void {
    this.profileTick.update((n) => n + 1);
  }

  /** Schrijft het huidige profiel naar IndexedDB (no-op als niet ready). */
  async persist(): Promise<boolean> {
    const profile = this.profileSignal();
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
