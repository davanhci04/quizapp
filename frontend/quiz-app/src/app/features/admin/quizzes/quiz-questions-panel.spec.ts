import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { QuizDetail, QuizQuestionItem } from '../../../core/models/quiz.models';
import { QuizQuestionsPanel } from './quiz-questions-panel';

registerLocaleData(localeVi);

const item = (questionId: number, order: number, extra: Partial<QuizQuestionItem> = {}): QuizQuestionItem => ({
  quizQuestionId: questionId * 10,
  questionId,
  content: `Câu ${questionId}`,
  questionType: 'SingleChoice',
  category: null,
  difficulty: null,
  questionStatus: 'Active',
  displayOrder: order,
  scoreWeight: 1,
  ...extra,
});

const makeQuiz = (questions: QuizQuestionItem[]): QuizDetail => ({
  quizId: 4,
  title: 'Quiz',
  description: null,
  duration: 10,
  passingScore: 1,
  status: 'Draft',
  isPublic: false,
  createdAt: '2026-09-30T00:00:00Z',
  createdBy: 1,
  totalScoreWeight: questions.reduce((s, q) => s + q.scoreWeight, 0),
  questions,
});

interface Internals {
  move(i: number, delta: -1 | 1): void;
  onWeightChange(q: QuizQuestionItem, e: Event): void;
  remove(q: QuizQuestionItem): void;
  openPicker(): void;
  error(): string | null;
}

async function create(quiz: QuizDetail) {
  await TestBed.configureTestingModule({
    imports: [QuizQuestionsPanel],
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: LOCALE_ID, useValue: 'vi' }],
  }).compileComponents();

  const fixture: ComponentFixture<QuizQuestionsPanel> = TestBed.createComponent(QuizQuestionsPanel);
  fixture.componentRef.setInput('quiz', quiz);
  const changes: QuizDetail[] = [];
  fixture.componentInstance.changed.subscribe((q) => changes.push(q));
  fixture.detectChanges();
  return {
    fixture,
    changes,
    http: TestBed.inject(HttpTestingController),
    panel: fixture.componentInstance as unknown as Internals,
    text: () => (fixture.nativeElement as HTMLElement).textContent ?? '',
  };
}

const weightEvent = (value: string) => {
  const input = document.createElement('input');
  input.value = value;
  return { event: { target: input } as unknown as Event, input };
};

describe('QuizQuestionsPanel', () => {
  it('shows the empty state with the BR-07 hint', async () => {
    const { text } = await create(makeQuiz([]));

    expect(text()).toContain('cần ít nhất 1 câu hỏi');
  });

  it('warns about question types that cannot be graded yet', async () => {
    const { text } = await create(makeQuiz([item(1, 1), item(2, 2, { questionType: 'ShortAnswer' })]));

    expect(text()).toContain('1 câu thuộc loại chưa hỗ trợ chấm điểm');
  });

  it('reorders by sending the full list of question ids', async () => {
    const quiz = makeQuiz([item(1, 1), item(2, 2), item(3, 3)]);
    const { panel, http, changes } = await create(quiz);

    panel.move(1, -1);

    const req = http.expectOne('/api/quizzes/4/questions/order');
    expect(req.request.body).toEqual({ questionIds: [2, 1, 3] });
    const updated = makeQuiz([item(2, 1), item(1, 2), item(3, 3)]);
    req.flush(updated);
    expect(changes).toEqual([updated]);
  });

  it('does not move past the ends', async () => {
    const { panel, http } = await create(makeQuiz([item(1, 1), item(2, 2)]));

    panel.move(0, -1);
    panel.move(1, 1);

    http.expectNone(() => true);
  });

  it('saves a changed weight', async () => {
    const { panel, http } = await create(makeQuiz([item(1, 1)]));
    const { event } = weightEvent('2.5');

    panel.onWeightChange(item(1, 1), event);

    const req = http.expectOne('/api/quizzes/4/questions/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ scoreWeight: 2.5 });
  });

  it('rejects invalid weights locally and restores the input', async () => {
    const { panel, http } = await create(makeQuiz([item(1, 1)]));

    for (const bad of ['', '0', '-1', '1000', 'abc']) {
      const { event, input } = weightEvent(bad);
      panel.onWeightChange(item(1, 1), event);
      expect(input.value).toBe('1');
    }

    http.expectNone(() => true);
    expect(panel.error()).toContain('0.01');
  });

  it('ignores an unchanged weight', async () => {
    const { panel, http } = await create(makeQuiz([item(1, 1)]));

    panel.onWeightChange(item(1, 1), weightEvent('1').event);

    http.expectNone(() => true);
  });

  it('removes a question only after confirmation', async () => {
    const { panel, http } = await create(makeQuiz([item(1, 1), item(2, 2)]));
    const dialog = TestBed.inject(MatDialog);
    const open = vi.spyOn(dialog, 'open');

    open.mockReturnValueOnce({ afterClosed: () => of(false) } as never);
    panel.remove(item(1, 1));
    http.expectNone(() => true);

    open.mockReturnValueOnce({ afterClosed: () => of(true) } as never);
    panel.remove(item(1, 1));
    expect(http.expectOne('/api/quizzes/4/questions/1').request.method).toBe('DELETE');
  });

  it('shows the server message when the last question of a published quiz cannot be removed (BR-07)', async () => {
    const { panel, http, fixture } = await create(makeQuiz([item(1, 1)]));
    vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({ afterClosed: () => of(true) } as never);

    panel.remove(item(1, 1));
    http
      .expectOne('/api/quizzes/4/questions/1')
      .flush({ detail: 'Quiz đang Published phải còn ít nhất 1 câu hỏi.' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(panel.error()).toContain('Published phải còn ít nhất 1 câu hỏi');
  });

  it('adds picked questions one after another', async () => {
    const { panel, http, changes } = await create(makeQuiz([item(1, 1)]));
    vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({ afterClosed: () => of([2, 3]) } as never);

    panel.openPicker();

    const first = http.expectOne('/api/quizzes/4/questions');
    expect(first.request.body).toEqual({ questionId: 2 });
    // Câu thứ hai chỉ được gửi sau khi câu đầu xong.
    http.expectNone('/api/quizzes/4/questions');
    first.flush(makeQuiz([item(1, 1), item(2, 2)]));

    const second = http.expectOne('/api/quizzes/4/questions');
    expect(second.request.body).toEqual({ questionId: 3 });
    second.flush(makeQuiz([item(1, 1), item(2, 2), item(3, 3)]));

    expect(changes.length).toBe(2);
    expect(changes[1].questions.length).toBe(3);
  });

  it('stops adding at the first error and reports it', async () => {
    const { panel, http, changes } = await create(makeQuiz([item(1, 1)]));
    vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({ afterClosed: () => of([2, 3]) } as never);

    panel.openPicker();
    http
      .expectOne('/api/quizzes/4/questions')
      .flush({ detail: 'Câu hỏi đã có trong quiz này.' }, { status: 409, statusText: 'Conflict' });

    http.expectNone('/api/quizzes/4/questions');
    expect(changes.length).toBe(0);
    expect(panel.error()).toBe('Câu hỏi đã có trong quiz này.');
  });

  it('does nothing when the picker is cancelled', async () => {
    const { panel, http } = await create(makeQuiz([item(1, 1)]));
    vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({ afterClosed: () => of(undefined) } as never);

    panel.openPicker();

    http.expectNone(() => true);
  });
});
