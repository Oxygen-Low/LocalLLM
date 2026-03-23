import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AdminService } from '../services/admin.service';

export const riskyAppsGuard: CanActivateFn = async () => {
  const adminService = inject(AdminService);
  const router = inject(Router);

  const response = await adminService.getRiskyAppsEnabled();
  if (response.success && response.riskyAppsEnabled === true) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
