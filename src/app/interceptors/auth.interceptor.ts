import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * SOC2 CC6.1 – HTTP interceptor that attaches the server-issued session token
 * to every outgoing API request as an Authorization: Bearer header.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getSessionToken();

  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
    return next(authReq);
  }

  return next(req);
};
