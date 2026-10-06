import { Component, computed, inject, OnInit } from '@angular/core';

import { CurriculumService } from '../services/curriculum.service';
import { PuzzleBankService } from '../services/puzzle-bank.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly curriculum = inject(CurriculumService);
  private readonly puzzleBank = inject(PuzzleBankService);

  readonly stap1Leerdoelen = computed(() => this.curriculum.stepSkills(1));
  readonly curriculumReady = this.curriculum.ready;
  readonly curriculumError = this.curriculum.error;
  readonly puzzleCount = this.puzzleBank.count;
  readonly puzzleReady = this.puzzleBank.ready;
  readonly puzzleError = this.puzzleBank.error;

  ngOnInit(): void {
    this.curriculum.load();
    this.puzzleBank.load();
  }
}
