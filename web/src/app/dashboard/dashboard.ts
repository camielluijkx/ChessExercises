import { Component, computed, effect, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AssessmentBankService } from '../services/assessment-bank.service';
import { CurriculumService } from '../services/curriculum.service';
import { MasteryService } from '../services/mastery.service';
import { PuzzleBankService } from '../services/puzzle-bank.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly router = inject(Router);
  private readonly curriculum = inject(CurriculumService);
  private readonly mastery = inject(MasteryService);
  private readonly puzzleBank = inject(PuzzleBankService);
  private readonly bankService = inject(AssessmentBankService);

  readonly activeStep = this.mastery.activeStep;
  readonly activeStepLeerdoelen = this.mastery.activeStepSkills;
  readonly progressLabel = this.mastery.progressLabel;
  readonly curriculumReady = this.curriculum.ready;
  readonly curriculumError = this.curriculum.error;
  readonly masteryReady = this.mastery.ready;
  readonly storageNotice = this.mastery.storageNotice;
  readonly puzzleCount = this.puzzleBank.count;
  readonly puzzleReady = this.puzzleBank.ready;
  readonly puzzleError = this.puzzleBank.error;

  readonly stapHeading = computed(() => `Stap ${this.activeStep()}`);

  readonly doorgaanLink = computed(() =>
    this.mastery.hasOpenToets() ? '/toets' : '/oefenen'
  );

  readonly assessmentOffer = this.mastery.assessmentOffer;
  readonly offerProminence = this.mastery.offerProminence;
  readonly offerLabel = this.mastery.offerLabel;
  readonly offerDetail = this.mastery.offerDetail;

  readonly acceptOfferLabel = computed(() => {
    const offer = this.assessmentOffer();
    return offer?.kind === 'maintenance' ? 'Start onderhoud' : 'Start beheersingstoets';
  });

  constructor() {
    effect(() => {
      if (this.curriculum.ready()) this.mastery.init();
    });
    effect(() => {
      if (
        !this.curriculum.ready() ||
        !this.mastery.ready() ||
        !this.bankService.ready()
      ) {
        return;
      }
      this.mastery.refreshAssessmentOffer(this.bankService.items());
    });
  }

  deferOffer(): void {
    this.mastery.deferAssessmentOffer();
  }

  acceptOffer(): void {
    const result = this.mastery.acceptAssessmentOffer(this.bankService.items());
    if (result['ok']) void this.router.navigate(['/toets']);
  }

  ngOnInit(): void {
    this.curriculum.load();
    this.puzzleBank.load();
  }
}
