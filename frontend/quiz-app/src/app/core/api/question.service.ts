import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PagedResult } from '../models/common.models';
import {
  DeleteQuestionResult,
  QuestionDetail,
  QuestionListItem,
  QuestionQuery,
  QuestionRequest,
  QuestionStatus,
} from '../models/question.models';
import { toParams } from '../util/http-params';

@Injectable({ providedIn: 'root' })
export class QuestionService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/questions';

  list(query: QuestionQuery = {}): Observable<PagedResult<QuestionListItem>> {
    return this.http.get<PagedResult<QuestionListItem>>(this.base, { params: toParams({ ...query }) });
  }

  get(id: number): Observable<QuestionDetail> {
    return this.http.get<QuestionDetail>(`${this.base}/${id}`);
  }

  create(request: QuestionRequest): Observable<QuestionDetail> {
    return this.http.post<QuestionDetail>(this.base, request);
  }

  /** `confirm` phải là true khi câu hỏi đang được quiz sử dụng (BR-12). */
  update(id: number, request: QuestionRequest, confirm = false): Observable<QuestionDetail> {
    return this.http.put<QuestionDetail>(`${this.base}/${id}`, request, { params: toParams({ confirm }) });
  }

  /** 204 => đã xóa; 200 => backend archive thay vì xóa vì câu hỏi đã có trong bài nộp (BR-13). */
  delete(id: number, confirm = false): Observable<DeleteQuestionResult> {
    return this.http
      .delete<DeleteQuestionResult | null>(`${this.base}/${id}`, { params: toParams({ confirm }), observe: 'response' })
      .pipe(map((r) => r.body ?? { outcome: 'Deleted', message: 'Đã xóa câu hỏi.' }));
  }

  setStatus(id: number, status: QuestionStatus): Observable<QuestionDetail> {
    const action = status === 'Archived' ? 'archive' : 'restore';
    return this.http.post<QuestionDetail>(`${this.base}/${id}/${action}`, {});
  }
}
