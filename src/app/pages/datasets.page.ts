import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../services/translation.service';
import { LlmService, ProviderInfo } from '../services/llm.service';
import { DatasetsService, DatasetRow } from '../services/datasets.service';

type WizardStep = 'configure' | 'generating' | 'results';
type DatasetMode = 'generate' | 'import';

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
            {{ t.translate('datasets.back') }}
          </a>
          <div>
            <h1 class="text-3xl font-bold text-secondary-900">{{ t.translate('datasets.title') }}</h1>
            <p class="text-muted text-sm mt-1">{{ t.translate('datasets.subtitle') }}</p>
          </div>
        </div>

        <!-- Mode selector -->
        @if (currentStep() === 'configure') {
          <div class="max-w-2xl mx-auto mb-6">
            <div class="flex rounded-lg border border-secondary-200 bg-white overflow-hidden">
              <button
                (click)="datasetMode.set('generate')"
                class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
                [ngClass]="datasetMode() === 'generate' ? 'bg-primary-600 text-white' : 'bg-white text-secondary-700 hover:bg-secondary-50'"
              >
                Generate with AI
              </button>
              <button
                (click)="datasetMode.set('import')"
                class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
                [ngClass]="datasetMode() === 'import' ? 'bg-primary-600 text-white' : 'bg-white text-secondary-700 hover:bg-secondary-50'"
              >
                Import from HuggingFace
              </button>
            </div>
          </div>
        }

        <!-- STEP 1: Configure (Generate) -->
        @if (currentStep() === 'configure' && datasetMode() === 'generate') {
          <div class="max-w-2xl mx-auto">
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 space-y-6">

              <!-- Instructions -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">
                  {{ t.translate('datasets.instructions') }}
                </label>
                <textarea
                  [(ngModel)]="instructions"
                  rows="4"
                  [placeholder]="t.translate('datasets.instructionsPlaceholder')"
                  class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm resize-none transition-colors"
                ></textarea>
                <p class="text-xs text-muted mt-1">{{ t.translate('datasets.instructionsHint') }}</p>
              </div>

              <!-- Provider Selection -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">
                  {{ t.translate('datasets.providerLabel') }}
                </label>
                @if (isLoadingProviders()) {
                  <div class="text-sm text-muted">{{ t.translate('datasets.loadingProviders') }}</div>
                } @else if (availableProviders().length === 0) {
                  <div class="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    {{ t.translate('datasets.noProviders') }} <a routerLink="/settings" class="text-primary-600 hover:underline">{{ t.translate('datasets.addProviderLink') }}</a>
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
                    {{ t.translate('datasets.modelLabel') }}
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

              <!-- Number of tokens -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">
                  {{ t.translate('datasets.numTokensLabel') }}
                </label>
                <input
                  type="number"
                  [(ngModel)]="numTokens"
                  min="1"
                  max="4096"
                  step="1"
                  class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm"
                />
                <p class="text-xs text-muted mt-1">{{ t.translate('datasets.numTokensHint') }}</p>
              </div>

              <!-- Generate button -->
              <button
                (click)="generateDataset()"
                [disabled]="!canGenerate()"
                class="w-full px-4 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ t.translate('datasets.generateButton') }}
              </button>
            </div>
          </div>
        }

        <!-- STEP 1: Configure (Import from HuggingFace) -->
        @if (currentStep() === 'configure' && datasetMode() === 'import') {
          <div class="max-w-2xl mx-auto">
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 space-y-6">

              <!-- Dataset ID -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">
                  HuggingFace Dataset ID
                </label>
                <input
                  type="text"
                  [(ngModel)]="importDatasetId"
                  placeholder="e.g. tatsu-lab/alpaca"
                  class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm transition-colors"
                />
                <p class="text-xs text-muted mt-1">Enter the HuggingFace dataset ID in "owner/name" format.</p>
              </div>

              <!-- Dataset Name -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">
                  Repository Name
                </label>
                <input
                  type="text"
                  [(ngModel)]="importName"
                  placeholder="e.g. alpaca-dataset"
                  class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm transition-colors"
                />
                <p class="text-xs text-muted mt-1">Name for the local dataset repository. If empty, the dataset name will be used.</p>
              </div>

              <!-- Split -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">
                  Split
                </label>
                <input
                  type="text"
                  [(ngModel)]="importSplit"
                  placeholder="train"
                  class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm transition-colors"
                />
                <p class="text-xs text-muted mt-1">Dataset split to import (e.g. "train", "test", "validation").</p>
              </div>

              <!-- Max Rows -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">
                  Max Rows
                </label>
                <input
                  type="number"
                  [(ngModel)]="importMaxRows"
                  min="1"
                  max="50000"
                  step="1"
                  class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm transition-colors"
                />
                <p class="text-xs text-muted mt-1">Maximum number of rows to import (1–50,000).</p>
              </div>

              @if (importError()) {
                <div class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                  {{ importError() }}
                </div>
              }

              <!-- Import button -->
              <button
                (click)="importFromHuggingFace()"
                [disabled]="!canImport() || isImporting()"
                class="w-full px-4 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ isImporting() ? 'Importing...' : 'Import Dataset' }}
              </button>
            </div>
          </div>
        }

        <!-- STEP 2: Generating -->
        @if (currentStep() === 'generating') {
          <div class="max-w-md mx-auto text-center py-16">
            <div class="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
            <p class="text-lg font-semibold text-secondary-900">{{ t.translate('datasets.generating') }}</p>
            <p class="text-sm text-muted mt-2">{{ t.translate('datasets.generatingHint') }}</p>
          </div>
        }

        <!-- STEP 3: Results -->
        @if (currentStep() === 'results') {
          <div class="max-w-4xl mx-auto space-y-6">

            <!-- Summary -->
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
              <div class="flex items-center justify-between flex-wrap gap-4">
                <div>
                  @if (generationError()) {
                    <h2 class="text-xl font-bold text-red-700">{{ t.translate('datasets.generationFailed') }}</h2>
                    <p class="text-sm text-muted mt-1">{{ t.translate('datasets.noRowsGenerated') }}</p>
                  } @else if (generatedRows().length > 0) {
                    <h2 class="text-xl font-bold text-secondary-900">{{ t.translate('datasets.generated') }}</h2>
                    <p class="text-sm text-muted mt-1">{{ generatedRows().length }} rows created successfully</p>
                  } @else {
                    <h2 class="text-xl font-bold text-secondary-900">{{ t.translate('datasets.noDatasetGenerated') }}</h2>
                    <p class="text-sm text-muted mt-1">{{ t.translate('datasets.emptyGeneration') }}</p>
                  }
                </div>
                <button
                  (click)="resetWizard()"
                  class="px-4 py-2 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-700 font-medium text-sm transition-colors"
                >
                  {{ t.translate('datasets.newDataset') }}
                </button>
              </div>
            </div>

            @if (generationError()) {
              <div class="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                {{ generationError() }}
              </div>
            }

            @if (saveErrorMessage()) {
              <div class="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                {{ saveErrorMessage() }}
              </div>
            }

            <!-- Preview table -->
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-secondary-50 border-b border-secondary-200">
                    <tr>
                      <th class="px-4 py-3 text-left font-semibold text-secondary-700">#</th>
                      <th class="px-4 py-3 text-left font-semibold text-secondary-700">{{ t.translate('datasets.tableInstruction') }}</th>
                      <th class="px-4 py-3 text-left font-semibold text-secondary-700">{{ t.translate('datasets.tableInput') }}</th>
                      <th class="px-4 py-3 text-left font-semibold text-secondary-700">{{ t.translate('datasets.tableOutput') }}</th>
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
            @if (generatedRows().length > 0) {
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6">
              <h3 class="text-lg font-bold text-secondary-900 mb-4">{{ t.translate('datasets.saveOrDownload') }}</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <!-- Download -->
                <button
                  (click)="downloadDataset()"
                  class="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700 font-semibold transition-colors"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {{ t.translate('datasets.downloadJsonl') }}
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
                      {{ t.translate('datasets.saveToRepo') }}
                    </button>
                  } @else {
                    <div class="p-4 rounded-lg border border-green-200 bg-green-50 space-y-3">
                      <input
                        type="text"
                        [(ngModel)]="saveRepoName"
                        [placeholder]="t.translate('datasets.repoNamePlaceholder')"
                        class="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm"
                      />
                      <input
                        type="text"
                        [(ngModel)]="saveRepoDescription"
                        [placeholder]="t.translate('datasets.descriptionPlaceholder')"
                        class="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm"
                      />
                      <div class="flex gap-2">
                        <button
                          (click)="saveToRepo()"
                          [disabled]="isSaving() || !saveRepoName.trim()"
                          class="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white font-medium text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          @if (isSaving()) { {{ t.translate('datasets.saving') }} } @else { {{ t.translate('datasets.save') }} }
                        </button>
                        <button
                          (click)="showSaveForm.set(false)"
                          class="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm"
                        >
                          {{ t.translate('datasets.cancel') }}
                        </button>
                      </div>
                    </div>
                  }

                  @if (saveSuccess()) {
                    <div class="p-3 rounded-lg bg-green-100 border border-green-300 text-green-800 text-sm">
                      {{ t.translate('datasets.savedSuccess').replace('{name}', savedRepoName()) }}
                    </div>
                  }
                </div>
              </div>
            </div>
            }
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
  datasetMode = signal<DatasetMode>('generate');

  // Configuration
  instructions = '';
  numTokens = 1000;
  selectedModel = '';

  // Providers
  isLoadingProviders = signal(false);
  availableProviders = signal<ProviderInfo[]>([]);
  selectedProvider = signal<ProviderInfo | null>(null);

  // Results
  generatedRows = signal<DatasetRow[]>([]);
  generationError = signal('');

  // Save
  showSaveForm = signal(false);
  saveRepoName = '';
  saveRepoDescription = '';
  isSaving = signal(false);
  saveSuccess = signal(false);
  savedRepoName = signal('');
  saveErrorMessage = signal('');

  // Import from HuggingFace
  importDatasetId = '';
  importName = '';
  importSplit = 'train';
  importMaxRows = 1000;
  isImporting = signal(false);
  importError = signal('');

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
    const hasModel = !!(this.selectedModel || this.selectedProvider()?.model);
    return (
      this.instructions.trim().length > 0 &&
      this.selectedProvider() !== null &&
      hasModel &&
      Number.isInteger(this.numTokens) &&
      this.numTokens >= 1
    );
  }

  async generateDataset(): Promise<void> {
    if (!this.canGenerate()) return;

    const provider = this.selectedProvider()!;
    const model = this.selectedModel || provider.model || '';

    this.currentStep.set('generating');
    this.generationError.set('');
    this.saveErrorMessage.set('');

    try {
      const res = await this.datasetsService.generate(
        this.instructions,
        provider.id,
        model,
        this.numTokens
      );
      if (res.success && res.rows) {
        this.generatedRows.set(res.rows);
      } else {
        this.generationError.set(res.error || 'Failed to generate dataset');
        this.generatedRows.set([]);
      }
    } catch (err: any) {
      this.generationError.set(err?.error?.error || err?.message || 'An error occurred while generating the dataset');
      this.generatedRows.set([]);
    }
    this.currentStep.set('results');
  }

  downloadDataset(): void {
    const rows = this.generatedRows();
    if (rows.length === 0) return;

    const jsonl = rows.map(r => JSON.stringify(r)).join('\n');
    const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dataset.jsonl';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  resetWizard(): void {
    this.generationError.set('');
    this.saveErrorMessage.set('');
    this.showSaveForm.set(false);
    this.saveSuccess.set(false);
    this.savedRepoName.set('');
    this.saveRepoName = '';
    this.saveRepoDescription = '';
    this.generatedRows.set([]);
    this.currentStep.set('configure');
  }

  async saveToRepo(): Promise<void> {
    if (!this.saveRepoName.trim() || this.isSaving()) return;

    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.saveErrorMessage.set('');

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
        this.saveErrorMessage.set(res.error || this.t.translate('datasets.saveError'));
      }
    } catch (err: any) {
      this.saveErrorMessage.set(err?.error?.error || err?.message || 'An error occurred while saving');
    } finally {
      this.isSaving.set(false);
    }
  }

  // --- Import from HuggingFace ---

  canImport(): boolean {
    return (
      this.importDatasetId.trim().length > 0 &&
      Number.isInteger(this.importMaxRows) &&
      this.importMaxRows >= 1
    );
  }

  async importFromHuggingFace(): Promise<void> {
    if (!this.canImport() || this.isImporting()) return;

    this.isImporting.set(true);
    this.importError.set('');
    this.currentStep.set('generating');

    try {
      const res = await this.datasetsService.importFromHuggingFace(
        this.importDatasetId.trim(),
        this.importName.trim(),
        this.importSplit.trim() || 'train',
        this.importMaxRows
      );
      if (res.success) {
        this.generatedRows.set([]);
        this.generationError.set('');
        this.saveSuccess.set(true);
        this.savedRepoName.set(res.repoName || this.importDatasetId);
        this.saveErrorMessage.set('');
        this.currentStep.set('results');
      } else {
        this.importError.set(res.error || 'Failed to import dataset');
        this.currentStep.set('configure');
      }
    } catch (err: any) {
      this.importError.set(err?.error?.error || err?.message || 'An error occurred while importing');
      this.currentStep.set('configure');
    } finally {
      this.isImporting.set(false);
    }
  }
}
