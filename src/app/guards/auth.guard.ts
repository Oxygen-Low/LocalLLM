import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // In demo mode, auto-login without redirecting to the login page
  if (await authService.checkAndLoginDemo()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
