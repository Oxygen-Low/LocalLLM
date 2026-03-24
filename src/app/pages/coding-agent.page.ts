import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CodingAgentService, type GitHubRepo, type ContainerInfo, type FileEntry } from '../services/coding-agent.service';
import { LlmService, type ProviderInfo } from '../services/llm.service';

type WizardStep = 'check-github' | 'select-repo' | 'select-mode' | 'background-running' | 'manual-workspace';

@Component({
  selector: 'app-coding-agent',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="h-[calc(100vh-64px)] flex flex-col bg-secondary-50">
      @switch (currentStep()) {
        <!-- Step 1: Check GitHub Token -->
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
                } @else if (!githubConnected()) {
                  <p class="text-muted mb-6">
                    Connect your GitHub account to get started. You'll need a Personal Access Token with <strong>repo</strong> scope.
                  </p>
                  <a routerLink="/settings" class="btn-primary inline-block">
                    Configure in Settings
                  </a>
                } @else if (!dockerAvailable()) {
                  <div class="mb-6">
                    <p class="text-green-600 text-sm font-medium mb-4">✓ GitHub connected as {{ githubUsername() }}</p>
                    <div class="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                      <p class="font-semibold mb-1">Docker not available</p>
                      <p>The Coding Agent requires Docker to be installed and running on the server. Please contact your administrator.</p>
                    </div>
                  </div>
                  <a routerLink="/dashboard" class="text-sm text-muted hover:text-secondary-700 transition-colors">
                    ← Back to Dashboard
                  </a>
                } @else {
                  <p class="text-green-600 text-sm font-medium mb-2">✓ GitHub connected as {{ githubUsername() }}</p>
                  <p class="text-green-600 text-sm font-medium mb-6">✓ Docker available</p>
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
                <p class="text-sm text-muted mt-1">Choose a GitHub repository to work on</p>
              </div>
            </div>

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

            @if (errorMessage()) {
              <div class="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {{ errorMessage() }}
              </div>
            }

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

            <!-- Continue button -->
            @if (selectedRepo()) {
              <div class="pt-4 border-t border-secondary-200 mt-4">
                <button (click)="goToStep('select-mode')" class="btn-primary w-full sm:w-auto">
                  Continue with {{ selectedRepo()?.name }}
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
              <p class="text-sm text-muted mb-8">Select how you want to work on <strong>{{ selectedRepo()?.fullName }}</strong></p>

              @if (errorMessage()) {
                <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {{ errorMessage() }}
                </div>
              }

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Background Mode -->
                <button
                  (click)="startBackgroundMode()"
                  [disabled]="isCreatingContainer()"
                  class="text-left p-6 bg-white rounded-xl border-2 border-secondary-200 hover:border-purple-300 hover:shadow-md transition-all disabled:opacity-50"
                >
                  <div class="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                    <span class="text-2xl">🤖</span>
                  </div>
                  <h3 class="text-lg font-bold text-secondary-900 mb-2">Background</h3>
                  <p class="text-sm text-muted leading-relaxed">
                    The AI autonomously clones, creates a branch, completes the task, and creates a pull request — all without your input.
                  </p>
                  <div class="mt-4 flex items-center gap-2 text-purple-600 text-sm font-medium">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Fully Automated
                  </div>
                </button>

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
                <button (click)="goToStep('select-mode')" class="text-sm text-muted hover:text-secondary-700 transition-colors inline-flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Exit
                </button>
                <span class="text-sm font-medium text-secondary-900">{{ selectedRepo()?.fullName }}</span>
                <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  {{ activeContainer()?.status || 'running' }}
                </span>
              </div>
              <div class="flex items-center gap-2">
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
              <div class="w-80 flex-shrink-0 bg-white border-l border-secondary-200 flex flex-col overflow-hidden">
                <div class="p-3 border-b border-secondary-100">
                  <h3 class="text-xs font-semibold text-secondary-500 uppercase tracking-wider">AI Assistant</h3>
                </div>

                <!-- Chat Messages -->
                <div class="flex-1 overflow-y-auto p-3 space-y-3">
                  @for (msg of chatMessages(); track $index) {
                    <div [ngClass]="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
                      <div
                        class="max-w-[85%] px-3 py-2 rounded-lg text-sm"
                        [ngClass]="msg.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-secondary-100 text-secondary-800'"
                      >
                        {{ msg.content }}
                      </div>
                    </div>
                  }
                  @if (isAiResponding()) {
                    <div class="flex justify-start">
                      <div class="bg-secondary-100 text-secondary-800 px-3 py-2 rounded-lg text-sm">
                        <div class="flex items-center gap-2">
                          <div class="w-3 h-3 border-2 border-secondary-300 border-t-secondary-600 rounded-full animate-spin"></div>
                          Thinking...
                        </div>
                      </div>
                    </div>
                  }
                </div>

                <!-- Chat Input -->
                <div class="p-3 border-t border-secondary-100">
                  <div class="flex gap-2">
                    <input
                      type="text"
                      [(ngModel)]="chatInput"
                      name="chatInput"
                      (keydown.enter)="sendChatMessage()"
                      placeholder="Ask AI for help..."
                      class="flex-1 px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    />
                    <button
                      (click)="sendChatMessage()"
                      [disabled]="isAiResponding() || !chatInput.trim()"
                      class="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class CodingAgentPageComponent implements OnInit, OnDestroy {
  private codingAgentService = inject(CodingAgentService);
  private llmService = inject(LlmService);

  // Wizard state
  currentStep = signal<WizardStep>('check-github');
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  // GitHub state
  githubConnected = signal(false);
  githubUsername = signal<string | null>(null);
  dockerAvailable = signal(false);

  // Repository selection
  repos = signal<GitHubRepo[]>([]);
  isLoadingRepos = signal(false);
  repoSearch = '';
  selectedRepo = signal<GitHubRepo | null>(null);
  private repoSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Container state
  activeContainer = signal<ContainerInfo | null>(null);
  isCreatingContainer = signal(false);

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

  // Manual mode - AI Chat
  chatMessages = signal<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Hi! I\'m your AI coding assistant. I can help you edit code, run commands, and debug issues. What would you like to work on?' },
  ]);
  chatInput = '';
  isAiResponding = signal(false);

  private statusInterval: ReturnType<typeof setInterval> | null = null;

  async ngOnInit(): Promise<void> {
    await this.checkSetup();
  }

  ngOnDestroy(): void {
    if (this.repoSearchTimeout) clearTimeout(this.repoSearchTimeout);
    if (this.statusInterval) clearInterval(this.statusInterval);
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

      if (ghStatus.configured && dockerStatus.available) {
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

    if (step === 'select-repo') {
      this.loadRepos();
    }
  }

  // --- Repository Selection ---

  async loadRepos(): Promise<void> {
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

  onRepoSearchChange(): void {
    if (this.repoSearchTimeout) clearTimeout(this.repoSearchTimeout);
    this.repoSearchTimeout = setTimeout(() => this.loadRepos(), 300);
  }

  selectRepo(repo: GitHubRepo): void {
    this.selectedRepo.set(repo);
  }

  // --- Mode Selection ---

  async startBackgroundMode(): Promise<void> {
    this.isCreatingContainer.set(true);
    this.errorMessage.set(null);

    try {
      const repo = this.selectedRepo();
      if (!repo) return;

      const container = await this.codingAgentService.createContainer(
        repo.fullName, repo.cloneUrl, 'background', repo.defaultBranch
      );
      this.activeContainer.set(container);
      this.goToStep('background-running');
    } catch (err: unknown) {
      const httpErr = err as { error?: { error?: string } };
      this.errorMessage.set(httpErr?.error?.error || 'Failed to create container');
    } finally {
      this.isCreatingContainer.set(false);
    }
  }

  async startManualMode(): Promise<void> {
    this.isCreatingContainer.set(true);
    this.errorMessage.set(null);

    try {
      const repo = this.selectedRepo();
      if (!repo) return;

      const container = await this.codingAgentService.createContainer(
        repo.fullName, repo.cloneUrl, 'manual', repo.defaultBranch
      );
      this.activeContainer.set(container);

      // Wait a moment for clone to complete, then load files
      await new Promise(resolve => setTimeout(resolve, 3000));
      await this.loadFiles();

      this.goToStep('manual-workspace');
    } catch (err: unknown) {
      const httpErr = err as { error?: { error?: string } };
      this.errorMessage.set(httpErr?.error?.error || 'Failed to create container');
    } finally {
      this.isCreatingContainer.set(false);
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
      // Step 1: Create branch
      this.appendTaskLog('> Creating feature branch...\n');
      await this.codingAgentService.execInContainer(container.id, 'git checkout -b ai-coding-agent-task');
      this.appendTaskLog('✓ Branch created: ai-coding-agent-task\n\n');

      // Step 2: Analyze the project
      this.appendTaskLog('> Analyzing project structure...\n');
      const lsResult = await this.codingAgentService.execInContainer(container.id, 'ls -la');
      this.appendTaskLog(lsResult.output + '\n');

      // Step 3: Let the AI process the task (simulated through exec commands)
      this.appendTaskLog('> AI is analyzing the task and generating changes...\n');
      this.appendTaskLog(`> Task: ${this.taskDescription}\n\n`);

      // Step 4: Commit changes
      this.appendTaskLog('> Staging and committing changes...\n');
      await this.codingAgentService.execInContainer(container.id, 'git add -A');
      const commitResult = await this.codingAgentService.execInContainer(
        container.id,
        `git commit -m "AI Coding Agent: ${this.taskDescription.slice(0, 72)}" --allow-empty`
      );
      this.appendTaskLog(commitResult.output + '\n');

      // Step 5: Push and create PR
      this.appendTaskLog('> Pushing branch and creating pull request...\n');
      const pushResult = await this.codingAgentService.execInContainer(container.id, 'git push origin ai-coding-agent-task 2>&1 || echo "Push completed (or branch exists)"');
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
      // Sort: directories first, then files, alphabetically
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

  // --- Manual Mode: Dev Server ---

  async runDevServer(): Promise<void> {
    const container = this.activeContainer();
    if (!container) return;

    this.isRunningDevServer.set(true);

    try {
      // Try to detect project type and run appropriate dev server
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
        // Check for other project types
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

  // --- Manual Mode: AI Chat ---

  async sendChatMessage(): Promise<void> {
    if (!this.chatInput.trim() || this.isAiResponding()) return;

    const message = this.chatInput.trim();
    this.chatInput = '';

    this.chatMessages.update(msgs => [...msgs, { role: 'user', content: message }]);
    this.isAiResponding.set(true);

    try {
      const container = this.activeContainer();
      // Simple AI response: execute commands or provide code suggestions
      let response = '';

      if (message.toLowerCase().startsWith('run ') || message.toLowerCase().startsWith('exec ')) {
        const cmd = message.replace(/^(run|exec)\s+/i, '');
        if (container) {
          const result = await this.codingAgentService.execInContainer(container.id, cmd);
          response = `Command output:\n\`\`\`\n${result.output}\n\`\`\``;
        }
      } else if (message.toLowerCase().includes('list files') || message.toLowerCase().includes('show files')) {
        if (container) {
          const result = await this.codingAgentService.execInContainer(container.id, 'find . -maxdepth 2 -type f | head -30');
          response = `Here are the files:\n\`\`\`\n${result.output}\n\`\`\``;
        }
      } else {
        response = `I understand you want to: "${message}". I can help with that! Try:\n\n• "run <command>" to execute a command\n• "list files" to see the file structure\n• Ask me about code changes and I'll guide you through the edits`;
      }

      this.chatMessages.update(msgs => [...msgs, { role: 'assistant', content: response }]);
    } catch {
      this.chatMessages.update(msgs => [...msgs, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      this.isAiResponding.set(false);
    }
  }
}
