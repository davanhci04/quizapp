import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthResponse } from '../models/auth.models';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
  });
  return {
    auth: TestBed.inject(AuthService),
    http: TestBed.inject(HttpClient),
    ctrl: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
  };
}

function signIn(auth: AuthService, ctrl: HttpTestingController) {
  auth.login({ usernameOrEmail: 'alice', password: 'abc12345' }).subscribe();
  const body: AuthResponse = {
    token: 'jwt-token',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    user: { userId: 1, username: 'alice', email: 'a@example.com', role: 'User' },
  };
  ctrl.expectOne('/api/auth/login').flush(body);
}

describe('authInterceptor', () => {
  beforeEach(() => localStorage.clear());

  it('does not add a header when logged out', () => {
    const { http, ctrl } = setup();

    http.get('/api/catalog/quizzes').subscribe();

    expect(ctrl.expectOne('/api/catalog/quizzes').request.headers.has('Authorization')).toBe(false);
  });

  it('adds the bearer token to API calls when logged in', () => {
    const { auth, http, ctrl } = setup();
    signIn(auth, ctrl);

    http.get('/api/attempts').subscribe();

    expect(ctrl.expectOne('/api/attempts').request.headers.get('Authorization')).toBe('Bearer jwt-token');
  });

  it('does not leak the token to other origins', () => {
    const { auth, http, ctrl } = setup();
    signIn(auth, ctrl);

    http.get('https://example.com/data').subscribe();

    expect(ctrl.expectOne('https://example.com/data').request.headers.has('Authorization')).toBe(false);
  });

  it('logs out and redirects to login on 401 from a protected call', () => {
    const { auth, http, ctrl, router } = setup();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    signIn(auth, ctrl);

    http.get('/api/attempts').subscribe({ error: () => undefined });
    ctrl.expectOne('/api/attempts').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.objectContaining({ queryParams: expect.anything() }));
  });

  it('keeps the session when a login call itself returns 401', () => {
    const { auth, http, ctrl } = setup();
    signIn(auth, ctrl);

    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    ctrl.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(true);
  });
});
