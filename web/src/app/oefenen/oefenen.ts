import {
  Component,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chess, Square } from 'chess.js';

import { ChessBoardComponent } from '../chess-board/chess-board.component';
import { safeCapture, safeEscape } from '../domain/assessment';
import { AssessmentItem } from '../domain/assessment.types';
import { AssessmentBankService } from '../services/assessment-bank.service';
import { CurriculumService } from '../services/curriculum.service';
import { MasteryService } from '../services/mastery.service';
import { PuzzleBankService } from '../services/puzzle-bank.service';

interface Attempt {
  skill: string;
  errors: number;
  hints: number;
  finished: boolean;
}

@Component({
  selector: 'app-oefenen',
  standalone: true,
  imports: [RouterLink, ChessBoardComponent],
  templateUrl: './oefenen.html',
  styleUrl: './oefenen.css',
})
export class Oefenen implements OnInit, OnDestroy {
  private readonly curriculum = inject(CurriculumService);
  private readonly mastery = inject(MasteryService);
  private readonly puzzleBank = inject(PuzzleBankService);
  private readonly bankService = inject(AssessmentBankService);

  private readonly board = viewChild(ChessBoardComponent);
  private replyTimer: ReturnType<typeof setTimeout> | null = null;
  private interactionLocked = false;
  private solutionStep = 0;
  private currentItem: AssessmentItem | null = null;
  private attempt: Attempt | null = null;
  private started = false;

  readonly loading = signal(true);
  readonly pendingToets = signal(false);
  readonly noPractice = signal(false);
  readonly orientationTip = signal('');
  readonly statusText = signal('');
  readonly statusKind = signal<'info' | 'correct' | 'wrong'>('info');
  readonly boardFen = signal('');
  readonly boardOrientation = signal<'w' | 'b'>('w');
  readonly showBoard = signal(false);
  readonly canInteract = signal(true);
  readonly puzzleDone = signal(false);

  constructor() {
    effect(() => {
      if (this.curriculum.ready()) this.mastery.init();
    });
    effect(() => {
      const ready =
        this.curriculum.ready() &&
        this.mastery.ready() &&
        this.puzzleBank.ready() &&
        this.bankService.ready();
      if (ready && !this.started) {
        this.started = true;
        this.tryStart();
      }
    });
  }

  ngOnInit(): void {
    this.curriculum.load();
    this.puzzleBank.load();
  }

  ngOnDestroy(): void {
    this.clearReplyTimer();
    void this.mastery.persist();
  }

  private tryStart(): void {
    this.loading.set(false);
    if (this.mastery.hasOpenToets()) {
      this.pendingToets.set(true);
      return;
    }
    this.startNextPuzzle();
  }

  private startNextPuzzle(): void {
    this.puzzleDone.set(false);
    const bank = this.bankService.items();
    const pick = this.mastery.choosePractice(bank);
    if (!pick) {
      this.noPractice.set(true);
      this.showBoard.set(false);
      return;
    }
    this.noPractice.set(false);
    const item = pick.item as AssessmentItem;
    this.currentItem = item;
    this.attempt = { skill: pick.skill, errors: 0, hints: 0, finished: false };
    this.solutionStep = 0;
    this.interactionLocked = false;
    this.boardFen.set(item.fen);
    const turn = new Chess(item.fen).turn();
    this.boardOrientation.set(turn === 'b' ? 'b' : 'w');
    this.showBoard.set(true);
    this.canInteract.set(true);
    const profile = this.mastery.profile();
    const step = profile && this.mastery.getApi() ? this.mastery.getApi()!.activeStep(profile) : 1;
    this.orientationTip.set(`Stap ${step} · ${this.mastery.skillLabel(pick.skill)}`);
    this.setStatus(
      turn === 'w' ? 'Jij speelt wit — jouw beurt' : 'Jij speelt zwart — jouw beurt',
      'info'
    );
    void this.mastery.persist();
  }

  onMove(uci: string): void {
    if (
      this.interactionLocked ||
      !this.attempt ||
      this.attempt.finished ||
      !this.currentItem ||
      !this.canInteract()
    ) {
      return;
    }
    const puzzle = this.currentItem.puzzle;
    const solution = puzzle.solution ?? [];
    const expected = solution[this.solutionStep];
    let correct = uci.toLowerCase() === expected?.toLowerCase();
    const v = this.currentItem.verification;
    const startFen = this.currentItem.fen;
    const boardFen = this.board()?.currentFen() ?? startFen;

    if (v?.kind === 'safeCapture') {
      correct = safeCapture(startFen, uci);
    } else if (v?.kind === 'safeEscape') {
      correct = safeEscape(startFen, uci);
    } else if (v?.kind === 'mate' && solution.length === 1) {
      correct = this.isMatingMove(boardFen, uci);
    }

    if (!correct) {
      this.attempt.errors++;
      this.setStatus('Dat is niet de bedoeling — probeer opnieuw', 'wrong');
      return;
    }
    if (!this.board()?.applyUci(uci)) {
      this.attempt.errors++;
      this.setStatus('Illegale zet — probeer opnieuw', 'wrong');
      return;
    }
    this.solutionStep++;
    if (this.solutionStep >= solution.length || this.board()?.isCheckmate()) {
      this.finishAttempt();
      this.setStatus('Goed! Puzzle opgelost.', 'correct');
      return;
    }
    this.playOpponentReply(solution);
  }

  private playOpponentReply(solution: string[]): void {
    this.interactionLocked = true;
    this.canInteract.set(false);
    this.setStatus('Goede zet!', 'correct');
    this.clearReplyTimer();
    this.replyTimer = setTimeout(() => {
      this.interactionLocked = false;
      const reply = solution[this.solutionStep];
      if (!reply || !this.board()?.applyUci(reply)) {
        this.canInteract.set(true);
        this.setStatus('Tegenstander kon niet antwoorden.', 'info');
        return;
      }
      this.solutionStep++;
      this.canInteract.set(true);
      const turn = this.board()?.turn();
      this.setStatus(
        turn === 'w' ? 'Jij speelt wit — jouw beurt' : 'Jij speelt zwart — jouw beurt',
        'info'
      );
      if (this.solutionStep >= solution.length || this.board()?.isCheckmate()) {
        this.finishAttempt();
        this.setStatus('Goed! Puzzle opgelost.', 'correct');
      }
    }, 500);
  }

  hint(): void {
    if (!this.attempt || this.attempt.finished || !this.currentItem) return;
    this.attempt.hints++;
    const move = this.currentItem.puzzle.solution?.[this.solutionStep];
    this.setStatus(move ? `Hint: begin op ${move.slice(0, 2)}` : 'Geen hint beschikbaar', 'info');
  }

  reset(): void {
    if (!this.attempt || this.attempt.finished || !this.currentItem) return;
    this.attempt.hints++;
    this.clearReplyTimer();
    this.interactionLocked = false;
    this.solutionStep = 0;
    this.canInteract.set(true);
    this.boardFen.set(this.currentItem.fen);
    const turn = new Chess(this.currentItem.fen).turn();
    this.setStatus(
      turn === 'w' ? 'Jij speelt wit — jouw beurt' : 'Jij speelt zwart — jouw beurt',
      'info'
    );
  }

  nextPuzzle(): void {
    if (!this.puzzleDone()) return;
    this.startNextPuzzle();
  }

  private finishAttempt(): void {
    if (!this.attempt || this.attempt.finished) return;
    this.attempt.finished = true;
    this.canInteract.set(false);
    this.puzzleDone.set(true);
    const score = this.attempt.errors ? 0 : this.attempt.hints ? 0.5 : 1;
    this.mastery.recordPracticeResult(this.attempt.skill, score, this.bankService.items());
  }

  private isMatingMove(fen: string, uci: string): boolean {
    try {
      const chess = new Chess(fen);
      chess.move({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        promotion: (uci.slice(4).toLowerCase() || undefined) as 'q' | 'r' | 'b' | 'n' | undefined,
      });
      return chess.isCheckmate();
    } catch {
      return false;
    }
  }

  private setStatus(text: string, kind: 'info' | 'correct' | 'wrong'): void {
    this.statusText.set(text);
    this.statusKind.set(kind);
  }

  private clearReplyTimer(): void {
    if (this.replyTimer) {
      clearTimeout(this.replyTimer);
      this.replyTimer = null;
    }
  }
}
