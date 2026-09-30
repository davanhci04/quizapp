import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { QuestionService } from '../../../core/api/question.service';
import { QuestionType } from '../../../core/models/attempt.models';
import {
  GRADABLE_TYPES,
  QuestionDetail,
  QuestionDifficulty,
  QuestionRequest,
} from '../../../core/models/question.models';
import { DIFFICULTIES, DIFFICULTY_LABEL, QUESTION_TYPES, QUESTION_TYPE_LABEL } from '../../../core/util/labels';
import { confirmationMessage, errorMessage } from '../../../core/util/problem-details';
import { notBlank } from '../../../core/util/validators';
import { ConfirmDialog } from '../../../shared/confirm-dialog';

type AnswerGroup = FormGroup<{
  answerId: FormControl<number | null>;
  answerText: FormControl<string>;
  isCorrect: FormControl<boolean>;
}>;

const MAX_ANSWERS = 10;
const MIN_ANSWERS = 2;

/** BR-06: mỗi câu hỏi có >= 2 đáp án và >= 1 đáp án đúng. */
function answersRule(control: AbstractControl): ValidationErrors | null {
  const groups = (control as FormArray<AnswerGroup>).controls;
  if (groups.length < MIN_ANSWERS) return { minAnswers: true };
  return groups.some((g) => g.controls.isCorrect.value) ? null : { noCorrect: true };
}

const isSingleChoice = (type: QuestionType) => type === 'SingleChoice' || type === 'TrueFalse';

@Component({
  selector: 'app-question-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatCheckboxModule,
    MatRadioModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './question-form.html',
  styleUrl: './question-form.scss',
})
export class QuestionForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly questions = inject(QuestionService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** Tham số route `:id`; không có khi tạo mới. */
  readonly id = input<number | undefined, string | number | undefined>(undefined, {
    transform: (v) => (v === undefined || v === '' ? undefined : Number(v)),
  });

  protected readonly types = QUESTION_TYPES;
  protected readonly difficulties = DIFFICULTIES;
  protected readonly maxAnswers = MAX_ANSWERS;

  protected readonly answers = new FormArray<AnswerGroup>([], answersRule);
  protected readonly form = this.fb.group({
    content: ['', [Validators.required, notBlank]],
    questionType: this.fb.control<QuestionType>('SingleChoice', Validators.required),
    category: ['', Validators.maxLength(100)],
    difficulty: this.fb.control<QuestionDifficulty | ''>(''),
    answers: this.answers,
  });

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly quizCount = signal(0);
  protected readonly isEdit = computed(() => this.id() !== undefined);

  private readonly currentType = toSignal(this.form.controls.questionType.valueChanges, {
    initialValue: this.form.controls.questionType.value,
  });
  protected readonly singleChoice = computed(() => isSingleChoice(this.currentType()));
  protected readonly gradable = computed(() => GRADABLE_TYPES.includes(this.currentType()));

  constructor() {
    this.form.controls.questionType.valueChanges.pipe(takeUntilDestroyed()).subscribe((type) => {
      if (isSingleChoice(type)) this.keepOnlyFirstCorrect();
      if (type === 'TrueFalse' && !this.isEdit() && this.answersAreBlank()) {
        this.answers.clear();
        this.addAnswer('Đúng', true);
        this.addAnswer('Sai');
      }
    });
  }

  ngOnInit(): void {
    const id = this.id();
    if (id === undefined) {
      this.addAnswer();
      this.addAnswer();
      return;
    }

    this.loading.set(true);
    this.questions.get(id).subscribe({
      next: (question) => {
        this.fill(question);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(errorMessage(e, 'Không tải được câu hỏi.'));
        this.loading.set(false);
      },
    });
  }

  protected typeText(type: QuestionType): string {
    return QUESTION_TYPE_LABEL[type];
  }

  protected difficultyText(difficulty: QuestionDifficulty): string {
    return DIFFICULTY_LABEL[difficulty];
  }

  protected addAnswer(text = '', isCorrect = false, answerId: number | null = null): void {
    if (this.answers.length >= MAX_ANSWERS) return;
    this.answers.push(
      this.fb.group({
        answerId: this.fb.control<number | null>(answerId),
        answerText: [text, [Validators.required, notBlank, Validators.maxLength(500)]],
        isCorrect: [isCorrect],
      }),
    );
  }

  protected removeAnswer(index: number): void {
    if (this.answers.length <= MIN_ANSWERS) return;
    this.answers.removeAt(index);
  }

  protected move(index: number, delta: -1 | 1): void {
    const target = index + delta;
    if (target < 0 || target >= this.answers.length) return;
    const control = this.answers.at(index);
    this.answers.removeAt(index);
    this.answers.insert(target, control);
  }

  /** Câu một lựa chọn / đúng-sai: chỉ một đáp án đúng. Loại khác: đánh dấu được nhiều đáp án. */
  protected setCorrect(index: number, checked: boolean): void {
    if (this.singleChoice()) {
      this.answers.controls.forEach((g, i) => g.controls.isCorrect.setValue(i === index));
    } else {
      this.answers.at(index).controls.isCorrect.setValue(checked);
    }
    this.answers.updateValueAndValidity();
  }

  protected submit(confirm = false): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.buildRequest();
    const id = this.id();
    const call = id === undefined ? this.questions.create(request) : this.questions.update(id, request, confirm);

    this.saving.set(true);
    this.error.set(null);
    call.subscribe({
      next: () => {
        this.snackBar.open(id === undefined ? 'Đã tạo câu hỏi.' : 'Đã lưu thay đổi.', 'Đóng', { duration: 3000 });
        void this.router.navigate(['/admin/questions']);
      },
      error: (e: unknown) => {
        this.saving.set(false);
        // BR-12: câu hỏi đang được quiz dùng => hỏi xác nhận rồi gửi lại với confirm=true.
        const warning = confirmationMessage(e);
        if (warning === null) {
          this.error.set(errorMessage(e));
          return;
        }
        this.dialog
          .open(ConfirmDialog, {
            data: { title: 'Câu hỏi đang được sử dụng', message: warning, confirmText: 'Vẫn lưu' },
          })
          .afterClosed()
          .subscribe((ok) => {
            if (ok) this.submit(true);
          });
      },
    });
  }

  private buildRequest(): QuestionRequest {
    const v = this.form.getRawValue();
    return {
      content: v.content.trim(),
      questionType: v.questionType,
      category: v.category.trim() || null,
      difficulty: v.difficulty || null,
      answers: v.answers.map((a) => ({
        answerId: a.answerId ?? undefined,
        answerText: a.answerText.trim(),
        isCorrect: a.isCorrect,
      })),
    };
  }

  private fill(question: QuestionDetail): void {
    this.quizCount.set(question.quizCount);
    this.form.patchValue({
      content: question.content,
      questionType: question.questionType,
      category: question.category ?? '',
      difficulty: question.difficulty ?? '',
    });
    this.answers.clear();
    for (const a of [...question.answers].sort((x, y) => x.displayOrder - y.displayOrder)) {
      this.addAnswer(a.answerText, a.isCorrect, a.answerId);
    }
  }

  private answersAreBlank(): boolean {
    return this.answers.controls.every((g) => g.controls.answerText.value.trim() === '' && !g.controls.isCorrect.value);
  }

  private keepOnlyFirstCorrect(): void {
    let found = false;
    for (const g of this.answers.controls) {
      if (g.controls.isCorrect.value) {
        if (found) g.controls.isCorrect.setValue(false);
        found = true;
      }
    }
    this.answers.updateValueAndValidity();
  }
}
