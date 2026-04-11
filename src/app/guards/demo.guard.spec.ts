import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { demoGuard } from './demo.guard';
import { AdminService } from '../services/admin.service';
import { signal } from '@angular/core';

describe('demoGuard', () => {
  let router: Router;
  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  function setup(isDemoMode: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AdminService,
          useValue: {
            demoMode: signal(isDemoMode),
          },
        },
      ],
    });
    router = TestBed.inject(Router);
  }

  it('should allow navigation when not in demo mode', () => {
    setup(false);
    const result = TestBed.runInInjectionContext(() => demoGuard(mockRoute, mockState));
    expect(result).toBe(true);
  });

  it('should redirect to /dashboard when in demo mode', () => {
    setup(true);
    const result = TestBed.runInInjectionContext(() => demoGuard(mockRoute, mockState));
    expect(result).toEqual(router.createUrlTree(['/dashboard']));
  });
});
