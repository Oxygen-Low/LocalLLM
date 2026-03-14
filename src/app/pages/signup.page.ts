import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-signup',
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
          <h1 class="text-2xl font-bold text-secondary-900">Create your account</h1>
          <p class="text-muted mt-1">Sign up to access the AI dashboard</p>
        </div>

        <!-- Signup Form -->
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
                placeholder="Choose a username"
              />
              <p class="mt-1 text-xs text-muted">3-30 characters, letters, numbers, hyphens, underscores</p>
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
                autocomplete="new-password"
                class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
                placeholder="Create a password"
              />
              <!-- Password requirements -->
              <div class="mt-2 space-y-1">
                <p class="text-xs" [ngClass]="password.length >= 8 ? 'text-green-600' : 'text-muted'">
                  {{ password.length >= 8 ? '✓' : '○' }} At least 8 characters
                </p>
                <p class="text-xs" [ngClass]="hasUppercase() ? 'text-green-600' : 'text-muted'">
                  {{ hasUppercase() ? '✓' : '○' }} One uppercase letter
                </p>
                <p class="text-xs" [ngClass]="hasLowercase() ? 'text-green-600' : 'text-muted'">
                  {{ hasLowercase() ? '✓' : '○' }} One lowercase letter
                </p>
                <p class="text-xs" [ngClass]="hasNumber() ? 'text-green-600' : 'text-muted'">
                  {{ hasNumber() ? '✓' : '○' }} One number
                </p>
                <p class="text-xs" [ngClass]="hasSpecial() ? 'text-green-600' : 'text-muted'">
                  {{ hasSpecial() ? '✓' : '○' }} One special character
                </p>
              </div>
            </div>

            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-secondary-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                required
                autocomplete="new-password"
                class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              [disabled]="isLoading()"
              class="w-full btn-primary py-3 text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isLoading() ? 'Creating account...' : 'Create Account' }}
            </button>
          </form>

          <div class="mt-6 text-center text-sm text-muted">
            Already have an account?
            <a routerLink="/login" class="text-primary-600 hover:text-primary-700 font-medium ml-1">
              Sign in
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
export class SignupPageComponent {
  username = '';
  password = '';
  confirmPassword = '';
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

  hasUppercase(): boolean {
    return /[A-Z]/.test(this.password);
  }

  hasLowercase(): boolean {
    return /[a-z]/.test(this.password);
  }

  hasNumber(): boolean {
    return /[0-9]/.test(this.password);
  }

  hasSpecial(): boolean {
    return /[^A-Za-z0-9]/.test(this.password);
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set(null);

    if (!this.username.trim() || !this.password || !this.confirmPassword) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Passwords do not match');
      return;
    }

    this.isLoading.set(true);

    try {
      const result = await this.authService.signup(
        this.username.trim(),
        this.password
      );

      if (result.success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage.set(result.error ?? 'Signup failed');
      }
    } catch {
      this.errorMessage.set('An unexpected error occurred. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
