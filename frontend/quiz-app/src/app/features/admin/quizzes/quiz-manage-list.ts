import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { QuizService } from '../../../core/api/quiz.service';
import { QuizListItem, QuizQuery, QuizStatus } from '../../../core/models/quiz.models';
import { QUIZ_STATUSES, QUIZ_STATUS_LABEL } from '../../../core/util/labels';
import { errorMessage } from '../../../core/util/problem-details';
import { ConfirmDialog } from '../../../shared/confirm-dialog';
import { ViPaginatorIntl } from '../../../shared/vi-paginator-intl';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-quiz-manage-list',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  providers: [{ provide: MatPaginatorIntl, useClass: ViPaginatorIntl }],
  templateUrl: './quiz-manage-list.html',
  styleUrl: './quiz-manage-list.scss',
})
export class QuizManageList {
  private readonly quizzes = inject(QuizService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly columns = ['title', 'status', 'access', 'duration', 'questions', 'actions'];
  protected readonly statuses = QUIZ_STATUSES;
  protected readonly pageSize = PAGE_SIZE;

  protected readonly filters = this.fb.group({
    search: '',
    status: '' as QuizQuery['status'],
    isPublic: '' as QuizQuery['isPublic'],
  });

  protected readonly items = signal<QuizListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  private readonly requests = new Subject<QuizQuery>();

  constructor() {
    this.requests
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((query) =>
          this.quizzes.list(query).pipe(
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

    this.filters.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.pageIndex.set(0);
        this.load();
      });

    this.load();
  }

  protected statusText(status: QuizStatus): string {
    return QUIZ_STATUS_LABEL[status];
  }

  protected statusOption(value: string): string {
    return QUIZ_STATUS_LABEL[value as QuizStatus];
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.load();
  }

  protected load(): void {
    const f = this.filters.getRawValue();
    this.requests.next({
      search: f.search.trim(),
      status: f.status,
      isPublic: f.isPublic,
      page: this.pageIndex() + 1,
      pageSize: PAGE_SIZE,
    });
  }

  protected remove(item: QuizListItem): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: `Xóa quiz "${item.title}"?`,
          message: 'Quiz và danh sách câu hỏi của nó sẽ bị xóa; các câu hỏi vẫn được giữ trong ngân hàng.',
          confirmText: 'Xóa',
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.quizzes.delete(item.quizId).subscribe({
          next: () => {
            this.snackBar.open('Đã xóa quiz.', 'Đóng', { duration: 3000 });
            // Xóa dòng cuối của trang cuối thì lùi về trang trước.
            if (this.items().length === 1 && this.pageIndex() > 0) this.pageIndex.update((p) => p - 1);
            this.load();
          },
          // Quiz đã có bài làm không xóa được (409): thông báo của server gợi ý chuyển sang Archived.
          error: (e: unknown) => this.snackBar.open(errorMessage(e), 'Đóng', { duration: 6000 }),
        });
      });
  }
}
