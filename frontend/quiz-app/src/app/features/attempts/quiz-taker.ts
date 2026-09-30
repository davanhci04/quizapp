import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioChange, MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AttemptService } from '../../core/api/attempt.service';
import { Attempt } from '../../core/models/attempt.models';
import { errorMessage } from '../../core/util/problem-details';
import { clockOffsetMs, formatClock, remainingMs } from '../../core/util/timer';
import { ConfirmDialog } from '../../shared/confirm-dialog';

/** Cảnh báo đỏ khi còn dưới ngưỡng này. */
const WARNING_MS = 60_000;

@Component({
  selector: 'app-quiz-taker',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatRadioModule],
  templateUrl: './quiz-taker.html',
  styleUrl: './quiz-taker.scss',
})
export class QuizTaker implements OnInit {
  private readonly attempts = inject(AttemptService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly attempt = input.required<Attempt>();
  /** Phát ra bài đã chấm sau khi nộp (thủ công hoặc tự động khi hết giờ). */
  readonly finished = output<Attempt>();
  /** Server đã đóng bài (ví dụ hết giờ): cần tải lại để hiện kết quả. */
  readonly reload = output<void>();

  protected readonly index = signal(0);
  /** questionId -> answerId đang chọn (null = bỏ trống). */
  protected readonly selected = signal<Record<number, number | null>>({});
  protected readonly remaining = signal(0);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly current = computed(() => this.attempt().questions[this.index()]);
  protected readonly total = computed(() => this.attempt().questions.length);
  protected readonly answeredCount = computed(
    () => this.attempt().questions.filter((q) => this.selected()[q.questionId] != null).length,
  );
  protected readonly clock = computed(() => formatClock(this.remaining()));
  protected readonly warning = computed(() => this.remaining() <= WARNING_MS);
  /** Khóa thao tác khi đang nộp hoặc đã hết giờ. */
  protected readonly locked = computed(() => this.submitting() || this.remaining() <= 0);

  private offsetMs = 0;
  private autoSubmitted = false;

  ngOnInit(): void {
    const attempt = this.attempt();
    this.offsetMs = clockOffsetMs(attempt.serverTime);
    this.selected.set(Object.fromEntries(attempt.questions.map((q) => [q.questionId, q.selectedAnswerId])));

    this.tick();
    const timer = setInterval(() => this.tick(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected go(index: number): void {
    if (index >= 0 && index < this.total()) this.index.set(index);
  }

  protected choose(questionId: number, answerId: number | null): void {
    if (this.locked()) return;

    const previous = this.selected()[questionId] ?? null;
    if (previous === answerId) return;

    // Cập nhật ngay trên giao diện, lỗi thì hoàn tác.
    this.selected.update((s) => ({ ...s, [questionId]: answerId }));
    this.attempts.saveAnswer(this.attempt().attemptId, questionId, answerId).subscribe({
      error: (e: unknown) => {
        this.selected.update((s) => ({ ...s, [questionId]: previous }));
        if (e instanceof HttpErrorResponse && e.status === 409) {
          this.reload.emit(); // bài đã kết thúc trên server
        } else {
          this.snackBar.open(errorMessage(e, 'Không lưu được đáp án.'), 'Đóng', { duration: 4000 });
        }
      },
    });
  }

  protected onRadio(event: MatRadioChange, questionId: number): void {
    this.choose(questionId, event.value as number);
  }

  protected confirmSubmit(): void {
    const unanswered = this.total() - this.answeredCount();
    const message =
      unanswered > 0
        ? `Bạn còn ${unanswered} câu chưa trả lời. Sau khi nộp sẽ không thể sửa đáp án.`
        : 'Bạn đã trả lời tất cả câu hỏi. Sau khi nộp sẽ không thể sửa đáp án.';

    this.dialog
      .open(ConfirmDialog, {
        data: { title: 'Nộp bài?', message, confirmText: 'Nộp bài', cancelText: 'Tiếp tục làm' },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.submit();
      });
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.submitError.set(null);

    this.attempts.submit(this.attempt().attemptId).subscribe({
      next: (result) => this.finished.emit(result),
      error: (e: unknown) => {
        this.submitError.set(errorMessage(e, 'Không nộp được bài.'));
        this.submitting.set(false);
      },
    });
  }

  private tick(): void {
    const ms = remainingMs(this.attempt().expiresAt, this.offsetMs);
    this.remaining.set(ms);

    // Hết giờ: tự nộp một lần với các đáp án hiện có (BR-05); lỗi thì để người dùng bấm thử lại.
    if (ms <= 0 && !this.autoSubmitted) {
      this.autoSubmitted = true;
      this.submit();
    }
  }
}
