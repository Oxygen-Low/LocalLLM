import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  // ⚡ Bolt: Using OnPush change detection to prevent unnecessary re-renders.
  // This component uses Signals and ngModel, which work perfectly with OnPush
  // by only triggering view updates when data actually changes or events fire.
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
      <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center gap-2 mb-4">
            <div class="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-xl">⚡</span>
            </div>
            <span class="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              Local.LLM
            </span>
          </div>
          <h1 class="text-2xl font-bold text-secondary-900">Welcome back</h1>
          <p class="text-muted mt-1">Sign in to access your dashboard</p>
        </div>

        <!-- Login Form -->
        <div class="bg-white rounded-xl shadow-lg border border-secondary-200 p-8">
          @if (errorMessage()) {
            <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="space-y-5">
            <div>
              <label for="username" class="block text-sm font-medium text-secondary-700 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                [(ngModel)]="username"
                name="username"
                required
                autocomplete="username"
                class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
                [placeholder]="usernamePlaceholder()"
                (input)="onUsernameInput()"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-secondary-700 mb-2">
                Password
              </label>
              <div class="relative">
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  required
                  autocomplete="current-password"
                  class="w-full px-4 py-3 pr-12 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
                  [placeholder]="passwordPlaceholder()"
                  (input)="onPasswordInput()"
                />
                <button
                  type="button"
                  (click)="showPassword.set(!showPassword())"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-secondary-400 hover:text-secondary-600 transition-colors"
                  [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                >
                  @if (showPassword()) {
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              [disabled]="isLoading()"
              class="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (isLoading()) {
                <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              }
              {{ isLoading() ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>

          <div class="mt-6 text-center text-sm text-muted">
            Don't have an account?
            <a routerLink="/signup" class="text-primary-600 hover:text-primary-700 font-medium ml-1">
              Sign up
            </a>
          </div>
        </div>

        <!-- Back to home -->
        <div class="mt-6 text-center">
          <a routerLink="/" class="text-sm text-muted hover:text-secondary-700 transition-colors">
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  username = '';
  password = '';
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);
  usernamePlaceholder = signal('Enter username');
  passwordPlaceholder = signal('Enter password');
  private passwordEasterEggStep = 0;
  private http = inject(HttpClient);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    if (environment.preview || this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.checkDemoMode();
    }
  }

  private async checkDemoMode(): Promise<void> {
    try {
      const resp = await firstValueFrom(
        this.http.get<{ success: boolean; demoMode: boolean }>(`${environment.apiUrl}/api/settings/demo`)
      );
      if (resp.demoMode) {
        const result = await this.authService.demoLogin();
        if (result.success) {
          this.router.navigate(['/dashboard']);
        }
      }
    } catch {
      // Server not reachable yet – ignore
    }
  }

  onUsernameInput(): void {
    if (this.username.trim() === 'username') {
      this.usernamePlaceholder.set('ok very funny');
      this.username = '';
    }
  }

  onPasswordInput(): void {
    const val = this.password;
    const step = this.passwordEasterEggStep;

    if (step === 0 && val === 'password') {
      this.passwordPlaceholder.set('Password is incorrect.');
      this.password = '';
      this.passwordEasterEggStep = 1;
    } else if (step === 1 && val === 'incorrect') {
      this.passwordPlaceholder.set('Try again.');
      this.password = '';
      this.passwordEasterEggStep = 2;
    } else if (step === 2 && val === 'again') {
      this.passwordPlaceholder.set('Try again later');
      this.password = '';
      this.passwordEasterEggStep = 3;
    } else if (step === 3 && val === 'again later') {
      this.passwordPlaceholder.set('ok then');
      this.password = '';
      this.passwordEasterEggStep = 4;
    }
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set(null);

    if (!this.username.trim() || !this.password) {
      this.errorMessage.set('Please enter both username and password');
      return;
    }

    this.isLoading.set(true);

    try {
      const result = await this.authService.login(
        this.username.trim(),
        this.password
      );

      if (result.success) {
        if (result.passwordResetRequired || this.authService.passwordResetRequired()) {
          this.router.navigate(['/settings'], { queryParams: { requireReset: '1' } });
        } else {
          this.router.navigate(['/dashboard']);
        }
      } else {
        const remaining = this.authService.getRemainingAttempts(this.username.trim().toLowerCase());
        if (remaining > 0 && remaining < 4) {
          this.errorMessage.set(`${result.error ?? 'Login failed'}. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
        } else {
          this.errorMessage.set(result.error ?? 'Login failed');
        }
      }
    } catch {
      this.errorMessage.set('An unexpected error occurred. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
