import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const http = inject(HttpClient);

  if (authService.isAuthenticated()) {
    return true;
  }

  // In demo mode, auto-login without redirecting to the login page
  try {
    const resp = await firstValueFrom(
      http.get<{ success: boolean; demoMode: boolean }>(`${environment.apiUrl}/api/settings/demo`)
    );
    if (resp.demoMode) {
      const result = await authService.demoLogin();
      if (result.success) {
        return true;
      }
    }
  } catch {
    // Server not reachable – fall through to login redirect
  }

  return router.createUrlTree(['/login']);
};
