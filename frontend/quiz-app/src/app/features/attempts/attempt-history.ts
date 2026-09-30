import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { Subject, catchError, of, switchMap, tap } from 'rxjs';
import { AttemptService } from '../../core/api/attempt.service';
import { AttemptListItem, AttemptStatus } from '../../core/models/attempt.models';
import { ATTEMPT_STATUS_LABEL, resultLabel } from '../../core/util/labels';
import { errorMessage } from '../../core/util/problem-details';
import { ViPaginatorIntl } from '../../shared/vi-paginator-intl';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-attempt-history',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  providers: [{ provide: MatPaginatorIntl, useClass: ViPaginatorIntl }],
  templateUrl: './attempt-history.html',
  styleUrl: './attempt-history.scss',
})
export class AttemptHistory {
  private readonly attempts = inject(AttemptService);

  protected readonly columns = ['quiz', 'startedAt', 'status', 'score', 'result', 'action'];
  protected readonly items = signal<AttemptListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pageSize = PAGE_SIZE;
  protected readonly resultLabel = resultLabel;

  private readonly requests = new Subject<number>();

  constructor() {
    this.requests
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((page) =>
          this.attempts.list(page, PAGE_SIZE).pipe(
            catchError((e: unknown) => {
              this.error.set(errorMessage(e));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((result) => {
        if (result) {
          this.items.set(result.items);
          this.totalCount.set(result.totalCount);
        }
        this.loading.set(false);
      });

    this.load();
  }

  protected statusText(status: AttemptStatus): string {
    return ATTEMPT_STATUS_LABEL[status];
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.load();
  }

  protected load(): void {
    this.requests.next(this.pageIndex() + 1);
  }
}
