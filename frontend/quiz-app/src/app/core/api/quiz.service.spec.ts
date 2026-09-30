import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { QuizRequest } from '../models/quiz.models';
import { QuizService } from './quiz.service';

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { service: TestBed.inject(QuizService), http: TestBed.inject(HttpTestingController) };
}

const request: QuizRequest = { title: 'Quiz', description: null, duration: 15, passingScore: 2, isPublic: true };

describe('QuizService', () => {
  it('drops empty filters but keeps isPublic=false', () => {
    const { service, http } = setup();

    service.list({ search: '', status: 'Published', isPublic: false, page: 1, pageSize: 10 }).subscribe();

    const params = http.expectOne((r) => r.url === '/api/quizzes').request.params;
    expect(params.has('search')).toBe(false);
    expect(params.get('status')).toBe('Published');
    expect(params.get('isPublic')).toBe('false');
  });

  it('creates and updates quizzes', () => {
    const { service, http } = setup();

    service.create(request).subscribe();
    const create = http.expectOne('/api/quizzes');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(request);

    service.update(3, request).subscribe();
    expect(http.expectOne('/api/quizzes/3').request.method).toBe('PUT');
  });

  it('changes status through the dedicated endpoint', () => {
    const { service, http } = setup();

    service.setStatus(3, 'Published').subscribe();

    const req = http.expectOne('/api/quizzes/3/status');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'Published' });
  });

  it('manages quiz questions', () => {
    const { service, http } = setup();

    service.addQuestion(3, { questionId: 7 }).subscribe();
    const add = http.expectOne('/api/quizzes/3/questions');
    expect(add.request.method).toBe('POST');
    expect(add.request.body).toEqual({ questionId: 7 });

    service.updateQuestion(3, 7, { scoreWeight: 2.5 }).subscribe();
    const update = http.expectOne('/api/quizzes/3/questions/7');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ scoreWeight: 2.5 });

    service.removeQuestion(3, 7).subscribe();
    expect(http.expectOne('/api/quizzes/3/questions/7').request.method).toBe('DELETE');

    service.reorder(3, [9, 7, 8]).subscribe();
    const order = http.expectOne('/api/quizzes/3/questions/order');
    expect(order.request.method).toBe('PUT');
    expect(order.request.body).toEqual({ questionIds: [9, 7, 8] });
  });

  it('deletes a quiz', () => {
    const { service, http } = setup();

    service.delete(3).subscribe();

    expect(http.expectOne('/api/quizzes/3').request.method).toBe('DELETE');
  });
});
