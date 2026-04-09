import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

describe('adminGuard', () => {
  let router: Router;
  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  function setup(isAuthenticated: boolean, isAdmin: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => isAuthenticated,
            isAdmin: () => isAdmin,
          },
        },
      ],
    });
    router = TestBed.inject(Router);
  }

  it('should allow navigation when user is authenticated and admin', () => {
    setup(true, true);
    const result = TestBed.runInInjectionContext(() => adminGuard(mockRoute, mockState));
    expect(result).toBe(true);
  });

  it('should redirect to /dashboard when user is authenticated but not admin', () => {
    setup(true, false);
    const result = TestBed.runInInjectionContext(() => adminGuard(mockRoute, mockState));
    expect(result).toEqual(router.createUrlTree(['/dashboard']));
  });

  it('should redirect to /dashboard when user is not authenticated', () => {
    setup(false, false);
    const result = TestBed.runInInjectionContext(() => adminGuard(mockRoute, mockState));
    expect(result).toEqual(router.createUrlTree(['/dashboard']));
  });

  it('should redirect to /dashboard when user is admin but not authenticated', () => {
    setup(false, true);
    const result = TestBed.runInInjectionContext(() => adminGuard(mockRoute, mockState));
    expect(result).toEqual(router.createUrlTree(['/dashboard']));
  });
});
