import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { bank } from '../domain/assessment';
import { createTacticalMastery } from '../domain/mastery';
import { MasteryProfile } from '../domain/mastery.types';
import { Puzzle } from '../domain/puzzle.types';
import { AssessmentBankService } from '../services/assessment-bank.service';
import { MasteryService } from '../services/mastery.service';
import { memoryIdb, PROFILE_IDB, PROFILE_KV } from '../services/profile-store.service';

import { Toets } from './toets';

const CURRICULUM = {
  skills: [
    {
      id: 's1.mate',
      step: 1,
      label: { nl: 'Mat in één', en: 'Mate in one' },
      ply: 1,
      prerequisites: [],
      tags: ['mateIn1'],
      required: true,
      source: 'https://example.com',
      outline: false,
      prerequisiteSource: 'app-design',
    },
  ],
  sources: { '1': 'https://example.com' },
};

function matePuzzle(id: string, fenStr: string, solution: string[], pieces: Puzzle['pieces']): Puzzle {
  return {
    id,
    level: 1,
    type: 'mat_in_1',
    turn: 'w',
    pieces,
    solution,
    castling: '-',
    ep: null,
    fen: fenStr,
    rating: 800,
    themes: ['mateIn1'],
    url: '',
    candidateIds: ['s1.mate'],
    classification: 'mate',
  };
}

function mateBank(count: number): Puzzle[] {
  const layouts = [
    {
      fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',
      solution: ['f7g7'],
      pieces: [
        { sq: 'h8', piece: 'bK' },
        { sq: 'f7', piece: 'wQ' },
        { sq: 'g6', piece: 'wK' },
      ],
    },
    {
      fen: 'k7/1Q2K3/8/8/8/8/8/8 w - - 0 1',
      solution: ['b7b8'],
      pieces: [
        { sq: 'a8', piece: 'bK' },
        { sq: 'b7', piece: 'wQ' },
        { sq: 'e7', piece: 'wK' },
      ],
    },
  ];
  return Array.from({ length: count }, (_, i) => {
    const layout = layouts[i % layouts.length];
    return matePuzzle(`mate${i}`, layout.fen, layout.solution, layout.pieces);
  });
}

function pendingProfile(line: string[] = [], draft = ''): MasteryProfile {
  const puzzles = mateBank(21);
  const items = bank(puzzles, {
    byId: { 's1.mate': { ply: 1 } },
    candidates: () => ['s1.mate'],
  });
  const item = items[0];
  const api = createTacticalMastery({
    skills: CURRICULUM.skills,
    byId: { 's1.mate': CURRICULUM.skills[0] },
    stepSkills: (step) => CURRICULUM.skills.filter((s) => s.step === step),
  });
  const profile = api.create();
  profile.pending = {
    kind: 'mastery',
    skillId: 's1.mate',
    cycleId: 'c1',
    puzzle: { ...item.puzzle, id: 'mate0' },
    position: item.position,
    line,
    draft: draft || line.join(' '),
    startedAt: Date.now(),
  };
  profile.session = {
    state: 'active',
    step: 1,
    slots: [{ id: 's1.mate', kind: 'mastery', quota: 10 }],
    counts: {},
    results: [],
    startedAt: Date.now(),
  };
  profile.skills['s1.mate'] = {
    status: 'learning',
    practice: 0,
    practiceScore: 0,
    history: [],
    cycle: {
      id: 'c1',
      kind: 'mastery',
      state: 'active',
      phase: 1,
      answers: [],
      firstCompletedAt: null,
    },
    proof: null,
  };
  return profile;
}

describe('Toets', () => {
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
      imports: [Toets],
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

  async function readyToets(): Promise<ReturnType<typeof TestBed.createComponent<Toets>>> {
    const fixture = TestBed.createComponent(Toets);
    fixture.detectChanges();
    http.expectOne('data/curriculum.json').flush(CURRICULUM);
    http.expectOne('data/puzzles.json').flush(mateBank(21));
    for (let i = 0; i < 50; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
      const mastery = TestBed.inject(MasteryService);
      const bankService = TestBed.inject(AssessmentBankService);
      if (mastery.ready() && bankService.ready()) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => http?.verify());

  it('verbergt leerdoel tijdens actieve toets', async () => {
    await configure(pendingProfile());
    const fixture = await readyToets();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Mat in één');
    expect(text).toContain('Thema verborgen');
  });

  it('toont reeks- en opgaveteller', async () => {
    await configure(pendingProfile());
    const fixture = await readyToets();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toMatch(/Toets · Reeks 1 · Opgave 1 van 10/);
    expect(text).toMatch(/0\/1 halve zetten ingevoerd/);
  });

  it('hervat ingevoerde variant', async () => {
    await configure(pendingProfile(['f7g7'], 'f7g7'));
    const fixture = await readyToets();
    const input = (fixture.nativeElement as HTMLElement).querySelector(
      '.variant-input'
    ) as HTMLInputElement;
    expect(input?.value).toBe('f7g7');
    expect(TestBed.inject(MasteryService).pending()?.line).toEqual(['f7g7']);
  });

  it('blokkeert vrije toetsstart zonder pending of actieve sessie', async () => {
    await configure();
    const fixture = await readyToets();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Geen actieve toets');
    expect(text).toContain('toetsaanbod op het dashboard');
    expect(text).not.toMatch(/instaptoets/i);
  });

  it('toont Onderhoud als subtitel bij maintenance-toets', async () => {
    const day = 24 * 60 * 60 * 1000;
    const profile = pendingProfile();
    profile.pending!.kind = 'maintenance';
    profile.session!.slots = [{ id: 's1.mate', kind: 'maintenance', quota: 10 }];
    profile.skills['s1.mate'].status = 'mastered';
    profile.skills['s1.mate'].proof = {
      count: 20,
      correct: 18,
      firstCompletedAt: 1,
      completedAt: 1 + day,
    };
    profile.skills['s1.mate'].cycle = {
      id: 'c1',
      kind: 'maintenance',
      state: 'active',
      phase: 1,
      answers: [],
      firstCompletedAt: null,
    };
    await configure(profile);
    const fixture = await readyToets();
    const subtitle = (fixture.nativeElement as HTMLElement).querySelector('.subtitle');
    expect(subtitle?.textContent?.trim()).toBe('Onderhoud');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toMatch(/instaptoets/i);
  });

  it('toont Beheersingstoets als subtitel bij mastery-toets', async () => {
    await configure(pendingProfile());
    const fixture = await readyToets();
    const subtitle = (fixture.nativeElement as HTMLElement).querySelector('.subtitle');
    expect(subtitle?.textContent?.trim()).toBe('Beheersingstoets');
  });
});
