import { Component, DestroyRef, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { AttemptService } from '../../core/api/attempt.service';
import { Attempt } from '../../core/models/attempt.models';
import { errorMessage } from '../../core/util/problem-details';
import { AttemptResult } from './attempt-result';
import { QuizTaker } from './quiz-taker';

/** Trang bài làm: đang làm thì hiện màn hình làm bài, đã kết thúc thì hiện kết quả. */
@Component({
  selector: 'app-attempt-page',
  imports: [MatProgressSpinnerModule, MatButtonModule, RouterLink, QuizTaker, AttemptResult],
  template: `
    @if (loading()) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else if (error(); as message) {
      <div class="error-banner" role="alert">{{ message }}</div>
      <a mat-button routerLink="/attempts">Về lịch sử làm bài</a>
    } @else if (attempt(); as a) {
      @if (a.status === 'InProgress') {
        <app-quiz-taker [attempt]="a" (finished)="attempt.set($event)" (reload)="reload()" />
      } @else {
        <app-attempt-result [attempt]="a" />
      }
    }
  `,
  styles: `
    .center {
      display: flex;
      justify-content: center;
      padding: 48px 0;
    }

    .error-banner {
      margin-bottom: 16px;
      padding: 12px 16px;
      border-radius: 8px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
  `,
})
export class AttemptPage {
  private readonly attempts = inject(AttemptService);

  /** Tham số route `:id`. */
  readonly id = input.required({ transform: numberAttribute });

  protected readonly attempt = signal<Attempt | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  private readonly reloadTick = signal(0);
  private readonly source = computed(() => ({ id: this.id(), tick: this.reloadTick() }));

  constructor() {
    toObservable(this.source)
      .pipe(
        tap(() => {
          // Đặt loading trước để component làm bài bị hủy và dựng lại với dữ liệu mới.
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(({ id }) =>
          this.attempts.get(id).pipe(
            catchError((e: unknown) => {
              this.error.set(errorMessage(e, 'Không tải được bài làm.'));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((attempt) => {
        this.attempt.set(attempt);
        this.loading.set(false);
      });
  }

  protected reload(): void {
    this.reloadTick.update((n) => n + 1);
  }
}
