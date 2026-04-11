import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let router: Router;
  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  function setup(isAuthenticated: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => isAuthenticated,
            checkAndLoginDemo: async () => false,
          },
        },
      ],
    });
    router = TestBed.inject(Router);
  }

  it('should allow navigation when user is authenticated', async () => {
    setup(true);
    const result = await TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(result).toBe(true);
  });

  it('should redirect to /login when user is not authenticated', async () => {
    setup(false);
    const result = await TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(result).toEqual(router.createUrlTree(['/login']));
  });
});
