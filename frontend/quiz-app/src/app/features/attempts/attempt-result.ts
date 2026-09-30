import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { Attempt } from '../../core/models/attempt.models';
import { ATTEMPT_STATUS_LABEL, resultLabel } from '../../core/util/labels';

@Component({
  selector: 'app-attempt-result',
  imports: [DatePipe, DecimalPipe, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './attempt-result.html',
  styleUrl: './attempt-result.scss',
})
export class AttemptResult {
  readonly attempt = input.required<Attempt>();

  protected readonly statusLabel = computed(() => ATTEMPT_STATUS_LABEL[this.attempt().status]);
  protected readonly verdict = computed(() => resultLabel(this.attempt().isPassed));
  protected readonly percent = computed(() => {
    const { totalScore, maxScore } = this.attempt();
    return maxScore > 0 ? Math.round(((totalScore ?? 0) / maxScore) * 100) : 0;
  });
  protected readonly correctCount = computed(() => this.attempt().questions.filter((q) => q.isCorrect).length);
}
