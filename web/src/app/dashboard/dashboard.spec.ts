import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { createTacticalMastery } from '../domain/mastery';
import { MasteryProfile } from '../domain/mastery.types';
import { Dashboard } from './dashboard';
import { MasteryService } from '../services/mastery.service';
import { memoryIdb, PROFILE_IDB, PROFILE_KV } from '../services/profile-store.service';

const CURRICULUM = {
  skills: [
    {
      id: 's1.capture',
      step: 1,
      label: { nl: 'Ongedekt materiaal winnen', en: 'Win undefended material' },
      ply: 1,
      prerequisites: [],
      tags: ['hangingPiece'],
      required: true,
      source: 'https://www.stappenmethode.nl/nl/stap1.php',
      outline: false,
      prerequisiteSource: 'app-design',
    },
    {
      id: 's1.mate',
      step: 1,
      label: { nl: 'Mat in één', en: 'Mate in one' },
      ply: 1,
      prerequisites: [],
      tags: ['mateIn1'],
      required: true,
      source: 'https://www.stappenmethode.nl/nl/stap1.php',
      outline: false,
      prerequisiteSource: 'app-design',
    },
    {
      id: 's1.defend',
      step: 1,
      label: { nl: 'Een stuk verdedigen', en: 'Defend a piece' },
      ply: 1,
      prerequisites: [],
      tags: ['defensiveMove'],
      required: true,
      source: 'https://www.stappenmethode.nl/nl/stap1.php',
      outline: false,
      prerequisiteSource: 'app-design',
    },
    {
      id: 's1.escape',
      step: 1,
      label: { nl: 'Schaak opheffen', en: 'Escape check' },
      ply: 1,
      prerequisites: [],
      tags: ['escape'],
      required: true,
      source: 'https://www.stappenmethode.nl/nl/stap1.php',
      outline: false,
      prerequisiteSource: 'app-design',
    },
    {
      id: 's1.exchange',
      step: 1,
      label: { nl: 'Voordelig ruilen', en: 'Favourable exchange' },
      ply: 1,
      prerequisites: ['s1.capture'],
      tags: ['equality'],
      required: true,
      source: 'https://www.stappenmethode.nl/nl/stap1.php',
      outline: false,
      prerequisiteSource: 'app-design',
    },
    {
      id: 's1.double',
      step: 1,
      label: { nl: 'Tweevoudige aanval: basis', en: 'Double attack: basics' },
      ply: 1,
      prerequisites: ['s1.capture'],
      tags: ['fork'],
      required: true,
      source: 'https://www.stappenmethode.nl/nl/stap1.php',
      outline: false,
      prerequisiteSource: 'app-design',
    },
  ],
  sources: { '1': 'https://www.stappenmethode.nl/nl/stap1.php' },
};

function baseProfile(
  mutate?: (profile: MasteryProfile) => void
): MasteryProfile {
  const api = createTacticalMastery({
    skills: CURRICULUM.skills,
    byId: Object.fromEntries(CURRICULUM.skills.map((s) => [s.id, s])),
    stepSkills: (step) => CURRICULUM.skills.filter((s) => s.step === step),
  });
  const profile = api.create();
  mutate?.(profile);
  return profile;
}

describe('Dashboard', () => {
  let http: HttpTestingController;

  async function configure(profile: MasteryProfile | null = null): Promise<void> {
    const kv = {
      map: {} as Record<string, string>,
      getItem: (k: string) => (k in kv.map ? kv.map[k] : null),
      setItem: (k: string, v: string) => {
        kv.map[k] = v;
      },
      removeItem: (k: string) => {
        delete kv.map[k];
      },
    };
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PROFILE_KV, useValue: kv },
        { provide: PROFILE_IDB, useValue: memoryIdb(profile) },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  }

  beforeEach(async () => {
    await configure();
  });

  afterEach(() => {
    http.verify();
  });

  function flushAssets(): void {
    http.expectOne('data/curriculum.json').flush(CURRICULUM);
    http.expectOne('data/puzzles.json').flush([{ id: 'p1' }, { id: 'p2' }]);
  }

  async function readyDashboard() {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    flushAssets();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('toont de Stappenmethode-disclaimer', async () => {
    const fixture = await readyDashboard();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('geen volledig Stappendiploma');
    expect(text).toContain('Alleen gedekte tactische vaardigheden');
  });

  it('toont voortgangsregel en stap-1-leerdoelen met Nederlandse Stappenmethode-labels', async () => {
    const fixture = await readyDashboard();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Stap 1 · 0/6 beheerst');
    expect(text).toContain('Stap 1');
    expect(text).toContain('Mat in één');
    expect(text).toContain('Schaak opheffen');
    expect(text).toContain('Ongedekt materiaal winnen');
    expect(text).toContain('Een stuk verdedigen');
    expect(text).toContain('Voordelig ruilen');
    expect(text).toContain('Tweevoudige aanval: basis');
    expect(text).not.toContain('Mate in one');
    expect(text).not.toContain('Escape check');
    expect(text).not.toContain('Win undefended material');
  });

  it('toont dat de puzzelbank geladen is', async () => {
    const fixture = await readyDashboard();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Puzzelbank geladen: 2 stellingen');
  });

  it('toont Doorgaan-knop naar oefenen', async () => {
    const fixture = await readyDashboard();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.doorgaan');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toContain('/oefenen');
    expect(link?.textContent?.trim()).toBe('Doorgaan');
  });

  it('Doorgaan wijst naar toets bij open pending', async () => {
    const mastery = TestBed.inject(MasteryService);
    spyOn(mastery, 'hasOpenToets').and.returnValue(true);
    const fixture = await readyDashboard();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.doorgaan');
    expect(link?.getAttribute('href')).toContain('/toets');
  });

  function stubOffer(cmp: Dashboard): void {
    Object.defineProperty(cmp, 'assessmentOffer', {
      configurable: true,
      value: () => ({
        skillId: 's1.mate',
        kind: 'mastery' as const,
        offeredAt: Date.now(),
        deferredAt: null,
      }),
    });
    Object.defineProperty(cmp, 'offerProminence', {
      configurable: true,
      value: () => 'primary' as const,
    });
    Object.defineProperty(cmp, 'offerLabel', {
      configurable: true,
      value: () => 'Beheersingstoets: Mat in één',
    });
    Object.defineProperty(cmp, 'offerDetail', {
      configurable: true,
      value: () => '20 opgaven in 2 reeksen · minimaal 18/20 correct',
    });
  }

  it('toont toetsaanbod wanneer aanwezig', async () => {
    const fixture = await readyDashboard();
    stubOffer(fixture.componentInstance);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.toetsaanbod')).not.toBeNull();
    expect(root.textContent).toContain('Beheersingstoets: Mat in één');
    expect(root.textContent).toContain('Start beheersingstoets');
    expect(root.textContent).toContain('Later');
  });

  it('Later roept deferAssessmentOffer aan', async () => {
    const mastery = TestBed.inject(MasteryService);
    const deferSpy = spyOn(mastery, 'deferAssessmentOffer').and.returnValue(true);
    const fixture = await readyDashboard();
    stubOffer(fixture.componentInstance);
    fixture.detectChanges();
    const later = (fixture.nativeElement as HTMLElement).querySelector(
      'button.defer-offer'
    ) as HTMLButtonElement;
    later.click();
    expect(deferSpy).toHaveBeenCalled();
  });

  it('toont leerdoelstatus learning op het dashboard', async () => {
    const fixture = await readyDashboard();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nog te beheersen');
    expect(text).not.toMatch(/instaptoets/i);
  });

  it('toont wachtstatus van 24 uur per leerdoel', async () => {
    TestBed.resetTestingModule();
    const firstCompletedAt = Date.UTC(2026, 9, 5, 12, 0, 0);
    await configure(
      baseProfile((p) => {
        p.skills['s1.mate'] = {
          status: 'learning',
          practice: 10,
          practiceScore: 10,
          history: [],
          cycle: {
            id: 'c1',
            kind: 'mastery',
            state: 'waiting',
            phase: 1,
            answers: Array.from({ length: 10 }, (_, i) => ({
              correct: true,
              at: firstCompletedAt,
              id: `p${i}`,
              position: `pos${i}`,
            })),
            firstCompletedAt,
          },
          proof: null,
        };
      })
    );
    const fixture = await readyDashboard();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Tweede reeks beschikbaar vanaf');
    expect(text).toContain(
      new Date(firstCompletedAt + 24 * 60 * 60 * 1000).toLocaleString('nl-NL')
    );
  });

  it('toont toetsaanbod-status bij het betreffende leerdoel', async () => {
    TestBed.resetTestingModule();
    await configure(
      baseProfile((p) => {
        p.assessmentOffer = {
          skillId: 's1.mate',
          kind: 'mastery',
          offeredAt: Date.now(),
          deferredAt: null,
        };
      })
    );
    spyOn(TestBed.inject(MasteryService), 'refreshAssessmentOffer');
    const fixture = await readyDashboard();
    const mateRow = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('.leerdoelen li'),
    ].find((li) => li.textContent?.includes('Mat in één'));
    expect(mateRow?.textContent).toContain('Toetsaanbod');
  });

  it('toont remediatiestatus en basisvaardigheid-hint', async () => {
    TestBed.resetTestingModule();
    const day = 24 * 60 * 60 * 1000;
    await configure(
      baseProfile((p) => {
        p.skills['s1.mate'] = {
          status: 'remediation',
          practice: 0,
          practiceScore: 0,
          history: [],
          cycle: null,
          proof: null,
        };
        p.skills['s1.capture'] = {
          status: 'mastered',
          practice: 10,
          practiceScore: 10,
          history: [],
          cycle: null,
          proof: {
            count: 20,
            correct: 18,
            firstCompletedAt: 1,
            completedAt: 1 + day,
          },
        };
        p.remediation = {
          origin: 's1.mate',
          checks: ['s1.capture'],
          gaps: [],
        };
      })
    );
    const fixture = await readyDashboard();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Gerichte herhaling nodig');
    expect(text).toContain('Eerst trainen we de ontbrekende basisvaardigheid:');
    expect(text).toContain('Ongedekt materiaal winnen');
    expect(text).toContain('Kies Doorgaan om gericht te oefenen');
  });
});
