import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, UserInfo } from '../models/auth.models';

const STORAGE_KEY = 'quizapp.auth';

interface StoredAuth {
  token: string;
  expiresAt: string;
  user: UserInfo;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly session = signal<StoredAuth | null>(this.load());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'Admin');

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', request).pipe(tap((r) => this.start(r)));
  }

  /** Đăng ký thành công thì đăng nhập luôn (API trả token như khi đăng nhập). */
  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', request).pipe(tap((r) => this.start(r)));
  }

  logout(redirectTo: string | null = '/'): void {
    this.session.set(null);
    this.write(null);
    if (redirectTo) void this.router.navigateByUrl(redirectTo);
  }

  private start(response: AuthResponse): void {
    const stored: StoredAuth = { token: response.token, expiresAt: response.expiresAt, user: response.user };
    this.session.set(stored);
    this.write(stored);
  }

  /** Đọc phiên đã lưu; bỏ qua nếu hỏng hoặc token đã hết hạn. */
  private load(): StoredAuth | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const stored = JSON.parse(raw) as StoredAuth;
      if (!stored.token || !stored.user || Date.parse(stored.expiresAt) <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return stored;
    } catch {
      return null;
    }
  }

  private write(stored: StoredAuth | null): void {
    try {
      if (stored) localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage bị chặn (chế độ riêng tư...): phiên chỉ tồn tại trong bộ nhớ.
    }
  }
}
