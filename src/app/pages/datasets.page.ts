import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../services/translation.service';
import { LlmService, ProviderInfo } from '../services/llm.service';
import { DatasetsService, DatasetRow, DatasetEntry } from '../services/datasets.service';

type WizardStep = 'configure' | 'generating' | 'results';
type DatasetMode = 'generate' | 'import' | 'queue' | 'refine';
type PageView = 'list' | 'create' | 'view';
type QueueItemStatus = 'pending' | 'generating' | 'refining' | 'saving' | 'done' | 'failed';

const GENERATING_PROGRESS_PERCENT = 60;
const SAVING_PROGRESS_PERCENT = 90;
const MAX_QUEUE_DESCRIPTION_LENGTH = 100;

interface QueueItem {
  id: string;
  name: string;
  instructions: string;
  providerId: string;
  providerName: string;
  model: string;
  numTokens: number;
  retryOnFail: boolean;
  status: QueueItemStatus;
  error?: string;
  rowCount?: number;
  type?: 'generate' | 'refine';
  datasetId?: string;
}

@Component({
  selector: 'app-datasets',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-white to-secondary-50">
      <div class="container-custom py-8 sm:py-12">

        <!-- Header -->
        <div class="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div class="flex items-center gap-4">
            <a routerLink="/dashboard"
               class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-700 font-medium text-sm transition-colors">
              {{ t.translate('datasets.back') }}
            </a>
            <div>
              <h1 class="text-3xl font-bold text-secondary-900">{{ t.translate('datasets.title') }}</h1>
              <p class="text-muted text-sm mt-1">{{ t.translate('datasets.subtitle') }}</p>
            </div>
          </div>
          @if (pageView() === 'list') {
            <button (click)="showCreate()" class="px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition-colors">
              + {{ t.translate('datasets.newDataset') }}
            </button>
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
            <button (click)="successMessage.set('')" class="ml-2 text-green-500 hover:text-green-700" aria-label="Dismiss success">✕</button>
          </div>
        }

        <!-- ============================================================ -->
        <!-- LIST VIEW                                                     -->
        <!-- ============================================================ -->
        @if (pageView() === 'list') {

          <!-- Storage usage -->
          @if (storageUsed() > 0) {
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-5 mb-6">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-secondary-700">{{ t.translate('datasets.storageUsed') }}</span>
                <span class="text-sm text-muted">{{ datasetsService.formatBytes(storageUsed()) }}</span>
              </div>
            </div>
          }

          @if (isLoadingDatasets()) {
            <div class="text-center py-16">
              <div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
              <p class="text-muted">{{ t.translate('datasets.loadingDatasets') }}</p>
            </div>
          } @else if (datasets().length === 0) {
            <div class="text-center py-16 bg-white rounded-xl border border-secondary-200 shadow-sm">
              <div class="text-5xl mb-4">📊</div>
              <h3 class="text-lg font-semibold text-secondary-900 mb-2">{{ t.translate('datasets.noDatasets') }}</h3>
              <p class="text-muted text-sm mb-6">{{ t.translate('datasets.noDatasetsHint') }}</p>
              <button (click)="showCreate()" class="px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition-colors">
                + {{ t.translate('datasets.newDataset') }}
              </button>
            </div>
          } @else {
            <!-- Filter tabs -->
            <div class="flex gap-2 mb-4">
              <button (click)="listFilter.set('all')"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                [ngClass]="listFilter() === 'all' ? 'bg-primary-600 text-white' : 'bg-white border border-secondary-200 text-secondary-700 hover:bg-secondary-50'">
                {{ t.translate('datasets.filterAll') }} ({{ datasets().length }})
              </button>
              <button (click)="listFilter.set('active')"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                [ngClass]="listFilter() === 'active' ? 'bg-primary-600 text-white' : 'bg-white border border-secondary-200 text-secondary-700 hover:bg-secondary-50'">
                {{ t.translate('datasets.filterActive') }} ({{ datasets().filter(d => d.status === 'active').length }})
              </button>
              <button (click)="listFilter.set('archived')"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                [ngClass]="listFilter() === 'archived' ? 'bg-primary-600 text-white' : 'bg-white border border-secondary-200 text-secondary-700 hover:bg-secondary-50'">
                {{ t.translate('datasets.filterArchived') }} ({{ datasets().filter(d => d.status === 'archived').length }})
              </button>
            </div>

            <!-- Dataset cards -->
            <div class="space-y-3">
              @for (ds of filteredDatasets(); track ds.id) {
                <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <h3 class="text-lg font-semibold text-secondary-900 truncate">{{ ds.name }}</h3>
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="ds.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-secondary-100 text-secondary-600'">
                          {{ ds.status === 'active' ? t.translate('datasets.statusActive') : t.translate('datasets.statusArchived') }}
                        </span>
                      </div>
                      @if (ds.description) {
                        <p class="text-sm text-muted truncate mb-2">{{ ds.description }}</p>
                      }
                      <div class="flex items-center gap-4 text-xs text-muted">
                        <span>{{ ds.rowCount }} {{ t.translate('datasets.rows') }}</span>
                        <span>~{{ ds.totalTokens }} {{ t.translate('datasets.tokens') }}</span>
                        <span>{{ ds.createdAt | date:'medium' }}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      @if (ds.status === 'active') {
                        <button (click)="viewDataset(ds)"
                          class="px-3 py-1.5 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-700 text-sm transition-colors"
                          title="View & Edit">
                          {{ t.translate('datasets.view') }}
                        </button>
                        <a [href]="datasetsService.getDownloadUrl(ds.id)"
                          class="px-3 py-1.5 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-700 text-sm transition-colors"
                          title="Download">
                          ↓
                        </a>
                        <button (click)="startRefine(ds)"
                          class="px-3 py-1.5 rounded-lg border border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700 text-sm transition-colors"
                          [disabled]="actionInProgress()">
                          {{ t.translate('datasets.refine') }}
                        </button>
                        <button (click)="archiveDataset(ds)"
                          class="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm transition-colors"
                          [disabled]="actionInProgress()">
                          {{ t.translate('datasets.archive') }}
                        </button>
                      } @else {
                        <button (click)="unarchiveDataset(ds)"
                          class="px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 text-sm transition-colors"
                          [disabled]="actionInProgress()">
                          {{ t.translate('datasets.unarchive') }}
                        </button>
                      }
                      <button (click)="confirmDelete(ds)"
                        class="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-sm transition-colors"
                        [disabled]="actionInProgress()">
                        {{ t.translate('datasets.delete') }}
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Delete confirmation modal -->
          @if (datasetToDelete()) {
            <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="datasetToDelete.set(null)">
              <div class="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl" (click)="$event.stopPropagation()">
                <h3 class="text-lg font-bold text-secondary-900 mb-2">{{ t.translate('datasets.confirmDeleteTitle') }}</h3>
                <p class="text-sm text-muted mb-4">
                  {{ t.translate('datasets.confirmDeleteMessage').replace('{name}', datasetToDelete()!.name) }}
                </p>
                <div class="flex gap-3 justify-end">
                  <button (click)="datasetToDelete.set(null)"
                    class="px-4 py-2 rounded-lg border border-secondary-200 bg-white text-secondary-700 text-sm font-medium hover:bg-secondary-50 transition-colors">
                    {{ t.translate('datasets.cancel') }}
                  </button>
                  <button (click)="deleteDataset(datasetToDelete()!)"
                    class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">
                    {{ t.translate('datasets.delete') }}
                  </button>
                </div>
              </div>
            </div>
          }
        }

        <!-- ============================================================ -->
        <!-- VIEW/EDIT VIEW                                                -->
        <!-- ============================================================ -->
        @if (pageView() === 'view') {
          <div class="max-w-5xl mx-auto space-y-6">

            <!-- Back button and title -->
            <div class="flex items-center justify-between flex-wrap gap-4">
              <div class="flex items-center gap-3">
                <button (click)="backToList()"
                  class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-700 font-medium text-sm transition-colors">
                  ← {{ t.translate('datasets.backToList') }}
                </button>
                <h2 class="text-xl font-bold text-secondary-900">
                  {{ t.translate('datasets.viewTitle').replace('{name}', viewingDataset()?.name || '') }}
                </h2>
              </div>
              <div class="flex items-center gap-2">
                @if (viewHasChanges()) {
                  <span class="text-xs text-amber-600 font-medium">{{ t.translate('datasets.unsavedChanges') }}</span>
                  <button (click)="discardViewChanges()"
                    class="px-3 py-1.5 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-700 text-sm transition-colors">
                    {{ t.translate('datasets.discardChanges') }}
                  </button>
                }
                <button (click)="addViewRow()"
                  class="px-3 py-1.5 rounded-lg border border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700 text-sm font-medium transition-colors">
                  + {{ t.translate('datasets.addRow') }}
                </button>
                <button (click)="saveViewChanges()"
                  [disabled]="isSavingView() || !viewHasChanges()"
                  class="px-4 py-1.5 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  @if (isSavingView()) { {{ t.translate('datasets.savingChanges') }} } @else { {{ t.translate('datasets.saveChanges') }} }
                </button>
              </div>
            </div>

            <!-- Dataset info -->
            @if (viewingDataset()) {
              <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-4">
                <div class="flex items-center gap-4 text-sm text-muted">
                  @if (viewingDataset()!.description) {
                    <span>{{ viewingDataset()!.description }}</span>
                    <span>·</span>
                  }
                  <span>{{ viewRows().length }} {{ t.translate('datasets.rows') }}</span>
                  <span>·</span>
                  <span>{{ viewingDataset()!.createdAt | date:'medium' }}</span>
                </div>
              </div>
            }

            @if (isLoadingViewRows()) {
              <div class="text-center py-16">
                <div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
                <p class="text-muted">{{ t.translate('datasets.loadingRows') }}</p>
              </div>
            } @else if (viewRows().length === 0) {
              <div class="text-center py-16 bg-white rounded-xl border border-secondary-200 shadow-sm">
                <div class="text-5xl mb-4">📋</div>
                <p class="text-muted text-sm mb-4">{{ t.translate('datasets.noRows') }}</p>
                <button (click)="addViewRow()"
                  class="px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition-colors">
                  + {{ t.translate('datasets.addRow') }}
                </button>
              </div>
            } @else {
              <!-- Rows table -->
              <div class="bg-white rounded-xl border border-secondary-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead class="bg-secondary-50 border-b border-secondary-200">
                      <tr>
                        <th class="px-3 py-3 text-left font-semibold text-secondary-700 w-10">#</th>
                        <th class="px-3 py-3 text-left font-semibold text-secondary-700">{{ t.translate('datasets.tableInstruction') }}</th>
                        <th class="px-3 py-3 text-left font-semibold text-secondary-700">{{ t.translate('datasets.tableInput') }}</th>
                        <th class="px-3 py-3 text-left font-semibold text-secondary-700">{{ t.translate('datasets.tableOutput') }}</th>
                        <th class="px-3 py-3 text-right font-semibold text-secondary-700 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of viewRows(); track $index) {
                        <tr class="border-b border-secondary-100 align-top">
                          <td class="px-3 py-2 text-muted whitespace-nowrap">{{ $index + 1 }}</td>
                          <td class="px-3 py-2">
                            <textarea
                              [ngModel]="row.instruction"
                              (ngModelChange)="onViewRowChange($index, 'instruction', $event)"
                              rows="2"
                              class="w-full px-2 py-1.5 rounded border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm resize-y transition-colors"
                            ></textarea>
                          </td>
                          <td class="px-3 py-2">
                            <textarea
                              [ngModel]="row.input"
                              (ngModelChange)="onViewRowChange($index, 'input', $event)"
                              rows="2"
                              class="w-full px-2 py-1.5 rounded border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm resize-y transition-colors"
                            ></textarea>
                          </td>
                          <td class="px-3 py-2">
                            <textarea
                              [ngModel]="row.output"
                              (ngModelChange)="onViewRowChange($index, 'output', $event)"
                              rows="2"
                              class="w-full px-2 py-1.5 rounded border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm resize-y transition-colors"
                            ></textarea>
                          </td>
                          <td class="px-3 py-2 text-right">
                            <button (click)="deleteViewRow($index)"
                              class="px-2 py-1 rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs transition-colors"
                              [title]="t.translate('datasets.deleteRow')">
                              ✕
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Bottom actions -->
              <div class="flex items-center justify-between">
                <button (click)="addViewRow()"
                  class="px-3 py-1.5 rounded-lg border border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700 text-sm font-medium transition-colors">
                  + {{ t.translate('datasets.addRow') }}
                </button>
                <div class="flex items-center gap-2">
                  @if (viewSaveSuccess()) {
                    <span class="text-sm text-green-600 font-medium">{{ t.translate('datasets.changesSaved') }}</span>
                  }
                  <button (click)="saveViewChanges()"
                    [disabled]="isSavingView() || !viewHasChanges()"
                    class="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    @if (isSavingView()) { {{ t.translate('datasets.savingChanges') }} } @else { {{ t.translate('datasets.saveChanges') }} }
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- ============================================================ -->
        <!-- CREATE VIEW (Generate / Import wizard)                        -->
        <!-- ============================================================ -->
        @if (pageView() === 'create') {

        <!-- Back to list button -->
        @if (currentStep() === 'configure') {
          <div class="mb-4">
            <button (click)="backToList()"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-700 font-medium text-sm transition-colors">
              ← {{ t.translate('datasets.backToList') }}
            </button>
          </div>
        }

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
              <button
                (click)="datasetMode.set('queue')"
                class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
                [ngClass]="datasetMode() === 'queue' ? 'bg-primary-600 text-white' : 'bg-white text-secondary-700 hover:bg-secondary-50'"
              >
                {{ t.translate('datasets.queueTab') }}
              </button>
              <button
                (click)="datasetMode.set('refine')"
                class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
                [ngClass]="datasetMode() === 'refine' ? 'bg-primary-600 text-white' : 'bg-white text-secondary-700 hover:bg-secondary-50'"
              >
                {{ t.translate('datasets.refineTab') }}
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

              <!-- Retry on fail -->
              <div class="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="retryOnFail"
                  [(ngModel)]="retryOnFail"
                  class="mt-0.5 h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-200"
                />
                <div>
                  <label for="retryOnFail" class="text-sm font-semibold text-secondary-900 cursor-pointer">
                    {{ t.translate('datasets.retryOnFailLabel') }}
                  </label>
                  <p class="text-xs text-muted mt-0.5">{{ t.translate('datasets.retryOnFailHint') }}</p>
                </div>
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
                  {{ t.translate('datasets.datasetNameLabel') }}
                </label>
                <input
                  type="text"
                  [(ngModel)]="importName"
                  placeholder="e.g. alpaca-dataset"
                  class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm transition-colors"
                />
                <p class="text-xs text-muted mt-1">{{ t.translate('datasets.datasetNameHint') }}</p>
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

        <!-- QUEUE MODE -->
        @if (currentStep() === 'configure' && datasetMode() === 'queue') {
          <div class="max-w-3xl mx-auto space-y-6">

            <!-- Queue description -->
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-5">
              <h2 class="text-lg font-bold text-secondary-900 mb-1">{{ t.translate('datasets.queueTitle') }}</h2>
              <p class="text-sm text-muted">{{ t.translate('datasets.queueSubtitle') }}</p>
            </div>

            <!-- Add to queue form -->
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 space-y-4">

              <!-- Dataset name -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">{{ t.translate('datasets.queueJobName') }}</label>
                <input
                  type="text"
                  [(ngModel)]="queueItemName"
                  [placeholder]="t.translate('datasets.queueJobNamePlaceholder')"
                  class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm transition-colors"
                />
              </div>

              <!-- Instructions -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">{{ t.translate('datasets.instructions') }}</label>
                <textarea
                  [(ngModel)]="queueItemInstructions"
                  rows="3"
                  [placeholder]="t.translate('datasets.instructionsPlaceholder')"
                  class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm resize-none transition-colors"
                ></textarea>
              </div>

              <!-- Provider Selection -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">{{ t.translate('datasets.providerLabel') }}</label>
                @if (isLoadingProviders()) {
                  <div class="text-sm text-muted">{{ t.translate('datasets.loadingProviders') }}</div>
                } @else if (availableProviders().length === 0) {
                  <div class="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    {{ t.translate('datasets.noProviders') }}
                  </div>
                } @else {
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    @for (p of availableProviders(); track p.id) {
                      <button
                        (click)="selectQueueProvider(p)"
                        class="text-left p-3 rounded-lg border transition-all"
                        [ngClass]="queueSelectedProvider()?.id === p.id
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

              <!-- Model override for queue -->
              @if (queueSelectedProvider() && queueSelectedProvider()!.models && queueSelectedProvider()!.models!.length > 1) {
                <div>
                  <label class="block text-sm font-semibold text-secondary-900 mb-2">{{ t.translate('datasets.modelLabel') }}</label>
                  <select
                    [(ngModel)]="queueSelectedModel"
                    class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm"
                  >
                    @for (m of queueSelectedProvider()!.models!; track m) {
                      <option [value]="getModelId(m)">{{ getModelLabel(m) }}</option>
                    }
                  </select>
                </div>
              }

              <!-- Number of tokens -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">{{ t.translate('datasets.numTokensLabel') }}</label>
                <input
                  type="number"
                  [(ngModel)]="queueItemTokens"
                  min="1"
                  max="4096"
                  step="1"
                  class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm"
                />
              </div>

              <!-- Retry on fail -->
              <div class="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="queueRetryOnFail"
                  [(ngModel)]="queueItemRetryOnFail"
                  class="mt-0.5 h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-200"
                />
                <div>
                  <label for="queueRetryOnFail" class="text-sm font-semibold text-secondary-900 cursor-pointer">{{ t.translate('datasets.retryOnFailLabel') }}</label>
                  <p class="text-xs text-muted mt-0.5">{{ t.translate('datasets.retryOnFailHint') }}</p>
                </div>
              </div>

              <!-- Add to queue button -->
              <button
                (click)="addToQueue()"
                [disabled]="!canAddToQueue()"
                class="w-full px-4 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ t.translate('datasets.addToQueue') }}
              </button>
            </div>

            <!-- Queue list -->
            @if (queueItems().length > 0) {
              <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 space-y-4">
                <!-- Overall progress -->
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-lg font-bold text-secondary-900">{{ t.translate('datasets.queueTab') }} ({{ queueItems().length }})</h3>
                  <div class="text-sm text-muted">
                    {{ t.translate('datasets.queueProgress').replace('{completed}', queueCompletedCount().toString()).replace('{total}', queueItems().length.toString()) }}
                  </div>
                </div>

                <!-- Overall progress bar -->
                <div class="w-full bg-secondary-100 rounded-full h-2.5">
                  <div
                    class="h-2.5 rounded-full transition-all duration-500"
                    [ngClass]="queueHasErrors() ? 'bg-amber-500' : 'bg-primary-600'"
                    [style.width.%]="queueOverallProgress()"
                  ></div>
                </div>

                <!-- Queue items -->
                <div class="space-y-3">
                  @for (item of queueItems(); track item.id) {
                    <div class="rounded-lg border p-4 transition-colors"
                      [ngClass]="{
                        'border-secondary-200 bg-white': item.status === 'pending',
                        'border-primary-300 bg-primary-50': item.status === 'generating' || item.status === 'saving' || item.status === 'refining',
                        'border-green-300 bg-green-50': item.status === 'done',
                        'border-red-300 bg-red-50': item.status === 'failed'
                      }">
                      <div class="flex items-center justify-between gap-3 mb-2">
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-2">
                            <span class="font-semibold text-sm text-secondary-900 truncate">{{ item.name }}</span>
                            @if (item.type === 'refine') {
                              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{{ t.translate('datasets.refine') }}</span>
                            }
                            <span class="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                              [ngClass]="{
                                'bg-secondary-100 text-secondary-600': item.status === 'pending',
                                'bg-primary-100 text-primary-700': item.status === 'generating' || item.status === 'saving' || item.status === 'refining',
                                'bg-green-100 text-green-700': item.status === 'done',
                                'bg-red-100 text-red-700': item.status === 'failed'
                              }">
                              {{ t.translate('datasets.queueItem' + capitalize(item.status)) }}
                            </span>
                          </div>
                          <p class="text-xs text-muted mt-1 truncate">{{ item.instructions }}</p>
                          <p class="text-xs text-muted mt-0.5">{{ item.providerName }} · {{ item.model }}{{ item.type !== 'refine' ? ' · ' + item.numTokens + ' tokens' : '' }}</p>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                          @if (item.status === 'done' && item.rowCount) {
                            <span class="text-xs text-green-700 font-medium">{{ item.rowCount }} rows</span>
                          }
                          @if (item.status === 'pending' && !isQueueRunning()) {
                            <button (click)="removeFromQueue(item.id)"
                              class="px-2 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs transition-colors">
                              {{ t.translate('datasets.removeFromQueue') }}
                            </button>
                          }
                        </div>
                      </div>

                      <!-- Per-item progress bar -->
                      @if (item.status === 'generating' || item.status === 'saving' || item.status === 'refining') {
                        <div class="w-full bg-primary-100 rounded-full h-1.5 mt-2">
                          <div class="h-1.5 rounded-full bg-primary-500 transition-all duration-700 animate-pulse"
                            [style.width.%]="getQueueItemProgress(item.status)"
                          ></div>
                        </div>
                      }

                      @if (item.status === 'failed' && item.error) {
                        <p class="text-xs text-red-600 mt-2">{{ item.error }}</p>
                      }
                    </div>
                  }
                </div>

                <!-- Queue action buttons -->
                <div class="flex gap-3 pt-2">
                  @if (!isQueueRunning()) {
                    @if (queueHasPending()) {
                      <button (click)="startQueue()"
                        class="flex-1 px-4 py-2.5 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors">
                        {{ t.translate('datasets.startQueue') }}
                      </button>
                    }
                    <button (click)="clearQueue()"
                      class="px-4 py-2.5 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-700 font-medium text-sm transition-colors">
                      {{ t.translate('datasets.clearQueue') }}
                    </button>
                  } @else {
                    <button (click)="stopQueue()"
                      class="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors">
                      {{ t.translate('datasets.stopQueue') }}
                    </button>
                    <span class="flex items-center gap-2 text-sm text-muted">
                      <span class="animate-spin w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full"></span>
                      {{ t.translate('datasets.queueRunning') }}
                    </span>
                  }
                </div>

                @if (queueCompletedCount() === queueItems().length && queueItems().length > 0 && !isQueueRunning()) {
                  <div class="p-3 rounded-lg bg-green-100 border border-green-300 text-green-800 text-sm text-center">
                    {{ t.translate('datasets.queueAllDone') }}
                  </div>
                }
              </div>
            } @else {
              <div class="text-center py-8 bg-white rounded-xl border border-secondary-200 shadow-sm">
                <div class="text-4xl mb-3">📋</div>
                <h3 class="text-base font-semibold text-secondary-900 mb-1">{{ t.translate('datasets.queueEmpty') }}</h3>
                <p class="text-sm text-muted">{{ t.translate('datasets.queueEmptyHint') }}</p>
              </div>
            }
          </div>
        }

        <!-- REFINE MODE -->
        @if (currentStep() === 'configure' && datasetMode() === 'refine') {
          <div class="max-w-3xl mx-auto space-y-6">

            <!-- Refine description -->
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-5">
              <h2 class="text-lg font-bold text-secondary-900 mb-1">{{ t.translate('datasets.refineTitle') }}</h2>
              <p class="text-sm text-muted">{{ t.translate('datasets.refineSubtitle') }}</p>
            </div>

            <!-- Add refine job form -->
            <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 space-y-4">

              <!-- Select dataset to refine -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">{{ t.translate('datasets.refineSelectDataset') }}</label>
                @if (activeDatasets().length === 0) {
                  <div class="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    {{ t.translate('datasets.refineNoDatasets') }}
                  </div>
                } @else {
                  <select
                    [(ngModel)]="refineDatasetId"
                    class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm"
                  >
                    <option value="">{{ t.translate('datasets.refineSelectPlaceholder') }}</option>
                    @for (ds of activeDatasets(); track ds.id) {
                      <option [value]="ds.id">{{ ds.name }} ({{ ds.rowCount }} rows)</option>
                    }
                  </select>
                }
              </div>

              <!-- Refinement instructions (optional) -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">{{ t.translate('datasets.refineInstructions') }}</label>
                <textarea
                  [(ngModel)]="refineInstructions"
                  rows="3"
                  [placeholder]="t.translate('datasets.refineInstructionsPlaceholder')"
                  class="w-full px-4 py-3 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm resize-none transition-colors"
                ></textarea>
                <p class="text-xs text-muted mt-1">{{ t.translate('datasets.refineInstructionsHint') }}</p>
              </div>

              <!-- Provider Selection -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">{{ t.translate('datasets.providerLabel') }}</label>
                @if (isLoadingProviders()) {
                  <div class="text-sm text-muted">{{ t.translate('datasets.loadingProviders') }}</div>
                } @else if (availableProviders().length === 0) {
                  <div class="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    {{ t.translate('datasets.noProviders') }}
                  </div>
                } @else {
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    @for (p of availableProviders(); track p.id) {
                      <button
                        (click)="selectRefineProvider(p)"
                        class="text-left p-3 rounded-lg border transition-all"
                        [ngClass]="refineSelectedProvider()?.id === p.id
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

              <!-- Model override for refine -->
              @if (refineSelectedProvider() && refineSelectedProvider()!.models && refineSelectedProvider()!.models!.length > 1) {
                <div>
                  <label class="block text-sm font-semibold text-secondary-900 mb-2">{{ t.translate('datasets.modelLabel') }}</label>
                  <select
                    [(ngModel)]="refineSelectedModel"
                    class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm"
                  >
                    @for (m of refineSelectedProvider()!.models!; track m) {
                      <option [value]="getModelId(m)">{{ getModelLabel(m) }}</option>
                    }
                  </select>
                </div>
              }

              <!-- Save as name -->
              <div>
                <label class="block text-sm font-semibold text-secondary-900 mb-2">{{ t.translate('datasets.refineSaveName') }}</label>
                <input
                  type="text"
                  [(ngModel)]="refineSaveName"
                  [placeholder]="t.translate('datasets.refineSaveNamePlaceholder')"
                  class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm transition-colors"
                />
                <p class="text-xs text-muted mt-1">{{ t.translate('datasets.refineSaveNameHint') }}</p>
              </div>

              <!-- Add to queue button -->
              <button
                (click)="addRefineToQueue()"
                [disabled]="!canAddRefineToQueue()"
                class="w-full px-4 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ t.translate('datasets.addRefineToQueue') }}
              </button>
            </div>

            <!-- Queue list (shared with generate queue) -->
            @if (queueItems().length > 0) {
              <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 space-y-4">
                <!-- Overall progress -->
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-lg font-bold text-secondary-900">{{ t.translate('datasets.queueTab') }} ({{ queueItems().length }})</h3>
                  <div class="text-sm text-muted">
                    {{ t.translate('datasets.queueProgress').replace('{completed}', queueCompletedCount().toString()).replace('{total}', queueItems().length.toString()) }}
                  </div>
                </div>

                <!-- Overall progress bar -->
                <div class="w-full bg-secondary-100 rounded-full h-2.5">
                  <div
                    class="h-2.5 rounded-full transition-all duration-500"
                    [ngClass]="queueHasErrors() ? 'bg-amber-500' : 'bg-primary-600'"
                    [style.width.%]="queueOverallProgress()"
                  ></div>
                </div>

                <!-- Queue items -->
                <div class="space-y-3">
                  @for (item of queueItems(); track item.id) {
                    <div class="rounded-lg border p-4 transition-colors"
                      [ngClass]="{
                        'border-secondary-200 bg-white': item.status === 'pending',
                        'border-primary-300 bg-primary-50': item.status === 'generating' || item.status === 'saving' || item.status === 'refining',
                        'border-green-300 bg-green-50': item.status === 'done',
                        'border-red-300 bg-red-50': item.status === 'failed'
                      }">
                      <div class="flex items-center justify-between gap-3 mb-2">
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-2">
                            <span class="font-semibold text-sm text-secondary-900 truncate">{{ item.name }}</span>
                            @if (item.type === 'refine') {
                              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{{ t.translate('datasets.refine') }}</span>
                            }
                            <span class="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                              [ngClass]="{
                                'bg-secondary-100 text-secondary-600': item.status === 'pending',
                                'bg-primary-100 text-primary-700': item.status === 'generating' || item.status === 'saving' || item.status === 'refining',
                                'bg-green-100 text-green-700': item.status === 'done',
                                'bg-red-100 text-red-700': item.status === 'failed'
                              }">
                              {{ t.translate('datasets.queueItem' + capitalize(item.status)) }}
                            </span>
                          </div>
                          <p class="text-xs text-muted mt-1 truncate">{{ item.instructions || t.translate('datasets.refineDefaultDescription') }}</p>
                          <p class="text-xs text-muted mt-0.5">{{ item.providerName }} · {{ item.model }}</p>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                          @if (item.status === 'done' && item.rowCount) {
                            <span class="text-xs text-green-700 font-medium">{{ item.rowCount }} rows</span>
                          }
                          @if (item.status === 'pending' && !isQueueRunning()) {
                            <button (click)="removeFromQueue(item.id)"
                              class="px-2 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs transition-colors">
                              {{ t.translate('datasets.removeFromQueue') }}
                            </button>
                          }
                        </div>
                      </div>

                      <!-- Per-item progress bar -->
                      @if (item.status === 'generating' || item.status === 'saving' || item.status === 'refining') {
                        <div class="w-full bg-primary-100 rounded-full h-1.5 mt-2">
                          <div class="h-1.5 rounded-full bg-primary-500 transition-all duration-700 animate-pulse"
                            [style.width.%]="getQueueItemProgress(item.status)"
                          ></div>
                        </div>
                      }

                      @if (item.status === 'failed' && item.error) {
                        <p class="text-xs text-red-600 mt-2">{{ item.error }}</p>
                      }
                    </div>
                  }
                </div>

                <!-- Queue action buttons -->
                <div class="flex gap-3 pt-2">
                  @if (!isQueueRunning()) {
                    @if (queueHasPending()) {
                      <button (click)="startQueue()"
                        class="flex-1 px-4 py-2.5 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors">
                        {{ t.translate('datasets.startQueue') }}
                      </button>
                    }
                    <button (click)="clearQueue()"
                      class="px-4 py-2.5 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-700 font-medium text-sm transition-colors">
                      {{ t.translate('datasets.clearQueue') }}
                    </button>
                  } @else {
                    <button (click)="stopQueue()"
                      class="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors">
                      {{ t.translate('datasets.stopQueue') }}
                    </button>
                    <span class="flex items-center gap-2 text-sm text-muted">
                      <span class="animate-spin w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full"></span>
                      {{ t.translate('datasets.queueRunning') }}
                    </span>
                  }
                </div>

                @if (queueCompletedCount() === queueItems().length && queueItems().length > 0 && !isQueueRunning()) {
                  <div class="p-3 rounded-lg bg-green-100 border border-green-300 text-green-800 text-sm text-center">
                    {{ t.translate('datasets.queueAllDone') }}
                  </div>
                }
              </div>
            }
          </div>
        }
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

                <!-- Save -->
                <div class="space-y-3">
                  @if (!showSaveForm()) {
                    <button
                      (click)="showSaveForm.set(true)"
                      class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 text-green-700 font-semibold transition-colors"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      {{ t.translate('datasets.saveDataset') }}
                    </button>
                  } @else {
                    <div class="p-4 rounded-lg border border-green-200 bg-green-50 space-y-3">
                      <input
                        type="text"
                        [(ngModel)]="saveDatasetName"
                        [placeholder]="t.translate('datasets.datasetNamePlaceholder')"
                        class="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm"
                      />
                      <input
                        type="text"
                        [(ngModel)]="saveDatasetDescription"
                        [placeholder]="t.translate('datasets.descriptionPlaceholder')"
                        class="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm"
                      />
                      <div class="flex gap-2">
                        <button
                          (click)="saveDataset()"
                          [disabled]="isSaving() || !saveDatasetName.trim()"
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
                      {{ t.translate('datasets.savedSuccess').replace('{name}', savedDatasetName()) }}
                    </div>
                  }
                </div>
              </div>
            </div>
            }
          </div>
        }

        } <!-- end create view -->
      </div>
    </div>
  `,
})
export class DatasetsPageComponent implements OnInit {
  protected t = inject(TranslationService);
  private llmService = inject(LlmService);
  datasetsService = inject(DatasetsService);

  // Page view
  pageView = signal<PageView>('list');

  // Dataset list
  datasets = signal<DatasetEntry[]>([]);
  isLoadingDatasets = signal(false);
  storageUsed = signal(0);
  listFilter = signal<'all' | 'active' | 'archived'>('all');
  errorMessage = signal('');
  successMessage = signal('');
  actionInProgress = signal(false);
  datasetToDelete = signal<DatasetEntry | null>(null);

  // Wizard state
  currentStep = signal<WizardStep>('configure');
  datasetMode = signal<DatasetMode>('generate');

  // Configuration
  instructions = '';
  numTokens = 1000;
  selectedModel = '';
  retryOnFail = false;

  // Providers
  isLoadingProviders = signal(false);
  availableProviders = signal<ProviderInfo[]>([]);
  selectedProvider = signal<ProviderInfo | null>(null);

  // Results
  generatedRows = signal<DatasetRow[]>([]);
  generationError = signal('');

  // Save
  showSaveForm = signal(false);
  saveDatasetName = '';
  saveDatasetDescription = '';
  isSaving = signal(false);
  saveSuccess = signal(false);
  savedDatasetName = signal('');
  saveErrorMessage = signal('');

  // Import from HuggingFace
  importDatasetId = '';
  importName = '';
  importSplit = 'train';
  importMaxRows = 1000;
  isImporting = signal(false);
  importError = signal('');

  // Queue
  queueItems = signal<QueueItem[]>([]);
  isQueueRunning = signal(false);
  private queueStopRequested = false;
  queueItemName = '';
  queueItemInstructions = '';
  queueSelectedProvider = signal<ProviderInfo | null>(null);
  queueSelectedModel = '';
  queueItemTokens = 1000;
  queueItemRetryOnFail = false;

  // Refine
  refineDatasetId = '';
  refineInstructions = '';
  refineSelectedProvider = signal<ProviderInfo | null>(null);
  refineSelectedModel = '';
  refineSaveName = '';

  // View/Edit
  viewingDataset = signal<DatasetEntry | null>(null);
  viewRows = signal<DatasetRow[]>([]);
  private viewOriginalRows: DatasetRow[] = [];
  isLoadingViewRows = signal(false);
  isSavingView = signal(false);
  viewSaveSuccess = signal(false);
  viewHasChanges = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadDatasets();
  }

  async loadDatasets(): Promise<void> {
    this.isLoadingDatasets.set(true);
    try {
      const res = await this.datasetsService.listDatasets();
      if (res.success) {
        this.datasets.set(res.datasets || []);
        this.storageUsed.set(res.storageUsed || 0);
      }
    } catch {
      this.errorMessage.set('Failed to load datasets');
    } finally {
      this.isLoadingDatasets.set(false);
    }
  }

  filteredDatasets(): DatasetEntry[] {
    const filter = this.listFilter();
    if (filter === 'all') return this.datasets();
    return this.datasets().filter(d => d.status === filter);
  }

  showCreate(): void {
    this.pageView.set('create');
    this.currentStep.set('configure');
    this.loadProviders();
  }

  backToList(): void {
    this.pageView.set('list');
    this.resetWizard();
    this.loadDatasets();
  }

  async loadProviders(): Promise<void> {
    if (this.availableProviders().length > 0) return;
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
        this.numTokens,
        this.retryOnFail
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
    this.savedDatasetName.set('');
    this.saveDatasetName = '';
    this.saveDatasetDescription = '';
    this.generatedRows.set([]);
    this.currentStep.set('configure');
  }

  async saveDataset(): Promise<void> {
    if (!this.saveDatasetName.trim() || this.isSaving()) return;

    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.saveErrorMessage.set('');

    try {
      const res = await this.datasetsService.save(
        this.saveDatasetName.trim(),
        this.saveDatasetDescription.trim(),
        this.generatedRows()
      );
      if (res.success) {
        this.saveSuccess.set(true);
        this.savedDatasetName.set(res.datasetName || this.saveDatasetName);
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
        this.savedDatasetName.set(res.datasetName || this.importDatasetId);
        this.saveErrorMessage.set('');
        this.currentStep.set('results');
      } else {
        this.importError.set(res.error || 'Failed to import dataset');
        this.currentStep.set('configure');
      }
    } catch (err: unknown) {
      const httpErr = err as { error?: { error?: string }; message?: string };
      this.importError.set(httpErr?.error?.error || httpErr?.message || 'An error occurred while importing');
      this.currentStep.set('configure');
    } finally {
      this.isImporting.set(false);
    }
  }

  // --- Dataset management ---

  confirmDelete(ds: DatasetEntry): void {
    this.datasetToDelete.set(ds);
  }

  async deleteDataset(ds: DatasetEntry): Promise<void> {
    this.datasetToDelete.set(null);
    this.actionInProgress.set(true);
    this.errorMessage.set('');
    try {
      await this.datasetsService.deleteDataset(ds.id);
      this.successMessage.set(`Dataset "${ds.name}" deleted`);
      await this.loadDatasets();
    } catch (err: any) {
      this.errorMessage.set(err?.error?.error || err?.message || 'Failed to delete dataset');
    } finally {
      this.actionInProgress.set(false);
    }
  }

  async archiveDataset(ds: DatasetEntry): Promise<void> {
    this.actionInProgress.set(true);
    this.errorMessage.set('');
    try {
      await this.datasetsService.archiveDataset(ds.id);
      this.successMessage.set(`Dataset "${ds.name}" archived`);
      await this.loadDatasets();
    } catch (err: any) {
      this.errorMessage.set(err?.error?.error || err?.message || 'Failed to archive dataset');
    } finally {
      this.actionInProgress.set(false);
    }
  }

  async unarchiveDataset(ds: DatasetEntry): Promise<void> {
    this.actionInProgress.set(true);
    this.errorMessage.set('');
    try {
      await this.datasetsService.unarchiveDataset(ds.id);
      this.successMessage.set(`Dataset "${ds.name}" unarchived`);
      await this.loadDatasets();
    } catch (err: any) {
      this.errorMessage.set(err?.error?.error || err?.message || 'Failed to unarchive dataset');
    } finally {
      this.actionInProgress.set(false);
    }
  }

  // --- View/Edit methods ---

  async viewDataset(ds: DatasetEntry): Promise<void> {
    this.viewingDataset.set(ds);
    this.viewRows.set([]);
    this.viewOriginalRows = [];
    this.viewHasChanges.set(false);
    this.viewSaveSuccess.set(false);
    this.pageView.set('view');
    this.isLoadingViewRows.set(true);
    try {
      const res = await this.datasetsService.getDatasetRows(ds.id);
      if (res.success) {
        const rows = res.rows || [];
        this.viewRows.set(rows);
        this.viewOriginalRows = rows.map(r => ({ ...r }));
      } else {
        this.errorMessage.set(res.error || 'Failed to load dataset rows');
        this.pageView.set('list');
      }
    } catch (err: any) {
      this.errorMessage.set(err?.error?.error || err?.message || 'Failed to load dataset rows');
      this.pageView.set('list');
    } finally {
      this.isLoadingViewRows.set(false);
    }
  }

  onViewRowChange(index: number, field: 'instruction' | 'input' | 'output', value: string): void {
    this.viewRows.update(rows => {
      const updated = [...rows];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    this.checkViewChanges();
  }

  addViewRow(): void {
    this.viewRows.update(rows => [...rows, { instruction: '', input: '', output: '' }]);
    this.checkViewChanges();
  }

  deleteViewRow(index: number): void {
    this.viewRows.update(rows => rows.filter((_, i) => i !== index));
    this.checkViewChanges();
  }

  discardViewChanges(): void {
    this.viewRows.set(this.viewOriginalRows.map(r => ({ ...r })));
    this.viewHasChanges.set(false);
    this.viewSaveSuccess.set(false);
  }

  async saveViewChanges(): Promise<void> {
    const ds = this.viewingDataset();
    if (!ds || this.isSavingView()) return;

    this.isSavingView.set(true);
    this.viewSaveSuccess.set(false);
    this.errorMessage.set('');

    try {
      const res = await this.datasetsService.updateDatasetRows(ds.id, this.viewRows());
      if (res.success) {
        this.viewOriginalRows = this.viewRows().map(r => ({ ...r }));
        this.viewHasChanges.set(false);
        this.viewSaveSuccess.set(true);
        // Update the viewing dataset metadata
        this.viewingDataset.update(d => d ? { ...d, rowCount: res.rowCount ?? d.rowCount, totalTokens: res.totalTokens ?? d.totalTokens } : d);
      } else {
        this.errorMessage.set(res.error || 'Failed to save changes');
      }
    } catch (err: any) {
      this.errorMessage.set(err?.error?.error || err?.message || 'Failed to save changes');
    } finally {
      this.isSavingView.set(false);
    }
  }

  private checkViewChanges(): void {
    const current = this.viewRows();
    const original = this.viewOriginalRows;
    if (current.length !== original.length) {
      this.viewHasChanges.set(true);
      return;
    }
    for (let i = 0; i < current.length; i++) {
      if (current[i].instruction !== original[i].instruction ||
          current[i].input !== original[i].input ||
          current[i].output !== original[i].output) {
        this.viewHasChanges.set(true);
        return;
      }
    }
    this.viewHasChanges.set(false);
  }

  // --- Refine methods ---

  activeDatasets(): DatasetEntry[] {
    return this.datasets().filter(d => d.status === 'active');
  }

  startRefine(ds: DatasetEntry): void {
    this.pageView.set('create');
    this.currentStep.set('configure');
    this.datasetMode.set('refine');
    this.refineDatasetId = ds.id;
    this.refineSaveName = `${ds.name}-refined`;
    this.loadProviders();
  }

  selectRefineProvider(provider: ProviderInfo): void {
    this.refineSelectedProvider.set(provider);
    const firstModel = provider.models?.[0];
    this.refineSelectedModel = provider.model || (typeof firstModel === 'string' ? firstModel : firstModel?.id ?? '');
  }

  canAddRefineToQueue(): boolean {
    const hasModel = !!(this.refineSelectedModel || this.refineSelectedProvider()?.model);
    return (
      this.refineDatasetId.length > 0 &&
      this.refineSaveName.trim().length > 0 &&
      this.refineSelectedProvider() !== null &&
      hasModel
    );
  }

  addRefineToQueue(): void {
    if (!this.canAddRefineToQueue()) return;
    const provider = this.refineSelectedProvider()!;
    const model = this.refineSelectedModel || provider.model || '';
    const item: QueueItem = {
      id: crypto.randomUUID(),
      name: this.refineSaveName.trim(),
      instructions: this.refineInstructions.trim(),
      providerId: provider.id,
      providerName: provider.name,
      model,
      numTokens: 0,
      retryOnFail: false,
      status: 'pending',
      type: 'refine',
      datasetId: this.refineDatasetId,
    };
    this.queueItems.update(items => [...items, item]);
    this.refineDatasetId = '';
    this.refineInstructions = '';
    this.refineSaveName = '';
  }

  // --- Queue methods ---

  selectQueueProvider(provider: ProviderInfo): void {
    this.queueSelectedProvider.set(provider);
    const firstModel = provider.models?.[0];
    this.queueSelectedModel = provider.model || (typeof firstModel === 'string' ? firstModel : firstModel?.id ?? '');
  }

  canAddToQueue(): boolean {
    const hasModel = !!(this.queueSelectedModel || this.queueSelectedProvider()?.model);
    return (
      this.queueItemName.trim().length > 0 &&
      this.queueItemInstructions.trim().length > 0 &&
      this.queueSelectedProvider() !== null &&
      hasModel &&
      Number.isInteger(this.queueItemTokens) &&
      this.queueItemTokens >= 1
    );
  }

  addToQueue(): void {
    if (!this.canAddToQueue()) return;
    const provider = this.queueSelectedProvider()!;
    const model = this.queueSelectedModel || provider.model || '';
    const item: QueueItem = {
      id: crypto.randomUUID(),
      name: this.queueItemName.trim(),
      instructions: this.queueItemInstructions.trim(),
      providerId: provider.id,
      providerName: provider.name,
      model,
      numTokens: this.queueItemTokens,
      retryOnFail: this.queueItemRetryOnFail,
      status: 'pending',
      type: 'generate',
    };
    this.queueItems.update(items => [...items, item]);
    this.queueItemName = '';
    this.queueItemInstructions = '';
  }

  removeFromQueue(id: string): void {
    this.queueItems.update(items => items.filter(item => item.id !== id));
  }

  clearQueue(): void {
    this.queueItems.set([]);
  }

  queueCompletedCount(): number {
    return this.queueItems().filter(i => i.status === 'done' || i.status === 'failed').length;
  }

  queueOverallProgress(): number {
    const items = this.queueItems();
    if (items.length === 0) return 0;
    const completed = items.filter(i => i.status === 'done' || i.status === 'failed').length;
    const inProgress = items.filter(i => i.status === 'generating' || i.status === 'saving' || i.status === 'refining').length;
    return ((completed + inProgress * 0.5) / items.length) * 100;
  }

  queueHasErrors(): boolean {
    return this.queueItems().some(i => i.status === 'failed');
  }

  queueHasPending(): boolean {
    return this.queueItems().some(i => i.status === 'pending');
  }

  capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  getQueueItemProgress(status: string): number {
    if (status === 'refining') return GENERATING_PROGRESS_PERCENT;
    return status === 'generating' ? GENERATING_PROGRESS_PERCENT : SAVING_PROGRESS_PERCENT;
  }

  async startQueue(): Promise<void> {
    if (this.isQueueRunning()) return;
    this.isQueueRunning.set(true);
    this.queueStopRequested = false;

    const items = this.queueItems();
    for (const item of items) {
      if (this.queueStopRequested) break;
      if (item.status !== 'pending') continue;

      if (item.type === 'refine' && item.datasetId) {
        // Refine existing dataset
        this.updateQueueItem(item.id, { status: 'refining' });
        try {
          const res = await this.datasetsService.refine(
            item.datasetId,
            item.providerId,
            item.model,
            item.instructions
          );

          if (this.queueStopRequested) {
            this.updateQueueItem(item.id, { status: 'pending' });
            break;
          }

          if (!res.success || !res.rows || res.rows.length === 0) {
            this.updateQueueItem(item.id, {
              status: 'failed',
              error: res.error || 'Refinement completed but produced no data rows',
            });
            continue;
          }

          // Save refined dataset
          this.updateQueueItem(item.id, { status: 'saving' });
          try {
            const saveRes = await this.datasetsService.save(
              item.name,
              `Refined dataset: ${item.instructions ? item.instructions.substring(0, MAX_QUEUE_DESCRIPTION_LENGTH) : 'Grammar and quality refinement'}`,
              res.rows
            );
            if (saveRes.success) {
              this.updateQueueItem(item.id, {
                status: 'done',
                rowCount: res.rows.length,
              });
            } else {
              this.updateQueueItem(item.id, {
                status: 'failed',
                error: saveRes.error || 'Failed to save refined dataset',
              });
            }
          } catch (saveErr: any) {
            this.updateQueueItem(item.id, {
              status: 'failed',
              error: saveErr?.error?.error || saveErr?.message || 'Failed to save refined dataset',
            });
          }
        } catch (err: any) {
          if (!this.queueStopRequested) {
            this.updateQueueItem(item.id, {
              status: 'failed',
              error: err?.error?.error || err?.message || 'Refinement failed',
            });
          } else {
            this.updateQueueItem(item.id, { status: 'pending' });
            break;
          }
        }
      } else {
        // Generate new dataset
        this.updateQueueItem(item.id, { status: 'generating' });
        try {
          const res = await this.datasetsService.generate(
            item.instructions,
            item.providerId,
            item.model,
            item.numTokens,
            item.retryOnFail
          );

          if (this.queueStopRequested) {
            this.updateQueueItem(item.id, { status: 'pending' });
            break;
          }

          if (!res.success || !res.rows || res.rows.length === 0) {
            this.updateQueueItem(item.id, {
              status: 'failed',
              error: res.error || 'Dataset generation completed but produced no data rows',
            });
            continue;
          }

          // Save
          this.updateQueueItem(item.id, { status: 'saving' });
          try {
            const saveRes = await this.datasetsService.save(
              item.name,
              `Auto-generated via queue: ${item.instructions.substring(0, MAX_QUEUE_DESCRIPTION_LENGTH)}`,
              res.rows
            );
            if (saveRes.success) {
              this.updateQueueItem(item.id, {
                status: 'done',
                rowCount: res.rows.length,
              });
            } else {
              this.updateQueueItem(item.id, {
                status: 'failed',
                error: saveRes.error || 'Failed to save dataset',
              });
            }
          } catch (saveErr: any) {
            this.updateQueueItem(item.id, {
              status: 'failed',
              error: saveErr?.error?.error || saveErr?.message || 'Failed to save dataset',
            });
          }
        } catch (err: any) {
          if (!this.queueStopRequested) {
            this.updateQueueItem(item.id, {
              status: 'failed',
              error: err?.error?.error || err?.message || 'Generation failed',
            });
          } else {
            this.updateQueueItem(item.id, { status: 'pending' });
            break;
          }
        }
      }
    }

    this.isQueueRunning.set(false);
    // Refresh the datasets list so newly saved datasets appear
    await this.loadDatasets();
  }

  stopQueue(): void {
    this.queueStopRequested = true;
  }

  private updateQueueItem(id: string, update: Partial<QueueItem>): void {
    this.queueItems.update(items =>
      items.map(item => (item.id === id ? { ...item, ...update } : item))
    );
  }
}
