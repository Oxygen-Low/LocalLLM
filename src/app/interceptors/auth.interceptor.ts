import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * SOC2 CC6.1 – HTTP interceptor that:
 * 1. Attaches the server-issued session token to outgoing requests.
 * 2. Handles 401 Unauthorized errors by logging out the user.
 * 3. Verifies X-Server-Instance-ID to detect server reinstalls/restarts.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getSessionToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
  }

  return next(authReq).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const serverId = event.headers.get('X-Server-Instance-ID');
        if (serverId && authService.isAuthenticated()) {
          const sessionServerId = authService.getSessionServerId();
          // If the server session doesn't have an instance ID, or it doesn't match,
          // the session is either legacy or from a different server instance.
          if (!sessionServerId || serverId !== sessionServerId) {
            authService.logout();
            router.navigate(['/login']);
          }
        }
      }
    }),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401 && authService.isAuthenticated()) {
          authService.logout();
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
