import { MasteryProfile } from './mastery.types';
import {
  legacyFromTraining,
  parseJson,
  stripInstaptoets,
} from './profile-persistence';

function baseProfile(over: Partial<MasteryProfile> = {}): MasteryProfile {
  return {
    version: 2,
    skills: {},
    exposure: { ids: {}, positions: {} },
    pending: null,
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

describe('profile-persistence', () => {
  it('stripInstaptoets leegt diagnostic en verwijdert pending diagnostic', () => {
    const profile = baseProfile({
      pending: {
        kind: 'diagnostic',
        skillId: 's1.mate',
        puzzle: { id: 'p1' },
        position: 'fen',
        line: [],
        startedAt: 1,
      },
    });
    const stripped = stripInstaptoets(profile);
    expect(stripped.diagnostic).toEqual({ done: [], recommendations: [] });
    expect(stripped.pending).toBeNull();
  });

  it('stripInstaptoets behoudt pending beheersingstoets', () => {
    const pending = {
      kind: 'mastery' as const,
      skillId: 's1.mate',
      puzzle: { id: 'p1' },
      position: 'fen',
      line: ['e2e4'],
      startedAt: 1,
    };
    const stripped = stripInstaptoets(baseProfile({ pending }));
    expect(stripped.pending).toEqual(pending);
    expect(stripped.diagnostic).toEqual({ done: [], recommendations: [] });
  });

  it('parseJson geeft undefined bij kapotte JSON', () => {
    expect(parseJson('{')).toBeUndefined();
    expect(parseJson(null)).toBeNull();
  });

  it('legacyFromTraining leest ratingprofiel uit training.v1', () => {
    expect(legacyFromTraining({ profile: { rating: 1500 } })).toEqual({ rating: 1500 });
    expect(legacyFromTraining(null)).toBeNull();
  });
});
