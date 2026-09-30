import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CatalogQuiz } from '../models/catalog.models';
import { PagedResult } from '../models/common.models';
import { toParams } from '../util/http-params';

export interface CatalogQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  list(query: CatalogQuery = {}): Observable<PagedResult<CatalogQuiz>> {
    return this.http.get<PagedResult<CatalogQuiz>>('/api/catalog/quizzes', { params: toParams({ ...query }) });
  }

  get(id: number): Observable<CatalogQuiz> {
    return this.http.get<CatalogQuiz>(`/api/catalog/quizzes/${id}`);
  }
}
