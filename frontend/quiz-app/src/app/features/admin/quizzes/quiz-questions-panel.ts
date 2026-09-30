import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, concat } from 'rxjs';
import { QuizService } from '../../../core/api/quiz.service';
import { GRADABLE_TYPES } from '../../../core/models/question.models';
import { QuizDetail, QuizQuestionItem } from '../../../core/models/quiz.models';
import { QUESTION_TYPE_LABEL } from '../../../core/util/labels';
import { errorMessage } from '../../../core/util/problem-details';
import { ConfirmDialog } from '../../../shared/confirm-dialog';
import { QuestionPickerDialog } from './question-picker-dialog';

const MIN_WEIGHT = 0.01;
const MAX_WEIGHT = 999.99;

/** Quản lý danh sách câu hỏi của một quiz (bảng trung gian QuizQuestion). */
@Component({
  selector: 'app-quiz-questions-panel',
  imports: [DecimalPipe, MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './quiz-questions-panel.html',
  styleUrl: './quiz-questions-panel.scss',
})
export class QuizQuestionsPanel {
  private readonly quizzes = inject(QuizService);
  private readonly dialog = inject(MatDialog);

  readonly quiz = input.required<QuizDetail>();
  /** Phát ra quiz mới nhất sau mỗi thay đổi thành công. */
  readonly changed = output<QuizDetail>();

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly ungradableCount = computed(
    () => this.quiz().questions.filter((q) => !GRADABLE_TYPES.includes(q.questionType)).length,
  );

  protected typeText(q: QuizQuestionItem): string {
    return QUESTION_TYPE_LABEL[q.questionType];
  }

  protected gradable(q: QuizQuestionItem): boolean {
    return GRADABLE_TYPES.includes(q.questionType);
  }

  protected openPicker(): void {
    this.dialog
      .open<QuestionPickerDialog, { excludeIds: number[] }, number[]>(QuestionPickerDialog, {
        width: '720px',
        maxWidth: '95vw',
        data: { excludeIds: this.quiz().questions.map((q) => q.questionId) },
      })
      .afterClosed()
      .subscribe((ids) => {
        if (ids && ids.length > 0) this.addAll(ids);
      });
  }

  protected move(index: number, delta: -1 | 1): void {
    const target = index + delta;
    const questions = this.quiz().questions;
    if (target < 0 || target >= questions.length) return;

    const ids = questions.map((q) => q.questionId);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    this.run(this.quizzes.reorder(this.quiz().quizId, ids));
  }

  protected onWeightChange(q: QuizQuestionItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);

    if (input.value.trim() === '' || !Number.isFinite(value) || value < MIN_WEIGHT || value > MAX_WEIGHT) {
      input.value = String(q.scoreWeight); // hoàn tác giá trị không hợp lệ
      this.error.set(`Điểm của câu phải nằm trong khoảng ${MIN_WEIGHT} – ${MAX_WEIGHT}.`);
      return;
    }
    if (value === q.scoreWeight) return;

    this.run(this.quizzes.updateQuestion(this.quiz().quizId, q.questionId, { scoreWeight: value }), () => {
      input.value = String(q.scoreWeight);
    });
  }

  protected remove(q: QuizQuestionItem): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Gỡ câu hỏi khỏi quiz?',
          message: 'Câu hỏi chỉ bị gỡ khỏi quiz này, vẫn được giữ trong ngân hàng câu hỏi.',
          confirmText: 'Gỡ',
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.run(this.quizzes.removeQuestion(this.quiz().quizId, q.questionId));
      });
  }

  /** Thêm lần lượt từng câu (mặc định điểm 1, xuống cuối danh sách); dừng ở lỗi đầu tiên. */
  private addAll(questionIds: number[]): void {
    const quizId = this.quiz().quizId;
    this.busy.set(true);
    this.error.set(null);
    concat(...questionIds.map((questionId) => this.quizzes.addQuestion(quizId, { questionId }))).subscribe({
      next: (updated) => this.changed.emit(updated),
      error: (e: unknown) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
      complete: () => this.busy.set(false),
    });
  }

  private run(call: Observable<QuizDetail>, onError?: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    call.subscribe({
      next: (updated) => {
        this.changed.emit(updated);
        this.busy.set(false);
      },
      error: (e: unknown) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
        onError?.();
      },
    });
  }
}
