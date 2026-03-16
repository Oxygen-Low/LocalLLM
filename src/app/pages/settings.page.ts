import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-white to-secondary-50">
      <div class="container-custom py-12 sm:py-16 lg:py-20">
        <!-- Header -->
        <div class="max-w-3xl mb-10">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
            <span class="w-2 h-2 bg-primary-600 rounded-full"></span>
            Settings
          </div>
          <h1 class="text-4xl sm:text-5xl font-bold text-secondary-900 mb-4">
            Account Settings
          </h1>
          <p class="text-lg text-muted">
            Manage your account preferences and security settings.
          </p>
        </div>

        <div class="max-w-2xl space-y-8">
          @if (authService.passwordResetRequired()) {
            <div class="p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-start gap-3">
              <svg class="w-5 h-5 mt-0.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856C18.403 19.403 19 18.552 19 17.6V6.4c0-.952-.597-1.803-1.623-2.4L12 2 6.623 4C5.597 4.597 5 5.448 5 6.4v11.2c0 .952.597 1.803 1.623 2.4z" />
              </svg>
              <div>
                <p class="font-semibold">Password update required</p>
                <p>Please set a new password to continue. Administrative policy requires an immediate update.</p>
              </div>
            </div>
          }

          <!-- Account Info -->
          <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 sm:p-8">
            <h2 class="text-xl font-semibold text-secondary-900 mb-6">Account Information</h2>
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center flex-shrink-0">
                <span class="text-white text-xl font-bold">{{ usernameInitial() }}</span>
              </div>
              <div>
                <p class="font-semibold text-secondary-900 text-lg">{{ authService.username() }}</p>
                <p class="text-sm text-muted">Local.LLM account</p>
              </div>
            </div>
          </div>

          <!-- Change Password -->
          <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 sm:p-8">
            <h2 class="text-xl font-semibold text-secondary-900 mb-2">Change Password</h2>
            <p class="text-sm text-muted mb-6">Update your password to keep your account secure.</p>

            @if (passwordSuccessMessage()) {
              <div class="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                {{ passwordSuccessMessage() }}
              </div>
            }
            @if (passwordErrorMessage()) {
              <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {{ passwordErrorMessage() }}
              </div>
            }

            <form (ngSubmit)="onChangePassword()" class="space-y-5">
              <div>
                <label for="currentPassword" class="block text-sm font-medium text-secondary-700 mb-2">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  [(ngModel)]="currentPassword"
                  name="currentPassword"
                  required
                  autocomplete="current-password"
                  class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
                  placeholder="Enter your current password"
                />
              </div>

              <div>
                <label for="newPassword" class="block text-sm font-medium text-secondary-700 mb-2">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  [(ngModel)]="newPassword"
                  name="newPassword"
                  required
                  autocomplete="new-password"
                  class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
                  placeholder="Enter your new password"
                />
                <div class="mt-2 space-y-1">
                  <p class="text-xs" [ngClass]="newPassword.length >= 8 ? 'text-green-600' : 'text-muted'">
                    {{ newPassword.length >= 8 ? '✓' : '○' }} At least 8 characters
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
                <label for="confirmNewPassword" class="block text-sm font-medium text-secondary-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  [(ngModel)]="confirmNewPassword"
                  name="confirmNewPassword"
                  required
                  autocomplete="new-password"
                  class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
                  placeholder="Confirm your new password"
                />
              </div>

              <div class="flex items-center gap-4">
                <button
                  type="submit"
                  [disabled]="isChangingPassword()"
                  class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ isChangingPassword() ? 'Updating...' : 'Update Password' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Danger Zone -->
          <div class="bg-white rounded-xl border border-red-200 shadow-sm p-6 sm:p-8">
            <h2 class="text-xl font-semibold text-red-700 mb-2">Danger Zone</h2>
            <p class="text-sm text-muted mb-6">These actions are permanent and cannot be undone.</p>

            @if (!showDeleteConfirm()) {
              <button
                (click)="showDeleteConfirm.set(true)"
                class="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete Account
              </button>
            } @else {
              <div class="rounded-lg border border-red-200 bg-red-50 p-5 space-y-4">
                <p class="text-sm font-medium text-red-800">
                  Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.
                </p>

                @if (deleteErrorMessage()) {
                  <div class="p-3 rounded-lg bg-white border border-red-200 text-red-700 text-sm">
                    {{ deleteErrorMessage() }}
                  </div>
                }

                <div>
                  <label for="deletePassword" class="block text-sm font-medium text-red-800 mb-2">
                    Enter your password to confirm
                  </label>
                  <input
                    id="deletePassword"
                    type="password"
                    [(ngModel)]="deletePassword"
                    name="deletePassword"
                    autocomplete="current-password"
                    class="w-full px-4 py-3 rounded-lg border border-red-200 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100 transition-all bg-white"
                    placeholder="Enter your password"
                  />
                </div>

                <div class="flex items-center gap-3">
                  <button
                    (click)="onDeleteAccount()"
                    [disabled]="isDeletingAccount()"
                    class="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ isDeletingAccount() ? 'Deleting...' : 'Yes, Delete My Account' }}
                  </button>
                  <button
                    (click)="cancelDelete()"
                    [disabled]="isDeletingAccount()"
                    class="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Back to Dashboard -->
          <div>
            <a routerLink="/dashboard" class="text-sm text-muted hover:text-secondary-700 transition-colors">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SettingsPageComponent {
  // Change password fields
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  isChangingPassword = signal(false);
  passwordErrorMessage = signal<string | null>(null);
  passwordSuccessMessage = signal<string | null>(null);

  // Delete account fields
  deletePassword = '';
  showDeleteConfirm = signal(false);
  isDeletingAccount = signal(false);
  deleteErrorMessage = signal<string | null>(null);

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  usernameInitial(): string {
    const name = this.authService.username();
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  hasUppercase(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }

  hasLowercase(): boolean {
    return /[a-z]/.test(this.newPassword);
  }

  hasNumber(): boolean {
    return /[0-9]/.test(this.newPassword);
  }

  hasSpecial(): boolean {
    return /[^A-Za-z0-9]/.test(this.newPassword);
  }

  async onChangePassword(): Promise<void> {
    this.passwordErrorMessage.set(null);
    this.passwordSuccessMessage.set(null);

    if (!this.currentPassword || !this.newPassword || !this.confirmNewPassword) {
      this.passwordErrorMessage.set('Please fill in all fields');
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.passwordErrorMessage.set('New passwords do not match');
      return;
    }

    if (this.currentPassword === this.newPassword) {
      this.passwordErrorMessage.set('New password must be different from your current password');
      return;
    }

    this.isChangingPassword.set(true);

    try {
      const result = await this.authService.changePassword(this.currentPassword, this.newPassword);

      if (result.success) {
        this.passwordSuccessMessage.set('Password updated successfully');
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
      } else {
        this.passwordErrorMessage.set(result.error ?? 'Failed to update password');
      }
    } catch {
      this.passwordErrorMessage.set('An unexpected error occurred. Please try again.');
    } finally {
      this.isChangingPassword.set(false);
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deletePassword = '';
    this.deleteErrorMessage.set(null);
  }

  async onDeleteAccount(): Promise<void> {
    this.deleteErrorMessage.set(null);

    if (!this.deletePassword) {
      this.deleteErrorMessage.set('Please enter your password to confirm');
      return;
    }

    this.isDeletingAccount.set(true);

    try {
      const result = await this.authService.deleteAccount(this.deletePassword);

      if (result.success) {
        this.router.navigate(['/']);
      } else {
        this.deleteErrorMessage.set(result.error ?? 'Failed to delete account');
      }
    } catch {
      this.deleteErrorMessage.set('An unexpected error occurred. Please try again.');
    } finally {
      this.isDeletingAccount.set(false);
    }
  }
}
