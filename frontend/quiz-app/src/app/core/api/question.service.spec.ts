import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { QuestionRequest } from '../models/question.models';
import { confirmationMessage } from '../util/problem-details';
import { QuestionService } from './question.service';

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { service: TestBed.inject(QuestionService), http: TestBed.inject(HttpTestingController) };
}

const request: QuestionRequest = {
  content: 'Q',
  questionType: 'SingleChoice',
  category: null,
  difficulty: null,
  answers: [
    { answerText: 'a', isCorrect: true },
    { answerText: 'b', isCorrect: false },
  ],
};

describe('QuestionService', () => {
  it('drops empty filters from the list query', () => {
    const { service, http } = setup();

    service.list({ search: '', category: 'Math', difficulty: '', questionType: 'TrueFalse', status: '', page: 2, pageSize: 10 }).subscribe();

    const params = http.expectOne((r) => r.url === '/api/questions').request.params;
    expect(params.keys().sort()).toEqual(['category', 'page', 'pageSize', 'questionType']);
    expect(params.get('category')).toBe('Math');
  });

  it('sends confirm=true when updating a question used by quizzes', () => {
    const { service, http } = setup();

    service.update(4, request, true).subscribe();

    const req = http.expectOne((r) => r.url === '/api/questions/4');
    expect(req.request.method).toBe('PUT');
    expect(req.request.params.get('confirm')).toBe('true');
    expect(req.request.body).toEqual(request);
  });

  it('maps 204 to a Deleted outcome', () => {
    const { service, http } = setup();
    let outcome = '';

    service.delete(1).subscribe((r) => (outcome = r.outcome));
    http.expectOne((r) => r.url === '/api/questions/1').flush(null, { status: 204, statusText: 'No Content' });

    expect(outcome).toBe('Deleted');
  });

  it('passes through the Archived outcome (BR-13)', () => {
    const { service, http } = setup();
    let outcome = '';

    service.delete(1).subscribe((r) => (outcome = r.outcome));
    http.expectOne((r) => r.url === '/api/questions/1').flush({ outcome: 'Archived', message: 'đã archive' });

    expect(outcome).toBe('Archived');
  });

  it('uses the archive and restore endpoints', () => {
    const { service, http } = setup();

    service.setStatus(3, 'Archived').subscribe();
    expect(http.expectOne('/api/questions/3/archive').request.method).toBe('POST');

    service.setStatus(3, 'Active').subscribe();
    expect(http.expectOne('/api/questions/3/restore').request.method).toBe('POST');
  });
});

describe('confirmationMessage', () => {
  const conflict = (body: unknown, status = 409) =>
    new HttpErrorResponse({ status, statusText: 'Conflict', error: body });

  it('returns the warning when the API asks for confirmation', () => {
    expect(confirmationMessage(conflict({ requiresConfirmation: true, detail: 'Đang dùng trong 2 quiz' }))).toBe(
      'Đang dùng trong 2 quiz',
    );
  });

  it('returns null for other conflicts and other statuses', () => {
    expect(confirmationMessage(conflict({ detail: 'Đáp án đã có trong bài nộp' }))).toBeNull();
    expect(confirmationMessage(conflict({ requiresConfirmation: true, detail: 'x' }, 400))).toBeNull();
    expect(confirmationMessage(new Error('boom'))).toBeNull();
  });
});
