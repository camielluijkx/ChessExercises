import { Component, computed, effect, inject, OnInit } from '@angular/core';

import { CurriculumService } from '../services/curriculum.service';
import { MasteryService } from '../services/mastery.service';
import { PuzzleBankService } from '../services/puzzle-bank.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly curriculum = inject(CurriculumService);
  private readonly mastery = inject(MasteryService);
  private readonly puzzleBank = inject(PuzzleBankService);

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

  constructor() {
    effect(() => {
      if (this.curriculum.ready()) this.mastery.init();
    });
  }

  ngOnInit(): void {
    this.curriculum.load();
    this.puzzleBank.load();
  }
}
