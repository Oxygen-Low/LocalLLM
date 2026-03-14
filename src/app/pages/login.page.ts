import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-secondary-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                [(ngModel)]="password"
                name="password"
                required
                autocomplete="current-password"
                class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              [disabled]="isLoading()"
              class="w-full btn-primary py-3 text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
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
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
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
        this.router.navigate(['/dashboard']);
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
