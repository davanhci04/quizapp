import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { QuestionListItem } from '../../../core/models/question.models';
import { QuestionPickerDialog } from './question-picker-dialog';

const row = (questionId: number, extra: Partial<QuestionListItem> = {}): QuestionListItem => ({
  questionId,
  content: `Câu ${questionId}`,
  questionType: 'SingleChoice',
  category: null,
  difficulty: null,
  status: 'Active',
  createdAt: '2026-09-30T00:00:00Z',
  answerCount: 2,
  quizCount: 0,
  ...extra,
});

interface Internals {
  toggle(item: QuestionListItem, checked: boolean): void;
  add(): void;
  selected(): ReadonlySet<number>;
}

async function create(excludeIds: number[]) {
  const close = vi.fn();
  await TestBed.configureTestingModule({
    imports: [QuestionPickerDialog],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MAT_DIALOG_DATA, useValue: { excludeIds } },
      { provide: MatDialogRef, useValue: { close } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(QuestionPickerDialog);
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  return {
    fixture,
    close,
    http,
    c: fixture.componentInstance as unknown as Internals,
    text: () => (fixture.nativeElement as HTMLElement).textContent ?? '',
  };
}

describe('QuestionPickerDialog', () => {
  it('only lists active questions', async () => {
    const { http } = await create([]);

    const req = http.expectOne((r) => r.url === '/api/questions');
    expect(req.request.params.get('status')).toBe('Active');
    req.flush({ items: [], page: 1, pageSize: 8, totalCount: 0 });
  });

  it('marks questions already in the quiz and hints at ungradable types', async () => {
    const { http, fixture, text } = await create([1]);
    http.expectOne((r) => r.url === '/api/questions').flush({
      items: [row(1), row(2, { questionType: 'LongAnswer' })],
      page: 1,
      pageSize: 8,
      totalCount: 2,
    });
    fixture.detectChanges();

    expect(text()).toContain('đã có trong quiz');
    expect(text()).toContain('chưa hỗ trợ chấm điểm');
  });

  it('closes with the ids of the selected questions', async () => {
    const { http, c, close } = await create([]);
    http.expectOne((r) => r.url === '/api/questions').flush({ items: [row(1), row(2), row(3)], page: 1, pageSize: 8, totalCount: 3 });

    c.toggle(row(3), true);
    c.toggle(row(1), true);
    c.toggle(row(1), false);
    c.add();

    expect(close).toHaveBeenCalledWith([3]);
  });
});
