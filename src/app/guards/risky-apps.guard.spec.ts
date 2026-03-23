import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { riskyAppsGuard } from './risky-apps.guard';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';
import { SecurityLoggerService } from '../services/security-logger.service';

describe('riskyAppsGuard', () => {
  let router: Router;
  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  const mockAuthService = {
    isAuthenticated: () => true,
    isAdmin: () => false,
    username: () => 'testuser',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminService,
        SecurityLoggerService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('allows navigation when risky apps are enabled', async () => {
    const adminService = TestBed.inject(AdminService);
    vi.spyOn(adminService, 'getRiskyAppsEnabled').mockResolvedValue({ success: true, riskyAppsEnabled: true });

    const result = await TestBed.runInInjectionContext(() => riskyAppsGuard(mockRoute, mockState));
    expect(result).toBe(true);
  });

  it('redirects to /dashboard when risky apps are disabled', async () => {
    const adminService = TestBed.inject(AdminService);
    vi.spyOn(adminService, 'getRiskyAppsEnabled').mockResolvedValue({ success: true, riskyAppsEnabled: false });

    const result = await TestBed.runInInjectionContext(() => riskyAppsGuard(mockRoute, mockState));
    expect(result).toEqual(router.createUrlTree(['/dashboard']));
  });

  it('redirects to /dashboard when settings fetch fails', async () => {
    const adminService = TestBed.inject(AdminService);
    vi.spyOn(adminService, 'getRiskyAppsEnabled').mockResolvedValue({ success: false });

    const result = await TestBed.runInInjectionContext(() => riskyAppsGuard(mockRoute, mockState));
    expect(result).toEqual(router.createUrlTree(['/dashboard']));
  });
});
