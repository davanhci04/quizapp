import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Attempt } from '../../core/models/attempt.models';
import { QuizTaker } from './quiz-taker';

function makeAttempt(expiresInMs: number, overrides: Partial<Attempt> = {}): Attempt {
  const now = Date.now();
  return {
    attemptId: 9,
    quizId: 1,
    quizTitle: 'Quiz thử',
    status: 'InProgress',
    startedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + expiresInMs).toISOString(),
    serverTime: new Date(now).toISOString(),
    submittedAt: null,
    totalScore: null,
    maxScore: 3,
    passingScore: 2,
    isPassed: null,
    questions: [
      {
        questionId: 1,
        content: 'Câu một?',
        questionType: 'SingleChoice',
        displayOrder: 1,
        scoreWeight: 1,
        selectedAnswerId: null,
        isCorrect: null,
        answers: [
          { answerId: 10, answerText: 'A', displayOrder: 1, isCorrect: null },
          { answerId: 11, answerText: 'B', displayOrder: 2, isCorrect: null },
        ],
      },
      {
        questionId: 2,
        content: 'Câu hai?',
        questionType: 'TrueFalse',
        displayOrder: 2,
        scoreWeight: 2,
        selectedAnswerId: 20,
        isCorrect: null,
        answers: [
          { answerId: 20, answerText: 'Đúng', displayOrder: 1, isCorrect: null },
          { answerId: 21, answerText: 'Sai', displayOrder: 2, isCorrect: null },
        ],
      },
    ],
    ...overrides,
  };
}

async function create(attempt: Attempt): Promise<{ fixture: ComponentFixture<QuizTaker>; http: HttpTestingController }> {
  await TestBed.configureTestingModule({
    imports: [QuizTaker],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();

  const fixture = TestBed.createComponent(QuizTaker);
  fixture.componentRef.setInput('attempt', attempt);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, http: TestBed.inject(HttpTestingController) };
}

const text = (fixture: ComponentFixture<QuizTaker>) => (fixture.nativeElement as HTMLElement).textContent ?? '';

describe('QuizTaker', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the first question, the clock and restores saved answers in the palette', async () => {
    const { fixture } = await create(makeAttempt(10 * 60_000));

    expect(text(fixture)).toContain('Câu một?');
    expect(text(fixture)).toMatch(/(09:5\d|10:00)/);
    // Câu 2 đã có đáp án lưu sẵn => "Đã trả lời 1 / 2".
    expect(text(fixture)).toContain('Đã trả lời 1 / 2');
  });

  it('saves the chosen answer immediately', async () => {
    const { fixture, http } = await create(makeAttempt(10 * 60_000));

    (fixture.componentInstance as unknown as { choose(q: number, a: number | null): void }).choose(1, 11);
    const req = http.expectOne('/api/attempts/9/answers/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ selectedAnswerId: 11 });
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(text(fixture)).toContain('Đã trả lời 2 / 2');
  });

  it('reverts the selection when saving fails', async () => {
    const { fixture, http } = await create(makeAttempt(10 * 60_000));

    (fixture.componentInstance as unknown as { choose(q: number, a: number | null): void }).choose(1, 11);
    http.expectOne('/api/attempts/9/answers/1').flush({ detail: 'lỗi' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(text(fixture)).toContain('Đã trả lời 1 / 2');
  });

  it('asks the parent to reload when the server says the attempt is closed (409)', async () => {
    const { fixture, http } = await create(makeAttempt(10 * 60_000));
    let reloads = 0;
    fixture.componentInstance.reload.subscribe(() => reloads++);

    (fixture.componentInstance as unknown as { choose(q: number, a: number | null): void }).choose(1, 10);
    http.expectOne('/api/attempts/9/answers/1').flush({ detail: 'hết giờ' }, { status: 409, statusText: 'Conflict' });

    expect(reloads).toBe(1);
  });

  it('auto-submits once when the time runs out', async () => {
    vi.useFakeTimers();
    const { fixture, http } = await create(makeAttempt(2000));
    const finished: string[] = [];
    fixture.componentInstance.finished.subscribe((a) => finished.push(a.status));

    http.expectNone('/api/attempts/9/submit');
    vi.advanceTimersByTime(3000);

    const req = http.expectOne('/api/attempts/9/submit');
    expect(req.request.method).toBe('POST');
    // Thêm giây trôi qua không được gửi thêm request nộp bài nào nữa.
    vi.advanceTimersByTime(3000);
    http.expectNone('/api/attempts/9/submit');

    req.flush(makeAttempt(0, { status: 'Submitted', totalScore: 3, isPassed: true }));
    expect(finished).toEqual(['Submitted']);
  });
});
