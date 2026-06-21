import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const AUTH_WRITE_ENDPOINTS = ['/api/auth/login', '/api/auth/register'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.token();
  const shouldSkipToken = AUTH_WRITE_ENDPOINTS.some((url) => request.url.endsWith(url));
  const authenticatedRequest = token && !shouldSkipToken
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error) => {
      if (error.status === 401 && !shouldSkipToken) {
        authService.clearSession();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    })
  );
};
