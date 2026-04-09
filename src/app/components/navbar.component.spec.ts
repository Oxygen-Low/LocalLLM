import { TestBed } from '@angular/core/testing';
import { RouterModule, Router } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../services/auth.service';

describe('NavbarComponent', () => {
  function setup(authState: { isAuthenticated: boolean; isAdmin: boolean; username: string }) {
    TestBed.configureTestingModule({
      imports: [NavbarComponent, RouterModule.forRoot([])],
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => authState.isAuthenticated,
            isAdmin: () => authState.isAdmin,
            username: () => authState.username,
            logout: vi.fn(),
          },
        },
      ],
    });
    return TestBed.createComponent(NavbarComponent);
  }

  it('should create the navbar component', () => {
    const fixture = setup({ isAuthenticated: false, isAdmin: false, username: '' });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have mobileMenuOpen set to false by default', () => {
    const fixture = setup({ isAuthenticated: false, isAdmin: false, username: '' });
    expect(fixture.componentInstance.mobileMenuOpen()).toBe(false);
  });

  it('should toggle mobile menu', () => {
    const fixture = setup({ isAuthenticated: false, isAdmin: false, username: '' });
    fixture.componentInstance.toggleMobileMenu();
    expect(fixture.componentInstance.mobileMenuOpen()).toBe(true);
    fixture.componentInstance.toggleMobileMenu();
    expect(fixture.componentInstance.mobileMenuOpen()).toBe(false);
  });

  it('should display the Local.LLM brand', () => {
    const fixture = setup({ isAuthenticated: false, isAdmin: false, username: '' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Local.LLM');
  });

  it('should show Sign In link when not authenticated', () => {
    const fixture = setup({ isAuthenticated: false, isAdmin: false, username: '' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const signInLink = compiled.querySelector('a[href="/login"]');
    expect(signInLink).not.toBeNull();
  });

  it('should show Sign Out button when authenticated', () => {
    const fixture = setup({ isAuthenticated: true, isAdmin: false, username: 'testuser' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('button'));
    const signOutBtn = buttons.find(b => b.textContent?.trim() === 'Sign Out');
    expect(signOutBtn).toBeTruthy();
  });

  it('should show username when authenticated', () => {
    const fixture = setup({ isAuthenticated: true, isAdmin: false, username: 'testuser' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('testuser');
  });

  it('should show Admin link when user is admin', () => {
    const fixture = setup({ isAuthenticated: true, isAdmin: true, username: 'admin' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const adminLink = compiled.querySelector('a[href="/admin"]');
    expect(adminLink).not.toBeNull();
  });

  it('should not show Admin link when user is not admin', () => {
    const fixture = setup({ isAuthenticated: true, isAdmin: false, username: 'user' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const adminLink = compiled.querySelector('a[href="/admin"]');
    expect(adminLink).toBeNull();
  });

  it('should call authService.logout and navigate on logout', () => {
    const fixture = setup({ isAuthenticated: true, isAdmin: false, username: 'testuser' });
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    fixture.componentInstance.onLogout();
    expect(fixture.componentInstance.authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should have Dashboard navigation link', () => {
    const fixture = setup({ isAuthenticated: false, isAdmin: false, username: '' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const dashLink = compiled.querySelector('a[href="/dashboard"]');
    expect(dashLink).not.toBeNull();
  });

  it('should have Docs navigation link', () => {
    const fixture = setup({ isAuthenticated: false, isAdmin: false, username: '' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const docsLink = compiled.querySelector('a[href="/docs"]');
    expect(docsLink).not.toBeNull();
  });
});
