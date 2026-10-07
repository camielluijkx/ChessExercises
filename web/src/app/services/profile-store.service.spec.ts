import { TestBed } from '@angular/core/testing';

import { LOCAL_PROFILE_KEY, stripInstaptoets } from '../domain/profile-persistence';
import { MasteryProfile } from '../domain/mastery.types';

import {
  memoryIdb,
  PROFILE_IDB,
  PROFILE_KV,
  ProfileKv,
  ProfileStore,
} from './profile-store.service';

function validProfile(over: Partial<MasteryProfile> = {}): MasteryProfile {
  return {
    version: 2,
    skills: {
      's1.mate': {
        status: 'mastered',
        practice: 10,
        practiceScore: 8,
        history: [],
        cycle: null,
        proof: { count: 20, correct: 18, firstCompletedAt: 1, completedAt: 2 },
      },
    },
    exposure: { ids: {}, positions: {} },
    pending: null,
    assessmentOffer: null,
    session: null,
    reviewQueue: [],
    recent: [],
    diagnostic: { done: ['s1.mate'], recommendations: ['s1.capture'] },
    remediation: { origin: null, checks: [], gaps: [] },
    legacyRating: null,
    enabled: true,
    ...over,
  };
}

function looseValid(p: unknown): p is MasteryProfile {
  if (!p || typeof p !== 'object') return false;
  const m = p as MasteryProfile;
  return (
    m.version === 2 &&
    !!m.skills &&
    typeof m.skills === 'object' &&
    !Array.isArray(m.skills) &&
    !!m.exposure?.ids &&
    !!m.exposure.positions &&
    Array.isArray(m.reviewQueue) &&
    Array.isArray(m.recent) &&
    Array.isArray(m.diagnostic?.done) &&
    Array.isArray(m.diagnostic?.recommendations)
  );
}

function memoryKv(seed: Record<string, string> = {}): ProfileKv & { map: Record<string, string> } {
  const map = { ...seed };
  return {
    map,
    getItem: (k) => (k in map ? map[k] : null),
    setItem: (k, v) => {
      map[k] = v;
    },
    removeItem: (k) => {
      delete map[k];
    },
  };
}

describe('ProfileStore', () => {
  let store: ProfileStore;
  let kv: ReturnType<typeof memoryKv>;
  let idb: ReturnType<typeof memoryIdb>;

  beforeEach(() => {
    kv = memoryKv();
    idb = memoryIdb(null);
    TestBed.configureTestingModule({
      providers: [
        ProfileStore,
        { provide: PROFILE_KV, useValue: kv },
        { provide: PROFILE_IDB, useValue: idb },
      ],
    });
    store = TestBed.inject(ProfileStore);
  });

  it('rondtrip: opgeslagen profiel overleeft herladen via IndexedDB-backend', async () => {
    const profile = stripInstaptoets(validProfile());
    expect(await store.save(profile)).toBeTrue();
    const loaded = await store.load(looseValid);
    expect(loaded.available).toBeTrue();
    expect(loaded.damaged).toBeFalse();
    expect(loaded.profile?.skills['s1.mate']?.status).toBe('mastered');
    expect(loaded.profile?.skills['s1.mate']?.practice).toBe(10);
  });

  it('migreert localStorage naar IndexedDB en stript diagnostic', async () => {
    const raw = validProfile({
      pending: {
        kind: 'diagnostic',
        skillId: 's1.mate',
        puzzle: { id: 'x' },
        position: 'fen',
        line: [],
        startedAt: 1,
      },
    });
    kv.setItem(LOCAL_PROFILE_KEY, JSON.stringify(raw));

    const loaded = await store.load(looseValid);
    expect(loaded.migrated).toBeTrue();
    expect(loaded.profile?.diagnostic).toEqual({ done: [], recommendations: [] });
    expect(loaded.profile?.pending).toBeNull();
    expect(loaded.profile?.skills['s1.mate']?.status).toBe('mastered');
    expect(kv.getItem(LOCAL_PROFILE_KEY)).toBeNull();
    expect(idb.data).toEqual(loaded.profile);

    const again = await store.load(looseValid);
    expect(again.migrated).toBeFalse();
    expect(again.profile?.skills['s1.mate']?.practice).toBe(10);
  });

  it('bij beschadigde localStorage: backup + damaged, geen stil verlies', async () => {
    kv.setItem(LOCAL_PROFILE_KEY, '{niet-json');
    const loaded = await store.load(looseValid);
    expect(loaded.profile).toBeNull();
    expect(loaded.damaged).toBeTrue();
    const backupKeys = Object.keys(kv.map).filter((k) =>
      k.startsWith(`${LOCAL_PROFILE_KEY}.backup.`)
    );
    expect(backupKeys.length).toBe(1);
    expect(kv.getItem(backupKeys[0])).toBe('{niet-json');
  });
});
