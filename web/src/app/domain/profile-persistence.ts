import { LegacyProfile, MasteryProfile } from './mastery.types';

/** localStorage-sleutel van de vanilla mastery-UI. */
export const LOCAL_PROFILE_KEY = 'chessExercises.mastery.v2';

/** Oude rating-/trainingsvoortgang (geen beheersingsimport). */
export const LEGACY_TRAINING_KEY = 'chessExercises.training.v1';

export const IDB_NAME = 'chessExercises';
export const IDB_STORE = 'mastery';
export const IDB_PROFILE_KEY = 'profile';

/**
 * Verwijdert instaptoets-/diagnostic-restant. Domeinschema houdt lege
 * diagnostic-velden (validatie vereist ze); pending diagnostic verdwijnt.
 */
export function stripInstaptoets(profile: MasteryProfile): MasteryProfile {
  const next: MasteryProfile = {
    ...profile,
    diagnostic: { done: [], recommendations: [] },
    pending: profile.pending?.kind === 'diagnostic' ? null : profile.pending,
  };
  return next;
}

export function parseJson(raw: string | null): unknown {
  if (raw == null || raw === '') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function legacyFromTraining(raw: unknown): LegacyProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const profile = (raw as { profile?: LegacyProfile }).profile;
  if (!profile || typeof profile !== 'object') return null;
  return profile;
}

export interface ProfileLoadOutcome {
  /** Geldig profiel na strip, of null → aanroeper maakt create(legacy). */
  profile: MasteryProfile | null;
  legacy: LegacyProfile | null;
  available: boolean;
  damaged: boolean;
  /** true als localStorage → IndexedDB is overgezet. */
  migrated: boolean;
}
