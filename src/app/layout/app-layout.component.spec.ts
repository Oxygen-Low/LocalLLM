import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppLayoutComponent } from './app-layout.component';
import { AuthService } from '../services/auth.service';
import { SecurityLoggerService } from '../services/security-logger.service';

describe('AppLayoutComponent', () => {
  function setup(authState: { isAuthenticated: boolean; isAdmin: boolean; passwordResetRequired: boolean }) {
    TestBed.configureTestingModule({
      imports: [AppLayoutComponent, RouterModule.forRoot([])],
      providers: [
        SecurityLoggerService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => authState.isAuthenticated,
            isAdmin: () => authState.isAdmin,
            username: () => 'testuser',
            passwordResetRequired: () => authState.passwordResetRequired,
            logout: vi.fn(),
            getSessionToken: () => 'mock-token',
            getSessionServerId: () => 'mock-server-id',
          },
        },
      ],
    });
    return TestBed.createComponent(AppLayoutComponent);
  }

  it('should create the app layout component', () => {
    const fixture = setup({ isAuthenticated: false, isAdmin: false, passwordResetRequired: false });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should set page title to Local.LLM on init', () => {
    const fixture = setup({ isAuthenticated: false, isAdmin: false, passwordResetRequired: false });
    fixture.detectChanges();
    const titleService = TestBed.inject(Title);
    expect(titleService.getTitle()).toBe('Local.LLM');
  });

  it('should contain a router outlet', () => {
    const fixture = setup({ isAuthenticated: false, isAdmin: false, passwordResetRequired: false });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const routerOutlet = compiled.querySelector('router-outlet');
    expect(routerOutlet).not.toBeNull();
  });

  it('should contain the navbar component', () => {
    const fixture = setup({ isAuthenticated: false, isAdmin: false, passwordResetRequired: false });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const navbar = compiled.querySelector('app-navbar');
    expect(navbar).not.toBeNull();
  });

  it('should contain the footer component', () => {
    const fixture = setup({ isAuthenticated: false, isAdmin: false, passwordResetRequired: false });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const footer = compiled.querySelector('app-footer');
    expect(footer).not.toBeNull();
  });

  it('should show password reset banner when password reset is required', () => {
    const fixture = setup({ isAuthenticated: true, isAdmin: false, passwordResetRequired: true });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Password update required');
  });

  it('should not show password reset banner when not required', () => {
    const fixture = setup({ isAuthenticated: true, isAdmin: false, passwordResetRequired: false });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Password update required');
  });

  it('should have an Update password now link in password reset banner', () => {
    const fixture = setup({ isAuthenticated: true, isAdmin: false, passwordResetRequired: true });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const banner = compiled.querySelector('.bg-amber-50');
    expect(banner).not.toBeNull();
    const bannerLink = banner?.querySelector('a[href="/settings"]');
    expect(bannerLink).not.toBeNull();
    expect(bannerLink?.textContent?.trim()).toContain('Update password now');
  });
});
