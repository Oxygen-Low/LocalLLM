import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RepositoriesService, type LocalRepo } from '../services/repositories.service';
import { CodingAgentService } from '../services/coding-agent.service';
import { AdminService } from '../services/admin.service';
import { environment } from '../../environments/environment';

type PageView = 'list' | 'create' | 'detail' | 'import-github' | 'export-github';

@Component({
  selector: 'app-repositories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-white to-secondary-50">
      <div class="container-custom py-10">

        <!-- Header -->
        <div class="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <a routerLink="/dashboard" class="text-sm text-muted hover:text-secondary-700 transition-colors mb-1 inline-flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              Dashboard
            </a>
            <h1 class="text-3xl font-bold text-secondary-900 flex items-center gap-3">
              <span class="text-3xl">📦</span> Local.LLM Repositories
            </h1>
            <p class="text-muted mt-1">Server-hosted git repositories with auto-archiving</p>
          </div>
          @if (currentView() === 'list') {
            <div class="flex gap-2 flex-wrap">
              <button (click)="showImportGitHub()" class="btn-secondary text-sm">
                ↓ Import from GitHub
              </button>
              <button (click)="showCreate()" class="btn-primary text-sm">
                + New Repository
              </button>
            </div>
          }
        </div>

        <!-- Error banner -->
        @if (errorMessage()) {
          <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {{ errorMessage() }}
            <button (click)="errorMessage.set('')" class="ml-2 text-red-500 hover:text-red-700" aria-label="Dismiss error">✕</button>
          </div>
        }

        <!-- Success banner -->
        @if (successMessage()) {
          <div class="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            {{ successMessage() }}
            <button (click)="successMessage.set('')" class="ml-2 text-green-500 hover:text-green-700" aria-label="Dismiss success message">✕</button>
          </div>
        }

        @switch (currentView()) {

          <!-- ============================================================ -->
          <!-- LIST VIEW                                                      -->
          <!-- ============================================================ -->
          @case ('list') {
            <!-- Storage usage bar -->
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-5 mb-6">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-secondary-700">Storage used</span>
                <span class="text-sm text-muted">{{ svc.formatBytes(storageUsed()) }} / {{ svc.formatBytes(storageMax()) }}</span>
              </div>
              <div class="w-full bg-secondary-100 rounded-full h-2">
                <div
                  class="h-2 rounded-full transition-all"
                  [class]="storageUsed() / storageMax() > 0.9 ? 'bg-red-500' : storageUsed() / storageMax() > 0.7 ? 'bg-amber-500' : 'bg-primary-600'"
                  [style.width.%]="Math.min(100, storageUsed() / storageMax() * 100)"
                ></div>
              </div>
              <p class="text-xs text-muted mt-1">Max {{ svc.formatBytes(storageMax()) }} total · {{ svc.formatBytes(1073741824) }} per repository · Archived after 1 hour of inactivity</p>
            </div>

            @if (isLoading()) {
              <div class="flex justify-center py-16">
                <div class="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
              </div>
            } @else if (repos().length === 0) {
              <div class="text-center py-16 bg-white rounded-xl border border-secondary-200 shadow-sm">
                <div class="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📦</div>
                <h3 class="text-lg font-semibold text-secondary-900 mb-2">No repositories yet</h3>
                <p class="text-muted text-sm mb-6">Create a new repository or import one from GitHub</p>
                <div class="flex justify-center gap-3">
                  <button (click)="showImportGitHub()" class="btn-secondary text-sm">↓ Import from GitHub</button>
                  <button (click)="showCreate()" class="btn-primary text-sm">+ New Repository</button>
                </div>
              </div>
            } @else {
              <div class="grid gap-4">
                @for (repo of repos(); track repo.id) {
                  <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-5 hover:border-primary-300 transition-colors">
                    <div class="flex items-start justify-between gap-4 flex-wrap">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <h3 class="font-semibold text-secondary-900 text-lg">{{ repo.name }}</h3>
                          <span [class]="repo.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-secondary-100 text-secondary-600'"
                                class="text-xs px-2 py-0.5 rounded-full font-medium">
                            {{ repo.status === 'active' ? '● Active' : '⧖ Archived' }}
                          </span>
                        </div>
                        @if (repo.description) {
                          <p class="text-sm text-muted mt-1 truncate">{{ repo.description }}</p>
                        }
                        <p class="text-xs text-muted mt-1">
                          Created {{ formatDate(repo.createdAt) }}
                          @if (repo.status === 'archived' && repo.archivedAt) {
                            · Archived {{ formatDate(repo.archivedAt) }}
                          } @else {
                            · Last active {{ formatRelative(repo.lastActivity) }}
                          }
                        </p>
                      </div>
                      <div class="flex gap-2 flex-wrap items-center">
                        @if (repo.status === 'active') {
                          <button (click)="viewRepo(repo)" class="px-3 py-1.5 rounded-lg border border-secondary-200 text-sm hover:bg-secondary-50 transition-colors">
                            Details
                          </button>
                          <button (click)="openInCodingAgent(repo)" class="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 text-sm hover:bg-purple-200 transition-colors">
                            💻 Open in Coding Agent
                          </button>
                          <button (click)="confirmArchive(repo)" [disabled]="operatingOn() === repo.id"
                                  class="px-3 py-1.5 rounded-lg border border-secondary-200 text-sm hover:bg-secondary-50 transition-colors disabled:opacity-50">
                            Archive
                          </button>
                        } @else {
                          <button (click)="doUnarchive(repo)" [disabled]="operatingOn() === repo.id"
                                  class="px-3 py-1.5 rounded-lg border border-secondary-200 text-sm hover:bg-secondary-50 transition-colors disabled:opacity-50">
                            @if (operatingOn() === repo.id) { Restoring… } @else { Restore }
                          </button>
                        }
                        <button (click)="confirmDelete(repo)" [disabled]="operatingOn() === repo.id"
                                class="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors disabled:opacity-50">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          }

          <!-- ============================================================ -->
          <!-- CREATE VIEW                                                    -->
          <!-- ============================================================ -->
          @case ('create') {
            <div class="max-w-lg">
              <button (click)="backToList()" class="text-sm text-muted hover:text-secondary-700 mb-4 inline-flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                Back
              </button>
              <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
                <h2 class="text-xl font-bold text-secondary-900 mb-6">New Repository</h2>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-1">Repository name *</label>
                    <input [(ngModel)]="createName" type="text" placeholder="my-project"
                           class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"/>
                    <p class="text-xs text-muted mt-1">Letters, digits, hyphens, underscores, dots</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-1">Description</label>
                    <input [(ngModel)]="createDescription" type="text" placeholder="What is this repository for?"
                           class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"/>
                  </div>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="createInitReadme" class="rounded"/>
                    <span class="text-sm text-secondary-700">Initialize with a README.md</span>
                  </label>
                  <button (click)="doCreate()" [disabled]="isCreating() || !createName.trim()"
                          class="btn-primary w-full disabled:opacity-50">
                    @if (isCreating()) { Creating… } @else { Create Repository }
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- ============================================================ -->
          <!-- DETAIL VIEW                                                    -->
          <!-- ============================================================ -->
          @case ('detail') {
            @if (selectedRepo()) {
              <button (click)="backToList()" class="text-sm text-muted hover:text-secondary-700 mb-4 inline-flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                Back to Repositories
              </button>
              <div class="max-w-2xl space-y-4">

                <!-- Header card -->
                <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
                  <div class="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 class="text-2xl font-bold text-secondary-900">{{ selectedRepo()!.name }}</h2>
                      @if (selectedRepo()!.description) {
                        <p class="text-muted mt-1">{{ selectedRepo()!.description }}</p>
                      }
                      <p class="text-xs text-muted mt-2">
                        Created {{ formatDate(selectedRepo()!.createdAt) }}
                        @if (selectedRepo()!.size !== undefined) {
                          · {{ svc.formatBytes(selectedRepo()!.size ?? 0) }} on disk
                        }
                      </p>
                    </div>
                    <span [class]="selectedRepo()!.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-secondary-100 text-secondary-600'"
                          class="text-sm px-3 py-1 rounded-full font-medium">
                      {{ selectedRepo()!.status === 'active' ? '● Active' : '⧖ Archived' }}
                    </span>
                  </div>
                </div>

                @if (selectedRepo()!.status === 'active') {
                  <!-- Clone instructions -->
                  <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
                    <h3 class="font-semibold text-secondary-900 mb-3">Clone this repository</h3>
                    <p class="text-sm text-muted mb-3">
                      Use your auth key as the password when cloning over HTTPS. You can use any username.
                    </p>
                    <div class="bg-secondary-50 rounded-lg p-3 font-mono text-xs break-all text-secondary-700 mb-3">
                      git clone {{ getCloneUrl(selectedRepo()!.id) }}
                    </div>
                    <div class="mb-3">
                      <label class="block text-sm font-medium text-secondary-700 mb-1">Auth Key</label>
                      <div class="flex gap-2">
                        <div class="flex-1 bg-secondary-50 rounded-lg px-3 py-2 font-mono text-xs text-secondary-700 break-all">
                          @if (showAuthKey()) {
                            {{ selectedRepo()!.authKey || '(not available)' }}
                          } @else {
                            ●●●●●●●●●●●●●●●●●●●●●●●●
                          }
                        </div>
                        <button (click)="showAuthKey.set(!showAuthKey())" class="px-3 py-2 rounded-lg border border-secondary-200 text-sm hover:bg-secondary-50 transition-colors flex-shrink-0">
                          {{ showAuthKey() ? 'Hide' : 'Show' }}
                        </button>
                        @if (selectedRepo()!.authKey) {
                          <button (click)="copyToClipboard(selectedRepo()!.authKey!)" class="px-3 py-2 rounded-lg border border-secondary-200 text-sm hover:bg-secondary-50 transition-colors flex-shrink-0">
                            Copy
                          </button>
                        }
                      </div>
                    </div>
                    <button (click)="doRegenerateKey()" [disabled]="operatingOn() === selectedRepo()!.id"
                            class="text-sm text-amber-600 hover:text-amber-800 transition-colors disabled:opacity-50">
                      ↻ Regenerate auth key
                    </button>
                    <p class="text-xs text-muted mt-1">Regenerating invalidates the current key immediately.</p>
                  </div>

                  <!-- Actions -->
                  <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
                    <h3 class="font-semibold text-secondary-900 mb-4">Actions</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button (click)="openInCodingAgent(selectedRepo()!)" class="flex items-center gap-2 p-3 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors text-sm font-medium">
                        <span>💻</span> Open in Coding Agent
                      </button>
                      <button (click)="showExportGitHub()" class="flex items-center gap-2 p-3 rounded-lg border border-secondary-200 hover:bg-secondary-50 transition-colors text-sm font-medium">
                        <span>↑</span> Export to GitHub
                      </button>
                      <button (click)="confirmArchive(selectedRepo()!)" [disabled]="operatingOn() === selectedRepo()!.id"
                              class="flex items-center gap-2 p-3 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors text-sm font-medium disabled:opacity-50">
                        <span>⧖</span> Archive Repository
                      </button>
                      <button (click)="confirmDelete(selectedRepo()!)" [disabled]="operatingOn() === selectedRepo()!.id"
                              class="flex items-center gap-2 p-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50">
                        <span>🗑</span> Delete Repository
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          }

          <!-- ============================================================ -->
          <!-- IMPORT FROM GITHUB                                            -->
          <!-- ============================================================ -->
          @case ('import-github') {
            <div class="max-w-lg">
              <button (click)="backToList()" class="text-sm text-muted hover:text-secondary-700 mb-4 inline-flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                Back
              </button>
              <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
                <h2 class="text-xl font-bold text-secondary-900 mb-2">Import from GitHub</h2>
                <p class="text-sm text-muted mb-6">Clone a GitHub repository as a Local.LLM repository. Private repos require a GitHub token configured in Settings.</p>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-1">GitHub Clone URL (HTTPS) *</label>
                    <input [(ngModel)]="importUrl" type="url" placeholder="https://github.com/owner/repo.git"
                           class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"/>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-1">Local name (optional)</label>
                    <input [(ngModel)]="importName" type="text" placeholder="Derived from URL if blank"
                           class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"/>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-1">Description</label>
                    <input [(ngModel)]="importDescription" type="text" placeholder="Optional description"
                           class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"/>
                  </div>
                  <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs">
                    <strong>Note:</strong> Large repositories may take several minutes to clone. The server must have internet access.
                  </div>
                  <button (click)="doImport()" [disabled]="isImporting() || !importUrl.trim()"
                          class="btn-primary w-full disabled:opacity-50">
                    @if (isImporting()) { Cloning… this may take a moment } @else { Import Repository }
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- ============================================================ -->
          <!-- EXPORT TO GITHUB                                              -->
          <!-- ============================================================ -->
          @case ('export-github') {
            <div class="max-w-lg">
              <button (click)="currentView.set('detail')" class="text-sm text-muted hover:text-secondary-700 mb-4 inline-flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                Back
              </button>
              <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
                <h2 class="text-xl font-bold text-secondary-900 mb-2">Export to GitHub</h2>
                <p class="text-sm text-muted mb-6">Create a new GitHub repository and push all branches and tags from <strong>{{ selectedRepo()?.name }}</strong>.</p>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-1">GitHub repository name</label>
                    <input [(ngModel)]="exportName" type="text" [placeholder]="selectedRepo()?.name || 'repo-name'"
                           class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"/>
                  </div>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="exportPrivate" class="rounded"/>
                    <span class="text-sm text-secondary-700">Make the GitHub repository private</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="exportDeleteLocal" class="rounded"/>
                    <span class="text-sm text-secondary-700">Delete this Local.LLM repository after export</span>
                  </label>
                  <button (click)="doExport()" [disabled]="isExporting()"
                          class="btn-primary w-full disabled:opacity-50">
                    @if (isExporting()) { Exporting… } @else { Export to GitHub }
                  </button>
                </div>
              </div>
            </div>
          }

        }
      </div>
    </div>
  `,
})
export class RepositoriesPageComponent implements OnInit {
  protected svc = inject(RepositoriesService);
  private codingAgentSvc = inject(CodingAgentService);

  protected Math = Math;

  currentView = signal<PageView>('list');
  repos = signal<LocalRepo[]>([]);
  selectedRepo = signal<LocalRepo | null>(null);
  storageUsed = signal(0);
  storageMax = signal(10737418240);

  isLoading = signal(false);
  isCreating = signal(false);
  isImporting = signal(false);
  isExporting = signal(false);
  operatingOn = signal('');

  errorMessage = signal('');
  successMessage = signal('');
  showAuthKey = signal(false);

  // Create form
  createName = '';
  createDescription = '';
  createInitReadme = true;

  // Import form
  importUrl = '';
  importName = '';
  importDescription = '';

  // Export form
  exportName = '';
  exportPrivate = false;
  exportDeleteLocal = false;

  async ngOnInit() {
    await this.loadRepos();
  }

  async loadRepos() {
    this.isLoading.set(true);
    try {
      const result = await this.svc.listRepos();
      this.repos.set(result.repos);
      this.storageUsed.set(result.storageUsed);
      this.storageMax.set(result.storageMax);
    } catch {
      this.errorMessage.set('Failed to load repositories');
    } finally {
      this.isLoading.set(false);
    }
  }

  showCreate() {
    this.createName = '';
    this.createDescription = '';
    this.createInitReadme = true;
    this.errorMessage.set('');
    this.currentView.set('create');
  }

  showImportGitHub() {
    this.importUrl = '';
    this.importName = '';
    this.importDescription = '';
    this.errorMessage.set('');
    this.currentView.set('import-github');
  }

  showExportGitHub() {
    this.exportName = this.selectedRepo()?.name || '';
    this.exportPrivate = false;
    this.exportDeleteLocal = false;
    this.errorMessage.set('');
    this.currentView.set('export-github');
  }

  async viewRepo(repo: LocalRepo) {
    try {
      const full = await this.svc.getRepo(repo.id);
      this.selectedRepo.set(full);
      this.showAuthKey.set(false);
      this.currentView.set('detail');
    } catch {
      this.errorMessage.set('Failed to load repository details');
    }
  }

  backToList() {
    this.selectedRepo.set(null);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.currentView.set('list');
    this.loadRepos();
  }

  async doCreate() {
    if (!this.createName.trim()) return;
    this.isCreating.set(true);
    this.errorMessage.set('');
    try {
      const repo = await this.svc.createRepo(this.createName.trim(), this.createDescription.trim(), this.createInitReadme);
      this.selectedRepo.set(repo);
      this.showAuthKey.set(true);
      this.currentView.set('detail');
      await this.loadRepos();
      this.successMessage.set(`Repository "${repo.name}" created. Save your auth key – it won't be shown again in full unless you view the repo details.`);
    } catch (err: unknown) {
      this.errorMessage.set((err as { error?: { error?: string } })?.error?.error || 'Failed to create repository');
    } finally {
      this.isCreating.set(false);
    }
  }

  async doImport() {
    if (!this.importUrl.trim()) return;
    this.isImporting.set(true);
    this.errorMessage.set('');
    try {
      const repo = await this.svc.importFromGitHub(this.importUrl.trim(), this.importName.trim(), this.importDescription.trim());
      await this.loadRepos();
      this.successMessage.set(`Repository "${repo.name}" imported successfully.`);
      this.currentView.set('list');
    } catch (err: unknown) {
      this.errorMessage.set((err as { error?: { error?: string } })?.error?.error || 'Failed to import repository');
    } finally {
      this.isImporting.set(false);
    }
  }

  async doExport() {
    const repo = this.selectedRepo();
    if (!repo) return;
    this.isExporting.set(true);
    this.errorMessage.set('');
    try {
      const result = await this.svc.exportToGitHub(repo.id, this.exportName.trim() || repo.name, this.exportPrivate, this.exportDeleteLocal);
      this.successMessage.set(`Exported to GitHub: ${result.githubUrl}`);
      if (this.exportDeleteLocal) {
        this.selectedRepo.set(null);
        await this.loadRepos();
        this.currentView.set('list');
      } else {
        this.currentView.set('detail');
      }
    } catch (err: unknown) {
      this.errorMessage.set((err as { error?: { error?: string } })?.error?.error || 'Failed to export to GitHub');
    } finally {
      this.isExporting.set(false);
    }
  }

  async doRegenerateKey() {
    const repo = this.selectedRepo();
    if (!repo) return;
    if (!confirm('Regenerate the auth key? The current key will stop working immediately.')) return;
    this.operatingOn.set(repo.id);
    try {
      const newKey = await this.svc.regenerateKey(repo.id);
      // Refresh the full repo to get updated data
      const updated = await this.svc.getRepo(repo.id);
      this.selectedRepo.set({ ...updated, authKey: newKey });
      this.showAuthKey.set(true);
      this.successMessage.set('Auth key regenerated. Copy it now – this is the only time it will be shown.');
    } catch {
      this.errorMessage.set('Failed to regenerate auth key');
    } finally {
      this.operatingOn.set('');
    }
  }

  async confirmArchive(repo: LocalRepo) {
    if (!confirm(`Archive "${repo.name}"? The repository will be compressed and the container deleted. It can be restored later.`)) return;
    this.operatingOn.set(repo.id);
    try {
      await this.svc.archiveRepo(repo.id);
      await this.loadRepos();
      if (this.currentView() === 'detail') this.backToList();
      this.successMessage.set(`Repository "${repo.name}" archived.`);
    } catch {
      this.errorMessage.set('Failed to archive repository');
    } finally {
      this.operatingOn.set('');
    }
  }

  async doUnarchive(repo: LocalRepo) {
    this.operatingOn.set(repo.id);
    try {
      await this.svc.unarchiveRepo(repo.id);
      await this.loadRepos();
      this.successMessage.set(`Repository "${repo.name}" restored.`);
    } catch (err: unknown) {
      this.errorMessage.set((err as { error?: { error?: string } })?.error?.error || 'Failed to restore repository');
    } finally {
      this.operatingOn.set('');
    }
  }

  async confirmDelete(repo: LocalRepo) {
    if (!confirm(`Permanently delete "${repo.name}"? This cannot be undone.`)) return;
    this.operatingOn.set(repo.id);
    try {
      await this.svc.deleteRepo(repo.id);
      if (this.currentView() === 'detail') {
        this.selectedRepo.set(null);
        this.currentView.set('list');
      }
      await this.loadRepos();
      this.successMessage.set(`Repository "${repo.name}" deleted.`);
    } catch {
      this.errorMessage.set('Failed to delete repository');
    } finally {
      this.operatingOn.set('');
    }
  }

  openInCodingAgent(repo: LocalRepo) {
    window.location.href = `/app/coding-agent?localRepoId=${repo.id}`;
  }

  getCloneUrl(repoId: string): string {
    return this.svc.getCloneUrl(repoId);
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.successMessage.set('Copied to clipboard!');
      setTimeout(() => this.successMessage.set(''), 2000);
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatRelative(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }
}
