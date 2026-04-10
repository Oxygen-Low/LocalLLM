import { Component, signal, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LlmService, type ProviderKeyStatus, type Persona, type McpServerInfo } from '../services/llm.service';
import { CodingAgentService } from '../services/coding-agent.service';

interface ProviderConfig {
  id: string;
  name: string;
  placeholder: string;
  models: string[];
}

@Component({
  selector: 'app-settings',
  standalone: true,
  /* ⚡ Bolt: Added OnPush change detection to prevent unnecessary re-renders in this complex component. This relies on Angular Signals for targeted DOM updates, significantly reducing CPU usage during heavy streaming or state changes. */
  changeDetection: ChangeDetectionStrategy.OnPush,
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

          <!-- Persona Settings -->
          <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 sm:p-8">
            <div class="flex items-center justify-between mb-2">
              <h2 class="text-xl font-semibold text-secondary-900">Persona Settings</h2>
              <a routerLink="/personas" class="text-sm text-primary-600 hover:text-primary-700 font-medium">Manage Personas →</a>
            </div>
            <p class="text-sm text-muted mb-6">Choose which persona the AI should use by default for new chats.</p>

            @if (personaSuccessMessage()) {
              <div class="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                {{ personaSuccessMessage() }}
              </div>
            }

            <div class="space-y-4">
              <div>
                <label for="defaultPersona" class="block text-sm font-medium text-secondary-700 mb-2">
                  Default Persona
                </label>
                <div class="flex gap-3">
                  <select
                    id="defaultPersona"
                    [(ngModel)]="defaultPersonaId"
                    class="flex-1 px-4 py-3 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all bg-white text-sm"
                  >
                    <option [value]="null">No default persona</option>
                    @for (persona of personas(); track persona.id) {
                      <option [value]="persona.id">{{ persona.name }}</option>
                    }
                  </select>
                  <button
                    (click)="saveDefaultPersona()"
                    [disabled]="isSavingPersona()"
                    class="btn-primary whitespace-nowrap"
                  >
                    {{ isSavingPersona() ? 'Saving...' : 'Save Default' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Change Username -->
          <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 sm:p-8">
            <h2 class="text-xl font-semibold text-secondary-900 mb-2">Change Username</h2>
            <p class="text-sm text-muted mb-6">Update your username. A 15-minute cooldown applies between changes.</p>

            @if (usernameSuccessMessage()) {
              <div class="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                {{ usernameSuccessMessage() }}
              </div>
            }
            @if (usernameErrorMessage()) {
              <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {{ usernameErrorMessage() }}
              </div>
            }

            <form (ngSubmit)="onChangeUsername()" class="space-y-5">
              <div>
                <label for="newUsername" class="block text-sm font-medium text-secondary-700 mb-2">
                  New Username
                </label>
                <input
                  id="newUsername"
                  type="text"
                  [(ngModel)]="newUsername"
                  name="newUsername"
                  required
                  autocomplete="username"
                  class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
                  placeholder="Enter your new username"
                />
                <div class="mt-2 space-y-1">
                  <p class="text-xs" [ngClass]="usernameHasMinLength() ? 'text-green-600' : 'text-muted'">
                    {{ usernameHasMinLength() ? '✓' : '○' }} At least 3 characters
                  </p>
                  <p class="text-xs" [ngClass]="usernameHasMaxLength() ? 'text-green-600' : 'text-muted'">
                    {{ usernameHasMaxLength() ? '✓' : '○' }} At most 30 characters
                  </p>
                  <p class="text-xs" [ngClass]="isValidUsernameChars() ? 'text-green-600' : 'text-muted'">
                    {{ isValidUsernameChars() ? '✓' : '○' }} Letters, numbers, hyphens, and underscores only
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-4">
                <button
                  type="submit"
                  [disabled]="isChangingUsername()"
                  class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ isChangingUsername() ? 'Updating...' : 'Update Username' }}
                </button>
              </div>
            </form>
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
                      <div>
                        <label [for]="'apikey-' + provider.id" class="block text-xs font-medium text-secondary-600 mb-1">API Key</label>
                        <input
                          [id]="'apikey-' + provider.id"
                          type="password"
                          [(ngModel)]="editApiKey"
                          [name]="'apikey-' + provider.id"
                          [placeholder]="provider.placeholder"
                          class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm"
                          autocomplete="off"
                        />
                      </div>
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

          <!-- HuggingFace Integration -->
          <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 sm:p-8">
            <h2 class="text-xl font-semibold text-secondary-900 mb-2">HuggingFace Integration</h2>
            <p class="text-sm text-muted mb-6">Connect your HuggingFace account for faster dataset downloads and lower rate limits. Optional — public datasets and models can be accessed without a token.</p>

            @if (hfSuccessMessage()) {
              <div class="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                {{ hfSuccessMessage() }}
              </div>
            }
            @if (hfErrorMessage()) {
              <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {{ hfErrorMessage() }}
              </div>
            }

            <div class="border border-secondary-100 rounded-lg p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" [ngClass]="hfConfigured() ? 'bg-green-500' : 'bg-secondary-300'"></span>
                  <h3 class="font-medium text-secondary-900">HuggingFace Access Token</h3>
                </div>
                @if (hfConfigured()) {
                  <button
                    (click)="removeHuggingFaceToken()"
                    class="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Remove Token
                  </button>
                }
              </div>

              @if (editingHuggingFace()) {
                <div class="space-y-3">
                  <div>
                    <label for="hf-token" class="block text-xs font-medium text-secondary-600 mb-1">Access Token</label>
                    <input
                      id="hf-token"
                      type="password"
                      [(ngModel)]="hfToken"
                      name="hfToken"
                      placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm"
                      autocomplete="off"
                    />
                    <p class="mt-1.5 text-xs text-muted">
                      Create a token at
                      <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline">huggingface.co/settings/tokens</a>
                      with <strong>read</strong> access.
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <button
                      (click)="saveHuggingFaceToken()"
                      [disabled]="isSavingHuggingFace()"
                      class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {{ isSavingHuggingFace() ? 'Validating...' : 'Save Token' }}
                    </button>
                    <button
                      (click)="cancelEditHuggingFace()"
                      class="px-4 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              } @else {
                <div class="flex items-center justify-between">
                  <div class="text-sm text-muted">
                    @if (hfConfigured()) {
                      <span class="text-green-600">✓ Connected</span>
                      @if (hfUsername()) {
                        <span class="text-secondary-400 ml-2">· {{ hfUsername() }}</span>
                      }
                    } @else {
                      Not configured
                    }
                  </div>
                  <button
                    (click)="startEditHuggingFace()"
                    class="px-3 py-1.5 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
                  >
                    {{ hfConfigured() ? 'Update' : 'Configure' }}
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- GitHub Integration -->
          <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 sm:p-8">
            <h2 class="text-xl font-semibold text-secondary-900 mb-2">GitHub Integration</h2>
            <p class="text-sm text-muted mb-6">Connect your GitHub account to use the Coding Agent. Your token is encrypted and stored securely.</p>

            @if (githubSuccessMessage()) {
              <div class="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                {{ githubSuccessMessage() }}
              </div>
            }
            @if (githubErrorMessage()) {
              <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {{ githubErrorMessage() }}
              </div>
            }

            <div class="border border-secondary-100 rounded-lg p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" [ngClass]="githubConfigured() ? 'bg-green-500' : 'bg-secondary-300'"></span>
                  <h3 class="font-medium text-secondary-900">GitHub Personal Access Token</h3>
                </div>
                @if (githubConfigured()) {
                  <button
                    (click)="removeGitHubToken()"
                    class="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Remove Token
                  </button>
                }
              </div>

              @if (editingGitHub()) {
                <div class="space-y-3">
                  <div>
                    <label for="github-pat" class="block text-xs font-medium text-secondary-600 mb-1">Personal Access Token</label>
                    <input
                      id="github-pat"
                      type="password"
                      [(ngModel)]="githubToken"
                      name="githubToken"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm"
                      autocomplete="off"
                    />
                    <p class="mt-1.5 text-xs text-muted">
                      Create a token at
                      <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline">github.com/settings/tokens</a>
                      with <strong>repo</strong> scope.
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <button
                      (click)="saveGitHubToken()"
                      [disabled]="isSavingGitHub()"
                      class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {{ isSavingGitHub() ? 'Validating...' : 'Save Token' }}
                    </button>
                    <button
                      (click)="cancelEditGitHub()"
                      class="px-4 py-2 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              } @else {
                <div class="flex items-center justify-between">
                  <div class="text-sm text-muted">
                    @if (githubConfigured()) {
                      <span class="text-green-600">✓ Connected</span>
                      @if (githubUsername()) {
                        <span class="text-secondary-400 ml-2">· {{ githubUsername() }}</span>
                      }
                    } @else {
                      Not configured
                    }
                  </div>
                  <button
                    (click)="startEditGitHub()"
                    class="px-3 py-1.5 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
                  >
                    {{ githubConfigured() ? 'Update' : 'Configure' }}
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- MCP Server Authentication -->
          @if (mcpServersRequiringAuth().length > 0) {
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 sm:p-8">
              <h2 class="text-xl font-semibold text-secondary-900 mb-2">MCP Server Authentication</h2>
              <p class="text-sm text-muted mb-6">Some MCP servers require personal authentication tokens. Configure your tokens below to use these integrations.</p>

              <div class="space-y-4">
                @for (mcp of mcpServersRequiringAuth(); track mcp.id) {
                  <div class="p-4 rounded-lg border border-secondary-200 bg-secondary-50 space-y-3">
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="font-medium text-secondary-900">{{ mcp.name }}</div>
                        @if (mcp.authDescription) {
                          <p class="text-xs text-muted mt-0.5">{{ mcp.authDescription }}</p>
                        }
                      </div>
                      <div class="flex items-center gap-2">
                        @if (mcp.authenticated) {
                          <span class="text-xs text-green-600 font-medium">✓ Configured</span>
                          <button
                            (click)="removeMcpAuth(mcp.id)"
                            class="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        } @else {
                          <span class="text-xs text-amber-600">Not configured</span>
                        }
                      </div>
                    </div>
                    @if (!mcp.authenticated || editingMcpAuth() === mcp.id) {
                      <div class="flex items-center gap-2">
                        <input
                          type="password"
                          [ngModel]="mcpAuthTokens[mcp.id] || ''"
                          (ngModelChange)="mcpAuthTokens[mcp.id] = $event"
                          [placeholder]="mcp.authDescription || 'Enter token'"
                          class="flex-1 px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"
                        />
                        <button
                          (click)="saveMcpAuth(mcp.id)"
                          [disabled]="isSavingMcpAuth()"
                          class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                          {{ isSavingMcpAuth() ? 'Saving...' : 'Save' }}
                        </button>
                      </div>
                    } @else {
                      <button
                        (click)="editingMcpAuth.set(mcp.id)"
                        class="text-xs text-primary-600 hover:text-primary-700"
                      >
                        Update token
                      </button>
                    }
                  </div>
                }
              </div>
              @if (mcpAuthMessage()) {
                <div class="mt-4 text-sm" [ngClass]="mcpAuthMessageType() === 'success' ? 'text-green-600' : 'text-red-600'">
                  {{ mcpAuthMessage() }}
                </div>
              }
            </div>
          }

          <!-- Change Password -->
          <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 sm:p-8">
            <h2 class="text-xl font-semibold text-secondary-900 mb-2">Change Password</h2>
            <p class="text-sm text-muted mb-6">Update your password to keep your account secure. A 3-minute cooldown applies between changes.</p>

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
              @if (!authService.passwordResetRequired()) {
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
              }

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
  // Change username fields
  newUsername = '';
  isChangingUsername = signal(false);
  usernameErrorMessage = signal<string | null>(null);
  usernameSuccessMessage = signal<string | null>(null);

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

  // Persona fields
  personas = signal<Persona[]>([]);
  defaultPersonaId: string | null = null;
  isSavingPersona = signal(false);
  personaSuccessMessage = signal<string | null>(null);

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

  // GitHub Integration fields
  githubConfigured = signal(false);
  githubUsername = signal<string | null>(null);
  editingGitHub = signal(false);
  githubToken = '';
  isSavingGitHub = signal(false);
  githubSuccessMessage = signal<string | null>(null);
  githubErrorMessage = signal<string | null>(null);

  // HuggingFace Integration fields
  hfConfigured = signal(false);
  hfUsername = signal<string | null>(null);
  editingHuggingFace = signal(false);
  hfToken = '';
  isSavingHuggingFace = signal(false);
  hfSuccessMessage = signal<string | null>(null);
  hfErrorMessage = signal<string | null>(null);

  // MCP Server Auth fields
  mcpServersRequiringAuth = signal<McpServerInfo[]>([]);
  editingMcpAuth = signal<string | null>(null);
  mcpAuthTokens: Record<string, string> = {};
  isSavingMcpAuth = signal(false);
  mcpAuthMessage = signal<string | null>(null);
  mcpAuthMessageType = signal<'success' | 'error'>('success');

  private llmService = inject(LlmService);
  private codingAgentService = inject(CodingAgentService);

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadApiKeyStatus(),
      this.loadGitHubStatus(),
      this.loadHuggingFaceStatus(),
      this.loadPersonaData(),
      this.loadMcpServers()
    ]);
  }

  async loadPersonaData(): Promise<void> {
    try {
      const [personas, defaultId] = await Promise.all([
        this.llmService.getPersonas(),
        this.llmService.getDefaultPersonaId()
      ]);
      this.personas.set(personas);
      this.defaultPersonaId = defaultId;
    } catch {
      // Silent failure
    }
  }

  async saveDefaultPersona(): Promise<void> {
    this.isSavingPersona.set(true);
    try {
      await this.llmService.setDefaultPersonaId(this.defaultPersonaId);
      this.personaSuccessMessage.set('Default persona saved successfully');
      setTimeout(() => this.personaSuccessMessage.set(null), 3000);
    } catch {
      // Silent failure
    } finally {
      this.isSavingPersona.set(false);
    }
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

  isValidUsernameChars(): boolean {
    return this.newUsername.length > 0 && /^[a-zA-Z0-9_-]+$/.test(this.newUsername);
  }

  usernameHasMinLength(): boolean {
    return this.newUsername.length >= 3;
  }

  usernameHasMaxLength(): boolean {
    return this.newUsername.length > 0 && this.newUsername.length <= 30;
  }

  // --- Username methods ---

  async onChangeUsername(): Promise<void> {
    this.usernameErrorMessage.set(null);
    this.usernameSuccessMessage.set(null);

    if (!this.newUsername) {
      this.usernameErrorMessage.set('Please enter a new username');
      return;
    }

    this.isChangingUsername.set(true);

    try {
      const result = await this.authService.changeUsername(this.newUsername);

      if (result.success) {
        this.usernameSuccessMessage.set('Username updated successfully');
        this.newUsername = '';
      } else if (result.retryAfterSeconds) {
        const minutes = Math.ceil(result.retryAfterSeconds / 60);
        this.usernameErrorMessage.set(`Username was changed recently. Please wait ${minutes} minute${minutes !== 1 ? 's' : ''} before changing it again.`);
      } else {
        this.usernameErrorMessage.set(result.error ?? 'Failed to update username');
      }
    } catch {
      this.usernameErrorMessage.set('An unexpected error occurred. Please try again.');
    } finally {
      this.isChangingUsername.set(false);
    }
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

  // --- GitHub Integration methods ---

  async loadGitHubStatus(): Promise<void> {
    try {
      const status = await this.codingAgentService.getGitHubStatus();
      this.githubConfigured.set(status.configured);
      this.githubUsername.set(status.username);
    } catch {
      // Silent failure
    }
  }

  startEditGitHub(): void {
    this.editingGitHub.set(true);
    this.githubToken = '';
    this.githubSuccessMessage.set(null);
    this.githubErrorMessage.set(null);
  }

  cancelEditGitHub(): void {
    this.editingGitHub.set(false);
    this.githubToken = '';
  }

  async saveGitHubToken(): Promise<void> {
    if (!this.githubToken.trim()) {
      this.githubErrorMessage.set('Please enter a GitHub token');
      return;
    }

    this.isSavingGitHub.set(true);
    this.githubErrorMessage.set(null);

    try {
      const result = await this.codingAgentService.setGitHubToken(this.githubToken.trim());
      this.githubSuccessMessage.set(`GitHub connected as ${result.username}`);
      this.editingGitHub.set(false);
      this.githubToken = '';
      await this.loadGitHubStatus();
    } catch (err: unknown) {
      const httpErr = err as { error?: { error?: string } };
      this.githubErrorMessage.set(httpErr?.error?.error || 'Failed to save GitHub token');
    } finally {
      this.isSavingGitHub.set(false);
    }
  }

  async removeGitHubToken(): Promise<void> {
    try {
      await this.codingAgentService.removeGitHubToken();
      this.githubSuccessMessage.set('GitHub token removed');
      await this.loadGitHubStatus();
    } catch {
      this.githubErrorMessage.set('Failed to remove GitHub token');
    }
  }

  // --- HuggingFace Integration methods ---

  async loadHuggingFaceStatus(): Promise<void> {
    try {
      const status = await this.llmService.getHuggingFaceStatus();
      this.hfConfigured.set(status.configured);
      this.hfUsername.set(status.username);
    } catch {
      // Silent failure
    }
  }

  startEditHuggingFace(): void {
    this.editingHuggingFace.set(true);
    this.hfToken = '';
    this.hfSuccessMessage.set(null);
    this.hfErrorMessage.set(null);
  }

  cancelEditHuggingFace(): void {
    this.editingHuggingFace.set(false);
    this.hfToken = '';
  }

  async saveHuggingFaceToken(): Promise<void> {
    if (!this.hfToken.trim()) {
      this.hfErrorMessage.set('Please enter a HuggingFace token');
      return;
    }

    this.isSavingHuggingFace.set(true);
    this.hfErrorMessage.set(null);

    try {
      const result = await this.llmService.setHuggingFaceToken(this.hfToken.trim());
      this.hfSuccessMessage.set(result.username ? `HuggingFace connected as ${result.username}` : 'HuggingFace token saved');
      this.editingHuggingFace.set(false);
      this.hfToken = '';
      await this.loadHuggingFaceStatus();
    } catch (err: unknown) {
      const httpErr = err as { error?: { error?: string } };
      this.hfErrorMessage.set(httpErr?.error?.error || 'Failed to save HuggingFace token');
    } finally {
      this.isSavingHuggingFace.set(false);
    }
  }

  async removeHuggingFaceToken(): Promise<void> {
    try {
      await this.llmService.removeHuggingFaceToken();
      this.hfSuccessMessage.set('HuggingFace token removed');
      await this.loadHuggingFaceStatus();
    } catch {
      this.hfErrorMessage.set('Failed to remove HuggingFace token');
    }
  }

  // --- Password methods ---

  async onChangePassword(): Promise<void> {
    this.passwordErrorMessage.set(null);
    this.passwordSuccessMessage.set(null);

    const resetRequired = this.authService.passwordResetRequired();

    if (!resetRequired && !this.currentPassword) {
      this.passwordErrorMessage.set('Please fill in all fields');
      return;
    }

    if (!this.newPassword || !this.confirmNewPassword) {
      this.passwordErrorMessage.set('Please fill in all fields');
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.passwordErrorMessage.set('New passwords do not match');
      return;
    }

    if (this.currentPassword && this.currentPassword === this.newPassword) {
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
      } else if (result.retryAfterSeconds) {
        const minutes = Math.ceil(result.retryAfterSeconds / 60);
        this.passwordErrorMessage.set(`Password was changed recently. Please wait ${minutes} minute${minutes !== 1 ? 's' : ''} before changing it again.`);
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

  // --- MCP Server Auth ---

  async loadMcpServers(): Promise<void> {
    try {
      const servers = await this.llmService.getMcpServers();
      this.mcpServersRequiringAuth.set(servers.filter(s => s.authRequired));
    } catch {
      // Silent failure
    }
  }

  async saveMcpAuth(serverId: string): Promise<void> {
    const token = this.mcpAuthTokens[serverId]?.trim();
    if (!token) {
      this.mcpAuthMessage.set('Please enter a token');
      this.mcpAuthMessageType.set('error');
      return;
    }

    this.isSavingMcpAuth.set(true);
    this.mcpAuthMessage.set(null);

    try {
      await this.llmService.setMcpAuth(serverId, token);
      this.mcpAuthMessage.set('Token saved successfully');
      this.mcpAuthMessageType.set('success');
      this.mcpAuthTokens[serverId] = '';
      this.editingMcpAuth.set(null);
      await this.loadMcpServers();
    } catch {
      this.mcpAuthMessage.set('Failed to save token');
      this.mcpAuthMessageType.set('error');
    } finally {
      this.isSavingMcpAuth.set(false);
    }
  }

  async removeMcpAuth(serverId: string): Promise<void> {
    try {
      await this.llmService.removeMcpAuth(serverId);
      this.mcpAuthMessage.set('Token removed');
      this.mcpAuthMessageType.set('success');
      await this.loadMcpServers();
    } catch {
      this.mcpAuthMessage.set('Failed to remove token');
      this.mcpAuthMessageType.set('error');
    }
  }
}
