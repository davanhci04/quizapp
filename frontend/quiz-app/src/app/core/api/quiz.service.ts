import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResult } from '../models/common.models';
import {
  AddQuizQuestionRequest,
  QuizDetail,
  QuizListItem,
  QuizQuery,
  QuizRequest,
  QuizStatus,
  UpdateQuizQuestionRequest,
} from '../models/quiz.models';
import { toParams } from '../util/http-params';

/** API quản lý quiz dành cho Admin. */
@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/quizzes';

  list(query: QuizQuery = {}): Observable<PagedResult<QuizListItem>> {
    return this.http.get<PagedResult<QuizListItem>>(this.base, { params: toParams({ ...query }) });
  }

  get(id: number): Observable<QuizDetail> {
    return this.http.get<QuizDetail>(`${this.base}/${id}`);
  }

  create(request: QuizRequest): Observable<QuizDetail> {
    return this.http.post<QuizDetail>(this.base, request);
  }

  update(id: number, request: QuizRequest): Observable<QuizDetail> {
    return this.http.put<QuizDetail>(`${this.base}/${id}`, request);
  }

  /** Published yêu cầu quiz có ít nhất 1 câu hỏi (BR-07). */
  setStatus(id: number, status: QuizStatus): Observable<QuizDetail> {
    return this.http.put<QuizDetail>(`${this.base}/${id}/status`, { status });
  }

  /** Xóa quiz và liên kết câu hỏi, giữ nguyên câu hỏi trong ngân hàng (BR-14). Quiz đã có bài làm trả 409. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  addQuestion(quizId: number, request: AddQuizQuestionRequest): Observable<QuizDetail> {
    return this.http.post<QuizDetail>(`${this.base}/${quizId}/questions`, request);
  }

  updateQuestion(quizId: number, questionId: number, request: UpdateQuizQuestionRequest): Observable<QuizDetail> {
    return this.http.put<QuizDetail>(`${this.base}/${quizId}/questions/${questionId}`, request);
  }

  removeQuestion(quizId: number, questionId: number): Observable<QuizDetail> {
    return this.http.delete<QuizDetail>(`${this.base}/${quizId}/questions/${questionId}`);
  }

  /** `questionIds` phải là toàn bộ câu hỏi hiện có của quiz theo thứ tự mới. */
  reorder(quizId: number, questionIds: number[]): Observable<QuizDetail> {
    return this.http.put<QuizDetail>(`${this.base}/${quizId}/questions/order`, { questionIds });
  }
}
