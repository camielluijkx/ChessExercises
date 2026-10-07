import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

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

describe('Dashboard', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
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
        { provide: PROFILE_IDB, useValue: memoryIdb(null) },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
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
});
