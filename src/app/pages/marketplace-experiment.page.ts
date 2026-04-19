import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../services/translation.service';
import { HttpClient } from '@angular/common/http';

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
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">Model</label>
                <select [(ngModel)]="newSim.model" class="input-primary">
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                </select>
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
                </div>
              </div>
            </div>

            <!-- Main Content -->
            <div class="lg:col-span-3 space-y-8">
               <div class="bg-white p-6 rounded-xl shadow-sm">
                  <h2 class="text-2xl font-bold mb-4">Marketplace Browser</h2>
                  <p class="text-muted italic">Marketplace items will appear here once LLMs start selling.</p>
               </div>
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

  loading = signal(false);
  activeSimulation = signal<any>(null);
  newSim = { name: '', numLLMs: 3, model: 'gpt-4o', mode: 'online' };

  ngOnInit() {
    this.loadSimulations();
  }

  async loadSimulations() {
    try {
      const res: any = await this.http.get('/api/marketplace/simulations').toPromise();
      if (res.success && res.simulations.length > 0) {
        this.activeSimulation.set(res.simulations[0]);
      }
    } catch (e) {}
  }

  async createSimulation() {
    this.loading.set(true);
    try {
      const res: any = await this.http.post('/api/marketplace/simulations', this.newSim).toPromise();
      if (res.success) {
        this.activeSimulation.set(res.simulation);
      }
    } catch (e) {
      alert('Failed to start simulation');
    } finally {
      this.loading.set(false);
    }
  }
}
