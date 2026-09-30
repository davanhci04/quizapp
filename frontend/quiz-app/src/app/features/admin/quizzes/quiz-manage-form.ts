import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { QuizService } from '../../../core/api/quiz.service';
import { QuizDetail, QuizRequest, QuizStatus } from '../../../core/models/quiz.models';
import { QUIZ_STATUSES, QUIZ_STATUS_LABEL } from '../../../core/util/labels';
import { errorMessage } from '../../../core/util/problem-details';
import { notBlank } from '../../../core/util/validators';
import { QuizQuestionsPanel } from './quiz-questions-panel';

@Component({
  selector: 'app-quiz-manage-form',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    QuizQuestionsPanel,
  ],
  templateUrl: './quiz-manage-form.html',
  styleUrl: './quiz-manage-form.scss',
})
export class QuizManageForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly quizzes = inject(QuizService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  /** Tham số route `:id`; không có khi tạo mới. */
  readonly id = input<number | undefined, string | number | undefined>(undefined, {
    transform: (v) => (v === undefined || v === '' ? undefined : Number(v)),
  });

  protected readonly statuses = QUIZ_STATUSES;

  protected readonly form = this.fb.group({
    title: ['', [Validators.required, notBlank, Validators.maxLength(200)]],
    description: ['', Validators.maxLength(500)],
    duration: [15, [Validators.required, Validators.min(1), Validators.max(1440), Validators.pattern(/^\d+$/)]],
    passingScore: [1, [Validators.required, Validators.min(0), Validators.max(999.99), Validators.pattern(/^\d{1,3}(\.\d{1,2})?$/)]],
    isPublic: false,
  });
  protected readonly statusControl = this.fb.control<QuizStatus>('Draft');

  protected readonly quiz = signal<QuizDetail | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly statusSaving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statusError = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.id() !== undefined);

  ngOnInit(): void {
    const id = this.id();
    if (id === undefined) return;

    this.loading.set(true);
    this.quizzes.get(id).subscribe({
      next: (quiz) => {
        this.apply(quiz);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(errorMessage(e, 'Không tải được quiz.'));
        this.loading.set(false);
      },
    });
  }

  protected statusText(status: QuizStatus): string {
    return QUIZ_STATUS_LABEL[status];
  }

  /** Điểm đạt cao hơn tổng điểm tối đa thì không ai đạt được. */
  protected unreachable(): boolean {
    const quiz = this.quiz();
    return quiz !== null && quiz.questions.length > 0 && this.form.controls.passingScore.value > quiz.totalScoreWeight;
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const request: QuizRequest = {
      title: v.title.trim(),
      description: v.description.trim() || null,
      duration: Number(v.duration),
      passingScore: Number(v.passingScore),
      isPublic: v.isPublic,
    };
    const id = this.id();

    this.saving.set(true);
    this.error.set(null);
    (id === undefined ? this.quizzes.create(request) : this.quizzes.update(id, request)).subscribe({
      next: (quiz) => {
        this.saving.set(false);
        if (id === undefined) {
          // Tạo xong đi thẳng tới trang chỉnh sửa để thêm câu hỏi.
          this.snackBar.open('Đã tạo quiz. Hãy thêm câu hỏi cho quiz.', 'Đóng', { duration: 4000 });
          void this.router.navigate(['/admin/quizzes', quiz.quizId, 'edit']);
        } else {
          this.apply(quiz);
          this.snackBar.open('Đã lưu thay đổi.', 'Đóng', { duration: 3000 });
        }
      },
      error: (e: unknown) => {
        this.error.set(errorMessage(e));
        this.saving.set(false);
      },
    });
  }

  protected applyStatus(): void {
    const quiz = this.quiz();
    if (!quiz || this.statusControl.value === quiz.status) return;

    this.statusSaving.set(true);
    this.statusError.set(null);
    this.quizzes.setStatus(quiz.quizId, this.statusControl.value).subscribe({
      next: (updated) => {
        this.apply(updated);
        this.statusSaving.set(false);
        this.snackBar.open(`Trạng thái: ${this.statusText(updated.status)}.`, 'Đóng', { duration: 3000 });
      },
      error: (e: unknown) => {
        // Ví dụ BR-07: quiz chưa có câu hỏi thì không xuất bản được.
        this.statusError.set(errorMessage(e));
        this.statusControl.setValue(quiz.status);
        this.statusSaving.set(false);
      },
    });
  }

  /** Cập nhật từ thay đổi danh sách câu hỏi; không đụng tới các ô đang nhập ở form thông tin. */
  protected onQuestionsChanged(quiz: QuizDetail): void {
    this.quiz.set(quiz);
    // Nếu quiz bị đổi trạng thái ở nơi khác thì đồng bộ ô chọn.
    this.statusControl.setValue(quiz.status);
  }

  private apply(quiz: QuizDetail): void {
    this.quiz.set(quiz);
    this.statusControl.setValue(quiz.status);
    this.form.reset({
      title: quiz.title,
      description: quiz.description ?? '',
      duration: quiz.duration,
      passingScore: quiz.passingScore,
      isPublic: quiz.isPublic,
    });
  }
}
