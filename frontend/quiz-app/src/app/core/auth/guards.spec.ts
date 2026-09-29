import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './guards';

const STORAGE_KEY = 'quizapp.auth';

function signInAs(role: 'Admin' | 'User'): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      token: 't',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { userId: 1, username: 'u', email: 'u@example.com', role },
    }),
  );
}

function run(guard: typeof authGuard, url = '/protected') {
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
}

describe('route guards', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  const toString = (result: unknown) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  it('authGuard sends guests to login with the return url', () => {
    expect(toString(run(authGuard, '/attempts/3'))).toBe('/login?returnUrl=%2Fattempts%2F3');
  });

  it('authGuard lets signed-in users through', () => {
    signInAs('User');
    expect(run(authGuard)).toBe(true);
  });

  it('adminGuard sends guests to login', () => {
    expect(toString(run(adminGuard, '/admin'))).toBe('/login?returnUrl=%2Fadmin');
  });

  it('adminGuard sends normal users home', () => {
    signInAs('User');
    expect(toString(run(adminGuard, '/admin'))).toBe('/');
  });

  it('adminGuard lets admins through', () => {
    signInAs('Admin');
    expect(run(adminGuard, '/admin')).toBe(true);
  });

  it('guestGuard lets guests through', () => {
    expect(run(guestGuard)).toBe(true);
  });

  it('guestGuard sends signed-in users home', () => {
    signInAs('User');
    expect(toString(run(guestGuard))).toBe('/');
  });
});
