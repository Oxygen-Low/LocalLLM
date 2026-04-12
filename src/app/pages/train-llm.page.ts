import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../services/translation.service';
import { TrainLlmService, type TrainingJob } from '../services/train-llm.service';
import { LlmService } from '../services/llm.service';
import { DatasetsService, type DatasetEntry } from '../services/datasets.service';

type PageView = 'queue' | 'create';

@Component({
  selector: 'app-train-llm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-white to-secondary-50">
      <div class="container-custom py-8 sm:py-12">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <a routerLink="/dashboard" class="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-block">
              {{ t.translate('trainLlm.back') }}
            </a>
            <h1 class="text-3xl sm:text-4xl font-bold text-secondary-900">
              {{ t.translate('trainLlm.title') }}
            </h1>
            <p class="text-muted mt-1">{{ t.translate('trainLlm.subtitle') }}</p>
          </div>
        </div>

        @if (pageView() === 'queue') {
          <!-- Queue View -->
          <div class="space-y-6">
            <!-- Actions -->
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-secondary-900">
                {{ t.translate('trainLlm.queue.title') }}
              </h2>
              <button
                (click)="showCreateView()"
                class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm"
              >
                {{ t.translate('trainLlm.queue.newJob') }}
              </button>
            </div>

            @if (isLoading()) {
              <div class="text-center py-12 text-muted">
                {{ t.translate('trainLlm.queue.loading') }}
              </div>
            } @else if (errorMessage()) {
              <div class="card p-6 border-red-200 bg-red-50">
                <p class="text-red-600 text-sm">{{ errorMessage() }}</p>
              </div>
            } @else if (jobs().length === 0) {
              <div class="card p-12 text-center">
                <div class="text-4xl mb-4">🎓</div>
                <h3 class="text-lg font-semibold text-secondary-900 mb-2">
                  {{ t.translate('trainLlm.queue.empty') }}
                </h3>
                <p class="text-muted text-sm mb-6">
                  {{ t.translate('trainLlm.queue.emptyDesc') }}
                </p>
                <button
                  (click)="showCreateView()"
                  class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm"
                >
                  {{ t.translate('trainLlm.queue.createFirst') }}
                </button>
              </div>
            } @else {
              <!-- Job Cards -->
              @for (job of jobs(); track job.id) {
                <div class="card p-6">
                  <div class="flex items-start justify-between mb-4">
                    <div>
                      <h3 class="text-lg font-semibold text-secondary-900">{{ job.name }}</h3>
                      <p class="text-sm text-muted mt-1">
                        {{ t.translate('trainLlm.job.baseModel') }}: {{ job.baseModelName }}
                        · {{ t.translate('trainLlm.job.mode') }}: {{ job.trainingMode === 'from-scratch' ? t.translate('trainLlm.job.modeFromScratch') : t.translate('trainLlm.job.modeFineTune') }}
                      </p>
                      <p class="text-sm text-muted">
                        {{ t.translate('trainLlm.job.dataset') }}: {{ job.datasetNames.join(', ') || 'Unknown' }}
                        @if (job.postDatasetNames?.length) {
                          · {{ t.translate('trainLlm.job.postDataset') }}: {{ job.postDatasetNames!.join(', ') }}
                        }
                      </p>
                      <p class="text-xs text-muted mt-1">
                        {{ t.translate('trainLlm.job.config') }}: {{ job.epochs }} epochs · LR {{ job.learningRate }} · Batch {{ job.batchSize }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <span [class]="getStatusBadgeClass(job.status)" class="px-3 py-1 rounded-full text-xs font-medium">
                        {{ trainLlmService.getStatusLabel(job.status) }}
                      </span>
                    </div>
                  </div>

                  <!-- Progress Bar -->
                  @if (trainLlmService.isActive(job.status)) {
                    <div class="mb-4">
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-sm text-muted">
                          {{ getPhaseLabel(job.phase) }}
                        </span>
                        <span class="text-sm font-medium text-secondary-900">{{ job.progress }}%</span>
                      </div>
                      <div class="w-full bg-secondary-200 rounded-full h-3">
                        <div
                          class="h-3 rounded-full transition-all duration-500"
                          [class]="job.phase === 'post_training' ? 'bg-purple-500' : 'bg-primary-600'"
                          [style.width.%]="job.progress"
                        ></div>
                      </div>
                    </div>
                  }

                  <!-- Error message -->
                  @if (job.status === 'failed' && job.error) {
                    <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p class="text-sm text-red-600">{{ job.error }}</p>
                    </div>
                  }

                  <!-- Actions -->
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted">
                      {{ t.translate('trainLlm.job.created') }}: {{ formatDate(job.createdAt) }}
                      @if (job.completedAt) {
                        · {{ t.translate('trainLlm.job.completed') }}: {{ formatDate(job.completedAt) }}
                      }
                    </span>
                    <div class="flex gap-2">
                      @if (job.status === 'completed' && job.trainingMode === 'from-scratch') {
                        <button
                          (click)="downloadGguf(job.id)"
                          [disabled]="downloadingJobId() === job.id"
                          class="px-3 py-1.5 text-sm text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
                        >
                          @if (downloadingJobId() === job.id) {
                            {{ t.translate('trainLlm.job.converting') }}
                          } @else {
                            {{ t.translate('trainLlm.job.downloadGguf') }}
                          }
                        </button>
                      }
                      @if (trainLlmService.isActive(job.status)) {
                        <button
                          (click)="cancelJob(job.id)"
                          class="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          {{ t.translate('trainLlm.job.cancel') }}
                        </button>
                      }
                      @if (!trainLlmService.isActive(job.status)) {
                        <button
                          (click)="deleteJob(job.id)"
                          class="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          {{ t.translate('trainLlm.job.delete') }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            }
          </div>
        }

        @if (pageView() === 'create') {
          <!-- Create View -->
          <div class="max-w-2xl">
            <div class="flex items-center gap-4 mb-8">
              <button
                (click)="showQueueView()"
                class="text-sm text-primary-600 hover:text-primary-700"
              >
                {{ t.translate('trainLlm.back') }}
              </button>
              <h2 class="text-xl font-semibold text-secondary-900">
                {{ t.translate('trainLlm.create.title') }}
              </h2>
            </div>

            <div class="card p-6 space-y-6">
              <!-- Training Mode Toggle -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  {{ t.translate('trainLlm.create.trainingMode') }}
                </label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    (click)="formTrainingMode = 'fine-tune'"
                    [class]="formTrainingMode === 'fine-tune'
                      ? 'p-3 rounded-lg border-2 border-primary-500 bg-primary-50 text-left transition-all'
                      : 'p-3 rounded-lg border-2 border-secondary-200 bg-white text-left transition-all hover:border-secondary-300'"
                  >
                    <div class="font-medium text-sm" [class]="formTrainingMode === 'fine-tune' ? 'text-primary-700' : 'text-secondary-700'">
                      🔧 {{ t.translate('trainLlm.create.modeFineTune') }}
                    </div>
                    <p class="text-xs mt-1" [class]="formTrainingMode === 'fine-tune' ? 'text-primary-600' : 'text-muted'">
                      {{ t.translate('trainLlm.create.modeFineTuneDesc') }}
                    </p>
                  </button>
                  <button
                    (click)="formTrainingMode = 'from-scratch'"
                    [class]="formTrainingMode === 'from-scratch'
                      ? 'p-3 rounded-lg border-2 border-primary-500 bg-primary-50 text-left transition-all'
                      : 'p-3 rounded-lg border-2 border-secondary-200 bg-white text-left transition-all hover:border-secondary-300'"
                  >
                    <div class="font-medium text-sm" [class]="formTrainingMode === 'from-scratch' ? 'text-primary-700' : 'text-secondary-700'">
                      🧪 {{ t.translate('trainLlm.create.modeFromScratch') }}
                    </div>
                    <p class="text-xs mt-1" [class]="formTrainingMode === 'from-scratch' ? 'text-primary-600' : 'text-muted'">
                      {{ t.translate('trainLlm.create.modeFromScratchDesc') }}
                    </p>
                  </button>
                </div>
              </div>

              <!-- Job Name -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-1.5">
                  {{ t.translate('trainLlm.create.name') }}
                </label>
                <input
                  type="text"
                  [(ngModel)]="formName"
                  maxlength="100"
                  class="w-full px-3 py-2 border border-secondary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  [placeholder]="t.translate('trainLlm.create.namePlaceholder')"
                />
              </div>

              <!-- Base Model (only for fine-tuning) -->
              @if (formTrainingMode === 'fine-tune') {
                <div>
                  <label class="block text-sm font-medium text-secondary-700 mb-1.5">
                    {{ t.translate('trainLlm.create.baseModel') }}
                  </label>
                  @if (models().length === 0) {
                    <p class="text-sm text-muted">
                      {{ t.translate('trainLlm.create.noModels') }}
                    </p>
                  } @else {
                    <select
                      [(ngModel)]="formBaseModelId"
                      class="w-full px-3 py-2 border border-secondary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    >
                      <option value="">{{ t.translate('trainLlm.create.selectModel') }}</option>
                      @for (model of models(); track model.id) {
                        <option [value]="model.id">{{ model.name }}</option>
                      }
                    </select>
                  }
                </div>
              }

              <!-- Training Datasets (multi-select) -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-1.5">
                  {{ t.translate('trainLlm.create.dataset') }}
                </label>
                @if (datasets().length === 0) {
                  <p class="text-sm text-muted">
                    {{ t.translate('trainLlm.create.noDatasets') }}
                  </p>
                } @else {
                  <div class="max-h-48 overflow-y-auto border border-secondary-200 rounded-lg divide-y divide-secondary-100">
                    @for (ds of datasets(); track ds.id) {
                      <label class="flex items-center gap-3 px-3 py-2 hover:bg-secondary-50 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          [checked]="formDatasetIds.includes(ds.id)"
                          (change)="toggleDataset(ds.id, 'training')"
                          class="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span class="text-secondary-800">{{ ds.name }}</span>
                        <span class="text-xs text-muted ml-auto">({{ ds.rowCount }} rows)</span>
                      </label>
                    }
                  </div>
                }
              </div>

              <!-- Post-Training Datasets (multi-select, optional) -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-1.5">
                  {{ t.translate('trainLlm.create.postDataset') }}
                </label>
                <div class="max-h-48 overflow-y-auto border border-secondary-200 rounded-lg divide-y divide-secondary-100">
                  @for (ds of datasets(); track ds.id) {
                    <label class="flex items-center gap-3 px-3 py-2 hover:bg-secondary-50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        [checked]="formPostDatasetIds.includes(ds.id)"
                        (change)="toggleDataset(ds.id, 'post')"
                        class="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span class="text-secondary-800">{{ ds.name }}</span>
                      <span class="text-xs text-muted ml-auto">({{ ds.rowCount }} rows)</span>
                    </label>
                  }
                </div>
              </div>

              <!-- Training Parameters -->
              <div class="border-t border-secondary-200 pt-4">
                <h3 class="text-sm font-medium text-secondary-700 mb-4">
                  {{ t.translate('trainLlm.create.parameters') }}
                </h3>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs text-muted mb-1">
                      {{ t.translate('trainLlm.create.epochs') }}
                    </label>
                    <input
                      type="number"
                      [(ngModel)]="formEpochs"
                      min="1"
                      max="100"
                      class="w-full px-3 py-2 border border-secondary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p class="text-xs text-muted mt-1">{{ t.translate('trainLlm.create.epochsDesc') }}</p>
                  </div>
                  <div>
                    <label class="block text-xs text-muted mb-1">
                      {{ t.translate('trainLlm.create.learningRate') }}
                    </label>
                    <input
                      type="number"
                      [(ngModel)]="formLearningRate"
                      step="0.00001"
                      min="0.000001"
                      max="0.01"
                      class="w-full px-3 py-2 border border-secondary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p class="text-xs text-muted mt-1">{{ t.translate('trainLlm.create.learningRateDesc') }}</p>
                  </div>
                  <div>
                    <label class="block text-xs text-muted mb-1">
                      {{ t.translate('trainLlm.create.batchSize') }}
                    </label>
                    <input
                      type="number"
                      [(ngModel)]="formBatchSize"
                      min="1"
                      max="64"
                      class="w-full px-3 py-2 border border-secondary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p class="text-xs text-muted mt-1">{{ t.translate('trainLlm.create.batchSizeDesc') }}</p>
                  </div>
                </div>
              </div>

              <!-- Error -->
              @if (createError()) {
                <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p class="text-sm text-red-600">{{ createError() }}</p>
                </div>
              }

              <!-- Submit -->
              <div class="flex items-center justify-end gap-3 pt-2">
                <button
                  (click)="showQueueView()"
                  class="px-4 py-2 text-sm text-secondary-600 border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors"
                >
                  {{ t.translate('trainLlm.create.cancel') }}
                </button>
                <button
                  (click)="createJob()"
                  [disabled]="isCreating()"
                  class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  @if (isCreating()) {
                    {{ t.translate('trainLlm.create.creating') }}
                  } @else {
                    {{ t.translate('trainLlm.create.submit') }}
                  }
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class TrainLlmPageComponent implements OnInit, OnDestroy {
  protected t = inject(TranslationService);
  protected trainLlmService = inject(TrainLlmService);
  private llmService = inject(LlmService);
  private datasetsService = inject(DatasetsService);

  pageView = signal<PageView>('queue');
  jobs = signal<TrainingJob[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');

  models = signal<{ id: string; name: string }[]>([]);
  datasets = signal<DatasetEntry[]>([]);

  // Create form
  formName = '';
  formTrainingMode: 'fine-tune' | 'from-scratch' = 'fine-tune';
  formBaseModelId = '';
  formDatasetIds: string[] = [];
  formPostDatasetIds: string[] = [];
  formEpochs = 3;
  formLearningRate = 0.00002;
  formBatchSize = 4;
  isCreating = signal(false);
  createError = signal('');
  downloadingJobId = signal<string | null>(null);

  private static readonly POLL_INTERVAL_MS = 5000;
  private jobPollingInterval: ReturnType<typeof setInterval> | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadJobs();
    this.startPolling();
    this.loadModelsAndDatasets();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  showCreateView(): void {
    this.createError.set('');
    this.pageView.set('create');
  }

  showQueueView(): void {
    this.pageView.set('queue');
    this.loadJobs();
  }

  async loadJobs(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      const res = await this.trainLlmService.listJobs();
      if (res.success) {
        this.jobs.set(res.jobs);
      } else {
        this.errorMessage.set(res.error || 'Failed to load training jobs');
      }
    } catch {
      this.errorMessage.set('Failed to load training jobs');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadModelsAndDatasets(): Promise<void> {
    try {
      const [localModels, datasetRes] = await Promise.all([
        this.llmService.getLocalModels(),
        this.datasetsService.listDatasets(),
      ]);
      this.models.set(localModels.map(m => ({ id: m.id, name: m.name })));
      if (datasetRes.success) {
        this.datasets.set(datasetRes.datasets.filter(d => d.status === 'active'));
      }
    } catch (err) {
      console.error('Failed to load models/datasets:', err);
    }
  }

  toggleDataset(id: string, type: 'training' | 'post'): void {
    const arr = type === 'training' ? this.formDatasetIds : this.formPostDatasetIds;
    const idx = arr.indexOf(id);
    if (idx >= 0) {
      arr.splice(idx, 1);
    } else {
      arr.push(id);
    }
  }

  async createJob(): Promise<void> {
    this.createError.set('');

    if (!this.formName.trim()) {
      this.createError.set('Please enter a name for the training job');
      return;
    }
    if (this.formTrainingMode === 'fine-tune' && !this.formBaseModelId) {
      this.createError.set('Please select a base model');
      return;
    }
    if (!this.formDatasetIds.length) {
      this.createError.set('Please select at least one training dataset');
      return;
    }

    this.isCreating.set(true);
    try {
      const res = await this.trainLlmService.createJob({
        name: this.formName.trim(),
        trainingMode: this.formTrainingMode,
        baseModelId: this.formTrainingMode === 'fine-tune' ? this.formBaseModelId : undefined,
        datasetIds: this.formDatasetIds,
        postDatasetIds: this.formPostDatasetIds.length ? this.formPostDatasetIds : undefined,
        epochs: this.formEpochs,
        learningRate: this.formLearningRate,
        batchSize: this.formBatchSize,
      });

      if (res.success) {
        this.resetForm();
        this.pageView.set('queue');
        await this.loadJobs();
      } else {
        this.createError.set(res.error || 'Failed to create training job');
      }
    } catch (err: unknown) {
      const httpErr = err as { error?: { error?: string } };
      this.createError.set(httpErr?.error?.error || 'Failed to create training job');
    } finally {
      this.isCreating.set(false);
    }
  }

  async cancelJob(id: string): Promise<void> {
    try {
      await this.trainLlmService.cancelJob(id);
      await this.loadJobs();
    } catch (err) {
      console.error('Failed to cancel job:', err);
    }
  }

  async deleteJob(id: string): Promise<void> {
    try {
      await this.trainLlmService.deleteJob(id);
      await this.loadJobs();
    } catch (err) {
      console.error('Failed to delete job:', err);
    }
  }

  downloadGguf(id: string): void {
    this.downloadingJobId.set(id);
    this.trainLlmService.downloadGguf(id, () => {
      this.downloadingJobId.set(null);
    });
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      queued: 'bg-yellow-100 text-yellow-700',
      starting: 'bg-blue-100 text-blue-700',
      loading_model: 'bg-blue-100 text-blue-700',
      loading_dataset: 'bg-blue-100 text-blue-700',
      training: 'bg-primary-100 text-primary-700',
      post_training: 'bg-purple-100 text-purple-700',
      saving: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      cancelled: 'bg-secondary-100 text-secondary-700',
    };
    return classes[status] || 'bg-secondary-100 text-secondary-700';
  }

  getPhaseLabel(phase: string): string {
    const labels: Record<string, string> = {
      training: 'Training in progress...',
      post_training: 'Post-training in progress...',
      done: 'Complete',
    };
    return labels[phase] || phase;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private startPolling(): void {
    this.jobPollingInterval = setInterval(async () => {
      const currentJobs = this.jobs();
      const hasActive = currentJobs.some(j => this.trainLlmService.isActive(j.status));
      if (hasActive && this.pageView() === 'queue') {
        await this.loadJobs();
      }
    }, TrainLlmPageComponent.POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.jobPollingInterval) {
      clearInterval(this.jobPollingInterval);
      this.jobPollingInterval = null;
    }
  }

  private resetForm(): void {
    this.formName = '';
    this.formTrainingMode = 'fine-tune';
    this.formBaseModelId = '';
    this.formDatasetIds = [];
    this.formPostDatasetIds = [];
    this.formEpochs = 3;
    this.formLearningRate = 0.00002;
    this.formBatchSize = 4;
  }
}
