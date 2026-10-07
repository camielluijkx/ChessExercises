import { Skill } from './curriculum.types';

export interface CurriculumPort {
  skills: Skill[];
  byId: Record<string, Skill>;
  stepSkills(step: number): Skill[];
}

export interface AnswerRecord {
  correct: boolean;
  at: number;
  id: string;
  position: string;
  outcome?: string;
}

export interface MasteryProof {
  cycleId?: string;
  count: number;
  correct: number;
  firstCompletedAt: number;
  completedAt: number;
}

export interface SkillCycle {
  id: string;
  kind: 'mastery' | 'maintenance';
  state: 'active' | 'waiting' | 'passed' | 'failed' | 'interrupted';
  phase: 1 | 2;
  answers: AnswerRecord[];
  firstCompletedAt: number | null;
}

export interface SkillState {
  status: 'learning' | 'mastered' | 'remediation';
  practice: number;
  practiceScore: number;
  history: AnswerRecord[];
  cycle: SkillCycle | null;
  proof: MasteryProof | null;
}

export interface ExposureMap {
  ids: Record<string, string>;
  positions: Record<string, string>;
}

export interface PendingAssessment {
  kind: 'mastery' | 'maintenance' | 'diagnostic';
  skillId: string;
  cycleId?: string;
  puzzle: { id: string; sourceId?: string; solution?: string[]; rating?: number };
  position: string;
  line: string[];
  startedAt: number;
  draft?: string;
  verificationFailure?: string;
}

export interface SessionSlot {
  id: string;
  kind: 'mastery' | 'maintenance';
  quota: number;
}

export interface SessionResult {
  id: string;
  skillId: string;
  correct: boolean;
  outcome?: string;
  line: string[];
  solution: string[];
}

export interface MasterySession {
  state: 'active' | 'complete' | 'blocked' | 'remediation';
  step: number;
  slots: SessionSlot[];
  counts: Record<string, number>;
  results: SessionResult[];
  startedAt: number;
}

export interface RemediationPlan {
  origin: string | null;
  checks: string[];
  gaps: string[];
}

export interface ReviewQueueItem {
  id: string;
  sourceId: string;
  position: string;
  skillId: string;
  at: number;
  line: string[];
  reason: string;
}

export interface AssessmentOffer {
  skillId: string;
  kind: 'mastery' | 'maintenance';
  offeredAt: number;
  deferredAt?: number | null;
}

export interface MasteryProfile {
  version: 2;
  skills: Record<string, SkillState>;
  exposure: ExposureMap;
  pending: PendingAssessment | null;
  assessmentOffer: AssessmentOffer | null;
  session: MasterySession | null;
  reviewQueue: ReviewQueueItem[];
  recent: string[];
  diagnostic: { done: string[]; recommendations: string[] };
  remediation: RemediationPlan;
  legacyRating: number | null;
  practiceRating?: number | null;
  enabled: boolean;
}

export interface BankItem {
  puzzle: { id: string; sourceId?: string; solution?: string[]; rating?: number };
  position: string;
  skills: string[];
  candidates: string[];
  eligible?: boolean;
}

export type AnswerOutcome = 'correct' | 'wrong' | 'skip' | 'unknown';

export interface LegacyProfile {
  rating?: number;
  completed?: number;
  themes?: Record<string, unknown>;
}
