import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AdminService, AdminUserSummary, Universe, Character } from '../services/admin.service';

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

              <!-- Universes & Characters Management -->
              <div class="bg-white border border-secondary-200 rounded-xl shadow-sm p-6 space-y-4">
                <div class="flex items-center justify-between gap-3 flex-wrap">
                  <div class="space-y-1">
                    <h2 class="text-xl font-semibold text-secondary-900">Universes &amp; Characters</h2>
                    <p class="text-sm text-muted">
                      Manage universes and the characters within them. Characters change how the AI behaves.
                    </p>
                  </div>
                  <button
                    (click)="toggleUniverseMenu()"
                    class="px-4 py-2 rounded-lg border border-secondary-200 bg-secondary-50 hover:bg-secondary-100 transition-colors font-medium text-secondary-900"
                  >
                    {{ universeMenuOpen() ? 'Hide universes' : 'Manage universes' }}
                  </button>
                </div>

                @if (universeMenuOpen()) {
                  <div class="space-y-4">
                    <!-- Create Universe -->
                    <div class="flex items-end gap-3">
                      <div class="flex-1">
                        <label for="newUniverseName" class="block text-sm font-medium text-secondary-800 mb-1">New universe</label>
                        <input
                          id="newUniverseName"
                          type="text"
                          [(ngModel)]="newUniverseName"
                          placeholder="Universe name"
                          class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm"
                        />
                      </div>
                      <button
                        (click)="onCreateUniverse()"
                        [disabled]="!newUniverseName.trim()"
                        class="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        Create
                      </button>
                    </div>

                    @if (isLoadingUniverses()) {
                      <div class="text-sm text-muted">Loading universes...</div>
                    } @else if (universes().length === 0) {
                      <div class="text-sm text-muted">No universes created yet.</div>
                    } @else {
                      <div class="space-y-4">
                        @for (universe of universes(); track universe.id) {
                          <div class="border border-secondary-200 rounded-lg">
                            <!-- Universe Header -->
                            <div class="p-4 bg-secondary-50 rounded-t-lg flex items-center justify-between gap-3 flex-wrap">
                              @if (editingUniverseId() === universe.id) {
                                <div class="flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    [(ngModel)]="editingUniverseName"
                                    class="flex-1 px-3 py-1.5 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"
                                  />
                                  <button
                                    (click)="onSaveUniverse(universe.id)"
                                    [disabled]="!editingUniverseName.trim()"
                                    class="px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 text-sm disabled:opacity-50"
                                  >Save</button>
                                  <button
                                    (click)="editingUniverseId.set(null)"
                                    class="px-3 py-1.5 rounded-lg border border-secondary-200 text-secondary-700 hover:bg-secondary-100 text-sm"
                                  >Cancel</button>
                                </div>
                              } @else {
                                <div class="flex items-center gap-2">
                                  <span class="font-semibold text-secondary-900">{{ universe.name }}</span>
                                  <span class="text-xs text-muted">({{ universe.characters.length }} character{{ universe.characters.length !== 1 ? 's' : '' }})</span>
                                </div>
                                <div class="flex items-center gap-2">
                                  <button
                                    (click)="onEditUniverse(universe)"
                                    class="px-3 py-1.5 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 text-sm transition-colors"
                                  >Edit</button>
                                  <button
                                    (click)="onDeleteUniverse(universe)"
                                    class="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm transition-colors"
                                  >Delete</button>
                                </div>
                              }
                            </div>

                            <!-- Characters List -->
                            <div class="p-4 space-y-3">
                              <!-- Add Character -->
                              <div class="flex items-end gap-2">
                                <div class="flex-1">
                                  <input
                                    type="text"
                                    [(ngModel)]="newCharacterNames[universe.id]"
                                    placeholder="Character name"
                                    class="w-full px-3 py-1.5 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"
                                  />
                                </div>
                                <div class="flex-1">
                                  <input
                                    type="text"
                                    [(ngModel)]="newCharacterDescs[universe.id]"
                                    placeholder="Description (hidden from users)"
                                    class="w-full px-3 py-1.5 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"
                                  />
                                </div>
                                <button
                                  (click)="onCreateCharacter(universe.id)"
                                  [disabled]="!newCharacterNames[universe.id]?.trim()"
                                  class="px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >Add</button>
                              </div>

                              @if (universe.characters.length === 0) {
                                <div class="text-xs text-muted py-1">No characters yet.</div>
                              } @else {
                                <div class="divide-y divide-secondary-100 border border-secondary-100 rounded-lg">
                                  @for (char of universe.characters; track char.id) {
                                    <div class="p-3">
                                      @if (editingCharacterId() === char.id) {
                                        <div class="space-y-2">
                                          <input
                                            type="text"
                                            [(ngModel)]="editingCharacterName"
                                            placeholder="Character name"
                                            class="w-full px-3 py-1.5 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"
                                          />
                                          <textarea
                                            [(ngModel)]="editingCharacterDesc"
                                            placeholder="Description (hidden from users)"
                                            rows="3"
                                            class="w-full px-3 py-1.5 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm resize-none"
                                          ></textarea>
                                          <div class="flex items-center gap-2">
                                            <button
                                              (click)="onSaveCharacter(universe.id, char.id)"
                                              [disabled]="!editingCharacterName.trim()"
                                              class="px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 text-sm disabled:opacity-50"
                                            >Save</button>
                                            <button
                                              (click)="editingCharacterId.set(null)"
                                              class="px-3 py-1.5 rounded-lg border border-secondary-200 text-secondary-700 hover:bg-secondary-100 text-sm"
                                            >Cancel</button>
                                          </div>
                                        </div>
                                      } @else {
                                        <div class="flex items-center justify-between gap-3 flex-wrap">
                                          <div class="space-y-0.5">
                                            <div class="font-medium text-sm text-secondary-900">{{ char.name }}</div>
                                            @if (char.description) {
                                              <div class="text-xs text-muted line-clamp-2">{{ char.description }}</div>
                                            }
                                          </div>
                                          <div class="flex items-center gap-2">
                                            <button
                                              (click)="onEditCharacter(char)"
                                              class="px-2 py-1 rounded border border-primary-200 text-primary-700 hover:bg-primary-50 text-xs transition-colors"
                                            >Edit</button>
                                            <button
                                              (click)="onDeleteCharacter(universe.id, char)"
                                              class="px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50 text-xs transition-colors"
                                            >Delete</button>
                                          </div>
                                        </div>
                                      }
                                    </div>
                                  }
                                </div>
                              }
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

          @if (isUnlocked()) {
            <!-- App Settings -->
            <div class="bg-white border border-secondary-200 rounded-xl shadow-sm p-6 space-y-4">
              <div class="space-y-1">
                <h2 class="text-xl font-semibold text-secondary-900">App Settings</h2>
                <p class="text-sm text-muted">
                  Control access to risky apps that run code on the server.
                </p>
              </div>

              <div class="flex items-center justify-between gap-4 p-4 rounded-lg border border-secondary-200 bg-secondary-50">
                <div class="space-y-1">
                  <div class="font-medium text-secondary-900 flex items-center gap-2">
                    <span>⚠️</span>
                    Risky Apps
                  </div>
                  <p class="text-sm text-muted">
                    Apps that execute code on the server (e.g. Coding Agent). When disabled, these apps are greyed out for all users.
                  </p>
                </div>
                <button
                  (click)="onToggleRiskyApps()"
                  [disabled]="isTogglingRiskyApps()"
                  [class]="riskyAppsEnabled()
                    ? 'px-4 py-2 rounded-lg bg-red-100 border border-red-200 text-red-700 hover:bg-red-200 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                    : 'px-4 py-2 rounded-lg bg-green-100 border border-green-200 text-green-700 hover:bg-green-200 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'"
                >
                  {{ isTogglingRiskyApps() ? 'Updating...' : (riskyAppsEnabled() ? 'Disable risky apps' : 'Enable risky apps') }}
                </button>
              </div>
            </div>
          }

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

  // Universe & Character state
  universeMenuOpen = signal(false);
  isLoadingUniverses = signal(false);
  universes = signal<Universe[]>([]);
  newUniverseName = '';
  editingUniverseId = signal<string | null>(null);
  editingUniverseName = '';
  editingCharacterId = signal<string | null>(null);
  editingCharacterName = '';
  editingCharacterDesc = '';
  newCharacterNames: Record<string, string> = {};
  newCharacterDescs: Record<string, string> = {};

  // App Settings state
  riskyAppsEnabled = signal<boolean>(true);
  isTogglingRiskyApps = signal(false);

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
      await this.loadAppSettings();
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

  // --- Universes ---

  toggleUniverseMenu(): void {
    const wasOpen = this.universeMenuOpen();
    this.universeMenuOpen.set(!wasOpen);
    if (!wasOpen && this.adminPasswordHash) {
      this.loadUniverses(this.adminPasswordHash);
    }
  }

  private async loadUniverses(adminHash: string): Promise<void> {
    this.isLoadingUniverses.set(true);
    try {
      const response = await this.adminService.listUniverses(adminHash);
      if (!response.success || !response.universes) {
        this.errorMessage.set(response.error ?? 'Failed to load universes.');
        this.universes.set([]);
        return;
      }
      this.universes.set(response.universes);
    } finally {
      this.isLoadingUniverses.set(false);
    }
  }

  async onCreateUniverse(): Promise<void> {
    if (!this.adminPasswordHash || !this.newUniverseName.trim()) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    const response = await this.adminService.createUniverse(this.newUniverseName.trim(), this.adminPasswordHash);
    if (!response.success) {
      this.errorMessage.set(response.error ?? 'Failed to create universe.');
      return;
    }
    this.statusMessage.set(`Universe "${this.newUniverseName.trim()}" created.`);
    this.newUniverseName = '';
    await this.loadUniverses(this.adminPasswordHash);
  }

  onEditUniverse(universe: Universe): void {
    this.editingUniverseId.set(universe.id);
    this.editingUniverseName = universe.name;
  }

  async onSaveUniverse(universeId: string): Promise<void> {
    if (!this.adminPasswordHash || !this.editingUniverseName.trim()) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    const response = await this.adminService.updateUniverse(universeId, this.editingUniverseName.trim(), this.adminPasswordHash);
    if (!response.success) {
      this.errorMessage.set(response.error ?? 'Failed to update universe.');
      return;
    }
    this.statusMessage.set(`Universe updated to "${this.editingUniverseName.trim()}".`);
    this.editingUniverseId.set(null);
    await this.loadUniverses(this.adminPasswordHash);
  }

  async onDeleteUniverse(universe: Universe): Promise<void> {
    if (!this.adminPasswordHash) return;
    const confirmed = window.confirm(`Delete universe "${universe.name}" and all its characters? This action cannot be undone.`);
    if (!confirmed) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    const response = await this.adminService.deleteUniverse(universe.id, this.adminPasswordHash);
    if (!response.success) {
      this.errorMessage.set(response.error ?? 'Failed to delete universe.');
      return;
    }
    this.statusMessage.set(`Universe "${universe.name}" deleted.`);
    await this.loadUniverses(this.adminPasswordHash);
  }

  // --- Characters ---

  async onCreateCharacter(universeId: string): Promise<void> {
    if (!this.adminPasswordHash) return;
    const name = (this.newCharacterNames[universeId] || '').trim();
    const description = (this.newCharacterDescs[universeId] || '').trim();
    if (!name) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    const response = await this.adminService.createCharacter(universeId, name, description, this.adminPasswordHash);
    if (!response.success) {
      this.errorMessage.set(response.error ?? 'Failed to create character.');
      return;
    }
    this.statusMessage.set(`Character "${name}" created.`);
    this.newCharacterNames[universeId] = '';
    this.newCharacterDescs[universeId] = '';
    await this.loadUniverses(this.adminPasswordHash);
  }

  onEditCharacter(character: Character): void {
    this.editingCharacterId.set(character.id);
    this.editingCharacterName = character.name;
    this.editingCharacterDesc = character.description || '';
  }

  async onSaveCharacter(universeId: string, characterId: string): Promise<void> {
    if (!this.adminPasswordHash || !this.editingCharacterName.trim()) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    const response = await this.adminService.updateCharacter(
      universeId, characterId, this.editingCharacterName.trim(), this.editingCharacterDesc.trim(), this.adminPasswordHash
    );
    if (!response.success) {
      this.errorMessage.set(response.error ?? 'Failed to update character.');
      return;
    }
    this.statusMessage.set(`Character updated to "${this.editingCharacterName.trim()}".`);
    this.editingCharacterId.set(null);
    await this.loadUniverses(this.adminPasswordHash);
  }

  async onDeleteCharacter(universeId: string, character: Character): Promise<void> {
    if (!this.adminPasswordHash) return;
    const confirmed = window.confirm(`Delete character "${character.name}"? This action cannot be undone.`);
    if (!confirmed) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    const response = await this.adminService.deleteCharacter(universeId, character.id, this.adminPasswordHash);
    if (!response.success) {
      this.errorMessage.set(response.error ?? 'Failed to delete character.');
      return;
    }
    this.statusMessage.set(`Character "${character.name}" deleted.`);
    await this.loadUniverses(this.adminPasswordHash);
  }

  // --- App Settings ---

  private async loadAppSettings(): Promise<void> {
    const response = await this.adminService.getRiskyAppsEnabled();
    if (response.success && typeof response.riskyAppsEnabled === 'boolean') {
      this.riskyAppsEnabled.set(response.riskyAppsEnabled);
    }
  }

  async onToggleRiskyApps(): Promise<void> {
    if (!this.adminPasswordHash) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    this.isTogglingRiskyApps.set(true);
    try {
      const newValue = !this.riskyAppsEnabled();
      const response = await this.adminService.setRiskyAppsEnabled(newValue, this.adminPasswordHash);
      if (!response.success) {
        this.errorMessage.set(response.error ?? 'Failed to update app settings.');
        return;
      }
      this.riskyAppsEnabled.set(newValue);
      this.statusMessage.set(`Risky apps ${newValue ? 'enabled' : 'disabled'}.`);
    } finally {
      this.isTogglingRiskyApps.set(false);
    }
  }
}
