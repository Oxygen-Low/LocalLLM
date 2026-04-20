import { Component, signal, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LlmService, type Persona } from '../services/llm.service';
import { AdminService } from '../services/admin.service';

type PageView = 'list' | 'create' | 'edit';

@Component({
  selector: 'app-personas',
  standalone: true,
  /* ⚡ Bolt: Added OnPush change detection to prevent unnecessary re-renders in this complex component. This relies on Angular Signals for targeted DOM updates, significantly reducing CPU usage during heavy streaming or state changes. */
  changeDetection: ChangeDetectionStrategy.OnPush,
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
              <span class="text-3xl">👤</span> Personas
            </h1>
            <p class="text-muted mt-1">Manage your private AI chat personas</p>
          </div>
          @if (currentView() === 'list' && !adminService.demoMode()) {
            <button (click)="showCreate()" class="btn-primary text-sm">
              + New Persona
            </button>
          }
        </div>

        <!-- Error banner -->
        @if (adminService.demoMode()) {
          <div class="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
            🎮 Demo mode — persona creation is disabled.
          </div>
        }
        @if (errorMessage()) {
          <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
            <span>{{ errorMessage() }}</span>
            <button type="button" (click)="errorMessage.set('')" class="text-red-500 hover:text-red-700" aria-label="Dismiss error" title="Dismiss error">✕</button>
          </div>
        }

        <!-- Success banner -->
        @if (successMessage()) {
          <div class="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center justify-between">
            <span>{{ successMessage() }}</span>
            <button type="button" (click)="successMessage.set('')" class="text-green-500 hover:text-green-700" aria-label="Dismiss success message" title="Dismiss success message">✕</button>
          </div>
        }

        @if (currentView() === 'list') {
          <!-- ============================================================ -->
          <!-- LIST VIEW                                                      -->
          <!-- ============================================================ -->
          @if (isLoading()) {
            <div class="flex justify-center py-16">
              <div class="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
          } @else if (personas().length === 0) {
            <div class="text-center py-16 bg-white rounded-xl border border-secondary-200 shadow-sm">
              <div class="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">👤</div>
              <h3 class="text-lg font-semibold text-secondary-900 mb-2">No personas yet</h3>
              <p class="text-muted text-sm mb-6">Create a persona to define how the AI sees you in chats</p>
              <button (click)="showCreate()" class="btn-primary text-sm">+ New Persona</button>
            </div>
          } @else {
            <div class="grid gap-4">
              @for (persona of personas(); track persona.id) {
                <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-5 hover:border-primary-300 transition-colors group">
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <h3 class="font-semibold text-secondary-900 text-lg truncate">{{ persona.name }}</h3>
                        @if (defaultPersonaId() === persona.id) {
                          <span class="bg-primary-100 text-primary-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Default</span>
                        }
                      </div>
                      <p class="text-sm text-secondary-600 mt-1 line-clamp-2">{{ persona.description }}</p>
                      <p class="text-xs text-muted mt-3">
                        Created {{ formatDate(persona.createdAt) }}
                      </p>
                    </div>
                    <div class="flex flex-col gap-2">
                      <div class="flex gap-2">
                        <button type="button" (click)="showEdit(persona)" class="p-2 rounded-lg border border-secondary-200 hover:bg-secondary-50 transition-colors text-secondary-600 focus-visible:ring-2 focus-visible:ring-primary-500 outline-none" title="Edit Persona" aria-label="Edit Persona">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button type="button" (click)="confirmDelete(persona)" class="p-2 rounded-lg border border-red-100 hover:bg-red-50 transition-colors text-red-500 focus-visible:ring-2 focus-visible:ring-red-500 outline-none" title="Delete Persona" aria-label="Delete Persona">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      @if (defaultPersonaId() !== persona.id) {
                        <button type="button" (click)="makeDefault(persona.id)" class="text-[11px] font-medium text-primary-600 hover:text-primary-800 transition-colors text-right opacity-0 group-hover:opacity-100 focus-visible:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded px-1 -mx-1">
                          Set as default
                        </button>
                      } @else {
                        <button type="button" (click)="makeDefault(null)" class="text-[11px] font-medium text-secondary-400 hover:text-secondary-600 transition-colors text-right opacity-0 group-hover:opacity-100 focus-visible:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-secondary-400 rounded px-1 -mx-1">
                          Clear default
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        } @else {
          <!-- ============================================================ -->
          <!-- CREATE / EDIT VIEW                                            -->
          <!-- ============================================================ -->
          <div class="max-w-2xl">
            <button (click)="backToList()" class="text-sm text-muted hover:text-secondary-700 mb-4 inline-flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              Back to List
            </button>
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
              <h2 class="text-xl font-bold text-secondary-900 mb-6">{{ currentView() === 'create' ? 'New Persona' : 'Edit Persona' }}</h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-secondary-700 mb-1">Name *</label>
                  <input [(ngModel)]="formName" type="text" placeholder="e.g. Jules, Senior Dev"
                         class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"/>
                  <p class="text-xs text-muted mt-1">This is how the AI will address you</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-secondary-700 mb-1">Description *</label>
                  <textarea [(ngModel)]="formDescription" rows="6" placeholder="Describe yourself... (e.g. I am a software engineer with 10 years of experience in Python and JavaScript. I prefer concise answers and highly technical explanations.)"
                            class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm resize-none"></textarea>
                  <p class="text-xs text-muted mt-1">This helps the AI tailor its responses to your specific needs and background</p>
                </div>

                <div class="pt-4 flex gap-3">
                  <button (click)="savePersona()" [disabled]="isSaving() || !formName.trim() || !formDescription.trim()"
                          class="btn-primary flex-1 disabled:opacity-50">
                    @if (isSaving()) { Saving... } @else { Save Persona }
                  </button>
                  <button (click)="backToList()" class="btn-secondary px-6">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class PersonasPageComponent implements OnInit {
  private llmService = inject(LlmService);
  adminService = inject(AdminService);

  currentView = signal<PageView>('list');
  personas = signal<Persona[]>([]);
  defaultPersonaId = signal<string | null>(null);

  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Form state
  editingPersonaId: string | null = null;
  formName = '';
  formDescription = '';

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const [personas, defaultId] = await Promise.all([
        this.llmService.getPersonas(),
        this.llmService.getDefaultPersonaId()
      ]);
      this.personas.set(personas);
      this.defaultPersonaId.set(defaultId);
    } catch {
      this.errorMessage.set('Failed to load personas');
    } finally {
      this.isLoading.set(false);
    }
  }

  showCreate() {
    this.editingPersonaId = null;
    this.formName = '';
    this.formDescription = '';
    this.errorMessage.set('');
    this.currentView.set('create');
  }

  showEdit(persona: Persona) {
    this.editingPersonaId = persona.id;
    this.formName = persona.name;
    this.formDescription = persona.description;
    this.errorMessage.set('');
    this.currentView.set('edit');
  }

  backToList() {
    this.currentView.set('list');
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  async savePersona() {
    if (!this.formName.trim() || !this.formDescription.trim()) return;
    this.isSaving.set(true);
    this.errorMessage.set('');
    try {
      if (this.editingPersonaId) {
        await this.llmService.updatePersona(this.editingPersonaId, this.formName.trim(), this.formDescription.trim());
        this.successMessage.set('Persona updated successfully');
      } else {
        await this.llmService.createPersona(this.formName.trim(), this.formDescription.trim());
        this.successMessage.set('Persona created successfully');
      }
      await this.loadData();
      this.currentView.set('list');
    } catch (err: any) {
      this.errorMessage.set(err.error?.error || 'Failed to save persona');
    } finally {
      this.isSaving.set(false);
    }
  }

  async confirmDelete(persona: Persona) {
    if (!confirm(`Are you sure you want to delete the persona "${persona.name}"?`)) return;
    try {
      await this.llmService.deletePersona(persona.id);
      await this.loadData();
      this.successMessage.set('Persona deleted');
    } catch {
      this.errorMessage.set('Failed to delete persona');
    }
  }

  async makeDefault(personaId: string | null) {
    try {
      await this.llmService.setDefaultPersonaId(personaId);
      this.defaultPersonaId.set(personaId);
      this.successMessage.set(personaId ? 'Default persona set' : 'Default persona cleared');
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch {
      this.errorMessage.set('Failed to set default persona');
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
