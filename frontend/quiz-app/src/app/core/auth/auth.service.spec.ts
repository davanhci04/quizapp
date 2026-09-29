import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthResponse } from '../models/auth.models';
import { AuthService } from './auth.service';

const STORAGE_KEY = 'quizapp.auth';

function response(role: 'Admin' | 'User', expiresInMs = 60_000): AuthResponse {
  return {
    token: 'jwt-token',
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    user: { userId: 1, username: 'alice', email: 'alice@example.com', role },
  };
}

function setup(): { service: AuthService; http: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  return { service: TestBed.inject(AuthService), http: TestBed.inject(HttpTestingController) };
}

describe('AuthService', () => {
  beforeEach(() => localStorage.clear());

  it('starts logged out', () => {
    const { service } = setup();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
    expect(service.token()).toBeNull();
  });

  it('stores the session after login', () => {
    const { service, http } = setup();

    service.login({ usernameOrEmail: 'alice', password: 'abc12345' }).subscribe();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(response('User'));

    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe('jwt-token');
    expect(service.user()?.username).toBe('alice');
    expect(service.isAdmin()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toContain('jwt-token');
  });

  it('logs in immediately after register', () => {
    const { service, http } = setup();

    service.register({ username: 'alice', email: 'alice@example.com', password: 'abc12345' }).subscribe();
    http.expectOne('/api/auth/register').flush(response('User'));

    expect(service.isAuthenticated()).toBe(true);
  });

  it('recognises admins', () => {
    const { service, http } = setup();

    service.login({ usernameOrEmail: 'root', password: 'abc12345' }).subscribe();
    http.expectOne('/api/auth/login').flush(response('Admin'));

    expect(service.isAdmin()).toBe(true);
  });

  it('clears the session on logout', () => {
    const { service, http } = setup();
    service.login({ usernameOrEmail: 'alice', password: 'abc12345' }).subscribe();
    http.expectOne('/api/auth/login').flush(response('User'));

    service.logout(null);

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('restores a valid stored session', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(response('User')));
    const { service } = setup();

    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()?.email).toBe('alice@example.com');
  });

  it('drops an expired stored session', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(response('User', -1000)));
    const { service } = setup();

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('ignores corrupted stored data', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const { service } = setup();

    expect(service.isAuthenticated()).toBe(false);
  });
});
