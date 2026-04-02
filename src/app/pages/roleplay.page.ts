import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RoleplayService, RoleplaySession, RoleplayPost, RoleplayCharacter } from '../services/roleplay.service';
import { LlmService, UniverseSummary, Persona } from '../services/llm.service';

type RoleplayView = 'list' | 'create' | 'session';

@Component({
  selector: 'app-roleplay',
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
              <span class="text-3xl">🎭</span> Roleplay
            </h1>
            <p class="text-muted mt-1">Immerse yourself in different universes</p>
          </div>
          @if (currentView() === 'list') {
            <button (click)="showCreate()" class="btn-primary text-sm">
              + New Session
            </button>
          }
        </div>

        <!-- Error banner -->
        @if (errorMessage()) {
          <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
            <span>{{ errorMessage() }}</span>
            <button (click)="errorMessage.set('')" class="text-red-500 hover:text-red-700">✕</button>
          </div>
        }

        @if (currentView() === 'list') {
          <!-- SESSION LIST -->
          @if (isLoading()) {
            <div class="flex justify-center py-16">
              <div class="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
          } @else if (sessions().length === 0) {
            <div class="text-center py-16 bg-white rounded-xl border border-secondary-200 shadow-sm">
              <div class="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🎭</div>
              <h3 class="text-lg font-semibold text-secondary-900 mb-2">No sessions yet</h3>
              <p class="text-muted text-sm mb-6">Create a session to start your roleplay adventure</p>
              <button (click)="showCreate()" class="btn-primary text-sm">+ New Session</button>
            </div>
          } @else {
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              @for (session of sessions(); track session.id) {
                <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-5 hover:border-primary-300 transition-colors group cursor-pointer" (click)="loadSession(session.id)">
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1 min-w-0">
                      <h3 class="font-semibold text-secondary-900 text-lg truncate">{{ session.name }}</h3>
                      <p class="text-sm text-secondary-600 mt-1">{{ session.universeName }}</p>
                      <p class="text-xs text-muted mt-3">Current Date: {{ session.currentDate }}</p>
                    </div>
                    <button (click)="confirmDelete(session); $event.stopPropagation()" class="p-2 rounded-lg border border-red-100 hover:bg-red-50 transition-colors text-red-500" title="Delete Session">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        } @else if (currentView() === 'create') {
          <!-- CREATE SESSION -->
          <div class="max-w-2xl mx-auto bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
            <h2 class="text-xl font-bold text-secondary-900 mb-6">Create New Session</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-1">Session Name *</label>
                <input [(ngModel)]="newSessionName" type="text" placeholder="e.g. My Adventure"
                       class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-1">Universe *</label>
                <select [(ngModel)]="selectedUniverseId" (change)="onUniverseChange()" class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm bg-white">
                  <option value="">Select a Universe</option>
                  @for (u of universes(); track u.id) {
                    <option [value]="u.id">{{ u.name }}</option>
                  }
                </select>
              </div>
              @if (selectedUniverseId) {
                <div>
                  <label class="block text-sm font-medium text-secondary-700 mb-1">Characters to include</label>
                  <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-secondary-100 p-3 rounded-lg">
                    @for (char of currentUniverseCharacters(); track char.id) {
                      <label class="flex items-center gap-2 p-2 hover:bg-secondary-50 rounded cursor-pointer transition-colors">
                        <input type="checkbox" [checked]="isCharacterSelected(char.id)" (change)="toggleCharacterSelection(char.id)" class="rounded text-primary-600 focus:ring-primary-100"/>
                        <span class="text-xs font-medium">{{ char.name }}</span>
                      </label>
                    }
                  </div>
                </div>
              }
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-1">Persona (Optional)</label>
                <select [(ngModel)]="selectedPersonaId" class="w-full px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm bg-white">
                  <option [value]="null">No Persona (Anonymous)</option>
                  @for (p of personas(); track p.id) {
                    <option [value]="p.id">{{ p.name }}</option>
                  }
                </select>
              </div>
              <div class="pt-4 flex gap-3">
                <button (click)="createSession()" [disabled]="isCreating() || !newSessionName.trim() || !selectedUniverseId"
                        class="btn-primary flex-1 disabled:opacity-50">
                  @if (isCreating()) { Creating... } @else { Start Roleplay }
                </button>
                <button (click)="currentView.set('list')" class="btn-secondary px-6">Cancel</button>
              </div>
            </div>
          </div>
        } @else if (currentView() === 'session' && currentSession()) {
          <!-- ACTIVE SESSION (SOCIAL MEDIA) -->
          <div class="grid lg:grid-cols-4 gap-6">
            <!-- Sidebar -->
            <div class="lg:col-span-1 space-y-4">
              <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-4">
                <h3 class="font-bold text-secondary-900 mb-2">{{ currentSession()?.name }}</h3>
                <p class="text-xs text-muted italic mb-4">{{ currentSession()?.universeName }}</p>
                <div class="p-3 bg-secondary-50 rounded-lg text-center mb-4">
                  <p class="text-xs text-muted uppercase tracking-wider font-bold mb-1">Current Date</p>
                  <p class="text-lg font-bold text-primary-600">{{ currentSession()?.currentDate }}</p>
                </div>
                <div class="flex flex-col gap-2">
                  <button (click)="endDay()" [disabled]="isLoading()" class="w-full btn-primary text-xs py-2">End Day & Post</button>
                  <button (click)="rewind()" [disabled]="isLoading()" class="w-full btn-secondary text-xs py-2">Rewind Day</button>
                  <button (click)="currentView.set('list')" class="w-full text-xs text-muted hover:text-secondary-800 transition-colors py-2">Close Session</button>
                </div>
              </div>

              <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-4">
                <h4 class="text-xs font-bold text-secondary-900 mb-3 uppercase tracking-wider">Characters</h4>
                <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
                  @for (char of currentSession()?.characters; track char.id) {
                    <div class="flex items-center gap-2 p-2 hover:bg-secondary-50 rounded-lg transition-colors border border-transparent hover:border-secondary-100">
                      <div class="w-8 h-8 rounded-full bg-secondary-200 flex items-center justify-center text-xs font-bold text-secondary-600 flex-shrink-0">
                        {{ char.name.charAt(0) }}
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs font-bold text-secondary-900 truncate">{{ char.name }}</p>
                        <p class="text-[10px] text-muted truncate">{{ char.job }} ({{ char.role }})</p>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Main Content (Social Media Feed) -->
            <div class="lg:col-span-3 space-y-4">
              <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-4">
                <h2 class="text-xl font-bold text-secondary-900 mb-4 flex items-center gap-2">
                  <span class="text-2xl">📱</span> Social Media
                </h2>
                <div class="space-y-4">
                  @if (currentSession()?.posts?.length === 0) {
                    <div class="text-center py-16">
                      <p class="text-muted italic">Nothing posted yet. End the day to trigger posts!</p>
                    </div>
                  } @else {
                    @for (post of currentSession()?.posts; track post.id) {
                      <div class="bg-white border border-secondary-100 rounded-xl p-4 shadow-sm hover:border-primary-100 transition-all">
                        <div class="flex items-center gap-3 mb-3">
                          <div class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                            {{ post.characterName.charAt(0) }}
                          </div>
                          <div>
                            <p class="text-sm font-bold text-secondary-900 hover:text-primary-600 cursor-pointer transition-colors">{{ post.characterName }}</p>
                            <p class="text-[11px] text-muted">{{ post.timestamp | date:'short' }}</p>
                          </div>
                        </div>
                        <p class="text-sm text-secondary-800 whitespace-pre-wrap leading-relaxed">{{ post.content }}</p>
                        <div class="mt-4 pt-3 border-t border-secondary-50 flex items-center gap-6">
                          <button class="flex items-center gap-1.5 text-xs text-muted hover:text-red-500 transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                            {{ post.likes }}
                          </button>
                          <button class="flex items-center gap-1.5 text-xs text-muted hover:text-primary-500 transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                            Reply
                          </button>
                          <button class="flex items-center gap-1.5 text-xs text-muted hover:text-green-500 transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                            Repost
                          </button>
                        </div>
                      </div>
                    }
                  }
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class RoleplayPageComponent implements OnInit {
  private roleplayService = inject(RoleplayService);
  private llmService = inject(LlmService);

  currentView = signal<RoleplayView>('list');
  sessions = signal<RoleplaySession[]>([]);
  universes = signal<UniverseSummary[]>([]);
  personas = signal<Persona[]>([]);
  currentSession = signal<RoleplaySession | null>(null);

  isLoading = signal(false);
  isCreating = signal(false);
  errorMessage = signal('');

  // Creation State
  newSessionName = '';
  selectedUniverseId = '';
  selectedCharacterIds = new Set<string>();
  selectedPersonaId: string | null = null;
  currentUniverseCharacters = signal<any[]>([]);

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const [sessions, universes, personas] = await Promise.all([
        this.roleplayService.listSessions(),
        this.llmService.getUniverses(),
        this.llmService.getPersonas()
      ]);
      this.sessions.set(sessions);
      this.universes.set(universes);
      this.personas.set(personas);
    } catch {
      this.errorMessage.set('Failed to load roleplay data');
    } finally {
      this.isLoading.set(false);
    }
  }

  showCreate() {
    this.newSessionName = '';
    this.selectedUniverseId = '';
    this.selectedCharacterIds.clear();
    this.selectedPersonaId = null;
    this.currentView.set('create');
  }

  onUniverseChange() {
    const u = this.universes().find(u => u.id === this.selectedUniverseId);
    this.currentUniverseCharacters.set(u ? u.characters : []);
    this.selectedCharacterIds.clear();
  }

  isCharacterSelected(id: string) {
    return this.selectedCharacterIds.has(id);
  }

  toggleCharacterSelection(id: string) {
    if (this.selectedCharacterIds.has(id)) {
      this.selectedCharacterIds.delete(id);
    } else {
      this.selectedCharacterIds.add(id);
    }
  }

  async createSession() {
    if (!this.newSessionName.trim() || !this.selectedUniverseId) return;
    this.isCreating.set(true);
    try {
      const session = await this.roleplayService.createSession(
        this.newSessionName.trim(),
        this.selectedUniverseId,
        Array.from(this.selectedCharacterIds),
        this.selectedPersonaId
      );
      this.currentSession.set(session);
      this.currentView.set('session');
      await this.loadData();
    } catch {
      this.errorMessage.set('Failed to create session');
    } finally {
      this.isCreating.set(false);
    }
  }

  async loadSession(id: string) {
    this.isLoading.set(true);
    try {
      const session = await this.roleplayService.getSession(id);
      this.currentSession.set(session);
      this.currentView.set('session');
    } catch {
      this.errorMessage.set('Failed to load session');
    } finally {
      this.isLoading.set(false);
    }
  }

  async endDay() {
    if (!this.currentSession()) return;
    this.isLoading.set(true);
    try {
      const session = await this.roleplayService.endDay(this.currentSession()!.id);
      this.currentSession.set(session);
    } catch {
      this.errorMessage.set('Failed to progress day');
    } finally {
      this.isLoading.set(false);
    }
  }

  async rewind() {
    if (!this.currentSession()) return;
    this.isLoading.set(true);
    try {
      const session = await this.roleplayService.rewind(this.currentSession()!.id);
      this.currentSession.set(session);
    } catch {
      this.errorMessage.set('Failed to rewind day');
    } finally {
      this.isLoading.set(false);
    }
  }

  async confirmDelete(session: RoleplaySession) {
    if (!confirm(`Delete roleplay session "${session.name}"?`)) return;
    try {
      await this.roleplayService.deleteSession(session.id);
      await this.loadData();
    } catch {
      this.errorMessage.set('Failed to delete session');
    }
  }
}
