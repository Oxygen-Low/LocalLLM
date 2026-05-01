import { Component, ChangeDetectionStrategy, inject, signal, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LlmService, type ProviderInfo, type Adventure, type AdventureSummary, type AdventureBookEntry, type UniverseSummary, type UniverseCharacterSummary, type Persona } from '../services/llm.service';

@Component({
  selector: 'app-adventure',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-64px)] bg-[#f4f1ea] text-[#2c2c2c] font-serif p-4 md:p-8 parchment">
      <div class="max-w-5xl mx-auto">

        <!-- Header -->
        <div class="flex items-center justify-between mb-8 border-b-2 border-[#8b7355] pb-4">
          <h1 class="text-3xl font-bold italic text-[#5d4037] drop-shadow-sm">The Adventure Chronicles</h1>
          <div class="flex gap-4 font-sans">
            <button (click)="viewMode.set('list')" class="px-4 py-2 rounded border border-[#8b7355] hover:bg-[#e8e4d9] transition-colors text-sm font-bold text-[#5d4037]">Library</button>
            <button (click)="viewMode.set('setup')" class="px-4 py-2 rounded bg-[#8b7355] text-white hover:bg-[#7a624a] transition-colors text-sm font-bold shadow-sm">New Tale</button>
          </div>
        </div>

        <!-- View: List Adventures -->
        @if (viewMode() === 'list') {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (adv of adventures(); track adv.id) {
              <button type="button" class="bg-white p-6 rounded shadow-md border border-[#d3d3d3] hover:shadow-lg transition-shadow cursor-pointer relative group text-left w-full focus:outline-none focus:ring-2 focus:ring-[#8b7355] focus:ring-offset-2"
                      (click)="loadAdventure(adv.id)"
                      [attr.aria-label]="'Load adventure: ' + adv.title + ' in universe ' + adv.universeName">
                <div class="absolute top-2 right-2">
                  <span [ngClass]="adv.status === 'playing' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-secondary-100 text-secondary-800 border-secondary-200'" class="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-sans font-bold border">
                    {{ adv.status }}
                  </span>
                </div>
                <h3 class="text-xl font-bold mb-2 text-[#5d4037] group-hover:text-[#8b7355] transition-colors">{{ adv.title }}</h3>
                <p class="text-sm text-secondary-500 font-sans mb-4">Universe: {{ adv.universeName }}</p>
                <div class="flex justify-between items-center text-xs text-secondary-400 font-sans mt-auto">
                  <span class="flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    {{ adv.personaName }}
                  </span>
                  <span>{{ adv.updatedAt | date:'mediumDate' }}</span>
                </div>
              </button>
            }
            @if (adventures().length === 0) {
              <div class="col-span-full text-center py-20 bg-white/50 rounded border-2 border-dashed border-[#8b7355]">
                <p class="text-secondary-500 italic">Your library is empty. Start a new tale.</p>
              </div>
            }
          </div>
        }

        <!-- View: Setup Adventure -->
        @if (viewMode() === 'setup') {
          <div class="bg-white p-8 rounded shadow-xl border border-[#d3d3d3] max-w-2xl mx-auto">
            <h2 class="text-2xl font-bold mb-6 text-center italic text-[#5d4037]">Begin a New Journey</h2>

            <div class="space-y-6 font-sans">
              <!-- Title -->
              <div>
                <label class="block text-sm font-bold text-secondary-700 mb-1 font-sans">Adventure Title</label>
                <input [(ngModel)]="setupData.title" type="text" placeholder="A Tale of Two Realms..." class="w-full px-4 py-2 rounded border border-secondary-300 focus:ring-2 focus:ring-[#8b7355] focus:border-transparent outline-none">
              </div>

              <!-- Persona Selection -->
              <div>
                <label class="block text-sm font-bold text-secondary-700 mb-1 font-sans">Play As (Persona)</label>
                <select [(ngModel)]="setupData.personaId" class="w-full px-4 py-2 rounded border border-secondary-300 outline-none">
                  <option [value]="null" disabled>Select your identity</option>
                  @for (p of personas(); track p.id) {
                    <option [value]="p.id">{{ p.name }}</option>
                  }
                </select>
                <p class="text-[10px] text-secondary-400 mt-1">Don't have a persona? <a routerLink="/personas" class="text-[#8b7355] underline font-bold">Create one</a></p>
              </div>

              <!-- Universe Selection -->
              <div>
                <label class="block text-sm font-bold text-secondary-700 mb-1 font-sans">Set in Universe</label>
                <select [(ngModel)]="setupData.universeId" (change)="onUniverseChange()" class="w-full px-4 py-2 rounded border border-secondary-300 outline-none">
                  <option [value]="null" disabled>Select a setting</option>
                  @for (u of universes(); track u.id) {
                    <option [value]="u.id">{{ u.name }}</option>
                  }
                </select>
              </div>

              <!-- NPC Selection -->
              @if (setupData.universeId) {
                <div>
                  <label class="block text-sm font-bold text-secondary-700 mb-2 font-sans">Include Characters</label>
                  <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded bg-secondary-50">
                    @for (c of availableNpcs(); track c.id) {
                      <label class="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition-colors border border-transparent hover:border-secondary-200">
                        <input type="checkbox" [checked]="setupData.npcIds.includes(c.id)" (change)="toggleNpc(c.id)" class="rounded text-[#8b7355]">
                        <span class="text-sm">{{ c.name }}</span>
                      </label>
                    }
                  </div>
                </div>
              }

              <!-- LLM Config -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-bold text-secondary-700 mb-1 font-sans">Narrator LLM</label>
                  <div class="relative">
                    <button (click)="showNarratorDropdown.set(!showNarratorDropdown())" class="w-full text-left px-4 py-2 rounded border border-secondary-300 text-xs flex justify-between items-center bg-white">
                      <span class="truncate">{{ getProviderLabel(setupData.narratorConfig) }}</span>
                      <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    @if (showNarratorDropdown()) {
                      <div class="absolute bottom-full mb-1 left-0 w-full bg-white border rounded shadow-lg z-50 max-h-60 overflow-y-auto">
                        @for (p of providers(); track p.id) {
                          @if (p.models) {
                            @for (m of p.models; track getModelId(m)) {
                              <button (click)="setupData.narratorConfig = {provider: p.id, model: getModelId(m)}; showNarratorDropdown.set(false)" class="w-full text-left px-4 py-2 text-[10px] hover:bg-secondary-50 border-b border-secondary-50">
                                {{ p.name }} - {{ getModelDisplayName(m) }}
                              </button>
                            }
                          } @else {
                            <button (click)="setupData.narratorConfig = {provider: p.id, model: p.model || ''}; showNarratorDropdown.set(false)" class="w-full text-left px-4 py-2 text-[10px] hover:bg-secondary-50 border-b border-secondary-50">
                              {{ p.name }}
                            </button>
                          }
                        }
                      </div>
                    }
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-bold text-secondary-700 mb-1 font-sans">Character LLM</label>
                  <div class="relative">
                    <button (click)="showCharacterDropdown.set(!showCharacterDropdown())" class="w-full text-left px-4 py-2 rounded border border-secondary-300 text-xs flex justify-between items-center bg-white">
                      <span class="truncate">{{ getProviderLabel(setupData.characterConfig) }}</span>
                      <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    @if (showCharacterDropdown()) {
                      <div class="absolute bottom-full mb-1 left-0 w-full bg-white border rounded shadow-lg z-50 max-h-60 overflow-y-auto">
                        @for (p of providers(); track p.id) {
                          @if (p.models) {
                            @for (m of p.models; track getModelId(m)) {
                              <button (click)="setupData.characterConfig = {provider: p.id, model: getModelId(m)}; showCharacterDropdown.set(false)" class="w-full text-left px-4 py-2 text-[10px] hover:bg-secondary-50 border-b border-secondary-50">
                                {{ p.name }} - {{ getModelDisplayName(m) }}
                              </button>
                            }
                          } @else {
                            <button (click)="setupData.characterConfig = {provider: p.id, model: p.model || ''}; showCharacterDropdown.set(false)" class="w-full text-left px-4 py-2 text-[10px] hover:bg-secondary-50 border-b border-secondary-50">
                              {{ p.name }}
                            </button>
                          }
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>

              <button (click)="startAdventure()" [disabled]="isStarting() || !setupData.universeId || !setupData.personaId" class="w-full py-4 rounded bg-[#5d4037] text-white font-bold hover:bg-[#4e342e] transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2 shadow-md">
                @if (isStarting()) {
                  <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  The Narrator is preparing the scene...
                } @else {
                  Begin the Tale
                }
              </button>
            </div>
          </div>
        }

        <!-- View: Play Adventure -->
        @if (viewMode() === 'play' && currentAdventure()) {
          <div class="flex flex-col gap-8">

            <!-- Book Container -->
            <div class="relative bg-[#faf9f6] bg-[url('/parchment.png')] aspect-[3/4] md:aspect-[4/3] rounded-sm [box-shadow:0_25px_50px_-12px_rgba(0,0,0,0.4),_inset_0_0_100px_rgba(139,115,85,0.1)] border border-[#d3d3d3] overflow-hidden flex flex-col md:flex-row">
              <!-- Gutter/Spine -->
              <div class="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-black/10 z-10"></div>
              <div class="hidden md:block absolute left-1/2 top-0 bottom-0 w-4 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/5 to-transparent z-10"></div>

              <!-- Left Page (Desktop) -->
              <div class="flex-1 p-8 md:p-12 border-b md:border-b-0 md:border-r border-[#e8e4d9] overflow-y-auto relative [box-shadow:inset_20px_0_30px_-20px_rgba(0,0,0,0.1)]">
                 <div class="prose prose-stone max-w-none prose-p:mb-6 last:prose-p:mb-0">
                    <div class="mb-6 flex justify-between items-end border-b border-[#e8e4d9] pb-1">
                      <span class="text-[10px] font-sans font-bold uppercase tracking-widest text-secondary-400">
                        {{ perspectiveName() }}
                      </span>
                      <span class="text-xs font-serif italic text-secondary-400">Page {{ currentPage() + 1 }}</span>
                    </div>
                    @for (entry of getPageEntries(currentPage()); track $index) {
                      <p [ngClass]="entry.type === 'action' ? 'italic text-secondary-500 pl-4 border-l-2 border-secondary-100' : 'text-stone-800 first-letter:float-left first-letter:text-6xl first-letter:font-bold first-letter:mr-3 first-letter:mt-2 first-letter:text-[#5d4037]'" class="leading-relaxed text-lg">
                        {{ entry.entry }}
                      </p>
                    }
                 </div>
              </div>

              <!-- Right Page (Desktop) -->
              <div class="flex-1 p-8 md:p-12 overflow-y-auto bg-white relative [box-shadow:inset_-20px_0_30px_-20px_rgba(0,0,0,0.1)]">
                <div class="prose prose-stone max-w-none prose-p:mb-6 last:prose-p:mb-0">
                   <div class="mb-6 flex justify-between items-end border-b border-[#e8e4d9] pb-1">
                      <span class="text-[10px] font-sans font-bold uppercase tracking-widest text-secondary-400">
                        {{ currentAdventure()?.title }}
                      </span>
                      <span class="text-xs font-serif italic text-secondary-400">Page {{ currentPage() + 2 }}</span>
                    </div>
                   @for (entry of getPageEntries(currentPage() + 1); track $index) {
                      <p [ngClass]="entry.type === 'action' ? 'italic text-secondary-500 pl-4 border-l-2 border-secondary-100' : 'text-stone-800'" class="leading-relaxed text-lg">
                        {{ entry.entry }}
                      </p>
                    }
                </div>
              </div>

              <!-- Page Turn Buttons -->
              <button (click)="prevPage()" [disabled]="currentPage() === 0" class="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 border border-[#8b7355] text-[#8b7355] hover:bg-white disabled:opacity-0 transition-all z-20 shadow-sm">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button (click)="nextPage()" [disabled]="(currentPage() + 2) * 5 >= currentBook().length" class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 border border-[#8b7355] text-[#8b7355] hover:bg-white disabled:opacity-0 transition-all z-20 shadow-sm">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>

              <!-- Perspective Switcher (Only if ended) -->
              @if (currentAdventure()?.status === 'ended') {
                <div class="absolute top-4 left-1/2 -translate-x-1/2 bg-[#8b7355] text-white px-4 py-1.5 rounded-full text-[10px] font-sans font-bold flex gap-4 z-20 shadow-lg border border-[#7a624a]">
                  <button (click)="setPerspective('user')" [class.text-white]="currentPerspective() === 'user'" [class.text-white/50]="currentPerspective() !== 'user'" class="hover:text-white transition-colors">YOU</button>
                  @for (npcId of currentAdventure()?.npcIds; track npcId) {
                    <button (click)="setPerspective(npcId)" [class.text-white]="currentPerspective() === npcId" [class.text-white/50]="currentPerspective() !== npcId" class="hover:text-white transition-colors uppercase">{{ getCharacterName(npcId) }}</button>
                  }
                </div>
              }
            </div>

            <!-- Controls -->
            <div class="bg-white p-6 rounded shadow-md border border-[#d3d3d3] font-sans">
               @if (currentAdventure()?.status === 'playing') {
                <div class="flex flex-col gap-4">
                  <div class="flex gap-2">
                    <input [(ngModel)]="userAction" (keydown.enter)="executeTurn()" [disabled]="isProcessing()" type="text" placeholder="I open the heavy oak door..." class="flex-1 px-4 py-3 rounded border border-secondary-300 outline-none focus:ring-2 focus:ring-[#8b7355] shadow-inner text-sm">
                    <button (click)="executeTurn()" [disabled]="isProcessing() || !userAction.trim()" class="px-6 py-3 rounded bg-[#5d4037] text-white font-bold hover:bg-[#4e342e] disabled:opacity-50 shadow-md transition-all">
                      Act
                    </button>
                    <button (click)="skipTurn()" [disabled]="isProcessing()" class="px-6 py-3 rounded border border-[#8b7355] text-[#8b7355] font-bold hover:bg-secondary-50 disabled:opacity-50 shadow-sm transition-all">
                      Wait
                    </button>
                  </div>
                  <div class="flex justify-between items-center">
                    <button (click)="endAdventure()" class="text-red-600 hover:text-red-700 text-xs font-bold uppercase tracking-widest">End Adventure</button>
                    @if (isProcessing()) {
                      <div class="flex items-center gap-2 text-xs text-[#8b7355] font-bold animate-pulse">
                        <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        The story is being written...
                      </div>
                    }
                  </div>
                </div>
               } @else {
                 <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                   <p class="text-secondary-600 italic text-sm">This tale has concluded. You may read the perspectives of all participants.</p>
                   <div class="flex gap-4">
                    <button (click)="resumeAdventure()" class="px-6 py-2 rounded bg-green-700 text-white font-bold hover:bg-green-800 text-sm shadow-md transition-all">Resume Tale</button>
                    <button (click)="confirmDelete()" class="px-6 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-700 text-sm shadow-md transition-all">Burn Book</button>
                   </div>
                 </div>
               }
            </div>
          </div>
        }

        @if (errorMessage()) {
          <div class="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded text-sm font-sans flex justify-between items-center shadow-sm">
            <span class="flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {{ errorMessage() }}
            </span>
            <button (click)="errorMessage.set(null)" class="hover:text-red-900 transition-colors">✕</button>
          </div>
        }

      </div>
    </div>
  `,
})
export class AdventurePageComponent implements OnInit {
  private llmService = inject(LlmService);

  viewMode = signal<'list' | 'setup' | 'play'>('list');
  adventures = signal<AdventureSummary[]>([]);
  currentAdventure = signal<Adventure | null>(null);

  // Setup state
  personas = signal<Persona[]>([]);
  universes = signal<UniverseSummary[]>([]);
  providers = signal<ProviderInfo[]>([]);
  availableNpcs = signal<UniverseCharacterSummary[]>([]);

  setupData = {
    title: '',
    personaId: null as string | null,
    universeId: null as string | null,
    npcIds: [] as string[],
    narratorConfig: { provider: '', model: '' },
    characterConfig: { provider: '', model: '' }
  };

  showNarratorDropdown = signal(false);
  showCharacterDropdown = signal(false);
  isStarting = signal(false);

  // Play state
  currentPerspective = signal<string>('user');
  currentPage = signal(0);
  userAction = '';
  isProcessing = signal(false);
  errorMessage = signal<string | null>(null);

  async ngOnInit() {
    await this.loadInitialData();
  }

  async loadInitialData() {
    try {
      const [advs, pers, univs, provs] = await Promise.all([
        this.llmService.listAdventures(),
        this.llmService.getPersonas(),
        this.llmService.getUniverses(),
        this.llmService.getProviders()
      ]);
      this.adventures.set(advs);
      this.personas.set(pers);
      this.universes.set(univs);
      this.providers.set(provs);

      // Default configs
      if (provs.length > 0) {
        const defaultProv = provs[0];
        const defaultModel = this.getModelId(defaultProv.models?.[0] || defaultProv.model || '');
        this.setupData.narratorConfig = { provider: defaultProv.id, model: defaultModel };
        this.setupData.characterConfig = { provider: defaultProv.id, model: defaultModel };
      }
    } catch (e) {
      this.errorMessage.set('Failed to load initial data');
    }
  }

  onUniverseChange() {
    const univ = this.universes().find(u => u.id === this.setupData.universeId);
    this.availableNpcs.set(univ?.characters || []);
    this.setupData.npcIds = [];
  }

  toggleNpc(id: string) {
    if (this.setupData.npcIds.includes(id)) {
      this.setupData.npcIds = this.setupData.npcIds.filter(i => i !== id);
    } else {
      this.setupData.npcIds.push(id);
    }
  }

  getProviderLabel(config: { provider: string; model: string }) {
    if (!config.provider) return 'Select Model';
    const p = this.providers().find(prov => prov.id === config.provider);
    return `${p?.name || config.provider} - ${config.model}`;
  }

  getModelId(m: string | { id: string; name: string }) {
    return typeof m === 'string' ? m : m.id;
  }

  getModelDisplayName(m: string | { id: string; name: string }) {
    return typeof m === 'string' ? m : m.name;
  }

  async startAdventure() {
    if (!this.setupData.universeId || !this.setupData.personaId) return;
    this.isStarting.set(true);
    this.errorMessage.set(null);
    try {
      const adv = await this.llmService.createAdventure({
        title: this.setupData.title,
        universeId: this.setupData.universeId,
        personaId: this.setupData.personaId,
        npcIds: this.setupData.npcIds,
        narratorConfig: this.setupData.narratorConfig,
        characterConfig: this.setupData.characterConfig
      });
      this.currentAdventure.set(adv);
      this.viewMode.set('play');
      this.currentPerspective.set('user');
      this.currentPage.set(0);
      await this.refreshAdventures();
    } catch (e) {
      this.errorMessage.set('The Narrator encountered an error while starting the tale.');
    } finally {
      this.isStarting.set(false);
    }
  }

  async loadAdventure(id: string) {
    try {
      const adv = await this.llmService.getAdventure(id);
      this.currentAdventure.set(adv);
      this.viewMode.set('play');
      this.currentPerspective.set('user');
      // Jump to last page
      const book = adv.books['user'];
      this.jumpToLastSpread(book);
    } catch (e) {
      this.errorMessage.set('Failed to open the book.');
    }
  }

  async refreshAdventures() {
    this.adventures.set(await this.llmService.listAdventures());
  }

  // Book Logic
  currentBook(): AdventureBookEntry[] {
    return this.currentAdventure()?.books[this.currentPerspective()] || [];
  }

  getPageEntries(pageNum: number): AdventureBookEntry[] {
    const book = this.currentBook();
    const entriesPerPage = 5; // 5 entries per page, 10 per spread
    const start = pageNum * entriesPerPage;
    return book.slice(start, start + entriesPerPage);
  }

  nextPage() {
    const entriesPerSpread = 10;
    if ((this.currentPage() + 1) * entriesPerSpread < this.currentBook().length) {
      this.currentPage.update(p => (p + 2));
    }
  }

  prevPage() {
    if (this.currentPage() >= 2) {
      this.currentPage.update(p => p - 2);
    }
  }

  perspectiveName(): string {
    const adv = this.currentAdventure();
    if (!adv) return '';
    if (this.currentPerspective() === 'user') return adv.personaName;
    return this.getCharacterName(this.currentPerspective());
  }

  getCharacterName(id: string) {
    const adv = this.currentAdventure();
    if (adv?.npcNames) {
      const found = adv.npcNames.find(n => n.id === id);
      if (found) return found.name;
    }
    for (const u of this.universes()) {
      const c = u.characters?.find(char => char.id === id);
      if (c) return c.name;
    }
    return 'Someone';
  }

  setPerspective(p: string) {
    this.currentPerspective.set(p);
    this.currentPage.set(0);
  }

  private jumpToLastSpread(book: AdventureBookEntry[] | undefined) {
    const length = book?.length ?? 0;
    if (length === 0) {
      this.currentPage.set(0);
      return;
    }
    const lastPageIdx = Math.floor((length - 1) / 5);
    const lastSpreadIdx = lastPageIdx % 2 === 0 ? lastPageIdx : lastPageIdx - 1;
    this.currentPage.set(Math.max(0, lastSpreadIdx));
  }

  async executeTurn() {
    if (!this.userAction.trim() || !this.currentAdventure()) return;
    this.isProcessing.set(true);
    this.errorMessage.set(null);
    try {
      const { adventure } = await this.llmService.executeAdventureTurn(this.currentAdventure()!.id, this.userAction);
      this.currentAdventure.set(adventure);
      this.userAction = '';
      this.jumpToLastSpread(adventure.books['user']);
    } catch (e) {
      this.errorMessage.set('The world failed to respond to your action.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  async skipTurn() {
    if (!this.currentAdventure()) return;
    this.isProcessing.set(true);
    this.errorMessage.set(null);
    try {
      const { adventure, somethingHappened } = await this.llmService.executeAdventureTurn(this.currentAdventure()!.id, 'skip');
      this.currentAdventure.set(adventure);
      if (somethingHappened) {
        this.jumpToLastSpread(adventure.books['user']);
      }
    } catch (e) {
      this.errorMessage.set('Time failed to pass.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  async endAdventure() {
    if (!this.currentAdventure()) return;
    try {
      const adv = await this.llmService.updateAdventureState(this.currentAdventure()!.id, 'ended');
      this.currentAdventure.set(adv);
      await this.refreshAdventures();
    } catch (e) {
      this.errorMessage.set('Failed to conclude the story.');
    }
  }

  async resumeAdventure() {
    if (!this.currentAdventure()) return;
    try {
      const adv = await this.llmService.updateAdventureState(this.currentAdventure()!.id, 'playing');
      this.currentAdventure.set(adv);
      this.currentPerspective.set('user');
      await this.refreshAdventures();
    } catch (e) {
      this.errorMessage.set('Failed to resume the journey.');
    }
  }

  async confirmDelete() {
    if (!this.currentAdventure() || !confirm('Are you sure you want to burn this book? The story will be lost forever.')) return;
    try {
      await this.llmService.deleteAdventure(this.currentAdventure()!.id);
      this.currentAdventure.set(null);
      this.viewMode.set('list');
      await this.refreshAdventures();
    } catch (e) {
      this.errorMessage.set('Failed to delete the adventure.');
    }
  }
}
