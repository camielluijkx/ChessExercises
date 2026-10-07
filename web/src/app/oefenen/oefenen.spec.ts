import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { bank } from '../domain/assessment';
import { createTacticalMastery } from '../domain/mastery';
import { Puzzle } from '../domain/puzzle.types';
import { AssessmentBankService } from '../services/assessment-bank.service';
import { CurriculumService } from '../services/curriculum.service';
import { MasteryService } from '../services/mastery.service';
import { PuzzleBankService } from '../services/puzzle-bank.service';
import { memoryIdb, PROFILE_IDB, PROFILE_KV } from '../services/profile-store.service';

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

const PUZZLES: Puzzle[] = [
  {
    id: 'mate1',
    level: 1,
    type: 'mat_in_1',
    turn: 'w',
    pieces: [
      { sq: 'h8', piece: 'bK' },
      { sq: 'f7', piece: 'wQ' },
      { sq: 'g6', piece: 'wK' },
    ],
    solution: ['f7g7'],
    castling: '-',
    ep: null,
    fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',
    rating: 800,
    themes: ['mateIn1'],
    url: '',
    candidateIds: ['s1.mate'],
    classification: 'mate',
  },
  {
    id: 'mate2',
    level: 1,
    type: 'mat_in_1',
    turn: 'w',
    pieces: [
      { sq: 'a8', piece: 'bK' },
      { sq: 'b7', piece: 'wQ' },
      { sq: 'c6', piece: 'wK' },
    ],
    solution: ['b7b8'],
    castling: '-',
    ep: null,
    fen: 'k7/1Q2K3/8/8/8/8/8/8 w - - 0 1',
    rating: 820,
    themes: ['mateIn1'],
    url: '',
    candidateIds: ['s1.mate'],
    classification: 'mate',
  },
];

describe('Oefenen wiring', () => {
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

  afterEach(() => http.verify());

  function flushData(): void {
    http.expectOne('data/curriculum.json').flush(CURRICULUM);
    http.expectOne('data/puzzles.json').flush(PUZZLES);
  }

  async function waitForMastery(): Promise<MasteryService> {
    const curriculum = TestBed.inject(CurriculumService);
    const puzzleBank = TestBed.inject(PuzzleBankService);
    curriculum.load();
    puzzleBank.load();
    flushData();
    const mastery = TestBed.inject(MasteryService);
    mastery.init();
    for (let i = 0; i < 50 && !mastery.ready(); i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    return mastery;
  }

  it('choosePractice levert een puzzel uit de bank', async () => {
    await waitForMastery();
    const curriculum = TestBed.inject(CurriculumService);
    const port = curriculum.asPort()!;
    const assessed = bank(PUZZLES, {
      byId: port.byId,
      candidates: (p) => curriculum.candidates(p as Puzzle),
    });
    const bankItems = [
      ...assessed,
      ...Array.from({ length: 20 }, (_, i) => ({
        ...assessed[0],
        puzzle: { ...assessed[0].puzzle, id: `reserve-${i}` },
        position: `${assessed[0].position}-alt-${i}`,
      })),
    ];
    const api = createTacticalMastery(port);
    const profile = api.create();
    const pick = api.choosePractice(profile, bankItems);
    expect(pick).not.toBeNull();
    expect(pick!.skill).toBe('s1.mate');
  });

  it('recordPracticeResult verhoogt practice op het profiel', async () => {
    const mastery = await waitForMastery();
    const before = mastery.profile()?.skills['s1.mate']?.practice ?? 0;
    mastery.recordPracticeResult('s1.mate', 1);
    const after = mastery.profile()?.skills['s1.mate']?.practice ?? 0;
    expect(after).toBe(before + 1);
  });

  it('AssessmentBankService bouwt bank wanneer data klaar is', async () => {
    const bankService = TestBed.inject(AssessmentBankService);
    const curriculum = TestBed.inject(CurriculumService);
    const puzzleBank = TestBed.inject(PuzzleBankService);
    curriculum.load();
    puzzleBank.load();
    flushData();
    for (let i = 0; i < 20 && !bankService.ready(); i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(bankService.ready()).toBe(true);
    expect(bankService.items().length).toBeGreaterThan(0);
  });
});

describe('choosePractice domain', () => {
  it('practiceResult telt score op', () => {
    const api = createTacticalMastery({
      skills: CURRICULUM.skills,
      byId: { 's1.mate': CURRICULUM.skills[0] },
      stepSkills: (step) => CURRICULUM.skills.filter((s) => s.step === step),
    });
    const profile = api.create();
    api.practiceResult(profile, 's1.mate', 1);
    expect(profile.skills['s1.mate'].practice).toBe(1);
    expect(profile.skills['s1.mate'].practiceScore).toBe(1);
    api.practiceResult(profile, 's1.mate', 0.5);
    expect(profile.skills['s1.mate'].practice).toBe(2);
    expect(profile.skills['s1.mate'].practiceScore).toBe(1.5);
  });
});
