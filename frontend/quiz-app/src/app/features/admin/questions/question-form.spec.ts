import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { QuestionDetail } from '../../../core/models/question.models';
import { QuestionForm } from './question-form';

// Các thành viên protected được truy cập qua kiểu này trong test.
interface Internals {
  form: { invalid: boolean; patchValue(v: object): void };
  answers: { length: number; at(i: number): { controls: { isCorrect: { value: boolean }; answerText: { setValue(v: string): void; value: string } } }; hasError(code: string): boolean };
  addAnswer(text?: string, isCorrect?: boolean, id?: number | null): void;
  removeAnswer(i: number): void;
  move(i: number, delta: -1 | 1): void;
  setCorrect(i: number, checked: boolean): void;
  submit(confirm?: boolean): void;
}

const internals = (f: ComponentFixture<QuestionForm>) => f.componentInstance as unknown as Internals;

async function create(id?: number) {
  await TestBed.configureTestingModule({
    imports: [QuestionForm],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();

  const fixture = TestBed.createComponent(QuestionForm);
  if (id !== undefined) fixture.componentRef.setInput('id', id);
  fixture.detectChanges();
  return { fixture, http: TestBed.inject(HttpTestingController), router: TestBed.inject(Router) };
}

const detail: QuestionDetail = {
  questionId: 5,
  createdBy: 1,
  content: 'Nội dung cũ',
  questionType: 'SingleChoice',
  category: 'Toán',
  difficulty: 'Easy',
  status: 'Active',
  createdAt: '2026-09-29T09:00:00Z',
  quizCount: 2,
  answers: [
    { answerId: 51, answerText: 'B', isCorrect: false, displayOrder: 2 },
    { answerId: 50, answerText: 'A', isCorrect: true, displayOrder: 1 },
  ],
};

describe('QuestionForm (create)', () => {
  it('starts with two blank answers and is invalid', async () => {
    const { fixture } = await create();
    const c = internals(fixture);

    expect(c.answers.length).toBe(2);
    expect(c.form.invalid).toBe(true);
  });

  it('enforces BR-06: needs at least one correct answer', async () => {
    const { fixture } = await create();
    const c = internals(fixture);
    c.answers.at(0).controls.answerText.setValue('a');
    c.answers.at(1).controls.answerText.setValue('b');

    expect(c.answers.hasError('noCorrect')).toBe(true);

    c.setCorrect(1, true);
    expect(c.answers.hasError('noCorrect')).toBe(false);
  });

  it('keeps a single correct answer for single-choice questions', async () => {
    const { fixture } = await create();
    const c = internals(fixture);

    c.setCorrect(0, true);
    c.setCorrect(1, true);

    expect(c.answers.at(0).controls.isCorrect.value).toBe(false);
    expect(c.answers.at(1).controls.isCorrect.value).toBe(true);
  });

  it('never drops below two answers', async () => {
    const { fixture } = await create();
    const c = internals(fixture);

    c.removeAnswer(0);
    expect(c.answers.length).toBe(2);

    c.addAnswer('c');
    c.removeAnswer(2);
    expect(c.answers.length).toBe(2);
  });

  it('reorders answers', async () => {
    const { fixture } = await create();
    const c = internals(fixture);
    c.answers.at(0).controls.answerText.setValue('first');
    c.answers.at(1).controls.answerText.setValue('second');

    c.move(0, 1);

    expect(c.answers.at(0).controls.answerText.value).toBe('second');
    expect(c.answers.at(1).controls.answerText.value).toBe('first');
  });

  it('does not call the API while the form is invalid', async () => {
    const { fixture, http } = await create();

    internals(fixture).submit();

    http.expectNone('/api/questions');
  });

  it('posts a trimmed request and returns to the list', async () => {
    const { fixture, http, router } = await create();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const c = internals(fixture);
    c.form.patchValue({ content: '  Câu mới  ', category: ' Toán ' });
    c.answers.at(0).controls.answerText.setValue(' Một ');
    c.answers.at(1).controls.answerText.setValue('Hai');
    c.setCorrect(0, true);

    c.submit();

    const req = http.expectOne('/api/questions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      content: 'Câu mới',
      questionType: 'SingleChoice',
      category: 'Toán',
      difficulty: null,
      answers: [
        { answerText: 'Một', isCorrect: true },
        { answerText: 'Hai', isCorrect: false },
      ],
    });
    req.flush({ ...detail, questionId: 9 });
    expect(navigate).toHaveBeenCalledWith(['/admin/questions']);
  });
});

describe('QuestionForm (edit)', () => {
  it('loads the question with answers in display order and keeps their ids', async () => {
    const { fixture, http } = await create(5);
    http.expectOne('/api/questions/5').flush(detail);
    fixture.detectChanges();
    const c = internals(fixture);

    expect(c.answers.length).toBe(2);
    expect(c.answers.at(0).controls.answerText.value).toBe('A');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('đang được dùng trong 2 quiz');
  });

  it('asks for confirmation on 409 and resubmits with confirm=true (BR-12)', async () => {
    const { fixture, http } = await create(5);
    http.expectOne('/api/questions/5').flush(detail);
    const dialog = TestBed.inject(MatDialog);
    const open = vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(true) } as never);

    internals(fixture).submit();

    const first = http.expectOne((r) => r.url === '/api/questions/5' && r.method === 'PUT');
    expect(first.request.params.get('confirm')).toBe('false');
    expect(first.request.body.answers.map((a: { answerId?: number }) => a.answerId)).toEqual([50, 51]);
    first.flush(
      { detail: 'Đang dùng trong 2 quiz', requiresConfirmation: true, quizCount: 2 },
      { status: 409, statusText: 'Conflict' },
    );

    expect(open).toHaveBeenCalledTimes(1);
    const second = http.expectOne((r) => r.url === '/api/questions/5' && r.method === 'PUT');
    expect(second.request.params.get('confirm')).toBe('true');
  });

  it('does not resubmit when the admin declines the warning', async () => {
    const { fixture, http } = await create(5);
    http.expectOne('/api/questions/5').flush(detail);
    const dialog = TestBed.inject(MatDialog);
    vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(false) } as never);

    internals(fixture).submit();
    http
      .expectOne((r) => r.method === 'PUT')
      .flush({ detail: 'Đang dùng', requiresConfirmation: true }, { status: 409, statusText: 'Conflict' });

    http.expectNone((r) => r.method === 'PUT');
  });

  it('shows the server message for other conflicts', async () => {
    const { fixture, http } = await create(5);
    http.expectOne('/api/questions/5').flush(detail);

    internals(fixture).submit();
    http
      .expectOne((r) => r.method === 'PUT')
      .flush({ detail: 'Có đáp án đã được chọn trong bài nộp' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Có đáp án đã được chọn trong bài nộp');
  });
});
