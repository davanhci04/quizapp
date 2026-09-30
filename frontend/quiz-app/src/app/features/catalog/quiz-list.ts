import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { CatalogQuery, CatalogService } from '../../core/api/catalog.service';
import { CatalogQuiz } from '../../core/models/catalog.models';
import { errorMessage } from '../../core/util/problem-details';
import { ViPaginatorIntl } from '../../shared/vi-paginator-intl';

const PAGE_SIZE = 9;

@Component({
  selector: 'app-quiz-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  providers: [{ provide: MatPaginatorIntl, useClass: ViPaginatorIntl }],
  templateUrl: './quiz-list.html',
  styleUrl: './quiz-list.scss',
})
export class QuizList {
  private readonly catalog = inject(CatalogService);

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly quizzes = signal<CatalogQuiz[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pageSize = PAGE_SIZE;

  /** Mỗi lần đổi trang/từ khóa đẩy vào đây; switchMap hủy request cũ nên không bị kết quả về sai thứ tự. */
  private readonly requests = new Subject<CatalogQuery>();

  constructor() {
    this.requests
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((query) =>
          this.catalog.list(query).pipe(
            catchError((e: unknown) => {
              this.error.set(errorMessage(e));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((result) => {
        if (result) {
          this.quizzes.set(result.items);
          this.totalCount.set(result.totalCount);
        }
        this.loading.set(false);
      });

    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.pageIndex.set(0);
        this.load();
      });

    this.load();
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.load();
  }

  protected reload(): void {
    this.load();
  }

  private load(): void {
    this.requests.next({ search: this.search.value.trim(), page: this.pageIndex() + 1, pageSize: PAGE_SIZE });
  }
}
