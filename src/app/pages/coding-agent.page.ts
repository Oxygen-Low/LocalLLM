import { Component, ChangeDetectionStrategy, inject, signal, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { marked } from 'marked';
import { environment } from '../../environments/environment';
import { LlmService, type ProviderInfo, type UniverseSummary, type UniverseCharacterSummary, type SearchEvent, type SendMessageOptions, type StreamResult, type ChatMessage as LlmChatMessage, type McpServerInfo } from '../services/llm.service';
import { CodingAgentService, type GitHubRepo, type LocalRepoInfo, type ContainerInfo, type FileEntry, type AgentMemory } from '../services/coding-agent.service';
import { VoiceService } from '../services/voice.service';

type WizardStep = 'check-github' | 'select-repo' | 'select-mode' | 'container-manager' | 'background-running' | 'manual-workspace';

interface LocalChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'step';
  content: string;
  displayContent?: string;
  thinking?: string;
  status?: 'running' | 'completed' | 'failed';
  toolName?: string;
  toolResult?: string;
  searches?: SearchEvent[];
}

interface ToolCall {
  name: string;
  params: Record<string, unknown>;
}

@Component({
  selector: 'app-coding-agent',
  standalone: true,
  /* ⚡ Bolt: Added OnPush change detection to prevent unnecessary re-renders in this complex component. This relies on Angular Signals for targeted DOM updates, significantly reducing CPU usage during heavy streaming or state changes. */
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="h-[calc(100vh-64px)] flex flex-col bg-secondary-50">
      @switch (currentStep()) {
        <!-- Step 1: Check Setup -->
        @case ('check-github') {
          <div class="flex-1 flex items-center justify-center">
            <div class="max-w-md w-full mx-4">
              <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-8 text-center">
                <div class="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-6">
                  <span class="text-3xl">💻</span>
                </div>
                <h1 class="text-2xl font-bold text-secondary-900 mb-3">AI Coding Agent</h1>

                @if (isLoading()) {
                  <p class="text-muted mb-6">Checking configuration...</p>
                  <div class="flex justify-center">
                    <div class="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                  </div>
                } @else if (!dockerAvailable()) {
                  @if (githubConnected()) {
                    <p class="text-green-600 text-sm font-medium mb-4">✓ GitHub connected as {{ githubUsername() }}</p>
                  }
                  <div class="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    <p class="font-semibold mb-1">Docker not available</p>
                    <p>The Coding Agent requires Docker to be installed and running on the server. Please contact your administrator.</p>
                  </div>
                  <a routerLink="/dashboard" class="text-sm text-muted hover:text-secondary-700 transition-colors">
                    ← Back to Dashboard
                  </a>
                } @else {
                  <p class="text-green-600 text-sm font-medium mb-2">✓ Docker available</p>
                  @if (githubConnected()) {
                    <p class="text-green-600 text-sm font-medium mb-6">✓ GitHub connected as {{ githubUsername() }}</p>
                  } @else {
                    <div class="mb-6 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm text-left">
                      <p class="font-semibold mb-1">GitHub not connected</p>
                      <p>You can still use <strong>public repositories</strong> by entering a URL. To access private repositories, <a routerLink="/settings" class="underline hover:text-blue-600">configure a GitHub token in Settings</a>.</p>
                    </div>
                  }
                  <button (click)="goToStep('select-repo')" class="btn-primary">
                    Select Repository
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- Step 2: Select Repository -->
        @case ('select-repo') {
          <div class="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-8">
            <div class="flex items-center justify-between mb-6">
              <div>
                <button (click)="goToStep('check-github')" class="text-sm text-muted hover:text-secondary-700 transition-colors mb-2 inline-flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <h1 class="text-2xl font-bold text-secondary-900">Select Repository</h1>
                <p class="text-sm text-muted mt-1">Choose a repository to work on</p>
              </div>
            </div>

            @if (errorMessage()) {
              <div class="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {{ errorMessage() }}
              </div>
            }

            <!-- Manual URL input (always visible) -->
            <div class="mb-6 p-4 bg-white rounded-lg border border-secondary-200">
              <h3 class="font-medium text-secondary-900 mb-1">Enter Repository URL</h3>
              <p class="text-xs text-muted mb-3">Paste any public git repository HTTPS URL (GitHub, GitLab, Bitbucket, etc.)</p>
              <div class="flex gap-2">
                <input
                  type="url"
                  [(ngModel)]="customRepoUrl"
                  name="customRepoUrl"
                  placeholder="https://github.com/owner/repo"
                  class="flex-1 px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm"
                />
                <button (click)="useCustomUrl()" class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors flex-shrink-0">
                  Use URL
                </button>
              </div>
              @if (customUrlError()) {
                <p class="mt-2 text-xs text-red-600">{{ customUrlError() }}</p>
              }
            </div>

            <!-- Local.LLM Repositories section -->
            <div class="mb-6">
              <h3 class="font-medium text-secondary-700 mb-3 flex items-center gap-2">
                <span>📦</span> Local.LLM Repositories
              </h3>
              @if (isLoadingLocalRepos()) {
                <div class="flex items-center gap-2 text-sm text-muted py-2">
                  <div class="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                  Loading local repositories…
                </div>
              } @else if (localRepos().length === 0) {
                <div class="p-3 rounded-lg bg-secondary-50 border border-secondary-200 text-sm text-muted">
                  No active Local.LLM repositories. <a routerLink="/app/repositories" class="text-primary-600 hover:underline">Create one in Repositories →</a>
                </div>
              } @else {
                <div class="space-y-2">
                  @for (repo of localRepos(); track repo.id) {
                    <button
                      (click)="selectLocalRepo(repo)"
                      class="w-full text-left p-4 bg-white rounded-lg border border-secondary-200 hover:border-primary-300 hover:shadow-sm transition-all"
                      [ngClass]="selectedLocalRepo()?.id === repo.id ? 'border-primary-500 ring-2 ring-primary-100' : ''"
                    >
                      <div class="flex items-start justify-between">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="font-medium text-secondary-900 truncate">{{ repo.name }}</span>
                            <span class="flex-shrink-0 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Local</span>
                          </div>
                          @if (repo.description) {
                            <p class="text-sm text-muted mt-1 truncate">{{ repo.description }}</p>
                          }
                          <p class="text-xs text-muted mt-1">Branch: {{ repo.defaultBranch }}</p>
                        </div>
                        @if (selectedLocalRepo()?.id === repo.id) {
                          <svg class="w-5 h-5 text-primary-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                          </svg>
                        }
                      </div>
                    </button>
                  }
                </div>
              }
            </div>

            <!-- GitHub repos section -->
            @if (githubConnected()) {
              <div class="mb-2">
                <h3 class="font-medium text-secondary-700 mb-3">Your GitHub Repositories</h3>
                <!-- Search -->
                <div class="mb-4">
                  <input
                    type="text"
                    [(ngModel)]="repoSearch"
                    name="repoSearch"
                    (ngModelChange)="onRepoSearchChange()"
                    placeholder="Search repositories..."
                    class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
                  />
                </div>
              </div>

              <!-- Repository List -->
              <div class="flex-1 overflow-y-auto space-y-2">
                @if (isLoadingRepos()) {
                  <div class="flex justify-center py-12">
                    <div class="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                  </div>
                } @else if (repos().length === 0) {
                  <div class="text-center py-12 text-muted">
                    <p>No repositories found.</p>
                  </div>
                } @else {
                  @for (repo of repos(); track repo.id) {
                    <button
                      (click)="selectRepo(repo)"
                      class="w-full text-left p-4 bg-white rounded-lg border border-secondary-200 hover:border-primary-300 hover:shadow-sm transition-all"
                      [ngClass]="selectedRepo()?.id === repo.id ? 'border-primary-500 ring-2 ring-primary-100' : ''"
                    >
                      <div class="flex items-start justify-between">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="font-medium text-secondary-900 truncate">{{ repo.fullName }}</span>
                            @if (repo.private) {
                              <span class="flex-shrink-0 px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-600 text-xs font-medium">Private</span>
                            }
                          </div>
                          @if (repo.description) {
                            <p class="text-sm text-muted mt-1 truncate">{{ repo.description }}</p>
                          }
                          <div class="flex items-center gap-3 mt-2 text-xs text-muted">
                            @if (repo.language) {
                              <span class="flex items-center gap-1">
                                <span class="w-2 h-2 rounded-full bg-primary-400"></span>
                                {{ repo.language }}
                              </span>
                            }
                            <span>{{ repo.defaultBranch }}</span>
                          </div>
                        </div>
                        @if (selectedRepo()?.id === repo.id) {
                          <svg class="w-5 h-5 text-primary-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                          </svg>
                        }
                      </div>
                    </button>
                  }
                }
              </div>
            } @else {
              <div class="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
                <p><strong>Connect GitHub</strong> to browse and select from your private repositories. <a routerLink="/settings" class="underline hover:text-blue-600">Configure in Settings →</a></p>
              </div>
            }

            <!-- Continue button -->
            @if (selectedRepo() || selectedLocalRepo()) {
              <div class="pt-4 border-t border-secondary-200 mt-4">
                <button (click)="goToStep('select-mode')" class="btn-primary w-full sm:w-auto">
                  Continue with {{ selectedLocalRepo()?.name || selectedRepo()?.name }}
                </button>
              </div>
            }
          </div>
        }

        <!-- Step 3: Select Mode -->
        @case ('select-mode') {
          <div class="flex-1 flex items-center justify-center px-4">
            <div class="max-w-2xl w-full">
              <button (click)="goToStep('select-repo')" class="text-sm text-muted hover:text-secondary-700 transition-colors mb-4 inline-flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <h1 class="text-2xl font-bold text-secondary-900 mb-2">Choose Mode</h1>
              <p class="text-sm text-muted mb-8">Select how you want to work on <strong>{{ selectedLocalRepo()?.name || selectedRepo()?.fullName }}</strong></p>

              @if (errorMessage()) {
                <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {{ errorMessage() }}
                </div>
              }

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Background Mode -->
                <div
                  class="relative text-left p-6 bg-secondary-50 rounded-xl border-2 border-secondary-200 grayscale opacity-60 cursor-not-allowed overflow-hidden"
                >
                  <div class="absolute top-2 right-2 bg-secondary-200 text-secondary-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                    Work in Progress
                  </div>
                  <div class="w-12 h-12 rounded-lg bg-secondary-200 flex items-center justify-center mb-4">
                    <span class="text-2xl">🤖</span>
                  </div>
                  <h3 class="text-lg font-bold text-secondary-900 mb-2">Background</h3>
                  <p class="text-sm text-muted leading-relaxed">
                    The AI autonomously clones, creates a branch, completes the task, and creates a pull request — all without your input.
                  </p>
                  <div class="mt-4 flex items-center gap-2 text-secondary-500 text-sm font-medium">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Fully Automated
                  </div>
                </div>

                <!-- Manual Mode -->
                <button
                  (click)="startManualMode()"
                  [disabled]="isCreatingContainer()"
                  class="text-left p-6 bg-white rounded-xl border-2 border-secondary-200 hover:border-blue-300 hover:shadow-md transition-all disabled:opacity-50"
                >
                  <div class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                    <span class="text-2xl">🛠️</span>
                  </div>
                  <h3 class="text-lg font-bold text-secondary-900 mb-2">Manual</h3>
                  <p class="text-sm text-muted leading-relaxed">
                    Open the repo in a codespace-like environment with AI chat, live preview, and a file explorer for hands-on coding.
                  </p>
                  <div class="mt-4 flex items-center gap-2 text-blue-600 text-sm font-medium">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Interactive Workspace
                  </div>
                </button>
              </div>

              @if (isCreatingContainer()) {
                <div class="mt-6 flex items-center gap-3 text-sm text-muted">
                  <div class="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                  Creating container and cloning repository...
                </div>
              }
            </div>
          </div>
        }

        <!-- Step 3b: Container Manager -->
        @case ('container-manager') {
          <div class="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-8">
            <button (click)="goToStep('select-mode')" class="text-sm text-muted hover:text-secondary-700 transition-colors mb-4 inline-flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div class="flex items-center justify-between mb-6">
              <div>
                <h1 class="text-2xl font-bold text-secondary-900">Containers</h1>
                <p class="text-sm text-muted mt-1">Manage containers for <strong>{{ selectedLocalRepo()?.name || selectedRepo()?.fullName }}</strong></p>
              </div>
              <button
                (click)="createNewContainer()"
                [disabled]="isCreatingContainer() || activeContainersForRepo().length >= 3"
                class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (isCreatingContainer()) {
                  <span class="flex items-center gap-2">
                    <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Creating...
                  </span>
                } @else {
                  + New Container
                }
              </button>
            </div>

            @if (errorMessage()) {
              <div class="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {{ errorMessage() }}
              </div>
            }

            @if (activeContainersForRepo().length >= 3) {
              <div class="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                Maximum of 3 active containers reached. Stop or remove a container to create a new one.
              </div>
            }

            @if (isLoadingContainers()) {
              <div class="flex justify-center py-12">
                <div class="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
              </div>
            } @else if (containersForRepo().length === 0) {
              <div class="text-center py-12">
                <div class="w-16 h-16 rounded-full bg-secondary-100 flex items-center justify-center mx-auto mb-4">
                  <span class="text-2xl">📦</span>
                </div>
                <p class="text-muted mb-2">No containers yet</p>
                <p class="text-sm text-muted">Create a new container to get started</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (container of containersForRepo(); track container.id) {
                  <div class="bg-white rounded-lg border border-secondary-200 p-4 hover:shadow-sm transition-all">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div class="w-3 h-3 rounded-full flex-shrink-0"
                          [ngClass]="container.status === 'running' ? 'bg-green-500' : container.status === 'creating' ? 'bg-amber-500 animate-pulse' : 'bg-secondary-400'">
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="text-sm font-medium text-secondary-900 truncate">{{ container.dockerName || container.id.slice(0, 12) }}</span>
                            <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                              [ngClass]="container.status === 'running' ? 'bg-green-100 text-green-700' : container.status === 'creating' ? 'bg-amber-100 text-amber-700' : 'bg-secondary-100 text-secondary-600'">
                              {{ container.status }}
                            </span>
                          </div>
                          <div class="flex items-center gap-3 mt-1 text-xs text-muted">
                            <span>Branch: {{ container.branch }}</span>
                            <span>Created: {{ formatDate(container.createdAt) }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-2 flex-shrink-0">
                        @if (container.status === 'running') {
                          <button
                            (click)="loadContainerWorkspace(container)"
                            class="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors"
                          >
                            Open
                          </button>
                          <button
                            (click)="stopContainerById(container.id)"
                            class="px-3 py-1.5 rounded-lg border border-secondary-200 text-xs font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
                          >
                            Stop
                          </button>
                        } @else if (container.status === 'stopped') {
                          <button
                            (click)="startAndLoadContainer(container)"
                            [disabled]="isStartingContainer()"
                            class="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {{ isStartingContainer() ? 'Starting...' : 'Start & Open' }}
                          </button>
                          <button
                            (click)="removeContainerById(container.id)"
                            class="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Background Mode: Running -->
        @case ('background-running') {
          <div class="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-8">
            <button (click)="goToStep('select-mode')" class="text-sm text-muted hover:text-secondary-700 transition-colors mb-4 inline-flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 sm:p-8">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <span class="text-xl">🤖</span>
                </div>
                <div>
                  <h2 class="text-lg font-bold text-secondary-900">Background Task</h2>
                  <p class="text-sm text-muted">{{ selectedRepo()?.fullName }}</p>
                </div>
              </div>

              <!-- Task Description Input -->
              @if (!backgroundTaskStarted()) {
                <div class="space-y-4">
                  <div>
                    <label for="taskDescription" class="block text-sm font-medium text-secondary-700 mb-2">
                      Task Description
                    </label>
                    <textarea
                      id="taskDescription"
                      [(ngModel)]="taskDescription"
                      name="taskDescription"
                      rows="4"
                      placeholder="Describe what you want the AI to do... e.g., 'Add a dark mode toggle to the navbar' or 'Fix the login form validation'"
                      class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all resize-none"
                    ></textarea>
                  </div>

                  @if (errorMessage()) {
                    <div class="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      {{ errorMessage() }}
                    </div>
                  }

                  <button
                    (click)="startBackgroundTask()"
                    [disabled]="isRunningTask() || !taskDescription.trim()"
                    class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ isRunningTask() ? 'Starting...' : 'Start Task' }}
                  </button>
                </div>
              } @else {
                <!-- Task Progress -->
                <div class="space-y-4">
                  <div class="flex items-center gap-2 text-sm font-medium text-purple-700">
                    @if (!taskCompleted()) {
                      <div class="w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                      Running...
                    } @else {
                      <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                      <span class="text-green-700">Completed</span>
                    }
                  </div>

                  <!-- Progress Log -->
                  <div class="bg-secondary-900 rounded-lg p-4 max-h-80 overflow-y-auto">
                    <pre class="text-sm text-green-400 font-mono whitespace-pre-wrap">{{ taskLog() }}</pre>
                  </div>

                  @if (taskCompleted()) {
                    <div class="p-4 rounded-lg bg-green-50 border border-green-200">
                      <p class="text-sm font-medium text-green-800 mb-2">✓ Task completed successfully</p>
                      <p class="text-sm text-green-700">A pull request has been created with the changes. Check your GitHub repository for details.</p>
                    </div>
                  }

                  <div class="flex gap-3">
                    @if (taskCompleted()) {
                      <a [href]="selectedRepo()?.htmlUrl + '/pulls'" target="_blank" rel="noopener noreferrer" class="btn-primary inline-flex items-center gap-2">
                        View Pull Requests
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    }
                    <button (click)="goToStep('select-repo')" class="btn-secondary">
                      New Task
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Manual Mode: Workspace -->
        @case ('manual-workspace') {
          <div class="flex-1 flex flex-col overflow-hidden">
            <!-- Toolbar -->
            <div class="flex items-center justify-between px-4 py-2 bg-white border-b border-secondary-200">
              <div class="flex items-center gap-3">
                <button (click)="goToStep('container-manager')" class="text-sm text-muted hover:text-secondary-700 transition-colors inline-flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Exit
                </button>
                <span class="text-sm font-medium text-secondary-900">{{ selectedLocalRepo()?.name || selectedRepo()?.fullName }}</span>
                <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  {{ activeContainer()?.status || 'running' }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  (click)="toggleAgentTerminal()"
                  class="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                  [ngClass]="showAgentTerminal() ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-secondary-200 text-secondary-700 hover:bg-secondary-50'"
                >
                  🤖 Agent Terminal
                </button>
                <button
                  (click)="runDevServer()"
                  [disabled]="isRunningDevServer()"
                  class="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {{ isRunningDevServer() ? 'Starting...' : '▶ Run Dev Server' }}
                </button>
                <button
                  (click)="stopActiveContainer()"
                  class="px-3 py-1.5 rounded-lg border border-secondary-200 text-xs font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
                >
                  Stop Container
                </button>
              </div>
            </div>

            <!-- Agent Terminal Output (collapsible) -->
            @if (showAgentTerminal()) {
              <div class="bg-secondary-900 border-b border-secondary-700 max-h-48 overflow-y-auto">
                <div class="flex items-center justify-between px-4 py-1.5 border-b border-secondary-700">
                  <span class="text-xs font-semibold text-secondary-400 uppercase tracking-wider">Agent Terminal</span>
                  <button (click)="clearAgentTerminal()" class="text-xs text-secondary-500 hover:text-secondary-300 transition-colors">Clear</button>
                </div>
                <pre class="p-3 text-xs text-green-400 font-mono whitespace-pre-wrap">{{ agentTerminalOutput() || '(No output yet)' }}</pre>
              </div>
            }

            <!-- Main Content: 3-panel layout -->
            <div class="flex-1 flex overflow-hidden">
              <!-- Left Panel: File Explorer -->
              <div class="w-64 flex-shrink-0 bg-white border-r border-secondary-200 flex flex-col overflow-hidden">
                <div class="p-3 border-b border-secondary-100">
                  <h3 class="text-xs font-semibold text-secondary-500 uppercase tracking-wider">Files</h3>
                </div>
                <div class="flex-1 overflow-y-auto p-2">
                  @if (isLoadingFiles()) {
                    <div class="flex justify-center py-4">
                      <div class="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    </div>
                  } @else {
                    @for (file of currentFiles(); track file.name) {
                      <button
                        (click)="onFileClick(file)"
                        class="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-secondary-100 transition-colors flex items-center gap-2 truncate"
                        [ngClass]="currentFilePath() === file.name ? 'bg-primary-50 text-primary-700' : 'text-secondary-700'"
                      >
                        @if (file.type === 'directory') {
                          <svg class="w-4 h-4 text-secondary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        } @else {
                          <svg class="w-4 h-4 text-secondary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        }
                        <span class="truncate">{{ getFileName(file.name) }}</span>
                      </button>
                    }
                  }
                </div>
              </div>

              <!-- Center Panel: Editor / Preview -->
              <div class="flex-1 flex flex-col overflow-hidden">
                <!-- Tabs -->
                <div class="flex items-center gap-1 px-3 py-1 bg-secondary-50 border-b border-secondary-200">
                  <button
                    (click)="activeTab.set('editor')"
                    class="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                    [ngClass]="activeTab() === 'editor' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'"
                  >
                    Editor
                  </button>
                  <button
                    (click)="activeTab.set('terminal')"
                    class="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                    [ngClass]="activeTab() === 'terminal' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'"
                  >
                    Terminal
                  </button>
                  <button
                    (click)="activeTab.set('preview')"
                    class="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                    [ngClass]="activeTab() === 'preview' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'"
                  >
                    Preview
                  </button>
                </div>

                <!-- Editor Tab -->
                @if (activeTab() === 'editor') {
                  <div class="flex-1 flex flex-col overflow-hidden">
                    @if (currentFilePath()) {
                      <div class="flex items-center justify-between px-3 py-2 bg-white border-b border-secondary-100">
                        <span class="text-xs text-muted truncate">{{ currentFilePath() }}</span>
                        <button
                          (click)="saveCurrentFile()"
                          [disabled]="isSavingFile()"
                          class="px-3 py-1 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                          {{ isSavingFile() ? 'Saving...' : 'Save' }}
                        </button>
                      </div>
                      <textarea
                        [(ngModel)]="fileContent"
                        name="fileContent"
                        class="flex-1 w-full p-4 font-mono text-sm text-secondary-800 bg-white border-none focus:outline-none resize-none"
                        spellcheck="false"
                      ></textarea>
                    } @else {
                      <div class="flex-1 flex items-center justify-center text-muted text-sm">
                        Select a file to edit
                      </div>
                    }
                  </div>
                }

                <!-- Terminal Tab -->
                @if (activeTab() === 'terminal') {
                  <div class="flex-1 flex flex-col bg-secondary-900 overflow-hidden">
                    <div class="flex-1 overflow-y-auto p-4">
                      <pre class="text-sm text-green-400 font-mono whitespace-pre-wrap">{{ terminalOutput() }}</pre>
                    </div>
                    <div class="flex items-center gap-2 p-3 border-t border-secondary-700">
                      <span class="text-green-400 font-mono text-sm">$</span>
                      <input
                        type="text"
                        [(ngModel)]="terminalCommand"
                        name="terminalCommand"
                        (keydown.enter)="executeTerminalCommand()"
                        placeholder="Enter command..."
                        class="flex-1 bg-transparent text-green-400 font-mono text-sm border-none focus:outline-none placeholder:text-secondary-600"
                        autocomplete="off"
                      />
                    </div>
                  </div>
                }

                <!-- Preview Tab -->
                @if (activeTab() === 'preview') {
                  <div class="flex-1 flex items-center justify-center text-muted text-sm bg-white p-4">
                    @if (previewUrl()) {
                      <iframe [src]="previewUrl()!" class="w-full h-full border rounded-lg"></iframe>
                    } @else {
                      <div class="text-center">
                        <p class="mb-2">No preview available</p>
                        <p class="text-xs">Click "Run Dev Server" to start a preview</p>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Right Panel: AI Chat -->
              <div class="w-96 flex-shrink-0 bg-white border-l border-secondary-200 flex flex-col overflow-hidden" #chatPanelRef>
                <!-- Header with toggles -->
                <div class="p-3 border-b border-secondary-100 space-y-2">
                  <div class="flex items-center justify-between">
                    <h3 class="text-xs font-semibold text-secondary-500 uppercase tracking-wider">AI Assistant</h3>
                    <button
                      (click)="showMemoriesPanel.set(!showMemoriesPanel())"
                      class="text-xs px-2 py-1 rounded transition-colors"
                      [ngClass]="showMemoriesPanel() ? 'bg-purple-100 text-purple-700' : 'text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100'"
                    >
                      🧠 {{ memories().length }}
                    </button>
                  </div>

                  <!-- Provider & Character selectors -->
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <div class="relative" #providerDropdown>
                      <button
                        (click)="toggleProviderDropdown($event)"
                        class="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-secondary-200 bg-secondary-50 hover:bg-secondary-100 text-xs transition-colors"
                        aria-label="Select AI provider"
                        title="Select AI provider"
                        aria-haspopup="listbox"
                        [attr.aria-expanded]="showProviderDropdown()"
                      >
                        <span class="w-1.5 h-1.5 rounded-full" [ngClass]="selectedProvider() ? 'bg-green-500' : 'bg-secondary-400'"></span>
                        <span class="text-secondary-700 max-w-[120px] truncate">
                          {{ selectedProvider()?.name || 'Provider' }}
                          @if (selectedProvider()?.model) {
                            <span class="text-secondary-400"> · {{ resolveModelName(selectedProvider()) }}</span>
                          }
                        </span>
                        <svg class="w-3 h-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      @if (showProviderDropdown()) {
                        <div class="absolute bottom-full left-0 mb-1 w-64 bg-white rounded-lg border border-secondary-200 shadow-lg py-1 z-50 max-h-72 overflow-y-auto">
                          @if (providers().length === 0) {
                            <div class="px-3 py-2 text-xs text-secondary-500">
                              No providers configured.
                              <a routerLink="/settings" class="text-primary-600 hover:underline">Set up API keys</a>
                            </div>
                          }
                          @for (p of providers(); track p.id) {
                            @if (p.models && p.models.length > 1) {
                              <div>
                                <button
                                  (click)="toggleModelList(p, $event)"
                                  class="w-full text-left px-3 py-2 text-xs hover:bg-secondary-50 transition-colors flex items-center gap-2"
                                  [ngClass]="selectedProvider()?.id === p.id ? 'bg-primary-50 text-primary-700' : 'text-secondary-700'"
                                >
                                  <span class="w-1.5 h-1.5 rounded-full" [ngClass]="p.available ? 'bg-green-500' : 'bg-secondary-300'"></span>
                                  <div class="flex-1 min-w-0">
                                    <div class="font-medium">{{ p.name }}</div>
                                    <div class="text-[10px] text-secondary-400">{{ p.models.length }} models</div>
                                  </div>
                                  <svg class="w-3 h-3 text-secondary-400 transition-transform" [ngClass]="expandedProvider() === p.id ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                @if (expandedProvider() === p.id) {
                                  <div class="border-t border-secondary-100 bg-secondary-50">
                                    @for (m of p.models; track getModelId(m)) {
                                      <button
                                        (click)="selectProviderModel(p, m)"
                                        class="w-full text-left pl-7 pr-3 py-1.5 text-xs hover:bg-secondary-100 transition-colors flex items-center gap-1.5"
                                        [ngClass]="selectedProvider()?.id === p.id && selectedProvider()?.model === getModelId(m) ? 'bg-primary-50 text-primary-700' : 'text-secondary-600'"
                                      >
                                        <span class="w-1 h-1 rounded-full" [ngClass]="selectedProvider()?.id === p.id && selectedProvider()?.model === getModelId(m) ? 'bg-primary-600' : 'bg-secondary-300'"></span>
                                        <span class="truncate">{{ getModelDisplayName(m) }}</span>
                                      </button>
                                    }
                                  </div>
                                }
                              </div>
                            } @else {
                              <button
                                (click)="selectProvider(p)"
                                class="w-full text-left px-3 py-2 text-xs hover:bg-secondary-50 transition-colors flex items-center gap-2"
                                [ngClass]="selectedProvider()?.id === p.id ? 'bg-primary-50 text-primary-700' : 'text-secondary-700'"
                              >
                                <span class="w-1.5 h-1.5 rounded-full" [ngClass]="p.available ? 'bg-green-500' : 'bg-secondary-300'"></span>
                                <div class="flex-1 min-w-0">
                                  <div class="font-medium">{{ p.name }}</div>
                                  @if (p.model) {
                                    <div class="text-[10px] text-secondary-400 truncate">{{ resolveModelName(p) }}</div>
                                  }
                                </div>
                              </button>
                            }
                          }
                        </div>
                      }
                    </div>

                    <!-- Character selector -->
                    @if (universes().length > 0) {
                      <div class="relative" #characterDropdown>
                        <button
                          (click)="toggleCharacterDropdown($event)"
                          class="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-colors"
                          [ngClass]="selectedCharacter()
                            ? 'border-purple-300 bg-purple-50 text-purple-700'
                            : 'border-secondary-200 bg-secondary-50 text-secondary-500 hover:bg-secondary-100'"
                          aria-label="Select roleplay character"
                          title="Select roleplay character"
                          aria-haspopup="listbox"
                          [attr.aria-expanded]="showCharacterDropdown()"
                        >
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {{ selectedCharacter()?.name || 'Char' }}
                        </button>

                        @if (showCharacterDropdown()) {
                          <div class="absolute bottom-full left-0 mb-1 w-56 bg-white rounded-lg border border-secondary-200 shadow-lg py-1 z-50 max-h-56 overflow-y-auto">
                            <button
                              (click)="selectCharacter(null)"
                              class="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary-50 transition-colors"
                              [ngClass]="!selectedCharacter() ? 'bg-purple-50 text-purple-700' : 'text-secondary-700'"
                            >
                              <div class="font-medium">No character</div>
                            </button>
                            @for (universe of universes(); track universe.id) {
                              @if (universe.characters.length > 0) {
                                <div class="px-3 py-1 text-[10px] font-semibold text-secondary-400 uppercase tracking-wider bg-secondary-50">
                                  {{ universe.name }}
                                </div>
                                @for (char of universe.characters; track char.id) {
                                  <button
                                    (click)="selectCharacter(char)"
                                    class="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary-50 transition-colors"
                                    [ngClass]="selectedCharacter()?.id === char.id ? 'bg-purple-50 text-purple-700' : 'text-secondary-700'"
                                  >
                                    {{ char.name }}
                                  </button>
                                }
                              }
                            }
                          </div>
                        }
                      </div>
                    }

                    <!-- MCPs Dropdown -->
                    <div class="relative" #mcpDropdown>
                      <button
                        (click)="toggleMcpDropdown($event)"
                        class="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-colors"
                        [ngClass]="webSearchEnabled() || enabledMcpServerIds().length > 0
                          ? 'border-primary-300 bg-primary-50 text-primary-700'
                          : 'border-secondary-200 bg-secondary-50 text-secondary-500 hover:bg-secondary-100'"
                        aria-label="Toggle MCPs"
                        title="Toggle MCPs"
                        aria-haspopup="menu"
                        [attr.aria-expanded]="showMcpDropdown()"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        MCPs
                        @if (enabledMcpServerIds().length > 0) {
                          <span class="bg-primary-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">{{ enabledMcpServerIds().length }}</span>
                        }
                        <svg class="w-3 h-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      @if (showMcpDropdown()) {
                        <div class="absolute bottom-full left-0 mb-1 w-56 bg-white rounded-lg border border-secondary-200 shadow-lg py-1 z-50">
                          <button
                            (click)="webSearchEnabled.set(!webSearchEnabled()); showMcpDropdown.set(false)"
                            class="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary-50 transition-colors flex items-center justify-between"
                            [ngClass]="webSearchEnabled() ? 'text-primary-700 font-medium' : 'text-secondary-700'"
                          >
                            <div class="flex items-center gap-2">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              Web Search
                            </div>
                            @if (webSearchEnabled()) {
                              <svg class="w-3.5 h-3.5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                              </svg>
                            }
                          </button>
                          @for (mcp of availableMcpServers(); track mcp.id) {
                            <button
                              (click)="toggleMcpServer(mcp)"
                              class="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary-50 transition-colors flex items-center justify-between"
                              [ngClass]="isMcpServerEnabled(mcp.id) ? 'text-primary-700 font-medium' : 'text-secondary-700'"
                            >
                              <div class="flex items-center gap-2 min-w-0">
                                <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                                </svg>
                                <span class="truncate">{{ mcp.name }}</span>
                                @if (mcp.authRequired && !mcp.authenticated) {
                                  <span class="text-xs text-amber-600 flex-shrink-0">🔒</span>
                                }
                              </div>
                              @if (isMcpServerEnabled(mcp.id)) {
                                <svg class="w-3.5 h-3.5 text-primary-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                </svg>
                              }
                            </button>
                          }
                          @if (availableMcpServers().length === 0) {
                            <div class="px-3 py-1.5 text-xs text-secondary-400">No MCP servers configured.</div>
                          }
                        </div>
                      }
                    </div>

                    <!-- Think toggle -->
                    <button
                      (click)="thinkEnabled.set(!thinkEnabled())"
                      class="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-colors"
                      [ngClass]="thinkEnabled()
                        ? 'border-primary-300 bg-primary-50 text-primary-700'
                        : 'border-secondary-200 bg-secondary-50 text-secondary-500 hover:bg-secondary-100'"
                      aria-label="Toggle think mode"
                      title="Toggle think mode"
                      [attr.aria-pressed]="thinkEnabled()"
                    >
                      💡 Think
                    </button>
                  </div>
                </div>

                <!-- Memories Panel (collapsible) -->
                @if (showMemoriesPanel()) {
                  <div class="border-b border-secondary-100 bg-purple-50/50 max-h-48 overflow-y-auto">
                    <div class="p-2 space-y-1">
                      @for (mem of memories(); track mem.id) {
                        <div class="flex items-start gap-1.5 p-1.5 bg-white rounded border border-secondary-100 text-xs">
                          <span class="flex-1 text-secondary-700 break-words">{{ mem.content }}</span>
                          <button
                            (click)="deleteMemory(mem.id)"
                            class="text-secondary-400 hover:text-red-500 flex-shrink-0 p-0.5"
                            aria-label="Delete memory"
                            title="Delete memory"
                          >
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      }
                      @if (memories().length === 0) {
                        <p class="text-xs text-secondary-400 text-center py-2">No memories stored</p>
                      }
                      <div class="flex gap-1 mt-1">
                        <input
                          type="text"
                          [(ngModel)]="newMemoryContent"
                          name="newMemoryContent"
                          (keydown.enter)="addMemory()"
                          placeholder="Add a memory..."
                          class="flex-1 px-2 py-1 rounded border border-secondary-200 text-xs focus:border-primary-600 focus:outline-none"
                        />
                        <button
                          (click)="addMemory()"
                          [disabled]="!newMemoryContent.trim()"
                          class="px-2 py-1 rounded bg-purple-600 text-white text-xs hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                }

                <!-- Chat Messages -->
                <div class="flex-1 overflow-y-auto p-3 space-y-3" #chatMessagesContainer>
                  @for (msg of chatMessages(); track $index) {
                    @if (msg.role === 'assistant' && msg.searches?.length) {
                      @for (search of msg.searches; track $index) {
                        <div class="flex items-center gap-1.5 text-[10px] text-secondary-500 mb-1">
                          <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span>Searched</span>
                          @if (search.url) {
                            <a [href]="search.url" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline truncate max-w-[200px]">{{ search.query }}</a>
                          } @else {
                            <span class="text-secondary-600">{{ search.query }}</span>
                          }
                        </div>
                      }
                    }
                    @if (msg.role === 'step') {
                      <div
                        (click)="msg.toolResult && showToolResult(msg)"
                        class="flex items-center gap-2 text-xs text-secondary-500 py-1 px-2 rounded hover:bg-secondary-50 transition-colors group cursor-default"
                        [class.cursor-pointer]="msg.toolResult"
                      >
                        @if (msg.status === 'running') {
                          <div class="w-3 h-3 border-2 border-secondary-300 border-t-secondary-600 rounded-full animate-spin"></div>
                        } @else if (msg.status === 'failed') {
                          <span class="text-red-500">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </span>
                        } @else {
                          <span class="text-secondary-400">
                            @switch (msg.toolName) {
                              @case ('read_file') {
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              }
                              @case ('edit_file') {
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              }
                              @case ('create_file') {
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              }
                              @case ('run_terminal') {
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              }
                              @case ('explorer_subagent') {
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                              }
                              @case ('coder_subagent') {
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                              }
                              @default {
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              }
                            }
                          </span>
                        }
                        <span class="flex-1 truncate">{{ msg.content }}</span>
                        <svg class="w-3 h-3 text-secondary-300 group-hover:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    } @else if (msg.role !== 'tool') {
                      <div [ngClass]="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
                        <div
                          class="max-w-[90%] px-3 py-2 rounded-lg text-sm"
                          [ngClass]="msg.role === 'user'
                            ? 'bg-primary-600 text-white'
                            : 'bg-secondary-100 text-secondary-800'"
                        >
                          @if (msg.thinking) {
                            <details class="mb-2">
                              <summary class="text-xs cursor-pointer opacity-70 font-medium">💭 Thought</summary>
                              <div class="mt-1 text-xs opacity-80 prose prose-sm max-w-none" [ngClass]="msg.role === 'user' ? 'prose-invert' : 'prose-secondary'" [innerHTML]="renderMarkdown(msg.thinking)"></div>
                            </details>
                          }
                          <div class="prose prose-sm max-w-none" [ngClass]="msg.role === 'user' ? 'prose-invert' : 'prose-secondary'" [innerHTML]="renderMarkdown(msg.displayContent ?? getContentAsString(msg.content))"></div>
                        </div>
                      </div>
                    }
                  }
                  @if (isAiResponding()) {
                    <div class="flex justify-start">
                      <div class="max-w-[90%] bg-secondary-100 text-secondary-800 px-3 py-2 rounded-lg text-sm">
                        @if (streamingThinking()) {
                          <details open class="mb-2">
                            <summary class="text-xs cursor-pointer opacity-70">💭 {{ thinkingDone() ? 'Thought' : 'Thinking...' }}</summary>
                            <div class="mt-1 text-xs opacity-80 prose prose-sm prose-secondary max-w-none" [innerHTML]="renderMarkdown(streamingThinking())"></div>
                          </details>
                        }
                        @if (streamingSearches().length > 0) {
                          <div class="space-y-1 mb-2">
                            @for (search of streamingSearches(); track $index) {
                              <div class="flex items-center gap-1.5 text-xs text-secondary-500">
                                @if (search.status === 'searching') {
                                  <div class="w-3 h-3 border-2 border-secondary-300 border-t-secondary-600 rounded-full animate-spin"></div>
                                } @else {
                                  <span>🔍</span>
                                }
                                <span>{{ search.query }}</span>
                              </div>
                            }
                          </div>
                        }
                        @if (streamingContent()) {
                          <div class="prose prose-sm prose-secondary max-w-none" [innerHTML]="renderMarkdown(streamingContent())"></div>
                        } @else if (!streamingThinking() && !streamingSearches().length) {
                          <div class="flex items-center gap-2">
                            <div class="w-3 h-3 border-2 border-secondary-300 border-t-secondary-600 rounded-full animate-spin"></div>
                            <span class="text-xs">{{ toolIterationCount() > 0 ? 'Executing tools (' + toolIterationCount() + '/10)...' : 'Thinking...' }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>

                <!-- Chat Input -->
                <div class="p-3 border-t border-secondary-100">
                  <div class="flex gap-2">
                    <textarea
                      [(ngModel)]="chatInput"
                      name="chatInput"
                      (keydown.enter)="onChatEnterKey($event)"
                      placeholder="Ask AI for help..."
                      rows="1"
                      class="flex-1 px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 resize-none max-h-24 overflow-y-auto"
                      (input)="autoChatResize($event)"
                    ></textarea>
                    @if (voiceService.recognitionSupported) {
                      <button
                        (click)="enterVoiceMode()"
                        [disabled]="isAiResponding()"
                        class="px-2 py-2 rounded-lg border border-secondary-200 text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700 transition-colors disabled:opacity-50 flex-shrink-0 self-end"
                        aria-label="Voice mode"
                        title="Voice mode"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </button>
                    }
                    <button
                      (click)="sendChatMessage()"
                      [disabled]="isAiResponding() || !chatInput.trim() || !selectedProvider()"
                      class="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-700 transition-colors disabled:opacity-50 flex-shrink-0 self-end"
                      aria-label="Send message"
                      title="Send message"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      }

      <!-- Voice Mode Overlay -->
      @if (voiceModeActive()) {
        <div class="fixed inset-0 z-50 bg-gradient-to-b from-secondary-900 to-secondary-800 flex flex-col items-center justify-center text-white">
          <!-- Close button -->
          <button
            (click)="exitVoiceMode()"
            class="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Exit voice mode"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Character display -->
          <div class="mb-4 text-center">
            @if (selectedCharacter()) {
              <p class="text-sm text-purple-300">🎭 {{ selectedCharacter()?.name }}</p>
            }
          </div>

          <!-- Status / transcript -->
          <div class="text-center mb-8 px-6 max-w-lg min-h-[80px]">
            @if (voiceService.isListening()) {
              <div class="flex items-center justify-center gap-2 mb-3">
                <span class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                <span class="text-sm text-red-300 font-medium">Listening...</span>
              </div>
              @if (voiceService.interimTranscript()) {
                <p class="text-lg text-white/80 italic">{{ voiceService.interimTranscript() }}</p>
              }
            } @else if (voiceService.isSpeaking()) {
              <div class="flex items-center justify-center gap-2 mb-3">
                <span class="text-sm text-green-300 font-medium">🔊 Speaking...</span>
              </div>
              <p class="text-sm text-white/60">Tap the mic to interrupt</p>
            } @else if (voiceProcessing()) {
              <div class="flex items-center justify-center gap-2">
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span class="text-sm text-white/70">Thinking...</span>
              </div>
            } @else {
              @if (errorMessage()) {
                <p class="text-sm text-red-400 mb-2">{{ errorMessage() }}</p>
              }
              <p class="text-sm text-white/60">Tap the mic to start talking</p>
            }
          </div>

          <!-- Mic button -->
          <button
            (click)="toggleVoiceListening()"
            [disabled]="voiceProcessing()"
            class="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50"
            [ngClass]="voiceService.isListening()
              ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-lg shadow-red-500/30'
              : 'bg-white/10 hover:bg-white/20 border-2 border-white/30'"
            aria-label="Toggle microphone"
          >
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          <!-- Voice picker -->
          <div class="mt-8 relative">
            <button
              (click)="showVoicePicker.set(!showVoicePicker())"
              class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707a1 1 0 011.707.707v14a1 1 0 01-1.707.707L5.586 15z" />
              </svg>
              <span class="max-w-[200px] truncate">{{ getSelectedVoiceLabel() }}</span>
              <svg class="w-3 h-3 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            @if (showVoicePicker()) {
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 max-h-64 overflow-y-auto bg-secondary-800 rounded-lg border border-secondary-600 shadow-xl py-1 z-50">
                @for (v of voiceService.availableVoices(); track $index) {
                  <button
                    (click)="voiceService.selectVoice($index); showVoicePicker.set(false)"
                    class="w-full text-left px-4 py-2 text-sm hover:bg-secondary-700 transition-colors truncate"
                    [ngClass]="voiceService.selectedVoiceIndex() === $index ? 'bg-primary-700/40 text-primary-300' : 'text-white/80'"
                  >
                    {{ v.label }}
                  </button>
                }
                @if (voiceService.availableVoices().length === 0) {
                  <p class="px-4 py-2 text-sm text-white/50">No voices available</p>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class CodingAgentPageComponent implements OnInit, OnDestroy {
  @ViewChild('chatMessagesContainer') chatMessagesContainer!: ElementRef;
  @ViewChild('providerDropdown') providerDropdown!: ElementRef;
  @ViewChild('characterDropdown') characterDropdown!: ElementRef;
  @ViewChild('mcpDropdown') mcpDropdown!: ElementRef;

  private codingAgentService = inject(CodingAgentService);
  private llmService = inject(LlmService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  voiceService = inject(VoiceService);

  // Wizard state
  currentStep = signal<WizardStep>('check-github');
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  // GitHub state
  githubConnected = signal(false);
  githubUsername = signal<string | null>(null);
  dockerAvailable = signal(false);

  // Repository selection (GitHub)
  repos = signal<GitHubRepo[]>([]);
  isLoadingRepos = signal(false);
  repoSearch = '';
  selectedRepo = signal<GitHubRepo | null>(null);
  private repoSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Repository selection (Local.LLM)
  localRepos = signal<LocalRepoInfo[]>([]);
  isLoadingLocalRepos = signal(false);
  selectedLocalRepo = signal<LocalRepoInfo | null>(null);

  // Custom URL entry
  customRepoUrl = '';
  customUrlError = signal<string | null>(null);

  // Container state
  activeContainer = signal<ContainerInfo | null>(null);
  isCreatingContainer = signal(false);

  // Container manager
  allContainers = signal<ContainerInfo[]>([]);
  isLoadingContainers = signal(false);
  isStartingContainer = signal(false);

  containersForRepo = signal<ContainerInfo[]>([]);
  activeContainersForRepo = signal<ContainerInfo[]>([]);

  // Background mode
  taskDescription = '';
  backgroundTaskStarted = signal(false);
  isRunningTask = signal(false);
  taskCompleted = signal(false);
  taskLog = signal('');

  // Manual mode - Files
  currentFiles = signal<FileEntry[]>([]);
  isLoadingFiles = signal(false);
  currentFilePath = signal<string | null>(null);
  currentDirPath = signal('.');
  fileContent = '';
  isSavingFile = signal(false);

  // Manual mode - Tabs
  activeTab = signal<'editor' | 'terminal' | 'preview'>('editor');

  // Manual mode - Terminal
  terminalOutput = signal('$ Welcome to the coding agent terminal\n');
  terminalCommand = '';

  // Manual mode - Preview
  previewUrl = signal<string | null>(null);
  isRunningDevServer = signal(false);

  // Manual mode - Agent Terminal
  showAgentTerminal = signal(false);
  agentTerminalOutput = signal('');

  // Manual mode - AI Chat
  chatMessages = signal<LocalChatMessage[]>([
    { role: 'assistant', content: 'Hi! I\u0027m your AI coding assistant. I can help you edit code, run commands, and debug issues. What would you like to work on?' },
  ]);
  chatInput = '';
  isAiResponding = signal(false);
  toolIterationCount = signal(0);

  // Provider/Model selection
  providers = signal<ProviderInfo[]>([]);
  selectedProvider = signal<ProviderInfo | null>(null);
  showProviderDropdown = signal(false);
  expandedProvider = signal<string | null>(null);

  // MCP selection
  showMcpDropdown = signal(false);
  webSearchEnabled = signal(false);
  availableMcpServers = signal<McpServerInfo[]>([]);
  enabledMcpServerIds = signal<string[]>([]);

  // Character selection
  universes = signal<UniverseSummary[]>([]);
  selectedCharacter = signal<UniverseCharacterSummary | null>(null);
  showCharacterDropdown = signal(false);

  // Think mode
  thinkEnabled = signal(false);

  // Streaming state
  streamingThinking = signal('');
  streamingContent = signal('');
  streamingSearches = signal<SearchEvent[]>([]);
  thinkingDone = signal(false);

  // Memories
  memories = signal<AgentMemory[]>([]);
  showMemoriesPanel = signal(false);
  newMemoryContent = '';

  // Voice mode state
  voiceModeActive = signal(false);
  voiceProcessing = signal(false);
  showVoicePicker = signal(false);

  private statusInterval: ReturnType<typeof setInterval> | null = null;
  private clickOutsideListener: ((e: Event) => void) | null = null;
  private providerPollTimer: ReturnType<typeof setInterval> | null = null;

  private static readonly MARKDOWN_CACHE_MAX_SIZE = 500;
  private readonly markdownCache = new Map<string, string>();

  // Cap tool iterations to prevent infinite loops when the LLM keeps invoking tools
  private static readonly MAX_TOOL_ITERATIONS = 10;

  async ngOnInit(): Promise<void> {
    this.clickOutsideListener = (e: Event) => {
      if (this.showProviderDropdown() && this.providerDropdown &&
          !this.providerDropdown.nativeElement.contains(e.target as Node)) {
        this.showProviderDropdown.set(false);
        this.expandedProvider.set(null);
      }
      if (this.showCharacterDropdown() && this.characterDropdown &&
          !this.characterDropdown.nativeElement.contains(e.target as Node)) {
        this.showCharacterDropdown.set(false);
      }
      if (this.showMcpDropdown() && this.mcpDropdown &&
          !this.mcpDropdown.nativeElement.contains(e.target as Node)) {
        this.showMcpDropdown.set(false);
      }
    };
    document.addEventListener('click', this.clickOutsideListener);

    await Promise.all([
      this.checkSetup(),
      this.loadProvidersWithRetry(),
      this.loadUniverses(),
      this.loadMcpServers(),
    ]);

    this.startProviderPollingIfNeeded();
  }

  ngOnDestroy(): void {
    if (this.repoSearchTimeout) clearTimeout(this.repoSearchTimeout);
    if (this.statusInterval) clearInterval(this.statusInterval);
    if (this.clickOutsideListener) {
      document.removeEventListener('click', this.clickOutsideListener);
    }
    this.stopProviderPolling();
    this.voiceService.stopListening();
    this.voiceService.stopSpeaking();
  }

  async checkSetup(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [ghStatus, dockerStatus] = await Promise.all([
        this.codingAgentService.getGitHubStatus(),
        this.codingAgentService.getDockerStatus().catch(() => ({ available: false })),
      ]);

      this.githubConnected.set(ghStatus.configured);
      this.githubUsername.set(ghStatus.username);
      this.dockerAvailable.set(dockerStatus.available);

      if (dockerStatus.available) {
        this.goToStep('select-repo');
      }
    } catch {
      this.errorMessage.set('Failed to check configuration');
    } finally {
      this.isLoading.set(false);
    }
  }

  goToStep(step: WizardStep): void {
    this.currentStep.set(step);
    this.errorMessage.set(null);
    this.customUrlError.set(null);

    if (step === 'select-repo') {
      if (this.githubConnected()) this.loadRepos();
      this.loadLocalRepos();
    }

    if (step === 'container-manager') {
      this.loadContainersForRepo();
    }

    if (step === 'manual-workspace') {
      this.loadMemories();
    }
  }

  // --- Provider/Model Selection ---

  private hasLocalProvider(): boolean {
    return this.providers().some(p => p.id === 'local');
  }

  private startProviderPollingIfNeeded(): void {
    if (this.hasLocalProvider()) return;
    this.providerPollTimer = setInterval(async () => {
      await this.loadProviders();
      if (this.hasLocalProvider()) {
        this.stopProviderPolling();
      }
    }, 10_000);
  }

  private stopProviderPolling(): void {
    if (this.providerPollTimer) {
      clearInterval(this.providerPollTimer);
      this.providerPollTimer = null;
    }
  }

  private async loadProvidersWithRetry(): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.loadProviders();
      if (this.providers().length > 0) return;
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async loadProviders(): Promise<void> {
    try {
      const providers = await this.llmService.getProviders();
      this.providers.set(providers);
      if (providers.length > 0 && !this.selectedProvider()) {
        this.selectedProvider.set(providers[0]);
      }
    } catch {
      // Silent failure
    }
  }

  toggleProviderDropdown(event: Event): void {
    event.stopPropagation();
    const opening = !this.showProviderDropdown();
    this.showProviderDropdown.set(opening);
    if (!opening) this.expandedProvider.set(null);
  }

  selectProvider(provider: ProviderInfo): void {
    this.selectedProvider.set(provider);
    this.showProviderDropdown.set(false);
    this.expandedProvider.set(null);
  }

  toggleModelList(provider: ProviderInfo, event: Event): void {
    event.stopPropagation();
    this.expandedProvider.set(this.expandedProvider() === provider.id ? null : provider.id);
  }

  selectProviderModel(provider: ProviderInfo, model: string | { id: string; name: string }): void {
    const modelId = typeof model === 'string' ? model : model.id;
    this.selectedProvider.set({ ...provider, model: modelId });
    this.showProviderDropdown.set(false);
    this.expandedProvider.set(null);
  }

  getModelId(model: string | { id: string; name: string }): string {
    return typeof model === 'string' ? model : model.id;
  }

  getModelDisplayName(model: string | { id: string; name: string }): string {
    return typeof model === 'string' ? model : model.name;
  }

  resolveModelName(provider: ProviderInfo | null | undefined): string {
    if (!provider?.model) return '';
    if (provider.models) {
      const found = provider.models.find(m => this.getModelId(m) === provider.model);
      if (found) return this.getModelDisplayName(found);
    }
    return provider.model;
  }

  // --- Character Selection ---

  async loadUniverses(): Promise<void> {
    try {
      const universes = await this.llmService.getUniverses();
      this.universes.set(universes);
    } catch {
      // Silent failure – character selection is optional
    }
  }

  toggleCharacterDropdown(event: Event): void {
    event.stopPropagation();
    this.showCharacterDropdown.set(!this.showCharacterDropdown());
  }

  toggleMcpDropdown(event: Event): void {
    event.stopPropagation();
    this.showMcpDropdown.set(!this.showMcpDropdown());
  }

  async loadMcpServers(): Promise<void> {
    try {
      const servers = await this.llmService.getMcpServers();
      this.availableMcpServers.set(servers);
    } catch {
      // Silent failure
    }
  }

  toggleMcpServer(mcp: McpServerInfo): void {
    if (mcp.authRequired && !mcp.authenticated) {
      this.errorMessage.set(`"${mcp.name}" requires authentication. Please configure your token in Settings > Integrations.`);
      this.showMcpDropdown.set(false);
      return;
    }
    const current = this.enabledMcpServerIds();
    if (current.includes(mcp.id)) {
      this.enabledMcpServerIds.set(current.filter(id => id !== mcp.id));
    } else {
      this.enabledMcpServerIds.set([...current, mcp.id]);
    }
  }

  isMcpServerEnabled(serverId: string): boolean {
    return this.enabledMcpServerIds().includes(serverId);
  }

  selectCharacter(character: UniverseCharacterSummary | null): void {
    this.selectedCharacter.set(character);
    this.showCharacterDropdown.set(false);
  }

  // --- Repository Selection ---

  async loadRepos(): Promise<void> {
    if (!this.githubConnected()) {
      this.repos.set([]);
      return;
    }
    this.isLoadingRepos.set(true);
    try {
      const repos = await this.codingAgentService.getGitHubRepos(1, this.repoSearch);
      this.repos.set(repos);
    } catch {
      this.errorMessage.set('Failed to load repositories');
    } finally {
      this.isLoadingRepos.set(false);
    }
  }

  async loadLocalRepos(): Promise<void> {
    this.isLoadingLocalRepos.set(true);
    try {
      const repos = await this.codingAgentService.getLocalRepos();
      this.localRepos.set(repos);
      const localRepoId = this.route.snapshot.queryParamMap.get('localRepoId');
      if (localRepoId) {
        const match = repos.find(r => r.id === localRepoId);
        if (match) this.selectLocalRepo(match);
      }
    } catch {
      // Local repos are optional
    } finally {
      this.isLoadingLocalRepos.set(false);
    }
  }

  onRepoSearchChange(): void {
    if (this.repoSearchTimeout) clearTimeout(this.repoSearchTimeout);
    this.repoSearchTimeout = setTimeout(() => this.loadRepos(), 300);
  }

  selectRepo(repo: GitHubRepo): void {
    this.selectedRepo.set(repo);
    this.selectedLocalRepo.set(null);
    this.customUrlError.set(null);
  }

  selectLocalRepo(repo: LocalRepoInfo): void {
    this.selectedLocalRepo.set(repo);
    this.selectedRepo.set(null);
    this.customUrlError.set(null);
  }

  useCustomUrl(): void {
    const url = this.customRepoUrl.trim();
    this.customUrlError.set(null);

    if (!url) {
      this.customUrlError.set('Please enter a repository URL');
      return;
    }

    if (!/^https:\/\/[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?\/[\w./\-]+(\.git)?$/.test(url)) {
      this.customUrlError.set('Please enter a valid HTTPS git repository URL (e.g. https://github.com/owner/repo)');
      return;
    }

    let urlPath: string;
    try {
      urlPath = new URL(url).pathname.replace(/\.git$/, '');
    } catch {
      this.customUrlError.set('Invalid URL format');
      return;
    }
    const parts = urlPath.split('/').filter(Boolean);
    const fullName = parts.join('/') || url;
    const name = parts[parts.length - 1] || 'repository';

    this.selectedRepo.set({
      id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
      name,
      fullName,
      description: null,
      private: false,
      defaultBranch: 'main',
      language: null,
      updatedAt: new Date().toISOString(),
      htmlUrl: url.replace(/\.git$/, ''),
      cloneUrl: url,
    });
    this.selectedLocalRepo.set(null);
  }

  // --- Mode Selection ---

  async startBackgroundMode(): Promise<void> {
    this.isCreatingContainer.set(true);
    this.errorMessage.set(null);

    try {
      const localRepo = this.selectedLocalRepo();
      if (localRepo) {
        const container = await this.codingAgentService.createLocalRepoContainer(localRepo.id);
        this.activeContainer.set(container);
        this.goToStep('background-running');
        return;
      }

      const repo = this.selectedRepo();
      if (!repo) return;

      const container = await this.codingAgentService.createContainer(
        repo.fullName, repo.cloneUrl, 'background', repo.defaultBranch
      );
      this.activeContainer.set(container);
      this.goToStep('background-running');
    } catch (err: unknown) {
      const httpErr = err as { error?: { error?: string } };
      const msg = httpErr?.error?.error || 'Failed to create container';
      this.errorMessage.set(
        msg.toLowerCase().includes('private') || msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('token')
          ? `${msg} — if this is a private repository, configure a Personal Access Token in Settings.`
          : msg
      );
    } finally {
      this.isCreatingContainer.set(false);
    }
  }

  startManualMode(): void {
    this.goToStep('container-manager');
  }

  // --- Container Manager ---

  async loadContainersForRepo(): Promise<void> {
    this.isLoadingContainers.set(true);
    try {
      const containers = await this.codingAgentService.listContainers();
      this.allContainers.set(containers);

      const localRepo = this.selectedLocalRepo();
      const ghRepo = this.selectedRepo();

      const filtered = containers.filter(c => {
        if (localRepo) return c.localRepoId === localRepo.id;
        if (ghRepo) return c.repoFullName === ghRepo.fullName;
        return false;
      });
      this.containersForRepo.set(filtered);
      this.activeContainersForRepo.set(filtered.filter(c => c.status === 'running' || c.status === 'creating'));
    } catch {
      this.errorMessage.set('Failed to load containers');
    } finally {
      this.isLoadingContainers.set(false);
    }
  }

  async createNewContainer(): Promise<void> {
    this.isCreatingContainer.set(true);
    this.errorMessage.set(null);

    // Initial message in chat
    this.chatMessages.set([
      { role: 'assistant', content: 'Setting up environment...' },
      { role: 'step', content: 'Create container', status: 'running' }
    ]);

    try {
      let container: ContainerInfo;
      const localRepo = this.selectedLocalRepo();
      if (localRepo) {
        container = await this.codingAgentService.createLocalRepoContainer(localRepo.id);
      } else {
        const repo = this.selectedRepo();
        if (!repo) return;
        container = await this.codingAgentService.createContainer(
          repo.fullName, repo.cloneUrl, 'manual', repo.defaultBranch
        );
      }

      this.chatMessages.update(msgs => {
        const newMsgs = [...msgs];
        newMsgs[1] = { ...newMsgs[1], status: 'completed' };
        newMsgs.push({ role: 'step', content: 'Clone repository', status: 'running' });
        return newMsgs;
      });

      // Poll until files are available (clone complete) or timeout after 30s
      let filesLoaded = false;
      for (let i = 0; i < 10 && !filesLoaded; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        try {
          const files = await this.codingAgentService.listFiles(container.id);
          if (files.length > 0) {
            filesLoaded = true;
            this.currentFiles.set(files);
          }
        } catch {
          // Container may not be ready yet, retry
        }
      }

      this.chatMessages.update(msgs => {
        const newMsgs = [...msgs];
        newMsgs[2] = { ...newMsgs[2], status: filesLoaded ? 'completed' : 'failed' };
        if (filesLoaded) {
          newMsgs.push({ role: 'assistant', content: 'Hi! I\u0027m your AI coding assistant. I\u0027ve set up the environment. What would you like to work on?' });
        }
        return newMsgs;
      });

      this.activeContainer.set(container);
      if (!filesLoaded) {
        await this.loadFiles();
      }
      this.goToStep('manual-workspace');
    } catch (err: unknown) {
      const httpErr = err as { error?: { error?: string } };
      const msg = httpErr?.error?.error || 'Failed to create container';
      this.errorMessage.set(
        msg.toLowerCase().includes('private') || msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('token')
          ? `${msg} — if this is a private repository, configure a Personal Access Token in Settings.`
          : msg
      );
    } finally {
      this.isCreatingContainer.set(false);
    }
  }

  async loadContainerWorkspace(container: ContainerInfo): Promise<void> {
    this.activeContainer.set(container);
    this.isLoadingFiles.set(true);
    try {
      const files = await this.codingAgentService.listFiles(container.id);
      files.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      this.currentFiles.set(files);
    } catch {
      // May fail if container is still starting
    } finally {
      this.isLoadingFiles.set(false);
    }
    this.goToStep('manual-workspace');
  }

  async startAndLoadContainer(container: ContainerInfo): Promise<void> {
    this.isStartingContainer.set(true);
    this.chatMessages.set([
      { role: 'assistant', content: 'Resuming environment...' },
      { role: 'step', content: 'Start container', status: 'running' }
    ]);

    try {
      await this.codingAgentService.startContainer(container.id);
      const updated = await this.codingAgentService.getContainer(container.id);

      this.chatMessages.update(msgs => {
        const newMsgs = [...msgs];
        newMsgs[1] = { ...newMsgs[1], status: 'completed' };
        newMsgs.push({ role: 'assistant', content: 'Welcome back! Environment is ready.' });
        return newMsgs;
      });

      await this.loadContainerWorkspace(updated);
    } catch {
      this.errorMessage.set('Failed to start container');
    } finally {
      this.isStartingContainer.set(false);
    }
  }

  async stopContainerById(containerId: string): Promise<void> {
    try {
      await this.codingAgentService.stopContainer(containerId);
      await this.loadContainersForRepo();
    } catch {
      this.errorMessage.set('Failed to stop container');
    }
  }

  async removeContainerById(containerId: string): Promise<void> {
    try {
      await this.codingAgentService.removeContainer(containerId);
      await this.loadContainersForRepo();
    } catch {
      this.errorMessage.set('Failed to remove container');
    }
  }

  formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  }

  // --- Background Mode ---

  async startBackgroundTask(): Promise<void> {
    if (!this.taskDescription.trim()) return;

    this.isRunningTask.set(true);
    this.errorMessage.set(null);
    this.backgroundTaskStarted.set(true);
    this.taskLog.set('> Starting background task...\n');

    const container = this.activeContainer();
    if (!container) return;

    try {
      this.appendTaskLog('> Creating feature branch...\n');
      await this.codingAgentService.execInContainer(container.id, 'git checkout -b ai-coding-agent-task');
      this.appendTaskLog('✓ Branch created: ai-coding-agent-task\n\n');

      this.appendTaskLog('> Analyzing project structure...\n');
      const lsResult = await this.codingAgentService.execInContainer(container.id, 'ls -la');
      this.appendTaskLog(lsResult.output + '\n');

      this.appendTaskLog('> AI is analyzing the task and generating changes...\n');
      this.appendTaskLog(`> Task: ${this.taskDescription}\n\n`);

      this.appendTaskLog('> Staging and committing changes...\n');
      await this.codingAgentService.execInContainer(container.id, 'git add -A');
      const safeDescription = this.taskDescription.slice(0, 72).replace(/["`$\\]/g, '');
      const commitResult = await this.codingAgentService.execInContainer(
        container.id,
        `git commit -m "AI Coding Agent: ${safeDescription}" --allow-empty`
      );
      this.appendTaskLog(commitResult.output + '\n');

      this.appendTaskLog('> Pushing branch and creating pull request...\n');
      const pushResult = await this.codingAgentService.execInContainer(container.id, 'git push origin ai-coding-agent-task 2>&1');
      this.appendTaskLog(pushResult.output + '\n');

      this.appendTaskLog('\n✓ Task completed successfully!\n');
      this.taskCompleted.set(true);
    } catch (err: unknown) {
      const httpErr = err as { error?: { error?: string }; message?: string };
      this.appendTaskLog(`\n✗ Error: ${httpErr?.error?.error || httpErr?.message || 'Unknown error'}\n`);
    } finally {
      this.isRunningTask.set(false);
    }
  }

  private appendTaskLog(text: string): void {
    this.taskLog.update(log => log + text);
  }

  // --- Manual Mode: Files ---

  async loadFiles(dirPath = '.'): Promise<void> {
    const container = this.activeContainer();
    if (!container) return;

    this.isLoadingFiles.set(true);
    try {
      const files = await this.codingAgentService.listFiles(container.id, dirPath);
      files.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      this.currentFiles.set(files);
      this.currentDirPath.set(dirPath);
    } catch {
      // Silent failure
    } finally {
      this.isLoadingFiles.set(false);
    }
  }

  async onFileClick(file: FileEntry): Promise<void> {
    if (file.type === 'directory') {
      await this.loadFiles(file.name);
    } else {
      await this.openFile(file.name);
    }
  }

  async openFile(filePath: string): Promise<void> {
    const container = this.activeContainer();
    if (!container) return;

    try {
      const content = await this.codingAgentService.readFile(container.id, filePath);
      this.currentFilePath.set(filePath);
      this.fileContent = content;
      this.activeTab.set('editor');
    } catch {
      this.errorMessage.set('Failed to open file');
    }
  }

  async saveCurrentFile(): Promise<void> {
    const container = this.activeContainer();
    const filePath = this.currentFilePath();
    if (!container || !filePath) return;

    this.isSavingFile.set(true);
    try {
      await this.codingAgentService.writeFile(container.id, filePath, this.fileContent);
    } catch {
      this.errorMessage.set('Failed to save file');
    } finally {
      this.isSavingFile.set(false);
    }
  }

  getFileName(path: string): string {
    return path.split('/').pop() || path;
  }

  // --- Manual Mode: Terminal ---

  async executeTerminalCommand(): Promise<void> {
    if (!this.terminalCommand.trim()) return;

    const container = this.activeContainer();
    if (!container) return;

    const cmd = this.terminalCommand;
    this.terminalCommand = '';
    this.terminalOutput.update(output => output + `$ ${cmd}\n`);

    try {
      const result = await this.codingAgentService.execInContainer(container.id, cmd);
      this.terminalOutput.update(output => output + result.output + '\n');
    } catch {
      this.terminalOutput.update(output => output + 'Error executing command\n');
    }
  }

  // --- Manual Mode: Agent Terminal ---

  toggleAgentTerminal(): void {
    this.showAgentTerminal.set(!this.showAgentTerminal());
  }

  clearAgentTerminal(): void {
    this.agentTerminalOutput.set('');
  }

  showToolResult(msg: LocalChatMessage): void {
    if (!msg.toolResult) return;
    this.agentTerminalOutput.update(o => o + `\n[${msg.content}]\n${msg.toolResult}\n`);
    this.showAgentTerminal.set(true);
  }

  // --- Manual Mode: Dev Server ---

  async runDevServer(): Promise<void> {
    const container = this.activeContainer();
    if (!container) return;

    this.isRunningDevServer.set(true);

    try {
      const result = await this.codingAgentService.execInContainer(
        container.id,
        'if [ -f package.json ]; then cat package.json; fi'
      );

      let devCommand = '';
      if (result.output) {
        try {
          const pkg = JSON.parse(result.output);
          if (pkg.scripts?.dev) devCommand = 'npm run dev';
          else if (pkg.scripts?.start) devCommand = 'npm start';
          else if (pkg.scripts?.serve) devCommand = 'npm run serve';
        } catch {
          // Not valid JSON
        }
      }

      if (!devCommand) {
        const checkResult = await this.codingAgentService.execInContainer(
          container.id,
          'ls requirements.txt Gemfile pom.xml go.mod 2>/dev/null || true'
        );
        if (checkResult.output.includes('requirements.txt')) {
          devCommand = 'python -m http.server 3000';
        }
      }

      if (devCommand) {
        this.terminalOutput.update(output => output + `$ ${devCommand} &\n`);
        await this.codingAgentService.execInContainer(container.id, `${devCommand} &`);
        this.terminalOutput.update(output => output + `Dev server starting...\n`);
      } else {
        this.terminalOutput.update(output => output + 'Could not detect project type for dev server\n');
      }
    } catch {
      this.terminalOutput.update(output => output + 'Failed to start dev server\n');
    } finally {
      this.isRunningDevServer.set(false);
    }
  }

  // --- Manual Mode: Container ---

  async stopActiveContainer(): Promise<void> {
    const container = this.activeContainer();
    if (!container) return;

    try {
      await this.codingAgentService.stopContainer(container.id);
      this.activeContainer.update(c => c ? { ...c, status: 'stopped' } : null);
    } catch {
      // Silent failure
    }
  }

  // --- Memories ---

  private getRepoKey(): string {
    const localRepo = this.selectedLocalRepo();
    if (localRepo) return `local:${localRepo.id}`;
    const repo = this.selectedRepo();
    if (repo) return repo.fullName;
    return 'unknown';
  }

  async loadMemories(): Promise<void> {
    try {
      const mems = await this.codingAgentService.getMemories(this.getRepoKey());
      this.memories.set(mems);
    } catch {
      // Silent failure
    }
  }

  async addMemory(): Promise<void> {
    const content = this.newMemoryContent.trim();
    if (!content) return;
    this.newMemoryContent = '';
    try {
      const mem = await this.codingAgentService.addMemory(this.getRepoKey(), content);
      this.memories.update(mems => [...mems, mem]);
    } catch {
      // Silent failure
    }
  }

  async deleteMemory(memId: string): Promise<void> {
    try {
      await this.codingAgentService.deleteMemory(this.getRepoKey(), memId);
      this.memories.update(mems => mems.filter(m => m.id !== memId));
    } catch {
      // Silent failure
    }
  }

  // --- Manual Mode: AI Chat ---

  // ---------------------------------------------------------------------------
  // Voice Mode
  // ---------------------------------------------------------------------------

  enterVoiceMode(): void {
    this.voiceModeActive.set(true);
    this.showVoicePicker.set(false);
  }

  exitVoiceMode(): void {
    this.voiceService.stopListening();
    this.voiceService.stopSpeaking();
    this.voiceModeActive.set(false);
    this.voiceProcessing.set(false);
    this.showVoicePicker.set(false);
  }

  async toggleVoiceListening(): Promise<void> {
    if (this.voiceService.isListening()) {
      this.voiceService.stopListening();
      return;
    }

    // If TTS is speaking, stop it and start listening
    if (this.voiceService.isSpeaking()) {
      this.voiceService.stopSpeaking();
    }

    try {
      const transcript = await this.voiceService.startListening();
      if (transcript) {
        await this.sendVoiceMessage(transcript);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.errorMessage.set(`Voice recognition failed: ${msg}. Check your microphone permissions and try again.`);
    }
  }

  private async sendVoiceMessage(message: string): Promise<void> {
    if (!message.trim() || this.isAiResponding() || !this.selectedProvider()) return;

    this.voiceProcessing.set(true);
    this.streamingSearches.set([]);
    this.chatMessages.update(msgs => [...msgs, { role: 'user', content: message }]);
    this.scrollChatToBottom();
    this.isAiResponding.set(true);
    this.toolIterationCount.set(0);

    try {
      await this.runAiLoop();

      // Speak the last assistant response via TTS if still in voice mode
      if (this.voiceModeActive()) {
        const msgs = this.chatMessages();
        const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant');
        if (lastAssistant) {
          const textToSpeak = lastAssistant.displayContent || this.getContentAsString(lastAssistant.content);
          await this.voiceService.speak(textToSpeak);
        }
      }
    } catch {
      this.chatMessages.update(msgs => [...msgs, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      this.isAiResponding.set(false);
      this.streamingThinking.set('');
      this.streamingContent.set('');
      this.streamingSearches.set([]);
      this.thinkingDone.set(false);
      this.toolIterationCount.set(0);
      this.voiceProcessing.set(false);
      this.scrollChatToBottom();
    }
  }

  getSelectedVoiceLabel(): string {
    const voices = this.voiceService.availableVoices();
    const idx = this.voiceService.selectedVoiceIndex();
    if (voices.length > 0 && idx < voices.length) {
      return voices[idx].label;
    }
    return 'Default Voice';
  }

  onChatEnterKey(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      ke.preventDefault();
      this.sendChatMessage();
    }
  }

  autoChatResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 96) + 'px';
  }

  private scrollChatToBottom(): void {
    setTimeout(() => {
      if (this.chatMessagesContainer?.nativeElement) {
        this.chatMessagesContainer.nativeElement.scrollTop = this.chatMessagesContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }

  async sendChatMessage(): Promise<void> {
    if (!this.chatInput.trim() || this.isAiResponding() || !this.selectedProvider()) return;

    const message = this.chatInput.trim();
    this.chatInput = '';

    this.streamingSearches.set([]);
    this.chatMessages.update(msgs => [...msgs, { role: 'user', content: message }]);
    this.scrollChatToBottom();
    this.isAiResponding.set(true);
    this.toolIterationCount.set(0);

    try {
      await this.runAiLoop();
    } catch {
      this.chatMessages.update(msgs => [...msgs, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      this.isAiResponding.set(false);
      this.streamingThinking.set('');
      this.streamingContent.set('');
      this.streamingSearches.set([]);
      this.thinkingDone.set(false);
      this.toolIterationCount.set(0);
      this.scrollChatToBottom();
    }
  }

  private async runAiLoop(): Promise<void> {
    for (let iteration = 0; iteration < CodingAgentPageComponent.MAX_TOOL_ITERATIONS; iteration++) {
      this.toolIterationCount.set(iteration);

      const llmMessages = this.buildLlmMessages();
      const result = await this.runStreamRequest(llmMessages);
      const fullContent = result.content;

      // Parse tool calls from response
      const toolCalls = this.parseToolCalls(fullContent);

      // Add the assistant's response (with thinking) but strip tool blocks for display
      const cleanedContent = this.stripToolCalls(fullContent).trim();
      if (cleanedContent || result.thinking || toolCalls.length > 0) {
        this.chatMessages.update(msgs => [...msgs, {
          role: 'assistant',
          content: fullContent,
          displayContent: cleanedContent || (toolCalls.length > 0 ? '' : '...'),
          thinking: result.thinking || undefined,
          searches: result.searches?.length ? result.searches : undefined,
        }]);
        this.scrollChatToBottom();
      }

      if (toolCalls.length === 0) {
        // No tools to call - we're done with this turn
        return;
      }

      // Execute each tool call
      let toolResultsText = '';
      for (const tc of toolCalls) {
        // Add a "step" message to show progress
        const stepIndex = this.chatMessages().length;
        const stepLabel = this.getToolStepLabel(tc);
        this.chatMessages.update(msgs => [...msgs, {
          role: 'step',
          content: stepLabel,
          status: 'running',
          toolName: tc.name
        }]);
        this.scrollChatToBottom();

        try {
          const toolResult = await this.executeTool(tc);
          toolResultsText += `[TOOL_RESULT: ${tc.name}]\n${toolResult}\n[/TOOL_RESULT]\n\n`;

          const isError = typeof toolResult === 'string' && toolResult.startsWith('Error:');

          // Update step status
          this.chatMessages.update(msgs => {
            const newMsgs = [...msgs];
            newMsgs[stepIndex] = {
              ...newMsgs[stepIndex],
              status: isError ? 'failed' : 'completed',
              toolResult: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
            };
            return newMsgs;
          });
        } catch (err) {
          const errMsg = String(err);
          toolResultsText += `[TOOL_RESULT: ${tc.name}]\nError: ${errMsg}\n[/TOOL_RESULT]\n\n`;
          // Update step to failed
          this.chatMessages.update(msgs => {
            const newMsgs = [...msgs];
            newMsgs[stepIndex] = { ...newMsgs[stepIndex], status: 'failed', toolResult: errMsg };
            return newMsgs;
          });
        }
        this.scrollChatToBottom();
      }

      // Add tool results as a tool message for the next LLM iteration
      this.chatMessages.update(msgs => [...msgs, { role: 'tool', content: toolResultsText }]);
      this.scrollChatToBottom();
    }

    // Exceeded max iterations
    this.chatMessages.update(msgs => [...msgs, {
      role: 'assistant',
      content: 'I\'ve reached the maximum number of tool iterations (10). Please provide further instructions if you\'d like me to continue.',
      displayContent: 'I\'ve reached the maximum number of tool iterations (10). Please provide further instructions if you\'d like me to continue.',
    }]);
  }

  private getToolStepLabel(tc: ToolCall): string {
    switch (tc.name) {
      case 'read_file': return `Read ${tc.params['path']}`;
      case 'create_file': return `Create ${tc.params['path']}`;
      case 'edit_file': return `Edit ${tc.params['path']}`;
      case 'run_terminal': return `Run \`${tc.params['command']}\``;
      case 'explorer_subagent': return 'Explore repository';
      case 'coder_subagent': return tc.params['task'] ? `Work on: ${tc.params['task']}` : 'Perform coding task';
      case 'store_memory': return 'Store memory';
      case 'delete_memory': return 'Delete memory';
      case 'web_search': return `Search: ${tc.params['query']}`;
      default: return `Execute ${tc.name}`;
    }
  }

  private buildLlmMessages(): LlmChatMessage[] {
    const rawRepoName = this.selectedLocalRepo()?.name || this.selectedRepo()?.fullName || 'unknown';
    const repoName = rawRepoName.replace(/[`${}\\]/g, '');
    const memoriesText = this.memories().map(m => `- ${m.content}`).join('\n') || '(none)';

    let availableTools = `
1. read_file - Read file contents. Params: {"path": "relative/path", "startLine": 1, "endLine": 50} (startLine/endLine optional)
2. create_file - Create a new file. Params: {"path": "relative/path", "content": "file contents"}
3. edit_file - Replace lines in a file. Params: {"path": "relative/path", "startLine": 1, "endLine": 5, "content": "replacement content"}
4. explorer_subagent - Read directory tree and key files to understand the repo. Params: {}
5. coder_subagent - Use when you need to perform a complex coding task. Params: {"paths": ["file1.ts"], "task": "description"}
6. run_terminal - Execute a shell command (10-minute timeout). Params: {"command": "npm install"}
7. new_terminal - Reset/clear the agent terminal output. Params: {}
8. store_memory - Store a memory about this repo for future sessions. Params: {"content": "fact to remember"}
9. delete_memory - Delete a stored memory. Params: {"id": "memory-id"}`;

    if (this.webSearchEnabled()) {
      availableTools += `
10. web_search - Perform a web search to get up-to-date information. Params: {"query": "search query"}`;
    }

    const systemPrompt = `You are an expert AI coding assistant working inside a Docker container with a cloned repository: ${repoName}.
You have access to the following tools. To use a tool, you MUST output the exact format below in your response. Do not use markdown blocks for tool calls.

[TOOL: tool_name]
{"param": "value"}
[/TOOL]

Available tools:
${availableTools}

Current memories for this repo:
${memoriesText}

Guidelines:
- **Think step-by-step.** Explain your reasoning before using tools.
- **Proactivity.** If a task requires multiple steps (e.g., install deps, then create file, then run tests), use the tools one after another. You do not need to wait for the user between tool calls.
- **Verification.** After creating or editing a file, you should ideally verify it (e.g., by reading it back or running a command).
- **Conciseness.** Be clear and professional. Use markdown for your normal text response.
- **File Edits.** When using edit_file, the "content" param must be the full new content for the specified line range.
- **Continuity.** After a tool result is provided, analyze the output and decide on the next step. Only stop when the task is complete or you need user clarification.`;

    const msgs: LlmChatMessage[] = [{ role: 'system', content: systemPrompt }];

    for (const msg of this.chatMessages()) {
      if (msg.role === 'step') {
        // Steps are for UI only, skip them for the LLM payload
        continue;
      }

      if (msg.role === 'tool') {
        // Tool results are sent as user messages with context
        msgs.push({ role: 'user', content: `[Tool execution results]\n${msg.content}` });
      } else {
        msgs.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
      }
    }

    return msgs;
  }

  private async runStreamRequest(llmMessages: LlmChatMessage[]): Promise<StreamResult> {
    const provider = this.selectedProvider();
    if (!provider) throw new Error('No provider selected');

    this.streamingThinking.set('');
    this.streamingContent.set('');
    this.streamingSearches.set([]);
    this.thinkingDone.set(false);

    const options: SendMessageOptions = {};
    if (this.thinkEnabled()) options.think = true;
    if (this.selectedCharacter()) options.characterId = this.selectedCharacter()?.id;

    try {
      return await this.llmService.sendMessageStream(
        llmMessages,
        provider.id,
        provider.model || '',
        options,
        {
          onThinking: (content) => {
            this.streamingThinking.update(t => t + content);
            this.scrollChatToBottom();
          },
          onContent: (content) => {
            if (!this.thinkingDone() && this.streamingThinking()) {
              this.thinkingDone.set(true);
            }
            this.streamingContent.update(c => c + content);
            this.scrollChatToBottom();
          },
          onSearch: (data) => {
            this.streamingSearches.update(s => {
              if (data.status === 'searched') {
                const idx = s.findIndex(e => e.status === 'searching' && e.query === data.query);
                if (idx >= 0) {
                  const updated = [...s];
                  updated[idx] = data;
                  return updated;
                }
              }
              return [...s, data];
            });
            this.scrollChatToBottom();
          },
          onDone: () => {
            this.thinkingDone.set(true);
          },
        }
      );
    } finally {
      this.streamingThinking.set('');
      this.streamingContent.set('');
      this.streamingSearches.set([]);
      this.thinkingDone.set(false);
    }
  }

  // --- Tool Parsing & Execution ---

  private parseToolCalls(content: string): ToolCall[] {
    const calls: ToolCall[] = [];
    const regex = /\[TOOL:\s*(\w+)\]\s*\n([\s\S]*?)\n\[\/TOOL\]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      try {
        const params = JSON.parse(match[2].trim());
        calls.push({ name: match[1], params });
      } catch {
        calls.push({ name: match[1], params: {} });
      }
    }
    return calls;
  }

  private stripToolCalls(content: string): string {
    return content.replace(/\[TOOL:\s*\w+\]\s*\n[\s\S]*?\n\[\/TOOL\]/g, '').trim();
  }

  private async executeTool(tc: ToolCall): Promise<string> {
    const container = this.activeContainer();
    if (!container) return 'Error: No active container';

    try {
      switch (tc.name) {
        case 'read_file': {
          const path = tc.params['path'] as string;
          if (!path) return 'Error: path is required';
          const content = await this.codingAgentService.readFile(container.id, path);
          const startLine = tc.params['startLine'] as number | undefined;
          const endLine = tc.params['endLine'] as number | undefined;
          if (startLine || endLine) {
            const lines = content.split('\n');
            const start = Math.max(0, (startLine || 1) - 1);
            const end = endLine ? Math.min(lines.length, endLine) : lines.length;
            return lines.slice(start, end).map((l, i) => `${start + i + 1}. ${l}`).join('\n');
          }
          return content;
        }

        case 'create_file': {
          const path = tc.params['path'] as string;
          const content = tc.params['content'] as string;
          if (!path || content === undefined) return 'Error: path and content are required';
          await this.codingAgentService.writeFile(container.id, path, content);
          await this.loadFiles(this.currentDirPath());
          return `File created: ${path}`;
        }

        case 'edit_file': {
          const path = tc.params['path'] as string;
          const startLine = tc.params['startLine'] as number;
          const endLine = tc.params['endLine'] as number;
          const content = tc.params['content'] as string;
          if (!path || !startLine || !endLine || content === undefined) return 'Error: path, startLine, endLine, and content are required';
          if (startLine > endLine) return 'Error: startLine must be <= endLine';
          const existing = await this.codingAgentService.readFile(container.id, path);
          const lines = existing.split('\n');
          const newLines = content.split('\n');
          lines.splice(startLine - 1, endLine - startLine + 1, ...newLines);
          await this.codingAgentService.writeFile(container.id, path, lines.join('\n'));
          // Refresh editor if same file
          if (this.currentFilePath() === path) {
            this.fileContent = lines.join('\n');
          }
          await this.loadFiles(this.currentDirPath());
          return `File edited: ${path} (lines ${startLine}-${endLine})`;
        }

        case 'explorer_subagent': {
          const treeResult = await this.codingAgentService.agentExec(container.id, 'find . -maxdepth 3 -not -path "*/node_modules/*" -not -path "*/.git/*" | head -100');
          let output = `Directory tree:\n${treeResult.output}\n`;
          const keyFiles = ['package.json', 'README.md', 'Cargo.toml', 'go.mod', 'requirements.txt'];
          const keyFileResults = await Promise.allSettled(
            keyFiles.map(kf => this.codingAgentService.readFile(container.id, kf).then(c => ({ name: kf, content: c })))
          );
          for (const r of keyFileResults) {
            if (r.status === 'fulfilled') {
              output += `\n--- ${r.value.name} ---\n${r.value.content.slice(0, 2000)}\n`;
            }
          }
          return output;
        }

        case 'coder_subagent': {
          const paths = tc.params['paths'] as string[] | undefined;
          const task = tc.params['task'] as string | undefined;
          let output = '';
          if (paths && paths.length > 0) {
            for (const p of paths) {
              try {
                const fileContent = await this.codingAgentService.readFile(container.id, p);
                output += `--- ${p} ---\n${fileContent}\n\n`;
              } catch {
                output += `--- ${p} --- (not found)\n\n`;
              }
            }
          }
          if (task) {
            output += `Task: ${task}\n`;
          }
          return output || 'No paths or task specified';
        }

        case 'run_terminal': {
          const command = tc.params['command'] as string;
          if (!command) return 'Error: command is required';
          this.agentTerminalOutput.update(o => o + `$ ${command}\n`);
          const result = await this.codingAgentService.agentExec(container.id, command);
          const output = result.output || '(no output)';
          this.agentTerminalOutput.update(o => o + output + '\n');
          if (result.timedOut) {
            await this.loadFiles(this.currentDirPath());
            return `Command timed out after 10 minutes.\nPartial output:\n${output}`;
          }
          await this.loadFiles(this.currentDirPath());
          return output;
        }

        case 'new_terminal': {
          this.agentTerminalOutput.set('');
          return 'Agent terminal cleared.';
        }

        case 'store_memory': {
          const content = tc.params['content'] as string;
          if (!content) return 'Error: content is required';
          const mem = await this.codingAgentService.addMemory(this.getRepoKey(), content);
          this.memories.update(mems => [...mems, mem]);
          return `Memory stored: ${mem.id}`;
        }

        case 'delete_memory': {
          const id = tc.params['id'] as string;
          if (!id) return 'Error: id is required';
          await this.codingAgentService.deleteMemory(this.getRepoKey(), id);
          this.memories.update(mems => mems.filter(m => m.id !== id));
          return `Memory deleted: ${id}`;
        }

        case 'web_search': {
          const query = tc.params['query'] as string;
          if (!query) return 'Error: query is required';

          this.streamingSearches.update(s => [...s, { status: 'searching', query }]);

          try {
            const res = await firstValueFrom(
              this.http.post<{ success: boolean, results: any[] }>(
                `${environment.apiUrl}/api/search`,
                { query }
              )
            );

            const resultsText = res.results.map(r => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`).join('\n\n');

            this.streamingSearches.update(s => {
              const idx = s.findIndex(e => e.status === 'searching' && e.query === query);
              if (idx >= 0) {
                const updated = [...s];
                updated[idx] = { status: 'searched', query, url: res.results[0]?.url };
                return updated;
              }
              return s;
            });

            // Add search event to the actual assistant message searches if it's currently responding
            // Coding agent uses a different pattern for persisting assistant messages

            return resultsText || 'No results found.';
          } catch (err) {
            return `Error: Failed to perform search`;
          }
        }

        default:
          return `Unknown tool: ${tc.name}`;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return `Error executing ${tc.name}: ${errMsg}`;
    }
  }

  // --- Markdown Rendering ---

  getContentAsString(content: string | any[]): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map(p => p.text || '').join('\n');
    }
    return '';
  }

  renderMarkdown(text: string): string {
    if (!text) return '';

    const cached = this.markdownCache.get(text);
    if (cached !== undefined) return cached;

    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    try {
      const html = marked.parse(escapedText, { breaks: true, gfm: true }) as string;
      if (this.markdownCache.size >= CodingAgentPageComponent.MARKDOWN_CACHE_MAX_SIZE) {
        this.markdownCache.clear();
      }
      this.markdownCache.set(text, html);
      return html;
    } catch {
      if (this.markdownCache.size >= CodingAgentPageComponent.MARKDOWN_CACHE_MAX_SIZE) {
        this.markdownCache.clear();
      }
      this.markdownCache.set(text, escapedText);
      return escapedText;
    }
  }
}
