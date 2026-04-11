import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let router: Router;
  let httpMock: HttpTestingController;
  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  function setup(isAuthenticated: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => isAuthenticated,
            demoLogin: async () => ({ success: false }),
          },
        },
      ],
    });
    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
  }

  it('should allow navigation when user is authenticated', async () => {
    setup(true);
    const result = await TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(result).toBe(true);
  });

  it('should redirect to /login when user is not authenticated', async () => {
    setup(false);
    const resultPromise = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    const req = httpMock.expectOne('/api/settings/demo');
    req.flush({ success: true, demoMode: false });
    const result = await resultPromise;
    expect(result).toEqual(router.createUrlTree(['/login']));
  });
});
