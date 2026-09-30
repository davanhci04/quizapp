import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AttemptService } from './attempt.service';
import { CatalogService } from './catalog.service';

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { http: TestBed.inject(HttpTestingController) };
}

describe('AttemptService', () => {
  it('starts an attempt with the quiz id', () => {
    const { http } = setup();
    TestBed.inject(AttemptService).start(7).subscribe();

    const req = http.expectOne('/api/attempts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ quizId: 7 });
  });

  it('saves an answer, including a blank one', () => {
    const { http } = setup();
    const service = TestBed.inject(AttemptService);

    service.saveAnswer(3, 12, 45).subscribe();
    const first = http.expectOne('/api/attempts/3/answers/12');
    expect(first.request.method).toBe('PUT');
    expect(first.request.body).toEqual({ selectedAnswerId: 45 });

    service.saveAnswer(3, 12, null).subscribe();
    expect(http.expectOne('/api/attempts/3/answers/12').request.body).toEqual({ selectedAnswerId: null });
  });

  it('submits and lists with paging params', () => {
    const { http } = setup();
    const service = TestBed.inject(AttemptService);

    service.submit(3).subscribe();
    expect(http.expectOne('/api/attempts/3/submit').request.method).toBe('POST');

    service.list(2, 10).subscribe();
    const list = http.expectOne((r) => r.url === '/api/attempts');
    expect(list.request.params.get('page')).toBe('2');
    expect(list.request.params.get('pageSize')).toBe('10');
  });
});

describe('CatalogService', () => {
  it('omits empty search terms', () => {
    const { http } = setup();
    TestBed.inject(CatalogService).list({ search: '', page: 1, pageSize: 9 }).subscribe();

    const req = http.expectOne((r) => r.url === '/api/catalog/quizzes');
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.get('page')).toBe('1');
  });

  it('sends the search term when present', () => {
    const { http } = setup();
    TestBed.inject(CatalogService).list({ search: 'angular' }).subscribe();

    expect(http.expectOne((r) => r.url === '/api/catalog/quizzes').request.params.get('search')).toBe('angular');
  });

  it('gets a quiz by id', () => {
    const { http } = setup();
    TestBed.inject(CatalogService).get(5).subscribe();

    expect(http.expectOne('/api/catalog/quizzes/5').request.method).toBe('GET');
  });
});
