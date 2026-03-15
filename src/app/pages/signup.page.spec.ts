import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SignupPageComponent } from './signup.page';
import { AuthService } from '../services/auth.service';
import { SecurityLoggerService } from '../services/security-logger.service';

describe('SignupPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupPageComponent, RouterModule.forRoot([])],
      providers: [
        AuthService,
        SecurityLoggerService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(SignupPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have showPassword set to false by default', () => {
    const fixture = TestBed.createComponent(SignupPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.showPassword()).toBe(false);
  });

  it('should have showConfirmPassword set to false by default', () => {
    const fixture = TestBed.createComponent(SignupPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.showConfirmPassword()).toBe(false);
  });

  it('should render password input as type="password" by default', () => {
    const fixture = TestBed.createComponent(SignupPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const passwordInput = compiled.querySelector('#password') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
  });

  it('should render confirm password input as type="password" by default', () => {
    const fixture = TestBed.createComponent(SignupPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const confirmInput = compiled.querySelector('#confirmPassword') as HTMLInputElement;
    expect(confirmInput.type).toBe('password');
  });

  it('should show password when password toggle button is clicked', () => {
    const fixture = TestBed.createComponent(SignupPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const toggleButton = compiled.querySelector('button[aria-label="Show password"]') as HTMLButtonElement;
    toggleButton.click();
    fixture.detectChanges();
    const passwordInput = compiled.querySelector('#password') as HTMLInputElement;
    expect(passwordInput.type).toBe('text');
    expect(fixture.componentInstance.showPassword()).toBe(true);
  });

  it('should show confirm password when confirm password toggle button is clicked', () => {
    const fixture = TestBed.createComponent(SignupPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const toggleButton = compiled.querySelector('button[aria-label="Show confirm password"]') as HTMLButtonElement;
    toggleButton.click();
    fixture.detectChanges();
    const confirmInput = compiled.querySelector('#confirmPassword') as HTMLInputElement;
    expect(confirmInput.type).toBe('text');
    expect(fixture.componentInstance.showConfirmPassword()).toBe(true);
  });

  it('should toggle password and confirm password independently', () => {
    const fixture = TestBed.createComponent(SignupPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const passwordToggle = compiled.querySelector('button[aria-label="Show password"]') as HTMLButtonElement;
    passwordToggle.click();
    fixture.detectChanges();

    const passwordInput = compiled.querySelector('#password') as HTMLInputElement;
    const confirmInput = compiled.querySelector('#confirmPassword') as HTMLInputElement;
    expect(passwordInput.type).toBe('text');
    expect(confirmInput.type).toBe('password');
  });

  it('should hide password when toggle button is clicked again', () => {
    const fixture = TestBed.createComponent(SignupPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    let toggleButton = compiled.querySelector('button[aria-label="Show password"]') as HTMLButtonElement;
    toggleButton.click();
    fixture.detectChanges();

    toggleButton = compiled.querySelector('button[aria-label="Hide password"]') as HTMLButtonElement;
    toggleButton.click();
    fixture.detectChanges();

    const passwordInput = compiled.querySelector('#password') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
    expect(fixture.componentInstance.showPassword()).toBe(false);
  });
});
