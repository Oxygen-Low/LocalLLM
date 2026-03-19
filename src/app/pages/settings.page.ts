import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LlmService, type ProviderKeyStatus } from '../services/llm.service';

interface ProviderConfig {
  id: string;
  name: string;
  placeholder: string;
  models: string[];
}

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
            Manage your account preferences, API keys, and security settings.
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

          <!-- AI Provider API Keys -->
          <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 sm:p-8">
            <h2 class="text-xl font-semibold text-secondary-900 mb-2">AI Provider API Keys</h2>
            <p class="text-sm text-muted mb-6">Configure your API keys for different AI providers. Keys are encrypted and stored securely on the server.</p>

            @if (apiKeySuccessMessage()) {
              <div class="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                {{ apiKeySuccessMessage() }}
              </div>
            }
            @if (apiKeyErrorMessage()) {
              <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {{ apiKeyErrorMessage() }}
              </div>
            }

            <div class="space-y-6">
              @for (provider of providerConfigs; track provider.id) {
                <div class="border border-secondary-100 rounded-lg p-4">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full" [ngClass]="apiKeyStatus()[provider.id]?.configured ? 'bg-green-500' : 'bg-secondary-300'"></span>
                      <h3 class="font-medium text-secondary-900">{{ provider.name }}</h3>
                    </div>
                    @if (apiKeyStatus()[provider.id]?.configured) {
                      <button
                        (click)="removeProviderKey(provider.id)"
                        class="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Remove Key
                      </button>
                    }
                  </div>

                  @if (editingProvider() === provider.id) {
                    <div class="space-y-3">
                      <input
                        type="password"
                        [(ngModel)]="editApiKey"
                        [name]="'apikey-' + provider.id"
                        [placeholder]="provider.placeholder"
                        class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm"
                        autocomplete="off"
                      />
                      <div>
                        <label class="block text-xs font-medium text-secondary-600 mb-1">Model</label>
                        <select
                          [(ngModel)]="editModel"
                          [name]="'model-' + provider.id"
                          class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm bg-white"
                        >
                          @for (model of provider.models; track model) {
                            <option [value]="model">{{ model }}</option>
                          }
                        </select>
                      </div>
                      <div class="flex gap-2">
                        <button
                          (click)="saveProviderKey(provider.id)"
                          [disabled]="isSavingKey()"
                          class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                          {{ isSavingKey() ? 'Saving...' : 'Save' }}
                        </button>
                        <button
                          (click)="cancelEditProvider()"
                          class="px-4 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  } @else {
                    <div class="flex items-center justify-between">
                      <div class="text-sm text-muted">
                        @if (apiKeyStatus()[provider.id]?.configured) {
                          <span class="text-green-600">✓ Configured</span>
                          @if (apiKeyStatus()[provider.id]?.selectedModel) {
                            <span class="text-secondary-400 ml-2">· {{ apiKeyStatus()[provider.id]?.selectedModel }}</span>
                          }
                        } @else {
                          Not configured
                        }
                      </div>
                      <button
                        (click)="startEditProvider(provider.id)"
                        class="px-3 py-1.5 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
                      >
                        {{ apiKeyStatus()[provider.id]?.configured ? 'Update' : 'Configure' }}
                      </button>
                    </div>
                  }
                </div>
              }
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
export class SettingsPageComponent implements OnInit {
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

  // API Key fields
  apiKeyStatus = signal<Record<string, ProviderKeyStatus>>({});
  editingProvider = signal<string | null>(null);
  editApiKey = '';
  editModel = '';
  isSavingKey = signal(false);
  apiKeySuccessMessage = signal<string | null>(null);
  apiKeyErrorMessage = signal<string | null>(null);

  providerConfigs: ProviderConfig[] = [
    {
      id: 'openrouter',
      name: 'OpenRouter',
      placeholder: 'sk-or-...',
      models: ['google/gemini-2.5-pro-preview', 'anthropic/claude-sonnet-4', 'openai/gpt-4o', 'meta-llama/llama-4-maverick', 'deepseek/deepseek-r1', 'mistralai/mistral-large-latest'],
    },
    {
      id: 'anthropic',
      name: 'Anthropic / Claude',
      placeholder: 'sk-ant-...',
      models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    },
    {
      id: 'openai',
      name: 'OpenAI / ChatGPT',
      placeholder: 'sk-...',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o3-mini', 'gpt-3.5-turbo'],
    },
    {
      id: 'deepseek',
      name: 'Deepseek',
      placeholder: 'sk-...',
      models: ['deepseek-chat', 'deepseek-reasoner'],
    },
    {
      id: 'xai',
      name: 'xAI / Grok',
      placeholder: 'xai-...',
      models: ['grok-3', 'grok-3-mini', 'grok-2'],
    },
    {
      id: 'google',
      name: 'Google',
      placeholder: 'AIza...',
      models: ['gemini-2.5-pro-preview-06-05', 'gemini-2.5-flash-preview-05-20', 'gemini-2.0-flash', 'gemini-1.5-pro'],
    },
  ];

  private llmService = inject(LlmService);

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadApiKeyStatus();
  }

  async loadApiKeyStatus(): Promise<void> {
    try {
      const status = await this.llmService.getApiKeyStatus();
      this.apiKeyStatus.set(status);
    } catch {
      // Silent failure
    }
  }

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

  // --- API Key methods ---

  startEditProvider(providerId: string): void {
    this.editingProvider.set(providerId);
    this.editApiKey = '';
    const status = this.apiKeyStatus()[providerId];
    const config = this.providerConfigs.find(p => p.id === providerId);
    this.editModel = status?.selectedModel || config?.models[0] || '';
    this.apiKeySuccessMessage.set(null);
    this.apiKeyErrorMessage.set(null);
  }

  cancelEditProvider(): void {
    this.editingProvider.set(null);
    this.editApiKey = '';
    this.editModel = '';
  }

  async saveProviderKey(providerId: string): Promise<void> {
    if (!this.editApiKey.trim()) {
      this.apiKeyErrorMessage.set('Please enter an API key');
      return;
    }

    this.isSavingKey.set(true);
    this.apiKeyErrorMessage.set(null);

    try {
      await this.llmService.setApiKey(providerId, this.editApiKey.trim(), this.editModel || undefined);
      this.apiKeySuccessMessage.set(`API key for ${this.providerConfigs.find(p => p.id === providerId)?.name} saved successfully`);
      this.editingProvider.set(null);
      this.editApiKey = '';
      this.editModel = '';
      await this.loadApiKeyStatus();
    } catch {
      this.apiKeyErrorMessage.set('Failed to save API key');
    } finally {
      this.isSavingKey.set(false);
    }
  }

  async removeProviderKey(providerId: string): Promise<void> {
    try {
      await this.llmService.removeApiKey(providerId);
      this.apiKeySuccessMessage.set('API key removed');
      await this.loadApiKeyStatus();
    } catch {
      this.apiKeyErrorMessage.set('Failed to remove API key');
    }
  }

  // --- Password methods ---

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
