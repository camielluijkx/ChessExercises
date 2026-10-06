import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Dashboard } from './dashboard';

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
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideHttpClient(), provideHttpClientTesting()],
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

  it('toont de Stappenmethode-disclaimer', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    flushAssets();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('geen volledig Stappendiploma');
    expect(text).toContain('Alleen gedekte tactische vaardigheden');
  });

  it('toont stap-1-leerdoelen met Nederlandse Stappenmethode-labels', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    flushAssets();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
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

  it('toont dat de puzzelbank geladen is', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    flushAssets();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Puzzelbank geladen: 2 stellingen');
  });
});
