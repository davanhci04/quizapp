import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Attempt } from '../../core/models/attempt.models';
import { AttemptResult } from './attempt-result';

registerLocaleData(localeVi);

const attempt: Attempt = {
  attemptId: 1,
  quizId: 2,
  quizTitle: 'Quiz kết quả',
  status: 'Submitted',
  startedAt: '2026-09-29T09:00:00Z',
  expiresAt: '2026-09-29T09:10:00Z',
  serverTime: '2026-09-29T09:05:00Z',
  submittedAt: '2026-09-29T09:05:00Z',
  totalScore: 1,
  maxScore: 6,
  passingScore: 3,
  isPassed: false,
  questions: [
    {
      questionId: 1,
      content: 'Câu đúng',
      questionType: 'SingleChoice',
      displayOrder: 1,
      scoreWeight: 1,
      selectedAnswerId: 10,
      isCorrect: true,
      answers: [
        { answerId: 10, answerText: 'a', displayOrder: 1, isCorrect: true },
        { answerId: 11, answerText: 'b', displayOrder: 2, isCorrect: false },
      ],
    },
    {
      questionId: 2,
      content: 'Câu sai',
      questionType: 'SingleChoice',
      displayOrder: 2,
      scoreWeight: 2,
      selectedAnswerId: 20,
      isCorrect: false,
      answers: [
        { answerId: 20, answerText: 'c', displayOrder: 1, isCorrect: false },
        { answerId: 21, answerText: 'd', displayOrder: 2, isCorrect: true },
      ],
    },
    {
      questionId: 3,
      content: 'Câu bỏ trống',
      questionType: 'TrueFalse',
      displayOrder: 3,
      scoreWeight: 3,
      selectedAnswerId: null,
      isCorrect: false,
      answers: [
        { answerId: 30, answerText: 'T', displayOrder: 1, isCorrect: true },
        { answerId: 31, answerText: 'F', displayOrder: 2, isCorrect: false },
      ],
    },
  ],
};

function render(value: Attempt): HTMLElement {
  TestBed.configureTestingModule({
    imports: [AttemptResult],
    providers: [provideRouter([]), { provide: LOCALE_ID, useValue: 'vi' }],
  });
  const fixture = TestBed.createComponent(AttemptResult);
  fixture.componentRef.setInput('attempt', value);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('AttemptResult', () => {
  it('shows the verdict, score and correct count', () => {
    const el = render(attempt);

    expect(el.querySelector('[data-testid="verdict"]')?.textContent).toContain('Không đạt');
    expect(el.textContent).toContain('Đúng 1 / 3 câu');
  });

  it('labels each question as correct, wrong or blank', () => {
    const text = render(attempt).textContent ?? '';

    expect(text).toContain('Đúng');
    expect(text).toContain('Sai');
    expect(text).toContain('Bỏ trống');
  });

  it('marks passed attempts and timed-out attempts', () => {
    const passed = render({ ...attempt, isPassed: true, totalScore: 5 });
    expect(passed.querySelector('[data-testid="verdict"]')?.textContent).toContain('Đạt');
  });

  it('mentions auto-submission for timed-out attempts', () => {
    TestBed.resetTestingModule();
    const text = render({ ...attempt, status: 'TimedOut' }).textContent ?? '';
    expect(text).toContain('tự động nộp khi hết giờ');
  });
});
