import { Injectable, computed, inject, signal } from '@angular/core';

import { createTacticalMastery, TacticalMasteryApi } from '../domain/mastery';
import {
  AnswerOutcome,
  AssessmentOffer,
  BankItem,
  MasteryProfile,
  PendingAssessment,
  SkillCycle,
} from '../domain/mastery.types';
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

  readonly assessmentOffer = computed((): AssessmentOffer | null => {
    this.profileTick();
    return this.profileSignal()?.assessmentOffer ?? null;
  });

  readonly offerProminence = computed((): 'primary' | 'secondary' => {
    const api = this.api;
    const offer = this.assessmentOffer();
    return api && offer ? api.offerProminence(offer) : 'primary';
  });

  readonly offerLabel = computed(() => {
    const offer = this.assessmentOffer();
    if (!offer) return '';
    const label = this.skillLabel(offer.skillId);
    return offer.kind === 'maintenance' ? `Onderhoud: ${label}` : `Beheersingstoets: ${label}`;
  });

  readonly offerDetail = computed(() => {
    const offer = this.assessmentOffer();
    if (!offer) return '';
    return offer.kind === 'maintenance'
      ? '10 opgaven · minimaal 8/10 correct'
      : '20 opgaven in 2 reeksen · minimaal 18/20 correct';
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
    const profile = this.profileSignal();
    return Boolean(profile?.pending || profile?.session?.state === 'active');
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

  recordPracticeResult(skillId: string, score: number, bank?: BankItem[]): void {
    const api = this.api;
    const profile = this.profileSignal();
    if (!api || !profile) return;
    api.practiceResult(profile, skillId, score);
    if (bank?.length) api.refreshOffer(profile, bank);
    this.touchProfile();
    void this.persist();
  }

  refreshAssessmentOffer(bank: BankItem[]): void {
    const api = this.api;
    const profile = this.profileSignal();
    if (!api || !profile || !bank.length) return;
    api.refreshOffer(profile, bank);
    this.touchProfile();
    void this.persist();
  }

  deferAssessmentOffer(): boolean {
    const api = this.api;
    const profile = this.profileSignal();
    if (!api || !profile) return false;
    const result = api.deferOffer(profile);
    if (result['ok']) {
      this.touchProfile();
      void this.persist();
    }
    return Boolean(result['ok']);
  }

  acceptAssessmentOffer(bank: BankItem[], now = Date.now()): Record<string, unknown> {
    const api = this.api;
    const profile = this.profileSignal();
    if (!api || !profile) return { ok: false, reason: 'not-ready' };
    const result = api.acceptOffer(profile, bank, now, Math.random);
    if (result['ok']) this.touchProfile();
    void this.persist();
    return result;
  }

  pending(): PendingAssessment | null {
    return this.profileSignal()?.pending ?? null;
  }

  session() {
    return this.profileSignal()?.session ?? null;
  }

  cycleFor(skillId: string): SkillCycle | null {
    const api = this.api;
    const profile = this.profileSignal();
    return api && profile ? (api.state(profile, skillId).cycle ?? null) : null;
  }

  toetsCounterLabel(): string {
    const pending = this.pending();
    const api = this.api;
    const profile = this.profileSignal();
    if (!pending || !api || !profile) return '';
    const parts: string[] = ['Toets'];
    if (pending.kind !== 'diagnostic') {
      parts.push(`Reeks ${api.state(profile, pending.skillId).cycle?.phase ?? 1}`);
      const slot = profile.session?.slots?.find((s) => s.id === pending.skillId);
      if (slot) {
        const count = profile.session?.counts[pending.skillId] ?? 0;
        parts.push(`Opgave ${count + 1} van ${slot.quota}`);
      }
    }
    parts.push(
      `${pending.line.length}/${pending.puzzle.solution?.length ?? 0} halve zetten ingevoerd.`
    );
    return parts.join(' · ');
  }

  continueToets(bank: BankItem[], now = Date.now()): Record<string, unknown> {
    const api = this.api;
    const profile = this.profileSignal();
    if (!api || !profile) return { ok: false, reason: 'not-ready' };
    if (profile.pending) return { ok: false, reason: 'pending' };
    if (profile.session?.state !== 'active') return { ok: false, reason: 'no-session' };
    const result = api.nextSession(profile, bank, now, Math.random);
    if (result['ok']) this.touchProfile();
    void this.persist();
    return result;
  }

  submitToetsAnswer(
    outcome: AnswerOutcome,
    bank?: BankItem[],
    now = Date.now()
  ): Record<string, unknown> {
    const api = this.api;
    const profile = this.profileSignal();
    if (!api || !profile) return { ok: false, reason: 'not-ready' };
    const result = api.answer(profile, outcome, now);
    if (bank?.length) api.refreshOffer(profile, bank);
    this.touchProfile();
    void this.persist();
    return result;
  }

  updatePendingLine(line: string[], draft?: string): void {
    const profile = this.profileSignal();
    if (!profile?.pending) return;
    profile.pending.line = line;
    profile.pending.draft =
      draft !== undefined ? draft.slice(0, 500) : line.join(' ');
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
      if (profile.assessmentOffer === undefined) profile.assessmentOffer = null;
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
