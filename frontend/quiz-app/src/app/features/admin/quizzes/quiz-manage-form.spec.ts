import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { QuizDetail } from '../../../core/models/quiz.models';
import { QuizManageForm } from './quiz-manage-form';

registerLocaleData(localeVi);

interface Internals {
  form: { invalid: boolean; patchValue(v: object): void; getRawValue(): Record<string, unknown> };
  statusControl: { value: string };
  save(): void;
  applyStatus(): void;
}

const quiz: QuizDetail = {
  quizId: 6,
  title: 'Quiz cũ',
  description: 'Mô tả',
  duration: 20,
  passingScore: 3,
  status: 'Draft',
  isPublic: true,
  createdAt: '2026-09-30T00:00:00Z',
  createdBy: 1,
  totalScoreWeight: 5,
  questions: [],
};

async function create(id?: number) {
  await TestBed.configureTestingModule({
    imports: [QuizManageForm],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: LOCALE_ID, useValue: 'vi' },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(QuizManageForm);
  if (id !== undefined) fixture.componentRef.setInput('id', id);
  fixture.detectChanges();
  return {
    fixture,
    http: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
    c: fixture.componentInstance as unknown as Internals,
    text: () => (fixture.nativeElement as HTMLElement).textContent ?? '',
  };
}

describe('QuizManageForm (create)', () => {
  it('rejects a blank title and out-of-range numbers', async () => {
    const { c } = await create();

    c.form.patchValue({ title: '   ' });
    expect(c.form.invalid).toBe(true);

    c.form.patchValue({ title: 'Ok', duration: 0 });
    expect(c.form.invalid).toBe(true);

    c.form.patchValue({ duration: 10, passingScore: 1.234 });
    expect(c.form.invalid).toBe(true);

    c.form.patchValue({ passingScore: 1.25 });
    expect(c.form.invalid).toBe(false);
  });

  it('does not call the API while invalid', async () => {
    const { c, http } = await create();

    c.save();

    http.expectNone('/api/quizzes');
  });

  it('creates a draft quiz and opens its edit page to add questions', async () => {
    const { c, http, router } = await create();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    c.form.patchValue({ title: '  Quiz mới ', description: '', duration: 30, passingScore: 2, isPublic: true });

    c.save();

    const req = http.expectOne('/api/quizzes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Quiz mới', description: null, duration: 30, passingScore: 2, isPublic: true });
    req.flush({ ...quiz, quizId: 12 });
    expect(navigate).toHaveBeenCalledWith(['/admin/quizzes', 12, 'edit']);
  });
});

describe('QuizManageForm (edit)', () => {
  it('loads the quiz into the form', async () => {
    const { c, http, fixture } = await create(6);
    http.expectOne('/api/quizzes/6').flush(quiz);
    fixture.detectChanges();

    expect(c.form.getRawValue()).toMatchObject({ title: 'Quiz cũ', duration: 20, passingScore: 3, isPublic: true });
    expect(c.statusControl.value).toBe('Draft');
  });

  it('shows the BR-07 error and reverts the status when publishing an empty quiz', async () => {
    const { c, http, fixture, text } = await create(6);
    http.expectOne('/api/quizzes/6').flush(quiz);
    (c.statusControl as unknown as { setValue(v: string): void }).setValue('Published');

    c.applyStatus();
    const req = http.expectOne('/api/quizzes/6/status');
    expect(req.request.body).toEqual({ status: 'Published' });
    req.flush({ detail: 'Quiz phải có ít nhất 1 câu hỏi mới được chuyển sang Published.' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(text()).toContain('ít nhất 1 câu hỏi');
    expect(c.statusControl.value).toBe('Draft');
  });

  it('does not call the API when the status is unchanged', async () => {
    const { c, http } = await create(6);
    http.expectOne('/api/quizzes/6').flush(quiz);

    c.applyStatus();

    http.expectNone('/api/quizzes/6/status');
  });

  it('warns when the passing score exceeds the maximum total score', async () => {
    const { c, http, fixture, text } = await create(6);
    http.expectOne('/api/quizzes/6').flush({
      ...quiz,
      questions: [{ quizQuestionId: 1, questionId: 1, content: 'C', questionType: 'SingleChoice', category: null, difficulty: null, questionStatus: 'Active', displayOrder: 1, scoreWeight: 5 }],
    });
    fixture.detectChanges();
    expect(text()).not.toContain('không ai đạt được');

    c.form.patchValue({ passingScore: 10 });
    fixture.detectChanges();

    expect(text()).toContain('không ai đạt được');
  });
});
