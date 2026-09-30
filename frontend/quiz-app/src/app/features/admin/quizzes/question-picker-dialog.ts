import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { QuestionService } from '../../../core/api/question.service';
import { QuestionListItem } from '../../../core/models/question.models';
import { GRADABLE_TYPES } from '../../../core/models/question.models';
import { QUESTION_TYPE_LABEL } from '../../../core/util/labels';
import { errorMessage } from '../../../core/util/problem-details';
import { ViPaginatorIntl } from '../../../shared/vi-paginator-intl';

export interface QuestionPickerData {
  /** Câu hỏi đã có trong quiz: hiện nhưng không chọn được. */
  excludeIds: number[];
}

const PAGE_SIZE = 8;

/** Chọn một hoặc nhiều câu hỏi đang hoạt động từ ngân hàng; đóng với mảng questionId đã chọn. */
@Component({
  selector: 'app-question-picker-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  providers: [{ provide: MatPaginatorIntl, useClass: ViPaginatorIntl }],
  templateUrl: './question-picker-dialog.html',
  styleUrl: './question-picker-dialog.scss',
})
export class QuestionPickerDialog {
  private readonly questions = inject(QuestionService);
  private readonly ref = inject<MatDialogRef<QuestionPickerDialog, number[]>>(MatDialogRef);
  private readonly data = inject<QuestionPickerData>(MAT_DIALOG_DATA);

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly items = signal<QuestionListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selected = signal<ReadonlySet<number>>(new Set());
  protected readonly pageSize = PAGE_SIZE;

  private readonly requests = new Subject<void>();

  constructor() {
    this.requests
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          // Chỉ câu hỏi Active mới thêm được vào quiz (câu đã archive bị backend từ chối).
          this.questions
            .list({ search: this.search.value.trim(), status: 'Active', page: this.pageIndex() + 1, pageSize: PAGE_SIZE })
            .pipe(
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

    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe(() => {
      this.pageIndex.set(0);
      this.requests.next();
    });

    this.requests.next();
  }

  protected typeText(item: QuestionListItem): string {
    return QUESTION_TYPE_LABEL[item.questionType];
  }

  protected gradable(item: QuestionListItem): boolean {
    return GRADABLE_TYPES.includes(item.questionType);
  }

  protected alreadyInQuiz(item: QuestionListItem): boolean {
    return this.data.excludeIds.includes(item.questionId);
  }

  protected isSelected(item: QuestionListItem): boolean {
    return this.selected().has(item.questionId);
  }

  protected toggle(item: QuestionListItem, checked: boolean): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (checked) next.add(item.questionId);
      else next.delete(item.questionId);
      return next;
    });
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.requests.next();
  }

  protected reload(): void {
    this.requests.next();
  }

  protected add(): void {
    this.ref.close([...this.selected()]);
  }
}
