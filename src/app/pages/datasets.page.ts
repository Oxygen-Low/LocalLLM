import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../services/translation.service';
import { LlmService, ProviderInfo } from '../services/llm.service';
import { DatasetsService, DatasetRow } from '../services/datasets.service';

type WizardStep = 'configure' | 'generating' | 'results';

@Component({
  selector: 'app-datasets',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-white to-secondary-50">
      <div class="container-custom py-8 sm:py-12">

        <!-- Header -->
        <div class="flex items-center gap-4 mb-8">
          <a routerLink="/dashboard"
             class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-700 font-medium text-sm transition-colors">
            ← Back
          </a>
          <div>
            <h1 class="text-3xl font-bold text-secondary-900">📊 Datasets</h1>
            <p class="text-muted text-sm mt-1">Create AI training datasets using any configured LLM provider</p>
          </div>
        </div>

        <!-- STEP 1: Configure -->
        @if (currentStep() === 'configure') {
          <div class="max-w-2xl mx-auto">
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 space-y-6">

              <!-- Instructions -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">
                  Instructions
                </label>
                <textarea
                  [(ngModel)]="instructions"
                  rows="4"
                  placeholder="e.g. Create a dataset that makes the LLM think like a Claude Model"
                  class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm resize-none transition-colors"
                ></textarea>
                <p class="text-xs text-muted mt-1">Describe the kind of data you want to generate. The LLM will create instruction/input/output rows based on this.</p>
              </div>

              <!-- Provider Selection -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">
                  LLM Provider &amp; Model
                </label>
                @if (isLoadingProviders()) {
                  <div class="text-sm text-muted">Loading providers…</div>
                } @else if (availableProviders().length === 0) {
                  <div class="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    No AI providers configured. <a routerLink="/settings" class="text-primary-600 hover:underline">Add one in Settings →</a>
                  </div>
                } @else {
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    @for (p of availableProviders(); track p.id) {
                      <button
                        (click)="selectProvider(p)"
                        class="text-left p-3 rounded-lg border transition-all"
                        [ngClass]="selectedProvider()?.id === p.id
                          ? 'border-primary-500 ring-2 ring-primary-100 bg-primary-50'
                          : 'border-secondary-200 hover:border-primary-300 bg-white'"
                      >
                        <div class="font-medium text-secondary-900 text-sm">{{ p.name }}</div>
                        <div class="text-xs text-muted mt-0.5">{{ p.model }}</div>
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Model override -->
              @if (selectedProvider() && selectedProvider()!.models && selectedProvider()!.models!.length > 1) {
                <div>
                  <label class="block text-sm font-semibold text-secondary-900 mb-2">
                    Model
                  </label>
                  <select
                    [(ngModel)]="selectedModel"
                    class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm"
                  >
                    @for (m of selectedProvider()!.models!; track m) {
                      <option [value]="getModelId(m)">{{ getModelLabel(m) }}</option>
                    }
                  </select>
                </div>
              }

              <!-- Number of rows -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">
                  Number of Rows
                </label>
                <input
                  type="number"
                  [(ngModel)]="numRows"
                  min="1"
                  max="100"
                  class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm"
                />
                <p class="text-xs text-muted mt-1">Choose between 1 and 100 rows. Larger datasets take longer to generate.</p>
              </div>

              <!-- Generate button -->
              <button
                (click)="generateDataset()"
                [disabled]="!canGenerate()"
                class="w-full px-4 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Generate Dataset
              </button>
            </div>
          </div>
        }

        <!-- STEP 2: Generating -->
        @if (currentStep() === 'generating') {
          <div class="max-w-md mx-auto text-center py-16">
            <div class="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
            <p class="text-lg font-semibold text-secondary-900">Generating dataset…</p>
            <p class="text-sm text-muted mt-2">This may take a moment depending on the number of rows.</p>
          </div>
        }

        <!-- STEP 3: Results -->
        @if (currentStep() === 'results') {
          <div class="max-w-4xl mx-auto space-y-6">

            <!-- Summary -->
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
              <div class="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 class="text-xl font-bold text-secondary-900">Dataset Generated</h2>
                  <p class="text-sm text-muted mt-1">{{ generatedRows().length }} rows created successfully</p>
                </div>
                <button
                  (click)="currentStep.set('configure')"
                  class="px-4 py-2 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-700 font-medium text-sm transition-colors"
                >
                  ← New Dataset
                </button>
              </div>
            </div>

            @if (errorMessage()) {
              <div class="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                {{ errorMessage() }}
              </div>
            }

            <!-- Preview table -->
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-secondary-50 border-b border-secondary-200">
                    <tr>
                      <th class="px-4 py-3 text-left font-semibold text-secondary-700">#</th>
                      <th class="px-4 py-3 text-left font-semibold text-secondary-700">Instruction</th>
                      <th class="px-4 py-3 text-left font-semibold text-secondary-700">Input</th>
                      <th class="px-4 py-3 text-left font-semibold text-secondary-700">Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of generatedRows(); track $index) {
                      <tr class="border-b border-secondary-100 hover:bg-secondary-50/50">
                        <td class="px-4 py-3 text-muted whitespace-nowrap">{{ $index + 1 }}</td>
                        <td class="px-4 py-3 max-w-xs truncate" [title]="row.instruction">{{ row.instruction }}</td>
                        <td class="px-4 py-3 max-w-xs truncate" [title]="row.input">{{ row.input }}</td>
                        <td class="px-4 py-3 max-w-xs truncate" [title]="row.output">{{ row.output }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Actions -->
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
              <h3 class="text-lg font-bold text-secondary-900 mb-4">Save or Download</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <!-- Download -->
                <button
                  (click)="downloadDataset()"
                  class="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700 font-semibold transition-colors"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download as JSONL
                </button>

                <!-- Save to Repo -->
                <div class="space-y-3">
                  @if (!showSaveForm()) {
                    <button
                      (click)="showSaveForm.set(true)"
                      class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 text-green-700 font-semibold transition-colors"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      Save to Dataset Repository
                    </button>
                  } @else {
                    <div class="p-4 rounded-lg border border-green-200 bg-green-50 space-y-3">
                      <input
                        type="text"
                        [(ngModel)]="saveRepoName"
                        placeholder="Dataset repository name"
                        class="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm"
                      />
                      <input
                        type="text"
                        [(ngModel)]="saveRepoDescription"
                        placeholder="Description (optional)"
                        class="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm"
                      />
                      <div class="flex gap-2">
                        <button
                          (click)="saveToRepo()"
                          [disabled]="isSaving() || !saveRepoName.trim()"
                          class="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white font-medium text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          @if (isSaving()) { Saving… } @else { Save }
                        </button>
                        <button
                          (click)="showSaveForm.set(false)"
                          class="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  }

                  @if (saveSuccess()) {
                    <div class="p-3 rounded-lg bg-green-100 border border-green-300 text-green-800 text-sm">
                      ✅ Dataset saved to repository "{{ savedRepoName() }}" successfully!
                    </div>
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
export class DatasetsPageComponent implements OnInit {
  protected t = inject(TranslationService);
  private llmService = inject(LlmService);
  private datasetsService = inject(DatasetsService);

  // Wizard state
  currentStep = signal<WizardStep>('configure');

  // Configuration
  instructions = '';
  numRows = 10;
  selectedModel = '';

  // Providers
  isLoadingProviders = signal(false);
  availableProviders = signal<ProviderInfo[]>([]);
  selectedProvider = signal<ProviderInfo | null>(null);

  // Results
  generatedRows = signal<DatasetRow[]>([]);
  errorMessage = signal('');

  // Save
  showSaveForm = signal(false);
  saveRepoName = '';
  saveRepoDescription = '';
  isSaving = signal(false);
  saveSuccess = signal(false);
  savedRepoName = signal('');

  async ngOnInit(): Promise<void> {
    this.isLoadingProviders.set(true);
    try {
      const providers = await this.llmService.getProviders();
      this.availableProviders.set(providers.filter(p => p.available));
    } catch {
      // providers will be empty
    } finally {
      this.isLoadingProviders.set(false);
    }
  }

  selectProvider(provider: ProviderInfo): void {
    this.selectedProvider.set(provider);
    const firstModel = provider.models?.[0];
    this.selectedModel = provider.model || (typeof firstModel === 'string' ? firstModel : firstModel?.id ?? '');
  }

  getModelId(m: string | { id: string; name: string }): string {
    return typeof m === 'string' ? m : m.id;
  }

  getModelLabel(m: string | { id: string; name: string }): string {
    return typeof m === 'string' ? m : m.name;
  }

  canGenerate(): boolean {
    return (
      this.instructions.trim().length > 0 &&
      this.selectedProvider() !== null &&
      this.numRows >= 1 &&
      this.numRows <= 100
    );
  }

  async generateDataset(): Promise<void> {
    if (!this.canGenerate()) return;

    const provider = this.selectedProvider()!;
    const model = this.selectedModel || provider.model || '';

    this.currentStep.set('generating');
    this.errorMessage.set('');

    try {
      const res = await this.datasetsService.generate(
        this.instructions,
        provider.id,
        model,
        this.numRows
      );
      if (res.success && res.rows) {
        this.generatedRows.set(res.rows);
      } else {
        this.errorMessage.set(res.error || 'Failed to generate dataset');
        this.generatedRows.set([]);
      }
    } catch (err: any) {
      this.errorMessage.set(err?.error?.error || err?.message || 'An error occurred while generating the dataset');
      this.generatedRows.set([]);
    }
    this.currentStep.set('results');
  }

  downloadDataset(): void {
    const rows = this.generatedRows();
    if (rows.length === 0) return;

    const jsonl = rows.map(r => JSON.stringify(r)).join('\n');
    const blob = new Blob([jsonl], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dataset.jsonl';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async saveToRepo(): Promise<void> {
    if (!this.saveRepoName.trim() || this.isSaving()) return;

    this.isSaving.set(true);
    this.saveSuccess.set(false);

    try {
      const res = await this.datasetsService.save(
        this.saveRepoName.trim(),
        this.saveRepoDescription.trim(),
        this.generatedRows()
      );
      if (res.success) {
        this.saveSuccess.set(true);
        this.savedRepoName.set(res.repoName || this.saveRepoName);
        this.showSaveForm.set(false);
      } else {
        this.errorMessage.set(res.error || 'Failed to save dataset');
      }
    } catch (err: any) {
      this.errorMessage.set(err?.error?.error || err?.message || 'An error occurred while saving');
    } finally {
      this.isSaving.set(false);
    }
  }
}
