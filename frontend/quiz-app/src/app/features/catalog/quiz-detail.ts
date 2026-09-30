import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { AttemptService } from '../../core/api/attempt.service';
import { CatalogService } from '../../core/api/catalog.service';
import { AuthService } from '../../core/auth/auth.service';
import { CatalogQuiz } from '../../core/models/catalog.models';
import { errorMessage } from '../../core/util/problem-details';

@Component({
  selector: 'app-quiz-detail',
  imports: [DatePipe, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './quiz-detail.html',
  styleUrl: './quiz-detail.scss',
})
export class QuizDetail {
  private readonly catalog = inject(CatalogService);
  private readonly attempts = inject(AttemptService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  /** Tham số route `:id` (nhờ withComponentInputBinding). */
  readonly id = input.required({ transform: numberAttribute });

  protected readonly quiz = signal<CatalogQuiz | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly starting = signal(false);
  protected readonly startError = signal<string | null>(null);
  protected readonly returnUrl = computed(() => `/quizzes/${this.id()}`);

  constructor() {
    toObservable(this.id)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
          this.quiz.set(null);
        }),
        switchMap((id) =>
          this.catalog.get(id).pipe(
            catchError((e: unknown) => {
              this.error.set(errorMessage(e));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((quiz) => {
        this.quiz.set(quiz);
        this.loading.set(false);
      });
  }

  protected start(): void {
    const quiz = this.quiz();
    if (!quiz) return;

    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.returnUrl() } });
      return;
    }

    this.starting.set(true);
    this.startError.set(null);
    this.attempts.start(quiz.quizId).subscribe({
      next: (attempt) => void this.router.navigate(['/attempts', attempt.attemptId]),
      error: (e: unknown) => {
        this.startError.set(errorMessage(e));
        this.starting.set(false);
      },
    });
  }
}
