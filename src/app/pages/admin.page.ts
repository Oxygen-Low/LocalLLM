import { Component, signal, ChangeDetectionStrategy, ViewChild, ElementRef, OnDestroy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AdminService, AdminUserSummary, Universe, Character, LocalModel, McpServer, Relationship } from '../services/admin.service';
import { LlmService } from '../services/llm.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  /* ⚡ Bolt: Added OnPush change detection to prevent unnecessary re-renders in this complex component. This relies on Angular Signals for targeted DOM updates, significantly reducing CPU usage during heavy streaming or state changes. */
  changeDetection: ChangeDetectionStrategy.OnPush,
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
                    <div class="space-y-3 p-4 border border-secondary-100 rounded-lg bg-secondary-50">
                      <h4 class="text-sm font-semibold text-secondary-900">Create new universe</h4>
                      <div class="space-y-2">
                        <div>
                          <label for="newUniverseName" class="block text-xs font-medium text-secondary-700 mb-1">Universe name</label>
                          <input
                            id="newUniverseName"
                            type="text"
                            [(ngModel)]="newUniverseName"
                            placeholder="e.g. Cyberpunk City"
                            class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label for="newUniverseDesc" class="block text-xs font-medium text-secondary-700 mb-1">Universe description (AI only)</label>
                          <textarea
                            id="newUniverseDesc"
                            [(ngModel)]="newUniverseDesc"
                            placeholder="Describe the universe setting, rules, and vibe..."
                            rows="3"
                            class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm bg-white resize-none"
                          ></textarea>
                        </div>
                        <button
                          (click)="onCreateUniverse()"
                          [disabled]="!newUniverseName.trim()"
                          class="w-full px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          Create Universe
                        </button>
                      </div>
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
                            <div class="p-4 bg-secondary-50 rounded-t-lg flex flex-col gap-3">
                              @if (editingUniverseId() === universe.id) {
                                <div class="space-y-2">
                                  <input
                                    type="text"
                                    [(ngModel)]="editingUniverseName"
                                    class="w-full px-3 py-1.5 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"
                                  />
                                  <textarea
                                    [(ngModel)]="editingUniverseDesc"
                                    rows="3"
                                    class="w-full px-3 py-1.5 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm resize-none"
                                  ></textarea>
                                  <div class="flex items-center gap-2">
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
                                </div>
                              } @else {
                                <div class="flex items-center justify-between gap-3 flex-wrap">
                                  <div class="flex flex-col">
                                    <div class="flex items-center gap-2">
                                      <span class="font-semibold text-secondary-900">{{ universe.name }}</span>
                                      <span class="text-xs text-muted">({{ universe.characters.length }} character{{ universe.characters.length !== 1 ? 's' : '' }})</span>
                                    </div>
                                    @if (universe.description) {
                                      <p class="text-xs text-muted mt-1 line-clamp-1 italic">{{ universe.description }}</p>
                                    }
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
                                </div>
                              }
                            </div>

                            <!-- Characters List -->
                            <div class="p-4 space-y-3">
                              <!-- Add Character -->
                              <div class="space-y-2">
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

                                <div class="space-y-1">
                                  <button
                                    (click)="newCharacterRelExpanded[universe.id] = !newCharacterRelExpanded[universe.id]"
                                    class="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                                  >
                                    {{ newCharacterRelExpanded[universe.id] ? '▼' : '▶' }}
                                    Relationships ({{ (newCharacterRelationships[universe.id] || []).length }})
                                  </button>

                                  @if (newCharacterRelExpanded[universe.id]) {
                                    <div class="p-2 border border-secondary-100 rounded bg-secondary-50 space-y-2">
                                      <p class="text-[10px] text-muted">Relationships can be added after creation for full search functionality.</p>
                                      @for (rel of newCharacterRelationships[universe.id] || []; track $index) {
                                        <div class="flex items-center gap-2 text-xs bg-white p-1.5 rounded border border-secondary-100">
                                          <span class="font-medium">{{ rel.targetName }}</span>
                                          <span class="text-muted">({{ rel.type }})</span>
                                          <button type="button" aria-label="Remove relationship" title="Remove relationship" (click)="removeRelationshipNew(universe.id, $index)" class="text-red-500 ml-auto outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded px-1">✖</button>
                                        </div>
                                      }
                                      <div class="flex gap-1">
                                        <input
                                          #newRelName
                                          type="text"
                                          placeholder="Name"
                                          class="flex-1 px-2 py-1 rounded border border-secondary-200 text-xs"
                                        />
                                        <button
                                          (click)="addCharacterRelationship(newRelName.value, universe.id); newRelName.value = ''"
                                          class="px-2 py-1 rounded bg-secondary-200 text-xs"
                                        >Add</button>
                                      </div>
                                    </div>
                                  }
                                </div>
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

                                          <!-- Relationships Editor -->
                                          <div class="space-y-2 border border-secondary-100 rounded-lg p-3 bg-secondary-50">
                                            <button
                                              (click)="relationshipsExpanded.set(!relationshipsExpanded())"
                                              class="flex items-center justify-between w-full text-sm font-semibold text-secondary-900"
                                            >
                                              <span>Relationships ({{ editingCharacterRelationships().length }})</span>
                                              <span>{{ relationshipsExpanded() ? '▲' : '▼' }}</span>
                                            </button>

                                            @if (relationshipsExpanded()) {
                                              <div class="space-y-3 pt-2">
                                                <!-- Current Relationships -->
                                                @if (editingCharacterRelationships().length > 0) {
                                                  <div class="space-y-2">
                                                    @for (rel of editingCharacterRelationships(); track $index) {
                                                      <div class="bg-white p-2 rounded border border-secondary-200 text-sm space-y-1">
                                                        <div class="flex items-center justify-between">
                                                          <span class="font-medium text-secondary-900">{{ rel.targetName }}</span>
                                                          <button type="button" aria-label="Remove relationship" title="Remove relationship" (click)="removeRelationship($index)" class="text-red-500 hover:text-red-700 outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded px-1">
                                                            <span class="sr-only">Remove</span>✖
                                                          </button>
                                                        </div>
                                                        <div class="grid grid-cols-2 gap-2">
                                                          <input
                                                            type="text"
                                                            [(ngModel)]="rel.type"
                                                            placeholder="Relationship type (e.g. Friend)"
                                                            class="px-2 py-1 rounded border border-secondary-200 text-xs w-full"
                                                          />
                                                          <input
                                                            type="text"
                                                            [(ngModel)]="rel.description"
                                                            placeholder="Details (optional)"
                                                            class="px-2 py-1 rounded border border-secondary-200 text-xs w-full"
                                                          />
                                                        </div>
                                                      </div>
                                                    }
                                                  </div>
                                                }

                                                <!-- Search & Add -->
                                                <div class="space-y-2 border-t border-secondary-200 pt-3">
                                                  <div class="flex items-center gap-2">
                                                    <div class="relative flex-1">
                                                      <input
                                                        type="text"
                                                        [ngModel]="relationshipSearchQuery()"
                                                        (ngModelChange)="relationshipSearchQuery.set($event)"
                                                        placeholder="Search for a character or enter a name..."
                                                        class="w-full px-3 py-1.5 rounded-lg border border-secondary-200 text-xs"
                                                      />
                                                      @if (relationshipSearchQuery()) {
                                                        <div class="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg overflow-hidden">
                                                          @for (item of filteredCharactersForRelationship(); track item.char.id) {
                                                            <button
                                                              (click)="addRelationship(item)"
                                                              class="w-full text-left px-3 py-2 text-xs hover:bg-primary-50 transition-colors border-b border-secondary-50 last:border-0"
                                                            >
                                                              <div class="font-medium text-secondary-900">{{ item.char.name }}</div>
                                                              <div class="text-[10px] text-muted">{{ item.universeName }}</div>
                                                            </button>
                                                          }
                                                          @if (relationshipSearchQuery().trim()) {
                                                            <button
                                                              (click)="addRelationship()"
                                                              class="w-full text-left px-3 py-2 text-xs bg-secondary-50 hover:bg-secondary-100 transition-colors"
                                                            >
                                                              Add "<span class="font-medium">{{ relationshipSearchQuery() }}</span>" as name-only
                                                            </button>
                                                          }
                                                        </div>
                                                      }
                                                    </div>
                                                    <div class="flex rounded-lg border border-secondary-200 overflow-hidden shrink-0">
                                                      <button
                                                        (click)="relationshipSearchMode.set('same')"
                                                        [class]="relationshipSearchMode() === 'same' ? 'bg-primary-100 text-primary-700' : 'bg-white text-secondary-600'"
                                                        class="px-2 py-1 text-[10px] font-medium transition-colors"
                                                      >Same</button>
                                                      <button
                                                        (click)="relationshipSearchMode.set('other')"
                                                        [class]="relationshipSearchMode() === 'other' ? 'bg-primary-100 text-primary-700' : 'bg-white text-secondary-600'"
                                                        class="px-2 py-1 text-[10px] font-medium transition-colors border-l border-secondary-200"
                                                      >Other</button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            }
                                          </div>

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
                                            @if (char.relationships && char.relationships.length > 0) {
                                              <div class="flex flex-wrap gap-1 mt-1">
                                                @for (rel of char.relationships; track $index) {
                                                  <span class="inline-flex items-center px-1.5 py-0.5 rounded-full bg-secondary-100 text-secondary-700 text-[10px] font-medium border border-secondary-200" [title]="rel.description || ''">
                                                    {{ rel.targetName }} ({{ rel.type }})
                                                  </span>
                                                }
                                              </div>
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

              <!-- LLM Models Management -->
              <div class="bg-white border border-secondary-200 rounded-xl shadow-sm p-6 space-y-4">
                <div class="flex items-center justify-between gap-3 flex-wrap">
                  <div class="space-y-1">
                    <h2 class="text-xl font-semibold text-secondary-900">LLM Models</h2>
                    <p class="text-sm text-muted">
                      Download HuggingFace models or upload your own GGUF files for local AI inference. Users can select from available models.
                    </p>
                  </div>
                  <button
                    (click)="toggleModelMenu()"
                    class="px-4 py-2 rounded-lg border border-secondary-200 bg-secondary-50 hover:bg-secondary-100 transition-colors font-medium text-secondary-900"
                  >
                    {{ modelMenuOpen() ? 'Hide models' : 'Manage models' }}
                  </button>
                </div>

                @if (modelMenuOpen()) {
                  <div class="space-y-4">
                    <!-- HuggingFace Credential -->
                    <div class="space-y-3 p-4 border border-secondary-100 rounded-lg bg-secondary-50">
                      <div class="flex items-center justify-between">
                        <h4 class="text-sm font-semibold text-secondary-900">HuggingFace Credential</h4>
                        <span class="w-2 h-2 rounded-full" [ngClass]="adminHfConfigured() ? 'bg-green-500' : 'bg-secondary-300'"></span>
                      </div>
                      <p class="text-xs text-muted">Optional — improves download speeds and reduces rate limiting for model downloads.</p>
                      @if (adminHfMessage()) {
                        <div class="p-2 rounded text-xs" [ngClass]="adminHfMessageType() === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'">
                          {{ adminHfMessage() }}
                        </div>
                      }
                      @if (editingAdminHf()) {
                        <div class="space-y-2">
                          <input
                            id="adminHfToken"
                            type="password"
                            [(ngModel)]="adminHfToken"
                            placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm bg-white"
                            autocomplete="off"
                          />
                          <p class="text-xs text-muted">
                            Create a token at
                            <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline">huggingface.co/settings/tokens</a>
                            with <strong>read</strong> access.
                          </p>
                          <div class="flex gap-2">
                            <button
                              (click)="saveAdminHfToken()"
                              [disabled]="isSavingAdminHf()"
                              class="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                            >
                              {{ isSavingAdminHf() ? 'Validating...' : 'Save' }}
                            </button>
                            <button
                              (click)="editingAdminHf.set(false); adminHfToken = ''"
                              class="px-3 py-1.5 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      } @else {
                        <div class="flex items-center justify-between">
                          <div class="text-sm text-muted">
                            @if (adminHfConfigured()) {
                              <span class="text-green-600">✓ Configured</span>
                              @if (adminHfUsername()) {
                                <span class="text-secondary-400 ml-2">· {{ adminHfUsername() }}</span>
                              }
                            } @else {
                              Not configured
                            }
                          </div>
                          <div class="flex gap-2">
                            <button
                              (click)="editingAdminHf.set(true); adminHfToken = ''; adminHfMessage.set(null)"
                              class="px-3 py-1.5 rounded-lg border border-secondary-200 text-sm font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
                            >
                              {{ adminHfConfigured() ? 'Update' : 'Configure' }}
                            </button>
                            @if (adminHfConfigured()) {
                              <button
                                (click)="removeAdminHfToken()"
                                class="px-3 py-1.5 rounded-lg border border-red-200 text-xs text-red-500 hover:text-red-700 transition-colors"
                              >
                                Remove
                              </button>
                            }
                          </div>
                        </div>
                      }
                    </div>

                    <!-- Upload GGUF Model -->
                    <div class="space-y-3 p-4 border border-secondary-100 rounded-lg bg-secondary-50">
                      <h4 class="text-sm font-semibold text-secondary-900">Upload GGUF model</h4>
                      <div class="space-y-2">
                        <div>
                          <label for="ggufFile" class="block text-xs font-medium text-secondary-700 mb-1">GGUF file</label>
                          <input
                            #ggufFileInput
                            id="ggufFile"
                            type="file"
                            accept=".gguf"
                            (change)="onGgufFileSelected($event)"
                            class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm bg-white file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                          />
                        </div>
                        <div>
                          <label for="uploadModelName" class="block text-xs font-medium text-secondary-700 mb-1">Display name (optional)</label>
                          <input
                            id="uploadModelName"
                            type="text"
                            [(ngModel)]="uploadModelName"
                            placeholder="e.g. My Custom Model"
                            class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm bg-white"
                          />
                        </div>
                        <button
                          (click)="onUploadModel()"
                          [disabled]="!selectedGgufFile || isUploadingModel()"
                          class="w-full px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {{ isUploadingModel() ? 'Uploading...' : 'Upload GGUF Model' }}
                        </button>
                      </div>
                    </div>

                    <!-- Download Model -->
                    <div class="space-y-3 p-4 border border-secondary-100 rounded-lg bg-secondary-50">
                      <h4 class="text-sm font-semibold text-secondary-900">Download from HuggingFace</h4>
                      <div class="space-y-2">
                        <div>
                          <label for="modelRepoId" class="block text-xs font-medium text-secondary-700 mb-1">HuggingFace Model ID</label>
                          <input
                            id="modelRepoId"
                            type="text"
                            [(ngModel)]="modelRepoId"
                            placeholder="e.g. TinyLlama/TinyLlama-1.1B-Chat-v1.0"
                            class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label for="newModelName" class="block text-xs font-medium text-secondary-700 mb-1">Display name (optional)</label>
                          <input
                            id="newModelName"
                            type="text"
                            [(ngModel)]="newModelName"
                            placeholder="e.g. TinyLlama 1.1B Chat"
                            class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm bg-white"
                          />
                        </div>
                        <button
                          (click)="onDownloadModel()"
                          [disabled]="!modelRepoId.trim() || isDownloadingModel()"
                          class="w-full px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {{ isDownloadingModel() ? 'Downloading...' : 'Download Model' }}
                        </button>
                        @if (downloadProgress(); as progress) {
                          <div class="mt-2 space-y-1">
                            <div class="w-full bg-secondary-200 rounded-full h-2 overflow-hidden">
                              <div
                                class="bg-primary-600 h-2 rounded-full transition-all duration-500"
                                [style.width.%]="progress.totalFiles > 0 ? (progress.downloadedFiles / progress.totalFiles * 100) : 0"
                              ></div>
                            </div>
                            <div class="text-xs text-secondary-600 text-center">
                              @if (progress.totalFiles > 0) {
                                {{ progress.downloadedFiles }} of {{ progress.totalFiles }} files ({{ (progress.downloadedFiles / progress.totalFiles * 100) | number:'1.0-0' }}%)
                              } @else {
                                Downloading… {{ progress.downloadedFiles }} files
                              }
                            </div>
                          </div>
                        } @else if (isDownloadingModel()) {
                          <div class="mt-2 text-xs text-secondary-600 text-center">Starting download…</div>
                        }
                      </div>
                    </div>

                    @if (isLoadingModels()) {
                      <div class="text-sm text-muted">Loading models...</div>
                    } @else if (localModels().length === 0) {
                      <div class="text-sm text-muted">No models downloaded yet.</div>
                    } @else {
                      <div class="divide-y divide-secondary-100 border border-secondary-100 rounded-lg">
                        @for (model of localModels(); track model.id) {
                          <div class="p-4 flex items-center justify-between gap-4 flex-wrap">
                            <div class="space-y-1">
                              <div class="font-semibold text-secondary-900 flex items-center gap-2">
                                {{ model.name }}
                                <span class="text-xs px-1.5 py-0.5 rounded font-medium" [class]="model.type === 'gguf' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'">
                                  {{ model.type === 'gguf' ? 'GGUF' : 'HuggingFace' }}
                                </span>
                              </div>
                              <p class="text-xs text-muted">
                                @if (model.huggingFaceId) {
                                  {{ model.huggingFaceId }} ·
                                }
                                {{ formatFileSize(model.size) }} · Added {{ model.downloadedAt | date: 'medium' }}
                              </p>
                            </div>
                            <button
                              (click)="onDeleteModel(model)"
                              [disabled]="actionInProgress() === model.id"
                              class="px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              {{ actionInProgress() === model.id ? 'Deleting...' : 'Delete' }}
                            </button>
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

              <div class="flex items-center justify-between gap-4 p-4 rounded-lg border border-secondary-200 bg-secondary-50">
                <div class="space-y-1">
                  <div class="font-medium text-secondary-900 flex items-center gap-2">
                    <span>🤖</span>
                    Kobold.cpp
                  </div>
                  <p class="text-sm text-muted">
                    Enable auto-detection and usage of a locally running Kobold.cpp server as an LLM provider.
                  </p>
                </div>
                <button
                  (click)="onToggleKobold()"
                  [disabled]="isTogglingKobold()"
                  [class]="koboldEnabled()
                    ? 'px-4 py-2 rounded-lg bg-red-100 border border-red-200 text-red-700 hover:bg-red-200 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'
                    : 'px-4 py-2 rounded-lg bg-green-100 border border-green-200 text-green-700 hover:bg-green-200 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'"
                >
                  {{ isTogglingKobold() ? 'Updating...' : (koboldEnabled() ? 'Disable' : 'Enable') }}
                </button>
              </div>

              <div class="flex items-center justify-between gap-4 p-4 rounded-lg border border-secondary-200 bg-secondary-50">
                <div class="space-y-1">
                  <div class="font-medium text-secondary-900 flex items-center gap-2">
                    <span>🦙</span>
                    Ollama
                  </div>
                  <p class="text-sm text-muted">
                    Enable auto-detection and usage of a locally running Ollama server as an LLM provider.
                  </p>
                </div>
                <button
                  (click)="onToggleOllama()"
                  [disabled]="isTogglingOllama()"
                  [class]="ollamaEnabled()
                    ? 'px-4 py-2 rounded-lg bg-red-100 border border-red-200 text-red-700 hover:bg-red-200 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'
                    : 'px-4 py-2 rounded-lg bg-green-100 border border-green-200 text-green-700 hover:bg-green-200 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'"
                >
                  {{ isTogglingOllama() ? 'Updating...' : (ollamaEnabled() ? 'Disable' : 'Enable') }}
                </button>
              </div>

              <div class="flex items-center justify-between gap-4 p-4 rounded-lg border border-secondary-200 bg-secondary-50">
                <div class="space-y-1">
                  <div class="font-medium text-secondary-900 flex items-center gap-2">
                    <span>📊</span>
                    Dataset Token Limit
                  </div>
                  <p class="text-sm text-muted">
                    Maximum number of tokens (in GB) allowed per generated dataset. Default is 40 GB.
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    type="number"
                    [(ngModel)]="datasetTokenLimitGB"
                    min="1"
                    max="1000"
                    step="1"
                    class="w-24 px-3 py-2 rounded-lg border border-secondary-200 text-sm text-right"
                  />
                  <span class="text-sm text-muted whitespace-nowrap">GB</span>
                  <button
                    (click)="onSaveDatasetTokenLimit()"
                    [disabled]="isSavingDatasetTokenLimit()"
                    class="px-4 py-2 rounded-lg bg-primary-100 border border-primary-200 text-primary-700 hover:bg-primary-200 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {{ isSavingDatasetTokenLimit() ? 'Saving...' : 'Save' }}
                  </button>
                </div>
              </div>
            </div>
          }

          @if (isUnlocked()) {
            <!-- MCP Servers Management -->
            <div class="bg-white border border-secondary-200 rounded-xl shadow-sm p-6 space-y-4">
              <div class="space-y-1">
                <h2 class="text-xl font-semibold text-secondary-900">MCP Servers</h2>
                <p class="text-sm text-muted">
                  Add Docker MCP (Model Context Protocol) servers to extend the general assistant and coding agent with external tools. Users can toggle these in the MCPs dropdown when chatting.
                </p>
              </div>

              <!-- Add New MCP Server Form -->
              <div class="p-4 rounded-lg border border-secondary-200 bg-secondary-50 space-y-3">
                <div class="font-medium text-secondary-900 text-sm">Add new MCP server</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-secondary-700 mb-1">Name</label>
                    <input
                      type="text"
                      [(ngModel)]="newMcpName"
                      placeholder="e.g. GitHub"
                      maxlength="100"
                      class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-secondary-700 mb-1">Docker Image</label>
                    <input
                      type="text"
                      [(ngModel)]="newMcpImage"
                      placeholder="e.g. mcp/github"
                      maxlength="200"
                      class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-secondary-700 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    [(ngModel)]="newMcpDescription"
                    placeholder="Brief description of what this MCP server provides"
                    maxlength="500"
                    class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"
                  />
                </div>
                <div class="flex items-center gap-3">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="newMcpAuthRequired" class="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500" />
                    <span class="text-sm text-secondary-800">Requires user authentication</span>
                  </label>
                </div>
                @if (newMcpAuthRequired) {
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-secondary-700 mb-1">Auth Env Variable</label>
                      <input
                        type="text"
                        [(ngModel)]="newMcpAuthEnvVar"
                        placeholder="e.g. GITHUB_TOKEN"
                        class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-secondary-700 mb-1">Auth Description (shown to users)</label>
                      <input
                        type="text"
                        [(ngModel)]="newMcpAuthDescription"
                        placeholder="e.g. GitHub Personal Access Token"
                        maxlength="200"
                        class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"
                      />
                    </div>
                  </div>
                }
                <div class="flex items-center gap-2">
                  <button
                    (click)="onAddMcpServer()"
                    [disabled]="isAddingMcpServer()"
                    class="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ isAddingMcpServer() ? 'Adding...' : 'Add MCP Server' }}
                  </button>
                  @if (mcpMessage()) {
                    <span class="text-sm" [ngClass]="mcpMessageType() === 'success' ? 'text-green-600' : 'text-red-600'">
                      {{ mcpMessage() }}
                    </span>
                  }
                </div>
              </div>

              <!-- Existing MCP Servers List -->
              @if (mcpServers().length > 0) {
                <div class="space-y-2">
                  @for (server of mcpServers(); track server.id) {
                    <div class="p-4 rounded-lg border border-secondary-200 bg-white space-y-2">
                      <div class="flex items-center justify-between gap-3">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="font-medium text-secondary-900">{{ server.name }}</span>
                            <span class="text-xs px-2 py-0.5 rounded-full font-mono" [ngClass]="server.enabled ? 'bg-green-100 text-green-700' : 'bg-secondary-100 text-secondary-500'">
                              {{ server.enabled ? 'Enabled' : 'Disabled' }}
                            </span>
                            @if (server.authRequired) {
                              <span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Auth required</span>
                            }
                          </div>
                          <p class="text-xs text-muted font-mono mt-0.5">{{ server.image }}</p>
                          @if (server.description) {
                            <p class="text-xs text-muted mt-0.5">{{ server.description }}</p>
                          }
                        </div>
                        <div class="flex items-center gap-2">
                          <button
                            (click)="onToggleMcpServer(server)"
                            [disabled]="actionInProgress() !== null"
                            class="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50"
                            [ngClass]="server.enabled
                              ? 'border-red-200 text-red-700 hover:bg-red-50'
                              : 'border-green-200 text-green-700 hover:bg-green-50'"
                          >
                            {{ server.enabled ? 'Disable' : 'Enable' }}
                          </button>
                          <button
                            (click)="onDeleteMcpServer(server)"
                            [disabled]="actionInProgress() !== null"
                            class="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <p class="text-sm text-muted text-center py-4">No MCP servers configured yet. Add one above to get started.</p>
              }
            </div>
          }

          @if (isUnlocked()) {
            <!-- Auto-Sync Settings -->
            <div class="bg-white border border-secondary-200 rounded-xl shadow-sm p-6 space-y-4">
              <div class="space-y-1">
                <h2 class="text-xl font-semibold text-secondary-900">Auto-Sync</h2>
                <p class="text-sm text-muted">
                  Automatically sync your data to an external directory (e.g. OneDrive, Google Drive, Dropbox) when the server starts and stops.
                  This allows you to share data between multiple computers.
                </p>
              </div>

              <div class="flex items-center justify-between gap-4 p-4 rounded-lg border border-secondary-200 bg-secondary-50">
                <div class="space-y-1">
                  <div class="font-medium text-secondary-900 flex items-center gap-2">
                    <span>🔄</span>
                    Enable Auto-Sync
                  </div>
                  <p class="text-sm text-muted">
                    When enabled, data will be synced to the specified directory on server start/stop.
                  </p>
                </div>
                <button
                  (click)="onToggleAutoSync()"
                  [disabled]="isTogglingAutoSync() || (!autoSyncEnabled() && !autoSyncDirectory.trim())"
                  [class]="autoSyncEnabled()
                    ? 'px-4 py-2 rounded-lg bg-red-100 border border-red-200 text-red-700 hover:bg-red-200 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'
                    : 'px-4 py-2 rounded-lg bg-green-100 border border-green-200 text-green-700 hover:bg-green-200 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'"
                >
                  {{ isTogglingAutoSync() ? 'Updating...' : (autoSyncEnabled() ? 'Disable' : 'Enable') }}
                </button>
              </div>

              <div class="space-y-3">
                <div>
                  <label for="autoSyncDir" class="block text-sm font-medium text-secondary-800 mb-1">Sync directory</label>
                  <input
                    id="autoSyncDir"
                    type="text"
                    [(ngModel)]="autoSyncDirectory"
                    placeholder="e.g. C:\\Users\\YourName\\OneDrive\\LocalLLM"
                    class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm"
                  />
                  <p class="text-xs text-muted mt-1">
                    A folder named "LocalLLM Data" will be created inside this directory containing your data.
                  </p>
                </div>

                <div class="flex items-center gap-3">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="autoSyncExcludeModels" class="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500" />
                    <span class="text-sm text-secondary-800">Exclude models (recommended — models are usually too large for cloud storage)</span>
                  </label>
                </div>

                <div class="flex items-center gap-3">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="autoSyncEncrypt" class="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500" />
                    <span class="text-sm text-secondary-800">Encrypt data before saving (for privacy)</span>
                  </label>
                </div>
              </div>

              @if (autoSyncEnabled()) {
                <div class="space-y-3 border-t border-secondary-200 pt-4">
                  <div class="flex items-center justify-between gap-3 flex-wrap">
                    <div class="space-y-1">
                      <div class="font-medium text-secondary-900 text-sm">Sync status</div>
                      @if (autoSyncLastSync()) {
                        <p class="text-xs text-muted">Last sync: {{ autoSyncLastSync() | date: 'medium' }}</p>
                      } @else {
                        <p class="text-xs text-muted">No sync performed yet.</p>
                      }
                      @if (autoSyncLastError()) {
                        <p class="text-xs text-red-600">Last error: {{ autoSyncLastError() }}</p>
                      }
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        (click)="onTriggerSync('push')"
                        [disabled]="isSyncing()"
                        class="px-3 py-2 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 transition-colors disabled:opacity-50 text-sm"
                      >
                        {{ isSyncing() ? 'Syncing...' : 'Push to remote' }}
                      </button>
                      <button
                        (click)="onTriggerSync('pull')"
                        [disabled]="isSyncing()"
                        class="px-3 py-2 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 transition-colors disabled:opacity-50 text-sm"
                      >
                        {{ isSyncing() ? 'Syncing...' : 'Pull from remote' }}
                      </button>
                    </div>
                  </div>
                </div>
              }

              <div class="border-t border-secondary-200 pt-4 space-y-3">
                <div class="space-y-1">
                  <div class="font-medium text-secondary-900 text-sm">Import from existing sync folder</div>
                  <p class="text-xs text-muted">
                    If you have an existing "LocalLLM Data" folder from another device, enter the parent directory path to import it.
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    [(ngModel)]="importSyncDirectory"
                    placeholder="e.g. C:\\Users\\YourName\\OneDrive\\LocalLLM"
                    class="flex-1 px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"
                  />
                  <button
                    (click)="onImportSync()"
                    [disabled]="!importSyncDirectory.trim() || isImportingSync()"
                    class="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                  >
                    {{ isImportingSync() ? 'Importing...' : 'Import' }}
                  </button>
                </div>
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
export class AdminPageComponent implements OnDestroy {
  @ViewChild('ggufFileInput') ggufFileInput?: ElementRef<HTMLInputElement>;

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
  newUniverseDesc = '';
  editingUniverseId = signal<string | null>(null);
  editingUniverseName = '';
  editingUniverseDesc = '';
  editingCharacterId = signal<string | null>(null);
  editingCharacterName = '';
  editingCharacterDesc = '';
  editingCharacterRelationships = signal<Relationship[]>([]);
  relationshipSearchQuery = signal('');
  relationshipSearchMode = signal<'same' | 'other'>('same');
  relationshipsExpanded = signal(false);

  newCharacterNames: Record<string, string> = {};
  newCharacterDescs: Record<string, string> = {};
  newCharacterRelationships: Record<string, Relationship[]> = {};
  newCharacterRelExpanded: Record<string, boolean> = {};

  filteredCharactersForRelationship = computed(() => {
    const query = this.relationshipSearchQuery().toLowerCase().trim();
    const mode = this.relationshipSearchMode();
    const editingId = this.editingCharacterId();
    const currentUniverseId = this.universes().find(u =>
      u.characters.some(c => c.id === editingId)
    )?.id;

    const pool: { char: Character; universeName: string }[] = [];

    this.universes().forEach(u => {
      if (mode === 'same' && u.id !== currentUniverseId) return;
      if (mode === 'other' && u.id === currentUniverseId) return;

      u.characters.forEach(c => {
        if (c.id !== editingId) {
          pool.push({ char: c, universeName: u.name });
        }
      });
    });

    if (!query) return pool.slice(0, 10);
    return pool.filter(p =>
      p.char.name.toLowerCase().includes(query) ||
      p.universeName.toLowerCase().includes(query)
    ).slice(0, 10);
  });

  // App Settings state
  riskyAppsEnabled = signal<boolean>(true);
  isTogglingRiskyApps = signal(false);
  koboldEnabled = signal<boolean>(false);
  isTogglingKobold = signal(false);
  ollamaEnabled = signal<boolean>(false);
  isTogglingOllama = signal(false);
  datasetTokenLimitGB = 40;
  isSavingDatasetTokenLimit = signal(false);

  // Auto-Sync state
  autoSyncEnabled = signal<boolean>(false);
  isTogglingAutoSync = signal(false);
  autoSyncDirectory = '';
  autoSyncExcludeModels = true;
  autoSyncEncrypt = false;
  autoSyncLastSync = signal<string | null>(null);
  autoSyncLastError = signal<string | null>(null);
  isSyncing = signal(false);
  importSyncDirectory = '';
  isImportingSync = signal(false);

  // LLM Models state
  modelMenuOpen = signal(false);
  isLoadingModels = signal(false);
  isDownloadingModel = signal(false);
  isUploadingModel = signal(false);
  localModels = signal<LocalModel[]>([]);
  downloadProgress = signal<{ downloadedFiles: number; totalFiles: number } | null>(null);
  private activeDownloadId: string | null = null;
  private downloadPollTimer: ReturnType<typeof setInterval> | null = null;
  newModelName = '';
  modelRepoId = '';
  uploadModelName = '';
  selectedGgufFile: File | null = null;

  // Admin HuggingFace Credential state
  adminHfConfigured = signal(false);
  adminHfUsername = signal<string | null>(null);
  editingAdminHf = signal(false);
  adminHfToken = '';
  isSavingAdminHf = signal(false);
  adminHfMessage = signal<string | null>(null);
  adminHfMessageType = signal<'success' | 'error'>('success');

  // MCP Servers state
  mcpServers = signal<McpServer[]>([]);
  isAddingMcpServer = signal(false);
  newMcpName = '';
  newMcpImage = '';
  newMcpDescription = '';
  newMcpAuthRequired = false;
  newMcpAuthEnvVar = '';
  newMcpAuthDescription = '';
  mcpMessage = signal<string | null>(null);
  mcpMessageType = signal<'success' | 'error'>('success');

  private llmService = inject(LlmService);

  constructor(
    private authService: AuthService,
    private adminService: AdminService
  ) {}

  ngOnDestroy(): void {
    this.stopPolling();
  }

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
      await this.loadMcpServers();
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
    const response = await this.adminService.createUniverse(
      this.newUniverseName.trim(), this.newUniverseDesc.trim(), this.adminPasswordHash
    );
    if (!response.success) {
      this.errorMessage.set(response.error ?? 'Failed to create universe.');
      return;
    }
    this.statusMessage.set(`Universe "${this.newUniverseName.trim()}" created.`);
    this.newUniverseName = '';
    this.newUniverseDesc = '';
    await this.loadUniverses(this.adminPasswordHash);
  }

  onEditUniverse(universe: Universe): void {
    this.editingUniverseId.set(universe.id);
    this.editingUniverseName = universe.name;
    this.editingUniverseDesc = universe.description || '';
  }

  async onSaveUniverse(universeId: string): Promise<void> {
    if (!this.adminPasswordHash || !this.editingUniverseName.trim()) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    const response = await this.adminService.updateUniverse(
      universeId, this.editingUniverseName.trim(), this.editingUniverseDesc.trim(), this.adminPasswordHash
    );
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
    const relationships = this.newCharacterRelationships[universeId] || [];
    if (!name) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    const response = await this.adminService.createCharacter(universeId, name, description, this.adminPasswordHash, relationships);
    if (!response.success) {
      this.errorMessage.set(response.error ?? 'Failed to create character.');
      return;
    }
    this.statusMessage.set(`Character "${name}" created.`);
    this.newCharacterNames[universeId] = '';
    this.newCharacterDescs[universeId] = '';
    delete this.newCharacterRelationships[universeId];
    delete this.newCharacterRelExpanded[universeId];
    await this.loadUniverses(this.adminPasswordHash);
  }

  onEditCharacter(character: Character): void {
    this.editingCharacterId.set(character.id);
    this.editingCharacterName = character.name;
    this.editingCharacterDesc = character.description || '';
    this.editingCharacterRelationships.set(structuredClone(character.relationships || []) as Relationship[]);
    this.relationshipSearchQuery.set('');
    this.relationshipsExpanded.set(false);
  }

  async onSaveCharacter(universeId: string, characterId: string): Promise<void> {
    if (!this.adminPasswordHash || !this.editingCharacterName.trim()) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    const response = await this.adminService.updateCharacter(
      universeId,
      characterId,
      this.editingCharacterName.trim(),
      this.editingCharacterDesc.trim(),
      this.adminPasswordHash,
      this.editingCharacterRelationships()
    );
    if (!response.success) {
      this.errorMessage.set(response.error ?? 'Failed to update character.');
      return;
    }
    this.statusMessage.set(`Character updated to "${this.editingCharacterName.trim()}".`);
    this.editingCharacterId.set(null);
    await this.loadUniverses(this.adminPasswordHash);
  }

  addRelationship(target?: { char: Character; universeName: string }): void {
    const rels = this.editingCharacterRelationships();
    const query = this.relationshipSearchQuery().trim();

    let newRel: Relationship | null = null;

    if (target) {
      if (rels.some(r => r.targetId === target.char.id)) return;
      newRel = {
        targetId: target.char.id,
        targetName: target.char.name,
        type: 'Friend',
      };
    } else if (query) {
      if (rels.some(r => !r.targetId && r.targetName === query)) return;
      newRel = {
        targetName: query,
        type: 'Friend',
      };
    }

    if (newRel) {
      const newRels = [...rels, newRel];
      this.editingCharacterRelationships.set(newRels);
    }

    this.relationshipSearchQuery.set('');
  }

  removeRelationship(index: number): void {
    const rels = this.editingCharacterRelationships();
    const newRels = rels.filter((_, i) => i !== index);
    this.editingCharacterRelationships.set(newRels);
  }

  addRelationshipNew(universeId: string, target?: { char: Character; universeName: string }): void {
    if (!this.newCharacterRelationships[universeId]) {
      this.newCharacterRelationships[universeId] = [];
    }
    const rels = this.newCharacterRelationships[universeId];
    // We don't have a search bar for "new character" yet in the UI I'm planning,
    // but I'll add the logic just in case.
    if (target) {
      if (rels.some(r => r.targetId === target.char.id)) return;
      const newRel: Relationship = {
        targetId: target.char.id,
        targetName: target.char.name,
        type: 'Friend',
      };
      this.newCharacterRelationships[universeId] = [...rels, newRel];
    }
  }

  removeRelationshipNew(universeId: string, index: number): void {
    const rels = this.newCharacterRelationships[universeId];
    if (rels) {
      this.newCharacterRelationships[universeId] = rels.filter((_, i) => i !== index);
    }
  }

  addCharacterRelationship(targetName: string, universeId: string): void {
    const trimmedName = targetName.trim();
    if (!trimmedName) return;

    if (!this.newCharacterRelationships[universeId]) {
      this.newCharacterRelationships[universeId] = [];
    }

    const rels = this.newCharacterRelationships[universeId];
    // Case-insensitive name-only dedupe
    if (rels.some(r => !r.targetId && r.targetName.toLowerCase() === trimmedName.toLowerCase())) return;

    // Create new array instead of mutating in-place
    this.newCharacterRelationships[universeId] = [...rels, {
      targetName: trimmedName,
      type: 'Friend'
    }];
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
    if (response.success) {
      if (typeof response.riskyAppsEnabled === 'boolean') {
        this.riskyAppsEnabled.set(response.riskyAppsEnabled);
      }
      if (typeof response.koboldEnabled === 'boolean') {
        this.koboldEnabled.set(response.koboldEnabled);
      }
      if (typeof response.ollamaEnabled === 'boolean') {
        this.ollamaEnabled.set(response.ollamaEnabled);
      }
      if (typeof response.maxDatasetTokensGB === 'number') {
        this.datasetTokenLimitGB = response.maxDatasetTokensGB;
      }
    }
    await this.loadAutoSyncStatus();
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

  async onToggleKobold(): Promise<void> {
    if (!this.adminPasswordHash) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    this.isTogglingKobold.set(true);
    try {
      const newValue = !this.koboldEnabled();
      const response = await this.adminService.setKoboldEnabled(newValue, this.adminPasswordHash);
      if (!response.success) {
        this.errorMessage.set(response.error ?? 'Failed to update Kobold.cpp settings.');
        return;
      }
      this.koboldEnabled.set(newValue);
      this.statusMessage.set(`Kobold.cpp ${newValue ? 'enabled' : 'disabled'}.`);
    } finally {
      this.isTogglingKobold.set(false);
    }
  }

  async onToggleOllama(): Promise<void> {
    if (!this.adminPasswordHash) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    this.isTogglingOllama.set(true);
    try {
      const newValue = !this.ollamaEnabled();
      const response = await this.adminService.setOllamaEnabled(newValue, this.adminPasswordHash);
      if (!response.success) {
        this.errorMessage.set(response.error ?? 'Failed to update Ollama settings.');
        return;
      }
      this.ollamaEnabled.set(newValue);
      this.statusMessage.set(`Ollama ${newValue ? 'enabled' : 'disabled'}.`);
    } finally {
      this.isTogglingOllama.set(false);
    }
  }

  async onSaveDatasetTokenLimit(): Promise<void> {
    if (!this.adminPasswordHash) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    this.isSavingDatasetTokenLimit.set(true);
    try {
      const limit = this.datasetTokenLimitGB;
      if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
        this.errorMessage.set('Dataset token limit must be a whole number between 1 and 1000 GB.');
        return;
      }
      const response = await this.adminService.setDatasetTokenLimit(limit, this.adminPasswordHash);
      if (!response.success) {
        this.errorMessage.set(response.error ?? 'Failed to update dataset token limit.');
        return;
      }
      this.datasetTokenLimitGB = limit;
      this.statusMessage.set(`Dataset token limit set to ${limit} GB.`);
    } finally {
      this.isSavingDatasetTokenLimit.set(false);
    }
  }

  // --- Auto-Sync ---

  private async loadAutoSyncStatus(): Promise<void> {
    if (!this.adminPasswordHash) return;
    const response = await this.adminService.getAutoSyncStatus(this.adminPasswordHash);
    if (response.success && response.autoSync) {
      this.autoSyncEnabled.set(response.autoSync.enabled);
      this.autoSyncDirectory = response.autoSync.directory || '';
      this.autoSyncExcludeModels = response.autoSync.excludeModels !== false;
      this.autoSyncEncrypt = response.autoSync.encrypt === true;
      if (response.status) {
        this.autoSyncLastSync.set(response.status.lastSync);
        this.autoSyncLastError.set(response.status.lastError);
      }
    }
  }

  async onToggleAutoSync(): Promise<void> {
    if (!this.adminPasswordHash) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    this.isTogglingAutoSync.set(true);
    try {
      const newEnabled = !this.autoSyncEnabled();
      const response = await this.adminService.setAutoSync({
        enabled: newEnabled,
        directory: this.autoSyncDirectory.trim(),
        excludeModels: this.autoSyncExcludeModels,
        encrypt: this.autoSyncEncrypt,
      }, this.adminPasswordHash);
      if (!response.success) {
        this.errorMessage.set(response.error ?? 'Failed to update auto-sync settings.');
        return;
      }
      this.autoSyncEnabled.set(newEnabled);
      this.statusMessage.set(`Auto-sync ${newEnabled ? 'enabled' : 'disabled'}.`);
    } finally {
      this.isTogglingAutoSync.set(false);
    }
  }

  async onTriggerSync(direction: string): Promise<void> {
    if (!this.adminPasswordHash) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    this.isSyncing.set(true);
    try {
      const response = await this.adminService.triggerAutoSync(direction, this.adminPasswordHash);
      if (!response.success) {
        this.errorMessage.set(response.error ?? 'Sync failed.');
        return;
      }
      this.autoSyncLastSync.set(response.timestamp ?? null);
      this.autoSyncLastError.set(null);
      this.statusMessage.set(`Sync complete (${response.direction ?? direction}).`);
    } finally {
      this.isSyncing.set(false);
    }
  }

  async onImportSync(): Promise<void> {
    if (!this.adminPasswordHash || !this.importSyncDirectory.trim()) return;
    const confirmed = window.confirm('Import data from the sync folder? This will overwrite local data with the synced data.');
    if (!confirmed) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    this.isImportingSync.set(true);
    try {
      const response = await this.adminService.importAutoSync(this.importSyncDirectory.trim(), this.adminPasswordHash);
      if (!response.success) {
        this.errorMessage.set(response.error ?? 'Import failed.');
        return;
      }
      this.statusMessage.set(`Data imported successfully (synced: ${response.importedDate}).`);
      this.autoSyncDirectory = this.importSyncDirectory.trim();
      this.autoSyncEnabled.set(true);
      this.importSyncDirectory = '';
      await this.loadAutoSyncStatus();
    } finally {
      this.isImportingSync.set(false);
    }
  }

  // --- LLM Models ---

  toggleModelMenu(): void {
    const wasOpen = this.modelMenuOpen();
    this.modelMenuOpen.set(!wasOpen);
    if (!wasOpen && this.adminPasswordHash) {
      this.loadModels(this.adminPasswordHash);
      this.loadAdminHfStatus();
    }
  }

  private async loadModels(adminHash: string): Promise<void> {
    this.isLoadingModels.set(true);
    try {
      const response = await this.adminService.listModels(adminHash);
      if (!response.success || !response.models) {
        this.errorMessage.set(response.error ?? 'Failed to load models.');
        this.localModels.set([]);
        return;
      }
      this.localModels.set(response.models);
    } finally {
      this.isLoadingModels.set(false);
    }
  }

  async onDownloadModel(): Promise<void> {
    if (!this.adminPasswordHash || !this.modelRepoId.trim()) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    this.isDownloadingModel.set(true);
    this.downloadProgress.set(null);
    try {
      const response = await this.adminService.downloadModel(
        this.modelRepoId.trim(),
        this.newModelName.trim(),
        this.adminPasswordHash
      );
      if (!response.success || !response.downloadId) {
        this.errorMessage.set(response.error ?? 'Failed to start model download.');
        this.isDownloadingModel.set(false);
        return;
      }

      // Start polling for download progress
      this.activeDownloadId = response.downloadId;
      this.pollDownloadStatus();
    } catch {
      this.errorMessage.set('Failed to start model download.');
      this.isDownloadingModel.set(false);
    }
  }

  private pollDownloadStatus(): void {
    if (this.downloadPollTimer) {
      clearInterval(this.downloadPollTimer);
    }
    this.downloadPollTimer = setInterval(async () => {
      if (!this.activeDownloadId || !this.adminPasswordHash) return;
      try {
        const status = await this.adminService.getDownloadStatus(
          this.activeDownloadId,
          this.adminPasswordHash
        );

        if (status.status === 'completed') {
          this.stopPolling();
          this.statusMessage.set(`Model "${this.newModelName.trim() || this.modelRepoId.trim()}" downloaded.`);
          this.newModelName = '';
          this.modelRepoId = '';
          this.downloadProgress.set(null);
          this.isDownloadingModel.set(false);
          await this.loadModels(this.adminPasswordHash);
        } else if (status.status === 'failed' || !status.success) {
          this.stopPolling();
          this.errorMessage.set(status.error ?? 'Model download failed.');
          this.downloadProgress.set(null);
          this.isDownloadingModel.set(false);
        } else {
          // Still in progress – update progress bar
          this.downloadProgress.set({
            downloadedFiles: status.downloadedFiles ?? 0,
            totalFiles: status.totalFiles ?? 0,
          });
        }
      } catch {
        this.stopPolling();
        this.errorMessage.set('Lost connection while downloading model.');
        this.downloadProgress.set(null);
        this.isDownloadingModel.set(false);
      }
    }, 3000);
  }

  private stopPolling(): void {
    if (this.downloadPollTimer) {
      clearInterval(this.downloadPollTimer);
      this.downloadPollTimer = null;
    }
    this.activeDownloadId = null;
  }

  onGgufFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedGgufFile = input.files?.[0] ?? null;
  }

  async onUploadModel(): Promise<void> {
    if (!this.adminPasswordHash || !this.selectedGgufFile) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    this.isUploadingModel.set(true);
    try {
      const response = await this.adminService.uploadModel(
        this.selectedGgufFile,
        this.uploadModelName.trim(),
        this.adminPasswordHash
      );
      if (!response.success) {
        this.errorMessage.set(response.error ?? 'Failed to upload model.');
        return;
      }
      const uploadedName = this.uploadModelName.trim() || this.selectedGgufFile.name;
      this.statusMessage.set(`Model "${uploadedName}" uploaded.`);
      this.uploadModelName = '';
      this.selectedGgufFile = null;
      if (this.ggufFileInput) this.ggufFileInput.nativeElement.value = '';
      await this.loadModels(this.adminPasswordHash);
    } finally {
      this.isUploadingModel.set(false);
    }
  }

  async onDeleteModel(model: LocalModel): Promise<void> {
    if (!this.adminPasswordHash) return;
    const confirmed = window.confirm(`Delete model "${model.name}"? This action cannot be undone.`);
    if (!confirmed) return;
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    this.actionInProgress.set(model.id);
    try {
      const response = await this.adminService.deleteModel(model.id, this.adminPasswordHash);
      if (!response.success) {
        this.errorMessage.set(response.error ?? 'Failed to delete model.');
        return;
      }
      this.statusMessage.set(`Model "${model.name}" deleted.`);
      await this.loadModels(this.adminPasswordHash);
    } finally {
      this.actionInProgress.set(null);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  // --- Admin HuggingFace Credential ---

  private async loadAdminHfStatus(): Promise<void> {
    try {
      const status = await this.llmService.getHuggingFaceStatus();
      this.adminHfConfigured.set(status.configured);
      this.adminHfUsername.set(status.username);
    } catch {
      // Silent failure
    }
  }

  async saveAdminHfToken(): Promise<void> {
    if (!this.adminHfToken.trim()) {
      this.adminHfMessage.set('Please enter a HuggingFace token');
      this.adminHfMessageType.set('error');
      return;
    }

    this.isSavingAdminHf.set(true);
    this.adminHfMessage.set(null);

    try {
      const result = await this.llmService.setHuggingFaceToken(this.adminHfToken.trim());
      this.adminHfMessage.set(result.username ? `Connected as ${result.username}` : 'Token saved');
      this.adminHfMessageType.set('success');
      this.editingAdminHf.set(false);
      this.adminHfToken = '';
      await this.loadAdminHfStatus();
    } catch (err: unknown) {
      const httpErr = err as { error?: { error?: string } };
      this.adminHfMessage.set(httpErr?.error?.error || 'Failed to save HuggingFace token');
      this.adminHfMessageType.set('error');
    } finally {
      this.isSavingAdminHf.set(false);
    }
  }

  async removeAdminHfToken(): Promise<void> {
    try {
      await this.llmService.removeHuggingFaceToken();
      this.adminHfMessage.set('HuggingFace token removed');
      this.adminHfMessageType.set('success');
      await this.loadAdminHfStatus();
    } catch {
      this.adminHfMessage.set('Failed to remove HuggingFace token');
      this.adminHfMessageType.set('error');
    }
  }

  // --- MCP Servers ---

  private async loadMcpServers(): Promise<void> {
    if (!this.adminPasswordHash) return;
    try {
      const response = await this.adminService.listMcpServers(this.adminPasswordHash);
      if (response.success && response.servers) {
        this.mcpServers.set(response.servers);
      }
    } catch {
      // Silent failure
    }
  }

  async onAddMcpServer(): Promise<void> {
    if (!this.adminPasswordHash) return;
    if (!this.newMcpName.trim() || !this.newMcpImage.trim()) {
      this.mcpMessage.set('Name and Docker image are required');
      this.mcpMessageType.set('error');
      return;
    }
    if (this.newMcpAuthRequired && !this.newMcpAuthEnvVar.trim()) {
      this.mcpMessage.set('Auth environment variable is required when auth is enabled');
      this.mcpMessageType.set('error');
      return;
    }

    this.isAddingMcpServer.set(true);
    this.mcpMessage.set(null);

    try {
      const response = await this.adminService.addMcpServer({
        name: this.newMcpName.trim(),
        image: this.newMcpImage.trim(),
        description: this.newMcpDescription.trim(),
        authRequired: this.newMcpAuthRequired,
        authEnvVar: this.newMcpAuthEnvVar.trim(),
        authDescription: this.newMcpAuthDescription.trim(),
      }, this.adminPasswordHash);

      if (response.success) {
        this.mcpMessage.set(`MCP server "${this.newMcpName.trim()}" added successfully`);
        this.mcpMessageType.set('success');
        this.newMcpName = '';
        this.newMcpImage = '';
        this.newMcpDescription = '';
        this.newMcpAuthRequired = false;
        this.newMcpAuthEnvVar = '';
        this.newMcpAuthDescription = '';
        await this.loadMcpServers();
      } else {
        this.mcpMessage.set(response.error || 'Failed to add MCP server');
        this.mcpMessageType.set('error');
      }
    } catch {
      this.mcpMessage.set('Failed to add MCP server');
      this.mcpMessageType.set('error');
    } finally {
      this.isAddingMcpServer.set(false);
    }
  }

  async onToggleMcpServer(server: McpServer): Promise<void> {
    if (!this.adminPasswordHash) return;
    this.actionInProgress.set(`mcp-toggle-${server.id}`);
    try {
      const response = await this.adminService.updateMcpServer(
        server.id,
        { enabled: !server.enabled },
        this.adminPasswordHash
      );
      if (response.success) {
        await this.loadMcpServers();
      } else {
        this.mcpMessage.set(response.error || 'Failed to update MCP server');
        this.mcpMessageType.set('error');
      }
    } catch {
      this.mcpMessage.set('Failed to update MCP server');
      this.mcpMessageType.set('error');
    } finally {
      this.actionInProgress.set(null);
    }
  }

  async onDeleteMcpServer(server: McpServer): Promise<void> {
    if (!this.adminPasswordHash) return;
    this.actionInProgress.set(`mcp-delete-${server.id}`);
    try {
      const response = await this.adminService.deleteMcpServer(server.id, this.adminPasswordHash);
      if (response.success) {
        this.mcpMessage.set(`MCP server "${server.name}" deleted`);
        this.mcpMessageType.set('success');
        await this.loadMcpServers();
      } else {
        this.mcpMessage.set(response.error || 'Failed to delete MCP server');
        this.mcpMessageType.set('error');
      }
    } catch {
      this.mcpMessage.set('Failed to delete MCP server');
      this.mcpMessageType.set('error');
    } finally {
      this.actionInProgress.set(null);
    }
  }
}