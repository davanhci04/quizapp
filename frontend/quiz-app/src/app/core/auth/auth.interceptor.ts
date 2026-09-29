import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const isApi = (url: string) => url.startsWith('/api/');
// Đăng nhập/đăng ký trả 401 khi sai thông tin: không coi đó là phiên hết hạn.
const isCredentialCall = (url: string) => url.startsWith('/api/auth/login') || url.startsWith('/api/auth/register');

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.token();
  const request = token && isApi(req.url) ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      // Token hết hạn hoặc không hợp lệ: xóa phiên và đưa về trang đăng nhập.
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApi(req.url) &&
        !isCredentialCall(req.url) &&
        auth.isAuthenticated()
      ) {
        auth.logout(null);
        void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    }),
  );
};
