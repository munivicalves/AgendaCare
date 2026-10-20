import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from './auth.config';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const base = new URL(inject(API_BASE_URL), document.baseURI);
  let target: URL;
  try {
    target = new URL(request.url, document.baseURI);
  } catch {
    return next(request);
  }
  const prefix = base.pathname.replace(/\/$/, '');
  const api =
    target.origin === base.origin &&
    (target.pathname === prefix || target.pathname.startsWith(prefix + '/'));
  const publico =
    target.pathname === prefix + '/auth/login' || target.pathname === prefix + '/auth/register';
  if (!api || publico) return next(request);
  const token = auth.tokenAtual();
  const authenticated = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` }, redirect: 'error' })
    : request;
  return next(authenticated).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token) auth.expirar(token);
      return throwError(() => error);
    }),
  );
};
