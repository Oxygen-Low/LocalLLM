import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AdminService, AdminUserSummary } from '../services/admin.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-white to-secondary-50">
      <div class="container-custom py-12 sm:py-16 lg:py-20 space-y-8">
        <div class="max-w-3xl space-y-3">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
            <span class="w-2 h-2 bg-primary-600 rounded-full"></span>
            Admin Configurations
          </div>
          <h1 class="text-4xl sm:text-5xl font-bold text-secondary-900">Administrative Controls</h1>
          <p class="text-lg text-muted max-w-2xl">
            This area is restricted to the administrator account. Confirm your credentials to manage user accounts securely.
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <div class="bg-white border border-secondary-200 rounded-xl shadow-sm p-6 space-y-4">
              <div class="flex items-center justify-between gap-3 flex-wrap">
                <div class="space-y-1">
                  <h2 class="text-xl font-semibold text-secondary-900">Admin verification</h2>
                  <p class="text-sm text-muted">Enter the admin password to unlock sensitive controls.</p>
                </div>
                <a routerLink="/dashboard" class="text-sm text-muted hover:text-secondary-800 transition-colors">
                  ← Back to dashboard
                </a>
              </div>

              @if (errorMessage()) {
                <div class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                  {{ errorMessage() }}
                </div>
              }

              @if (statusMessage()) {
                <div class="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
                  {{ statusMessage() }}
                </div>
              }

              <div class="space-y-3">
                <label for="adminPassword" class="block text-sm font-medium text-secondary-800">Admin password</label>
                <input
                  id="adminPassword"
                  name="adminPassword"
                  type="password"
                  [(ngModel)]="adminPassword"
                  [disabled]="isUnlocking() || isUnlocked()"
                  autocomplete="current-password"
                  class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all disabled:bg-secondary-50"
                  placeholder="Enter admin password to continue"
                />
              </div>

              <div class="flex items-center gap-3">
                <button
                  (click)="unlock()"
                  [disabled]="!adminPassword || isUnlocking() || isUnlocked()"
                  class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ isUnlocking() ? 'Verifying...' : isUnlocked() ? 'Verified' : 'Unlock controls' }}
                </button>
                @if (isUnlocked()) {
                  <span class="text-sm text-green-700 font-medium inline-flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-green-500"></span>
                    Admin verified
                  </span>
                }
              </div>
            </div>

            @if (isUnlocked()) {
              <div class="bg-white border border-secondary-200 rounded-xl shadow-sm p-6 space-y-4">
                <div class="flex items-center justify-between gap-3 flex-wrap">
                  <div class="space-y-1">
                    <h2 class="text-xl font-semibold text-secondary-900">Account management</h2>
                    <p class="text-sm text-muted">
                      Use the menu to view accounts, require password resets, or remove stale accounts.
                    </p>
                  </div>
                  <button
                    (click)="toggleMenu()"
                    class="px-4 py-2 rounded-lg border border-secondary-200 bg-secondary-50 hover:bg-secondary-100 transition-colors font-medium text-secondary-900"
                  >
                    {{ menuOpen() ? 'Hide account menu' : 'Account management menu' }}
                  </button>
                </div>

                @if (menuOpen()) {
                  <div class="space-y-3">
                    @if (isLoadingUsers()) {
                      <div class="text-sm text-muted">Loading accounts...</div>
                    } @else if (users().length === 0) {
                      <div class="text-sm text-muted">No accounts found.</div>
                    } @else {
                      <div class="divide-y divide-secondary-100 border border-secondary-100 rounded-lg">
                        @for (user of users(); track user.username) {
                          <div class="p-4 flex items-center justify-between gap-4 flex-wrap">
                            <div class="space-y-1">
                              <div class="flex items-center gap-2">
                                <span class="font-semibold text-secondary-900">{{ user.username }}</span>
                                @if (user.username === 'admin') {
                                  <span class="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                    Admin
                                  </span>
                                }
                                @if (user.passwordResetRequired) {
                                  <span class="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    Reset required
                                  </span>
                                }
                              </div>
                              <p class="text-xs text-muted">
                                Created {{ user.createdAt ? (user.createdAt | date: 'medium') : 'unknown' }}
                              </p>
                            </div>

                            <div class="flex items-center gap-2">
                              <button
                                (click)="onResetPassword(user.username)"
                                [disabled]="actionInProgress() === user.username"
                                class="px-3 py-2 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 transition-colors disabled:opacity-50"
                              >
                                {{ actionInProgress() === user.username ? 'Resetting...' : 'Require new password' }}
                              </button>
                              <button
                                (click)="onDeleteUser(user.username)"
                                [disabled]="user.username === 'admin' || actionInProgress() === user.username"
                                class="px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {{ actionInProgress() === user.username ? 'Deleting...' : 'Delete account' }}
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <div class="bg-white border border-secondary-200 rounded-xl shadow-sm p-6 space-y-4">
            <h3 class="text-lg font-semibold text-secondary-900">Security checklist</h3>
            <ul class="space-y-3 text-sm text-secondary-800">
              <li class="flex gap-3">
                <span class="mt-1 w-2 h-2 rounded-full bg-green-500"></span>
                Protect this page by never sharing the admin password.
              </li>
              <li class="flex gap-3">
                <span class="mt-1 w-2 h-2 rounded-full bg-green-500"></span>
                Require password resets for suspicious accounts before deleting them.
              </li>
              <li class="flex gap-3">
                <span class="mt-1 w-2 h-2 rounded-full bg-green-500"></span>
                Deleting the admin account is blocked to prevent accidental lockouts.
              </li>
              <li class="flex gap-3">
                <span class="mt-1 w-2 h-2 rounded-full bg-green-500"></span>
                Changes take effect immediately; active sessions will be prompted to update credentials.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminPageComponent {
  adminPassword = '';
  adminPasswordHash: string | null = null;
  isUnlocking = signal(false);
  isUnlocked = signal(false);
  menuOpen = signal(false);
  isLoadingUsers = signal(false);
  users = signal<AdminUserSummary[]>([]);
  errorMessage = signal<string | null>(null);
  statusMessage = signal<string | null>(null);
  actionInProgress = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private adminService: AdminService
  ) {}

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  async unlock(): Promise<void> {
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    this.isUnlocking.set(true);

    try {
      const hashed = await this.authService.hashPassword(this.adminPassword);
      this.adminPasswordHash = hashed;
      this.adminPassword = '';
      await this.loadUsers(hashed);
      this.isUnlocked.set(true);
      this.statusMessage.set('Admin verified. Account controls unlocked.');
    } catch {
      this.errorMessage.set('Unable to verify admin credentials right now. Please try again.');
    } finally {
      this.isUnlocking.set(false);
    }
  }

  private async loadUsers(adminHash: string): Promise<void> {
    this.isLoadingUsers.set(true);
    try {
      const response = await this.adminService.listUsers(adminHash);
      if (!response.success || !response.users) {
        this.errorMessage.set(response.error ?? 'Failed to load users.');
        this.users.set([]);
        return;
      }
      this.users.set(response.users);
      this.errorMessage.set(null);
    } finally {
      this.isLoadingUsers.set(false);
    }
  }

  async onResetPassword(username: string): Promise<void> {
    if (!this.adminPasswordHash) {
      this.errorMessage.set('Unlock admin controls before performing actions.');
      return;
    }
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    this.actionInProgress.set(username);
    try {
      const response = await this.adminService.resetPassword(username, this.adminPasswordHash);
      if (!response.success) {
        this.errorMessage.set(response.error ?? 'Failed to reset password.');
        return;
      }
      this.statusMessage.set(`Password reset requirement added for ${username}.`);
      await this.loadUsers(this.adminPasswordHash);
    } finally {
      this.actionInProgress.set(null);
    }
  }

  async onDeleteUser(username: string): Promise<void> {
    if (!this.adminPasswordHash) {
      this.errorMessage.set('Unlock admin controls before performing actions.');
      return;
    }
    if (username === 'admin') {
      this.errorMessage.set('The admin account cannot be deleted.');
      return;
    }

    const confirmed = window.confirm(`Delete account "${username}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    this.errorMessage.set(null);
    this.statusMessage.set(null);
    this.actionInProgress.set(username);
    try {
      const response = await this.adminService.deleteUser(username, this.adminPasswordHash);
      if (!response.success) {
        this.errorMessage.set(response.error ?? 'Failed to delete account.');
        return;
      }
      this.statusMessage.set(`Account "${username}" deleted.`);
      await this.loadUsers(this.adminPasswordHash);
    } finally {
      this.actionInProgress.set(null);
    }
  }
}
