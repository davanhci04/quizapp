import { DatePipe } from '@angular/common';
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
import { QuestionService } from '../../../core/api/question.service';
import { QuestionListItem, QuestionQuery, QuestionStatus } from '../../../core/models/question.models';
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  QUESTION_STATUSES,
  QUESTION_STATUS_LABEL,
  QUESTION_TYPES,
  QUESTION_TYPE_LABEL,
} from '../../../core/util/labels';
import { confirmationMessage, errorMessage } from '../../../core/util/problem-details';
import { ConfirmDialog } from '../../../shared/confirm-dialog';
import { ViPaginatorIntl } from '../../../shared/vi-paginator-intl';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-question-list',
  imports: [
    DatePipe,
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
  templateUrl: './question-list.html',
  styleUrl: './question-list.scss',
})
export class QuestionList {
  private readonly questions = inject(QuestionService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly columns = ['content', 'type', 'category', 'difficulty', 'status', 'usage', 'actions'];
  protected readonly types = QUESTION_TYPES;
  protected readonly difficulties = DIFFICULTIES;
  protected readonly statuses = QUESTION_STATUSES;
  protected readonly pageSize = PAGE_SIZE;

  protected readonly filters = this.fb.group({
    search: '',
    category: '',
    questionType: '' as QuestionQuery['questionType'],
    difficulty: '' as QuestionQuery['difficulty'],
    status: '' as QuestionQuery['status'],
  });

  protected readonly items = signal<QuestionListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  private readonly requests = new Subject<QuestionQuery>();

  constructor() {
    this.requests
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((query) =>
          this.questions.list(query).pipe(
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

    // Gõ tìm kiếm thì chờ một chút; đổi bộ lọc khác thì tải lại từ trang đầu.
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

  protected typeText(type: QuestionListItem['questionType']): string {
    return QUESTION_TYPE_LABEL[type];
  }

  protected difficultyText(difficulty: QuestionListItem['difficulty']): string {
    return difficulty ? DIFFICULTY_LABEL[difficulty] : '—';
  }

  protected statusText(status: QuestionStatus): string {
    return QUESTION_STATUS_LABEL[status];
  }

  protected typeOption(type: string): string {
    return QUESTION_TYPE_LABEL[type as keyof typeof QUESTION_TYPE_LABEL];
  }

  protected difficultyOption(value: string): string {
    return DIFFICULTY_LABEL[value as keyof typeof DIFFICULTY_LABEL];
  }

  protected statusOption(value: string): string {
    return QUESTION_STATUS_LABEL[value as keyof typeof QUESTION_STATUS_LABEL];
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.load();
  }

  protected load(): void {
    const f = this.filters.getRawValue();
    this.requests.next({
      search: f.search.trim(),
      category: f.category.trim(),
      questionType: f.questionType,
      difficulty: f.difficulty,
      status: f.status,
      page: this.pageIndex() + 1,
      pageSize: PAGE_SIZE,
    });
  }

  protected toggleArchive(item: QuestionListItem): void {
    const target: QuestionStatus = item.status === 'Active' ? 'Archived' : 'Active';
    this.questions.setStatus(item.questionId, target).subscribe({
      next: () => {
        this.snackBar.open(target === 'Archived' ? 'Đã archive câu hỏi.' : 'Đã khôi phục câu hỏi.', 'Đóng', {
          duration: 3000,
        });
        this.load();
      },
      error: (e: unknown) => this.snackBar.open(errorMessage(e), 'Đóng', { duration: 5000 }),
    });
  }

  protected remove(item: QuestionListItem): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Xóa câu hỏi?',
          message: 'Câu hỏi và các đáp án của nó sẽ bị xóa. Nếu câu hỏi đã có trong bài nộp, hệ thống sẽ archive thay vì xóa.',
          confirmText: 'Xóa',
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.doDelete(item.questionId, false);
      });
  }

  /** BR-12: nếu câu hỏi đang được quiz sử dụng, server yêu cầu xác nhận lần nữa kèm cảnh báo. */
  private doDelete(id: number, confirm: boolean): void {
    this.questions.delete(id, confirm).subscribe({
      next: (result) => {
        this.snackBar.open(result.message, 'Đóng', { duration: 5000 });
        this.load();
      },
      error: (e: unknown) => {
        const warning = confirmationMessage(e);
        if (warning === null) {
          this.snackBar.open(errorMessage(e), 'Đóng', { duration: 5000 });
          return;
        }
        this.dialog
          .open(ConfirmDialog, {
            data: { title: 'Câu hỏi đang được sử dụng', message: warning, confirmText: 'Vẫn xóa' },
          })
          .afterClosed()
          .subscribe((ok) => {
            if (ok) this.doDelete(id, true);
          });
      },
    });
  }
}
