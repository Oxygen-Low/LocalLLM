import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AdminService } from '../services/admin.service';

export const demoGuard: CanActivateFn = () => {
  const adminService = inject(AdminService);
  const router = inject(Router);

  if (adminService.demoMode()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
