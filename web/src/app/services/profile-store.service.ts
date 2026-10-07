import { inject, Injectable, InjectionToken } from '@angular/core';

import {
  IDB_NAME,
  IDB_PROFILE_KEY,
  IDB_STORE,
  LEGACY_TRAINING_KEY,
  LOCAL_PROFILE_KEY,
  legacyFromTraining,
  parseJson,
  ProfileLoadOutcome,
  stripInstaptoets,
} from '../domain/profile-persistence';
import { LegacyProfile, MasteryProfile } from '../domain/mastery.types';

type ValidFn = (p: unknown) => p is MasteryProfile;

/** Key-value (localStorage-achtig) voor migratiebron. */
export interface ProfileKv {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** IndexedDB-achtige put/get voor het beheersingsprofiel. */
export interface ProfileIdb {
  get(): Promise<unknown>;
  put(profile: MasteryProfile): Promise<void>;
}

export const PROFILE_KV = new InjectionToken<ProfileKv>('PROFILE_KV', {
  providedIn: 'root',
  factory: (): ProfileKv => localStorage,
});

export const PROFILE_IDB = new InjectionToken<ProfileIdb>('PROFILE_IDB', {
  providedIn: 'root',
  factory: (): ProfileIdb => createBrowserIdb(),
});

function createBrowserIdb(): ProfileIdb {
  const openDb = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
    });

  return {
    async get() {
      const db = await openDb();
      try {
        return await new Promise<unknown>((resolve, reject) => {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const req = tx.objectStore(IDB_STORE).get(IDB_PROFILE_KEY);
          req.onsuccess = () => resolve(req.result ?? null);
          req.onerror = () => reject(req.error);
        });
      } finally {
        db.close();
      }
    },
    async put(profile: MasteryProfile) {
      const db = await openDb();
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(profile, IDB_PROFILE_KEY);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    },
  };
}

/** In-memory IDB-dubbel voor unit tests. */
export function memoryIdb(seed: unknown = null): ProfileIdb & { data: unknown } {
  const box = { data: seed };
  return {
    get data() {
      return box.data;
    },
    set data(v: unknown) {
      box.data = v;
    },
    async get() {
      return box.data;
    },
    async put(profile: MasteryProfile) {
      box.data = profile;
    },
  };
}

@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly kv = inject(PROFILE_KV);
  private readonly idb = inject(PROFILE_IDB);

  /** Laadt uit IndexedDB, anders localStorage (migratie + diagnostic-strip). */
  async load(valid: ValidFn): Promise<ProfileLoadOutcome> {
    try {
      const fromIdb = await this.idb.get();
      if (fromIdb != null) {
        if (valid(fromIdb)) {
          return {
            profile: stripInstaptoets(fromIdb),
            legacy: null,
            available: true,
            damaged: false,
            migrated: false,
          };
        }
        try {
          this.backupRaw(JSON.stringify(fromIdb));
        } catch {
          /* best-effort */
        }
        return this.freshFromLegacy(true, true);
      }

      const localRaw = this.safeGet(LOCAL_PROFILE_KEY);
      const localParsed = parseJson(localRaw);
      if (localParsed === undefined) {
        this.backupRaw(localRaw);
        return this.freshFromLegacy(true, true);
      }
      if (valid(localParsed)) {
        const profile = stripInstaptoets(localParsed);
        const saved = await this.save(profile);
        if (saved) this.safeRemove(LOCAL_PROFILE_KEY);
        return {
          profile,
          legacy: null,
          available: saved,
          damaged: false,
          migrated: true,
        };
      }

      if (localRaw) this.backupRaw(localRaw);
      return this.freshFromLegacy(true, Boolean(localRaw));
    } catch {
      return { profile: null, legacy: null, available: false, damaged: false, migrated: false };
    }
  }

  async save(profile: MasteryProfile): Promise<boolean> {
    try {
      await this.idb.put(profile);
      return true;
    } catch {
      return false;
    }
  }

  private freshFromLegacy(available: boolean, damaged: boolean): ProfileLoadOutcome {
    const legacy = this.readLegacy();
    return { profile: null, legacy, available, damaged, migrated: false };
  }

  private readLegacy(): LegacyProfile | null {
    return legacyFromTraining(parseJson(this.safeGet(LEGACY_TRAINING_KEY)));
  }

  private backupRaw(raw: string | null): void {
    if (!raw) return;
    try {
      this.kv.setItem(`${LOCAL_PROFILE_KEY}.backup.${Date.now()}`, raw);
    } catch {
      /* best-effort */
    }
  }

  private safeGet(key: string): string | null {
    try {
      return this.kv.getItem(key);
    } catch {
      return null;
    }
  }

  private safeRemove(key: string): void {
    try {
      this.kv.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
