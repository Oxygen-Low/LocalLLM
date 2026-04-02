import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../services/translation.service';
import { WebSeoService, type SeoApp, type SeoProgress, type SeoCheckResult } from '../services/web-seo.service';
import { CodingAgentService, type GitHubRepo, type LocalRepoInfo } from '../services/coding-agent.service';
import { Subscription } from 'rxjs';

type ViewMode = 'list' | 'add' | 'check' | 'results';

@Component({
  selector: 'app-web-seo',
  standalone: true,
  /* ⚡ Bolt: Added OnPush change detection to prevent unnecessary re-renders in this complex component. This relies on Angular Signals for targeted DOM updates, significantly reducing CPU usage during heavy streaming or state changes. */
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-64px)] bg-secondary-50 py-8 px-4 sm:px-6 lg:px-8">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <a routerLink="/dashboard" class="text-sm text-muted hover:text-secondary-700 transition-colors mb-2 inline-flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </a>
            <h1 class="text-3xl font-bold text-secondary-900">{{ t.translate('webSeo.title') }}</h1>
            <p class="text-muted mt-1">{{ t.translate('webSeo.subtitle') }}</p>
          </div>
          @if (currentView() === 'list') {
            <button (click)="goToAdd()" class="btn-primary flex items-center gap-2">
              <span class="text-lg">+</span> {{ t.translate('webSeo.addApp') }}
            </button>
          } @else {
            <button (click)="goBack()" class="text-sm text-muted hover:text-secondary-700 transition-colors flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          }
        </div>

        <!-- List View -->
        @if (currentView() === 'list') {
          @if (isLoading()) {
            <div class="flex justify-center py-12">
              <div class="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
          } @else if (apps().length === 0) {
            <div class="bg-white rounded-xl border border-secondary-200 p-12 text-center">
              <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="text-3xl">🔍</span>
              </div>
              <h3 class="text-lg font-medium text-secondary-900">{{ t.translate('webSeo.noApps') }}</h3>
              <button (click)="goToAdd()" class="mt-4 btn-primary">
                {{ t.translate('webSeo.addApp') }}
              </button>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              @for (app of apps(); track app.id) {
                <div class="bg-white rounded-xl border border-secondary-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                  <div class="p-6 flex-1">
                    <div class="flex items-start justify-between mb-4">
                      <div class="w-12 h-12 rounded-lg bg-secondary-100 flex items-center justify-center text-xl">
                        {{ app.type === 'url' ? '🌐' : '📦' }}
                      </div>
                      <div class="flex gap-2">
                        <button (click)="deleteApp(app.id)" class="text-secondary-400 hover:text-red-500 p-1">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <h3 class="text-lg font-bold text-secondary-900 truncate">{{ app.name }}</h3>
                    <p class="text-sm text-muted mt-1 truncate">
                      {{ app.type === 'url' ? app.url : app.repoFullName }}
                    </p>

                    @if (app.lastCheck) {
                      <div class="mt-4 pt-4 border-t border-secondary-100">
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-xs font-medium text-secondary-500 uppercase">{{ t.translate('webSeo.score') }}</span>
                          <span class="text-lg font-bold" [ngClass]="getScoreColor(app.lastCheck.report.totalScore)">
                            {{ app.lastCheck.report.totalScore }}
                          </span>
                        </div>
                        <div class="flex gap-1 h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                          <div class="h-full" [ngStyle]="{'width': app.lastCheck.report.totalScore + '%', 'background-color': getScoreHex(app.lastCheck.report.totalScore)}"></div>
                        </div>
                        <p class="text-[10px] text-muted mt-2">
                          {{ t.translate('webSeo.lastChecked') }}: {{ formatDate(app.lastCheck.timestamp) }}
                        </p>
                      </div>
                    } @else {
                      <div class="mt-4 pt-4 border-t border-secondary-100 text-center py-4">
                        <p class="text-xs text-muted">Never checked</p>
                      </div>
                    }
                  </div>
                  <div class="p-4 bg-secondary-50 border-t border-secondary-100 flex gap-2">
                    <button (click)="runCheck(app)" class="flex-1 btn-primary text-sm py-2">
                      {{ t.translate('webSeo.checkNow') }}
                    </button>
                    @if (app.lastCheck) {
                      <button (click)="viewResults(app)" class="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-secondary-700 hover:bg-secondary-50 text-sm transition-colors">
                        View
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        }

        <!-- Add View -->
        @if (currentView() === 'add') {
          <div class="max-w-2xl mx-auto bg-white rounded-xl border border-secondary-200 p-8">
            <h2 class="text-2xl font-bold text-secondary-900 mb-6">Add New SEO App</h2>

            <div class="space-y-6">
              <!-- App Name -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-1">App Name</label>
                <input type="text" [(ngModel)]="newApp.name" placeholder="e.g. My Portfolio" class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100" />
              </div>

              <!-- Type Selector -->
              <div class="grid grid-cols-2 gap-4">
                <button
                  (click)="newApp.type = 'url'"
                  [ngClass]="newApp.type === 'url' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-secondary-200 hover:border-secondary-300 text-secondary-600'"
                  class="flex flex-col items-center p-4 rounded-xl border-2 transition-all"
                >
                  <span class="text-2xl mb-2">🌐</span>
                  <span class="font-medium">{{ t.translate('webSeo.urlType') }}</span>
                </button>
                <button
                  (click)="newApp.type = 'repo'"
                  [ngClass]="newApp.type === 'repo' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-secondary-200 hover:border-secondary-300 text-secondary-600'"
                  class="flex flex-col items-center p-4 rounded-xl border-2 transition-all"
                >
                  <span class="text-2xl mb-2">📦</span>
                  <span class="font-medium">{{ t.translate('webSeo.repoType') }}</span>
                </button>
              </div>

              @if (newApp.type === 'url') {
                <div>
                  <label class="block text-sm font-medium text-secondary-700 mb-1">Website URL</label>
                  <input type="url" [(ngModel)]="newApp.url" placeholder="https://example.com" class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100" />
                </div>
              } @else {
                <!-- Repo Selection (Simpler version of Coding Agent) -->
                <div>
                  <label class="block text-sm font-medium text-secondary-700 mb-3">Select Repository</label>

                  @if (isLoadingRepos()) {
                    <div class="py-4 flex justify-center">
                      <div class="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    </div>
                  } @else {
                    <div class="space-y-2 max-h-60 overflow-y-auto pr-2">
                      @for (repo of repos(); track repo.id) {
                        <button
                          (click)="selectRepo(repo)"
                          [ngClass]="newApp.repoFullName === repo.fullName ? 'border-primary-600 bg-primary-50' : 'border-secondary-200 hover:border-secondary-300'"
                          class="w-full text-left p-3 rounded-lg border text-sm transition-all"
                        >
                          <div class="font-medium text-secondary-900">{{ repo.fullName }}</div>
                          <div class="text-xs text-muted truncate">{{ repo.description || 'No description' }}</div>
                        </button>
                      }
                    </div>
                  }
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-1">Build Command (optional)</label>
                    <input type="text" [(ngModel)]="newApp.buildCommand" placeholder="npm run build" class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-1">Start Command</label>
                    <input type="text" [(ngModel)]="newApp.startCommand" placeholder="npm start" class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100" />
                  </div>
                </div>
              }

              <div class="pt-6">
                <button
                  (click)="createApp()"
                  [disabled]="!isValidApp()"
                  class="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create SEO App
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Execution View -->
        @if (currentView() === 'check') {
          <div class="max-w-3xl mx-auto">
            <div class="bg-white rounded-xl border border-secondary-200 overflow-hidden">
              <div class="p-6 border-b border-secondary-100">
                <h2 class="text-xl font-bold text-secondary-900">Running SEO Check: {{ selectedApp()?.name }}</h2>
                <p class="text-sm text-muted">This may take a few minutes as we build and analyze your application.</p>
              </div>

              <div class="p-6 bg-secondary-900 font-mono text-sm min-h-80 max-h-96 overflow-y-auto" #logContainer>
                @for (log of checkLogs(); track $index) {
                  <div class="mb-2 flex items-start gap-3">
                    @if (log.status === 'running') {
                      <div class="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mt-0.5"></div>
                    } @else if (log.status === 'completed') {
                      <span class="text-green-500">✓</span>
                    } @else {
                      <span class="text-red-500">✗</span>
                    }
                    <span [ngClass]="log.status === 'failed' ? 'text-red-400' : 'text-green-400'">
                      {{ log.message }}
                    </span>
                  </div>
                }
                @if (!checkCompleted() && !checkError()) {
                  <div class="text-secondary-500 animate-pulse mt-4 italic">Executing tasks...</div>
                }
              </div>

              @if (checkError()) {
                <div class="p-6 bg-red-50 border-t border-red-100">
                  <p class="text-red-700 font-medium">Error: {{ checkError() }}</p>
                  <button (click)="goBack()" class="mt-4 btn-secondary">Go Back</button>
                </div>
              }
            </div>
          </div>
        }

        <!-- Results View -->
        @if (currentView() === 'results') {
          @if (selectedApp()?.lastCheck; as result) {
            <div class="space-y-8">
              <!-- Summary Card -->
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2 bg-white rounded-2xl border border-secondary-200 p-8 shadow-sm">
                  <div class="flex items-center gap-6 mb-8">
                    <div class="relative w-32 h-32 flex items-center justify-center">
                      <svg class="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="58" stroke="currentColor" stroke-width="8" fill="transparent" class="text-secondary-100" />
                        <circle cx="64" cy="64" r="58" stroke="currentColor" stroke-width="8" fill="transparent"
                          [attr.stroke-dasharray]="364.4"
                          [attr.stroke-dashoffset]="364.4 * (1 - result.report.totalScore / 100)"
                          [ngClass]="getScoreColor(result.report.totalScore)"
                          class="transition-all duration-1000 ease-out" />
                      </svg>
                      <span class="absolute text-4xl font-black text-secondary-900">{{ result.report.totalScore }}</span>
                    </div>
                    <div>
                      <h2 class="text-2xl font-bold text-secondary-900">SEO Audit Result</h2>
                      <p class="text-muted mt-2 leading-relaxed">{{ result.report.summary }}</p>
                      @if (result.report.visionWarning) {
                        <div class="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                          <span>⚠️ Text-only analysis (Vision not available)</span>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Category Scores -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div class="p-4 rounded-xl bg-secondary-50 border border-secondary-100 text-center">
                      <div class="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">Performance</div>
                      <div class="text-2xl font-black" [ngClass]="getScoreColor(result.report.categories.performance)">
                        {{ result.report.categories.performance }}
                      </div>
                    </div>
                    <div class="p-4 rounded-xl bg-secondary-50 border border-secondary-100 text-center">
                      <div class="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">Accessibility</div>
                      <div class="text-2xl font-black" [ngClass]="getScoreColor(result.report.categories.accessibility)">
                        {{ result.report.categories.accessibility }}
                      </div>
                    </div>
                    <div class="p-4 rounded-xl bg-secondary-50 border border-secondary-100 text-center">
                      <div class="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">Best Practices</div>
                      <div class="text-2xl font-black" [ngClass]="getScoreColor(result.report.categories.bestPractices)">
                        {{ result.report.categories.bestPractices }}
                      </div>
                    </div>
                    <div class="p-4 rounded-xl bg-secondary-50 border border-secondary-100 text-center">
                      <div class="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">SEO</div>
                      <div class="text-2xl font-black" [ngClass]="getScoreColor(result.report.categories.seo)">
                        {{ result.report.categories.seo }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Screenshot -->
                <div class="bg-white rounded-2xl border border-secondary-200 p-4 shadow-sm">
                  <h3 class="text-sm font-bold text-secondary-900 mb-3 px-2">Page Preview</h3>
                  <div class="aspect-[4/3] rounded-lg border border-secondary-100 overflow-hidden bg-secondary-50">
                    <img [src]="'data:image/jpeg;base64,' + result.screenshot" class="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              <!-- Findings List -->
              <div>
                <h3 class="text-xl font-bold text-secondary-900 mb-4">{{ t.translate('webSeo.findings') }}</h3>
                <div class="space-y-4">
                  @for (finding of result.report.findings; track $index) {
                    <div class="bg-white rounded-xl border-l-4 p-6 shadow-sm flex gap-4"
                      [ngClass]="{
                        'border-l-red-500': finding.type === 'error',
                        'border-l-amber-500': finding.type === 'warning',
                        'border-l-green-500': finding.type === 'success'
                      }">
                      <div class="text-2xl">
                        {{ finding.type === 'error' ? '❌' : finding.type === 'warning' ? '⚠️' : '✅' }}
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="text-xs font-bold text-secondary-400 uppercase tracking-widest">{{ finding.category }}</span>
                        </div>
                        <h4 class="font-bold text-secondary-900">{{ finding.message }}</h4>
                        @if (finding.suggestion) {
                          <p class="text-sm text-secondary-600 mt-2 bg-secondary-50 p-3 rounded-lg border border-secondary-100">
                            <span class="font-bold">Suggestion:</span> {{ finding.suggestion }}
                          </p>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div class="flex justify-center pb-12">
                <button (click)="runCheck(selectedApp()!)" class="btn-primary px-8 py-3">
                  Re-run Check
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class WebSeoPageComponent implements OnInit, OnDestroy {
  protected t = inject(TranslationService);
  private webSeoService = inject(WebSeoService);
  private codingAgentService = inject(CodingAgentService);

  currentView = signal<ViewMode>('list');
  isLoading = signal(true);
  apps = signal<SeoApp[]>([]);

  // Add App form
  newApp = {
    name: '',
    type: 'url' as 'url' | 'repo',
    url: '',
    repoFullName: '',
    cloneUrl: '',
    buildCommand: '',
    startCommand: ''
  };

  // Repos for selection
  repos = signal<GitHubRepo[]>([]);
  isLoadingRepos = signal(false);

  // Check state
  selectedApp = signal<SeoApp | null>(null);
  checkLogs = signal<SeoProgress[]>([]);
  checkCompleted = signal(false);
  checkError = signal<string | null>(null);
  private checkSub: Subscription | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadApps();
  }

  ngOnDestroy(): void {
    if (this.checkSub) this.checkSub.unsubscribe();
  }

  async loadApps(): Promise<void> {
    this.isLoading.set(true);
    try {
      const apps = await this.webSeoService.listApps();
      this.apps.set(apps);
    } catch {
      // Error handling
    } finally {
      this.isLoading.set(false);
    }
  }

  goToAdd(): void {
    this.currentView.set('add');
    this.loadRepos();
  }

  async loadRepos(): Promise<void> {
    this.isLoadingRepos.set(true);
    try {
      const repos = await this.codingAgentService.getGitHubRepos();
      this.repos.set(repos);
    } catch {
      // Error
    } finally {
      this.isLoadingRepos.set(false);
    }
  }

  selectRepo(repo: GitHubRepo): void {
    this.newApp.repoFullName = repo.fullName;
    this.newApp.cloneUrl = repo.cloneUrl;
    if (!this.newApp.name) this.newApp.name = repo.name;
  }

  isValidApp(): boolean {
    if (!this.newApp.name) return false;
    if (this.newApp.type === 'url') return !!this.newApp.url;
    return !!this.newApp.repoFullName && !!this.newApp.startCommand;
  }

  async createApp(): Promise<void> {
    try {
      await this.webSeoService.createApp(this.newApp);
      await this.loadApps();
      this.currentView.set('list');
      // Reset form
      this.newApp = { name: '', type: 'url', url: '', repoFullName: '', cloneUrl: '', buildCommand: '', startCommand: '' };
    } catch {
      // Error
    }
  }

  async deleteApp(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this SEO app?')) {
      try {
        await this.webSeoService.deleteApp(id);
        await this.loadApps();
      } catch {}
    }
  }

  runCheck(app: SeoApp): void {
    this.selectedApp.set(app);
    this.currentView.set('check');
    this.checkLogs.set([]);
    this.checkCompleted.set(false);
    this.checkError.set(null);

    this.checkSub = this.webSeoService.runCheck(app.id).subscribe({
      next: (event) => {
        if (event.type === 'progress') {
          this.checkLogs.update(logs => {
            const existing = logs.find(l => l.step === event.data.step);
            if (existing) {
              existing.status = event.data.status;
              existing.message = event.data.message;
              return [...logs];
            }
            return [...logs, event.data];
          });
        } else if (event.type === 'result') {
          this.checkCompleted.set(true);
          // Refresh app data to get the result
          this.loadApps().then(() => {
            const updated = this.apps().find(a => a.id === app.id);
            if (updated) this.selectedApp.set(updated);
            this.currentView.set('results');
          });
        }
      },
      error: (err) => {
        this.checkError.set(err.error?.error || err.message || 'Check failed');
      }
    });
  }

  viewResults(app: SeoApp): void {
    this.selectedApp.set(app);
    this.currentView.set('results');
  }

  goBack(): void {
    if (this.checkSub) {
      if (confirm('Cancel SEO check?')) {
        this.checkSub.unsubscribe();
        this.checkSub = null;
        this.currentView.set('list');
      }
    } else {
      this.currentView.set('list');
    }
  }

  getScoreColor(score: number): string {
    if (score >= 90) return 'text-green-600';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-600';
  }

  getScoreHex(score: number): string {
    if (score >= 90) return '#16a34a';
    if (score >= 50) return '#f59e0b';
    return '#dc2626';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }
}
