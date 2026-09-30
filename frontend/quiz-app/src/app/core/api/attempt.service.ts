import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Attempt, AttemptListItem } from '../models/attempt.models';
import { PagedResult } from '../models/common.models';
import { toParams } from '../util/http-params';

@Injectable({ providedIn: 'root' })
export class AttemptService {
  private readonly http = inject(HttpClient);

  /** Bắt đầu làm bài; nếu đang có bài dở dang của quiz này thì server trả lại bài đó. */
  start(quizId: number): Observable<Attempt> {
    return this.http.post<Attempt>('/api/attempts', { quizId });
  }

  list(page = 1, pageSize = 10): Observable<PagedResult<AttemptListItem>> {
    return this.http.get<PagedResult<AttemptListItem>>('/api/attempts', { params: toParams({ page, pageSize }) });
  }

  get(id: number): Observable<Attempt> {
    return this.http.get<Attempt>(`/api/attempts/${id}`);
  }

  /** Lưu đáp án một câu; `null` nghĩa là bỏ trống. */
  saveAnswer(attemptId: number, questionId: number, selectedAnswerId: number | null): Observable<void> {
    return this.http.put<void>(`/api/attempts/${attemptId}/answers/${questionId}`, { selectedAnswerId });
  }

  submit(id: number): Observable<Attempt> {
    return this.http.post<Attempt>(`/api/attempts/${id}/submit`, {});
  }
}
