import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../services/translation.service';
import { HttpClient } from '@angular/common/http';
import { LlmService, type ProviderInfo } from '../services/llm.service';

interface NewSimulation {
  name: string;
  numLLMs: number;
  model: string;
  provider: string;
  mode: string;
}

interface Simulation {
  id: string;
  name: string;
  status: string;
  turn: number;
}

interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  sellerId: string;
  variants?: Array<{ name: string; price: number }>;
}

interface TurnResult {
  name: string;
  thought: string;
  action: string;
}

@Component({
  selector: 'app-marketplace-experiment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-12">
      <div class="container-custom">
        <h1 class="text-4xl font-bold mb-8 text-secondary-900">Marketplace Experiment</h1>

        @if (!activeSimulation()) {
          <!-- Wizard -->
          <div class="bg-white p-8 rounded-2xl shadow-sm max-w-2xl mx-auto">
            <h2 class="text-2xl font-semibold mb-6">Create New Simulation</h2>
            <div class="space-y-6">
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">Simulation Name</label>
                <input [(ngModel)]="newSim.name" type="text" class="input-primary" placeholder="Experiment Alpha">
              </div>
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">Number of LLMs</label>
                <input [(ngModel)]="newSim.numLLMs" type="number" min="1" max="10" class="input-primary">
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-secondary-700 mb-2">Provider</label>
                  <select [(ngModel)]="newSim.provider" (ngModelChange)="onProviderChange()" class="input-primary">
                    @for (p of providers(); track p.id) {
                      <option [value]="p.id">{{ p.name }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-secondary-700 mb-2">Model</label>
                  <select [(ngModel)]="newSim.model" class="input-primary">
                    @for (m of availableModels(); track getModelId(m)) {
                      <option [value]="getModelId(m)">{{ getModelDisplayName(m) }}</option>
                    }
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">Mode</label>
                <select [(ngModel)]="newSim.mode" class="input-primary">
                  <option value="online">Online (Internet Access)</option>
                  <option value="offline">Offline (Restricted)</option>
                </select>
              </div>
              <button (click)="createSimulation()" class="btn-primary w-full py-3" [disabled]="loading()">
                {{ loading() ? 'Starting...' : 'Start Simulation' }}
              </button>
            </div>
          </div>
        } @else {
          <!-- Dashboard -->
          <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <!-- Sidebar -->
            <div class="lg:col-span-1 space-y-6">
              <div class="bg-white p-6 rounded-xl shadow-sm">
                <h3 class="font-bold text-lg mb-4">Simulation Info</h3>
                <div class="space-y-2 text-sm">
                  <p><span class="text-muted">Name:</span> {{ activeSimulation()?.name }}</p>
                  <p><span class="text-muted">Status:</span>
                    <span class="px-2 py-1 rounded-full text-xs font-medium"
                      [ngClass]="activeSimulation()?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'">
                      {{ activeSimulation()?.status }}
                    </span>
                  </p>
                  <p><span class="text-muted">Turn:</span> {{ activeSimulation()?.turn || 0 }}</p>
                </div>

                <div class="mt-6 pt-6 border-t border-secondary-100">
                  <button (click)="runTurn()" class="btn-primary w-full py-2 flex items-center justify-center gap-2" [disabled]="loading()">
                    @if (loading()) {
                      <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processing...
                    } @else {
                      <span>▶ Run Turn</span>
                    }
                  </button>
                  @if (turnError()) {
                    <div class="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg" role="alert">
                      {{ turnError() }}
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Main Content -->
            <div class="lg:col-span-3 space-y-8">
               <div class="bg-white p-6 rounded-xl shadow-sm">
                  <h2 class="text-2xl font-bold mb-4">Marketplace Browser</h2>

                  @if (items().length === 0) {
                    <p class="text-muted italic">Marketplace items will appear here once LLMs start selling.</p>
                  } @else {
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      @for (item of items(); track item.id) {
                        <div class="p-4 border border-secondary-200 rounded-lg hover:border-primary-300 transition-colors">
                          <h3 class="font-bold text-secondary-900">{{ item.name }}</h3>
                          <p class="text-sm text-muted mb-2">{{ item.description }}</p>
                          <div class="flex items-center justify-between">
                            <span class="text-primary-600 font-semibold">&#36;{{ item.variants?.[0]?.price ?? '—' }}</span>
                            <span class="text-xs text-secondary-500">Seller: {{ (item.sellerId && typeof item.sellerId === 'string' ? item.sellerId.slice(0,8) : '—') }}</span>
                          </div>
                        </div>
                      }
                    </div>
                  }
               </div>

               @if (turnResults().length > 0) {
                 <div class="bg-white p-6 rounded-xl shadow-sm">
                   <h2 class="text-xl font-bold mb-4">Recent Agent Activities</h2>
                   <div class="space-y-4">
                     @for (res of turnResults(); track $index) {
                       <div class="p-3 bg-secondary-50 rounded-lg border border-secondary-200">
                         <div class="flex items-center gap-2 mb-1">
                           <span class="font-bold text-sm text-secondary-900">{{ res.name }}</span>
                           <span class="px-1.5 py-0.5 rounded bg-secondary-200 text-[10px] font-bold uppercase tracking-wider">{{ res.action }}</span>
                         </div>
                         <p class="text-xs text-secondary-700 italic">"{{ res.thought }}"</p>
                       </div>
                     }
                   </div>
                 </div>
               }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class MarketplaceExperimentPageComponent implements OnInit {
  private http = inject(HttpClient);
  protected t = inject(TranslationService);
  private llmService = inject(LlmService);

  loading = signal(false);
  activeSimulation = signal<Simulation | null>(null);
  newSim: NewSimulation = { name: '', numLLMs: 3, model: '', provider: '', mode: 'online' };
  items = signal<MarketplaceItem[]>([]);
  turnResults = signal<TurnResult[]>([]);

  providers = signal<ProviderInfo[]>([]);
  availableModels = signal<Array<string | { id: string; name: string }>>([]);
  loadError = signal<string | null>(null);
  turnError = signal<string | null>(null);

  ngOnInit() {
    this.loadSimulations();
    this.loadProviders();
  }

  async loadProviders() {
    try {
      const providers = await this.llmService.getProviders();
      this.providers.set(providers);
      if (providers.length > 0) {
        const first = providers[0];
        this.newSim.provider = first.id;
        this.availableModels.set(first.models || []);
        this.newSim.model = first.model || this.getModelId(first.models?.[0] || '');
      }
    } catch (e) {
      console.error('Failed to load providers:', e);
      this.loadError.set('Failed to load LLM providers');
    }
  }

  onProviderChange() {
    const provider = this.providers().find(p => p.id === this.newSim.provider);
    if (provider) {
      this.availableModels.set(provider.models || []);
      this.newSim.model = provider.model || this.getModelId(provider.models?.[0] || '');
    }
  }

  getModelId(model: string | { id: string; name: string }): string {
    return typeof model === 'string' ? model : model.id;
  }

  getModelDisplayName(model: string | { id: string; name: string }): string {
    return typeof model === 'string' ? model : (model.name || model.id);
  }

  async loadSimulations() {
    try {
      const res: any = await this.http.get('/api/marketplace/simulations').toPromise();
      if (res.success && res.simulations.length > 0) {
        this.activeSimulation.set(res.simulations[0]);
        this.loadItems();
      }
    } catch (e) {
      console.error('Failed to load simulations:', e);
      this.loadError.set('Failed to load simulations');
    }
  }

  async loadItems() {
    const simId = this.activeSimulation()?.id;
    if (!simId) return;
    try {
      const res: any = await this.http.get(`/api/marketplace/items?simId=${simId}`).toPromise();
      if (res.success) {
        this.items.set(res.items);
      }
    } catch (e) {
      console.error('Failed to load items:', e);
      this.loadError.set('Failed to load marketplace items');
    }
  }

  async runTurn() {
    const simId = this.activeSimulation()?.id;
    if (!simId) return;

    this.loading.set(true);
    this.turnError.set(null);
    try {
      const res: any = await this.http.post(`/api/marketplace/simulations/${simId}/turn`, {}).toPromise();
      if (res.success) {
        this.activeSimulation.update(s => s ? { ...s, turn: res.turn } : s);
        this.turnResults.set(res.results || []);
        await this.loadItems();
      }
    } catch (e) {
      console.error('Failed to process turn:', e);
      this.turnError.set('Failed to process turn');
    } finally {
      this.loading.set(false);
    }
  }

  async createSimulation() {
    this.loading.set(true);
    this.turnError.set(null);
    try {
      const res: any = await this.http.post('/api/marketplace/simulations', this.newSim).toPromise();
      if (res.success) {
        this.activeSimulation.set(res.simulation);
      }
    } catch (e) {
      console.error('Failed to start simulation:', e);
      this.turnError.set('Failed to start simulation');
    } finally {
      this.loading.set(false);
    }
  }
}
