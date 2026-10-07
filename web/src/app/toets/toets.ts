import {
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chess } from 'chess.js';

import { ChessBoardComponent } from '../chess-board/chess-board.component';
import { grade } from '../domain/assessment';
import { AssessmentItem } from '../domain/assessment.types';
import { PendingAssessment } from '../domain/mastery.types';
import { AssessmentBankService } from '../services/assessment-bank.service';
import { CurriculumService } from '../services/curriculum.service';
import { MasteryService } from '../services/mastery.service';
import { PuzzleBankService } from '../services/puzzle-bank.service';

type Phase = 'loading' | 'waiting' | 'blocked' | 'active' | 'feedback';

interface FeedbackContext {
  skillId: string;
  skillLabel: string;
  solution: string[];
  outcome: string;
  answerState?: string;
  sessionActive: boolean;
}

@Component({
  selector: 'app-toets',
  standalone: true,
  imports: [RouterLink, ChessBoardComponent],
  templateUrl: './toets.html',
  styleUrl: './toets.css',
})
export class Toets implements OnInit, OnDestroy {
  private readonly curriculum = inject(CurriculumService);
  private readonly mastery = inject(MasteryService);
  private readonly puzzleBank = inject(PuzzleBankService);
  private readonly bankService = inject(AssessmentBankService);

  private readonly board = viewChild(ChessBoardComponent);
  private started = false;

  readonly phase = signal<Phase>('loading');
  readonly waitingUntil = signal<number | null>(null);
  readonly blockedMessage = signal('');
  readonly counterLabel = computed(() => this.mastery.toetsCounterLabel());
  readonly modeSubtitle = computed(() => {
    const profile = this.mastery.profile();
    const pending = profile?.pending;
    if (pending?.kind === 'maintenance') return 'Onderhoud';
    const session = profile?.session;
    const slot = session?.slots?.find((s) => s.id === pending?.skillId) ?? session?.slots?.[0];
    return slot?.kind === 'maintenance' ? 'Onderhoud' : 'Beheersingstoets';
  });
  readonly variantInput = signal('');
  readonly boardFen = signal('');
  readonly boardOrientation = signal<'w' | 'b'>('w');
  readonly canInteract = signal(true);
  readonly interactionLocked = signal(false);
  readonly statusText = signal('');
  readonly statusKind = signal<'info' | 'correct' | 'wrong'>('info');
  readonly feedback = signal<FeedbackContext | null>(null);

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
    void this.mastery.persist();
  }

  onMove(uci: string): void {
    if (this.phase() !== 'active' || this.interactionLocked()) return;
    const pending = this.mastery.pending();
    const item = this.currentItem();
    if (!pending || !item) return;
    const solutionLen = pending.puzzle.solution?.length ?? 0;
    if (pending.line.length >= solutionLen) return;
    if (!this.board()?.applyUci(uci)) return;
    const line = [...pending.line, uci.toLowerCase()];
    this.variantInput.set(line.join(' '));
    this.mastery.updatePendingLine(line);
  }

  onVariantInput(value: string): void {
    this.variantInput.set(value);
    const pending = this.mastery.pending();
    if (!pending) return;
    pending.draft = value.slice(0, 500);
    void this.mastery.persist();
  }

  undoVariant(): void {
    if (this.phase() !== 'active' || this.interactionLocked()) return;
    const pending = this.mastery.pending();
    if (!pending?.line.length) return;
    const line = pending.line.slice(0, -1);
    this.mastery.updatePendingLine(line);
    this.loadCurrentPuzzle();
  }

  async submitVariant(): Promise<void> {
    const item = this.currentItem();
    const pending = this.mastery.pending();
    if (!item || !pending || this.interactionLocked()) return;

    const raw = this.variantInput().trim();
    const line = raw
      .split(/\s+/)
      .filter(Boolean)
      .map((m) => m.toLowerCase());
    const filtered = line.filter((m) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m));
    this.mastery.updatePendingLine(filtered, raw);

    this.interactionLocked.set(true);
    this.canInteract.set(false);
    this.setStatus('Antwoord ingediend…', 'info');

    const ctx = this.captureFeedbackContext(pending);
    const gradeResult = await grade(item, line);
    const answerResult = this.mastery.submitToetsAnswer(
      gradeResult.outcome,
      this.bankService.items()
    );
    this.showFeedback(ctx, gradeResult.outcome, answerResult);
    this.interactionLocked.set(false);
  }

  skipAssessment(): void {
    const pending = this.mastery.pending();
    if (!pending || this.interactionLocked()) return;
    const ctx = this.captureFeedbackContext(pending);
    const answerResult = this.mastery.submitToetsAnswer('skip', this.bankService.items());
    this.showFeedback(ctx, 'skip', answerResult);
    this.canInteract.set(false);
  }

  continueAssessment(): void {
    this.feedback.set(null);
    const result = this.mastery.continueToets(this.bankService.items());
    if (result['ok']) {
      this.phase.set('active');
      this.canInteract.set(true);
      this.loadCurrentPuzzle();
      return;
    }
    if (result['reason'] === 'waiting') {
      this.waitingUntil.set(result['until'] as number);
      this.phase.set('waiting');
      return;
    }
    this.blockedMessage.set(this.formatBlocked(result));
    this.phase.set('blocked');
  }

  waitingLabel(): string {
    const until = this.waitingUntil();
    if (!until) return 'De volgende reeks volgt na minimaal 24 uur.';
    return `De volgende reeks volgt na minimaal 24 uur (vanaf ${new Date(until).toLocaleString('nl-NL')}).`;
  }

  feedbackMessage(): string {
    const fb = this.feedback();
    if (!fb) return '';
    const parts: string[] = [];
    if (fb.outcome === 'unknown') {
      parts.push('Antwoord kon niet automatisch worden beoordeeld.');
    } else if (fb.sessionActive) {
      parts.push('Antwoord geregistreerd. Feedback volgt na deze toetsreeks.');
    } else if (fb.outcome === 'correct') {
      parts.push('Goed!');
    } else if (fb.outcome === 'skip') {
      parts.push('Overgeslagen.');
    } else {
      parts.push('Niet correct.');
    }
    if (fb.answerState === 'waiting') {
      parts.push('Eerste reeks afgerond. De tweede reeks volgt na minimaal 24 uur.');
    }
    parts.push(`${fb.skillLabel}.`);
    if (!fb.sessionActive && fb.solution.length) {
      parts.push(`Oplossing: ${fb.solution.join(' ')}`);
    }
    return parts.join(' ');
  }

  private tryStart(): void {
    this.phase.set('loading');
    if (this.mastery.pending()) {
      this.phase.set('active');
      this.canInteract.set(true);
      this.loadCurrentPuzzle();
      return;
    }
    if (this.mastery.session()?.state === 'active') {
      const result = this.mastery.continueToets(this.bankService.items());
      if (result['ok']) {
        this.phase.set('active');
        this.canInteract.set(true);
        this.loadCurrentPuzzle();
        return;
      }
      if (result['reason'] === 'waiting') {
        this.waitingUntil.set(result['until'] as number);
        this.phase.set('waiting');
        return;
      }
      this.blockedMessage.set(this.formatBlocked(result));
      this.phase.set('blocked');
      return;
    }
    this.blockedMessage.set(
      'Geen actieve toets. Accepteer het toetsaanbod op het dashboard.'
    );
    this.phase.set('blocked');
  }

  private loadCurrentPuzzle(): void {
    const pending = this.mastery.pending();
    const item = pending ? this.findItem(pending) : null;
    if (!pending || !item) {
      this.blockedMessage.set('Geen toetsopgave beschikbaar.');
      this.phase.set('blocked');
      return;
    }
    this.variantInput.set(pending.draft ?? pending.line.join(' '));
    this.boardFen.set(item.fen);
    const turn = new Chess(item.fen).turn();
    this.boardOrientation.set(turn === 'b' ? 'b' : 'w');
    queueMicrotask(() => {
      const board = this.board();
      if (!board) return;
      for (const uci of pending.line) {
        if (!board.applyUci(uci)) break;
      }
    });
    this.setStatus('Thema verborgen. Voer ook de tegenzetten in…', 'info');
  }

  private currentItem(): AssessmentItem | null {
    const pending = this.mastery.pending();
    return pending ? this.findItem(pending) : null;
  }

  private findItem(pending: PendingAssessment): AssessmentItem | null {
    const items = this.bankService.items();
    return (
      items.find((i) => i.puzzle.id === pending.puzzle.id) ??
      items.find((i) => i.position === pending.position) ??
      null
    );
  }

  private captureFeedbackContext(pending: PendingAssessment): FeedbackContext {
    return {
      skillId: pending.skillId,
      skillLabel: this.mastery.skillLabel(pending.skillId),
      solution: pending.puzzle.solution ?? [],
      outcome: '',
      sessionActive: this.mastery.session()?.state === 'active',
    };
  }

  private showFeedback(
    ctx: FeedbackContext,
    outcome: string,
    answerResult: Record<string, unknown>
  ): void {
    ctx.outcome = outcome;
    ctx.answerState = answerResult['ok'] ? (answerResult['state'] as string) : undefined;
    ctx.sessionActive =
      answerResult['ok'] === true && this.mastery.session()?.state === 'active';
    this.feedback.set(ctx);
    this.phase.set('feedback');
    this.setStatus(this.feedbackMessage(), outcome === 'correct' ? 'correct' : 'info');
  }

  private formatBlocked(result: Record<string, unknown>): string {
    if (result['reason'] === 'insufficient') {
      const available = result['available'];
      const needed = result['needed'];
      if (Number.isFinite(available) && Number.isFinite(needed)) {
        return `Onvoldoende toetsmateriaal (${available}/${needed}).`;
      }
      return 'Onvoldoende toetsmateriaal voor een beheersingstoets.';
    }
    if (result['reason'] === 'locked') {
      return 'Beheersingstoets nog niet beschikbaar: voltooi eerst eerdere leerdoelen.';
    }
    return 'Beheersingstoets kan nu niet worden gestart.';
  }

  private setStatus(text: string, kind: 'info' | 'correct' | 'wrong'): void {
    this.statusText.set(text);
    this.statusKind.set(kind);
  }
}
