import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BooksService, type BookSpace, type WritingTask, type Evaluation, type Book } from '../services/books.service';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-books',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-[calc(100vh-64px)] bg-secondary-50 text-secondary-900 font-sans p-4 md:p-8">
      <div class="max-w-6xl mx-auto">

        <!-- Header -->
        <div class="flex items-center justify-between mb-8 pb-4 border-b border-secondary-200">
          <div>
            <h1 class="text-3xl font-bold text-secondary-900 flex items-center gap-3">
              <span class="text-4xl">📚</span> {{ t.translate('books.title') }}
            </h1>
            <p class="text-muted text-sm mt-1">{{ t.translate('books.subtitle') }}</p>
          </div>
          <div class="flex gap-3">
            <button type="button" (click)="viewMode.set('list')" class="px-4 py-2 rounded-lg border border-secondary-300 bg-white hover:bg-secondary-50 transition-colors text-sm font-medium">{{ t.translate('books.nav.library') }}</button>
            <button type="button" (click)="viewMode.set('create-space')" class="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium shadow-sm">{{ t.translate('books.nav.newSpace') }}</button>
          </div>
        </div>

        @if (error()) {
          <div class="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex justify-between items-center animate-fade-in duration-300">
            <span class="flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {{ error() }}
            </span>
            <button type="button" (click)="error.set(null)" aria-label="Close error" class="hover:text-red-900">✕</button>
          </div>
        }

        <!-- View: List Spaces -->
        @if (viewMode() === 'list') {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (space of spaces(); track space.id) {
              <div class="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden hover:shadow-md transition-shadow group">
                <div class="p-6">
                  <div class="flex justify-between items-start mb-4">
                    <h3 class="text-xl font-bold text-secondary-900 truncate pr-4">{{ space.title }}</h3>
                    <button type="button" (click)="deleteSpace(space.id)" [attr.aria-label]="t.translate('books.list.deleteSpace')" class="text-secondary-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                  </div>
                  <p class="text-sm text-muted line-clamp-2 mb-4 h-10">{{ space.description || t.translate('books.list.noDescription') }}</p>
                  @if (space.inspiration) {
                    <div class="flex items-center gap-2 text-xs text-primary-600 font-medium bg-primary-50 px-3 py-1.5 rounded-full w-fit mb-6">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      {{ space.inspiration }}
                    </div>
                  } @else {
                    <div class="h-8 mb-6"></div>
                  }
                  <div class="flex items-center justify-between pt-4 border-t border-secondary-100">
                    <span class="text-xs text-muted flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.246.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      {{ space.books.length }} {{ t.translate('books.list.booksCount') }}
                    </span>
                    <button type="button" (click)="openSpace(space)" class="text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors">{{ t.translate('books.list.enterSpace') }} →</button>
                  </div>
                </div>
              </div>
            }
            @if (spaces().length === 0) {
              <div class="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-secondary-300">
                <div class="text-5xl mb-4">🖋️</div>
                <h3 class="text-lg font-bold text-secondary-900">{{ t.translate('books.list.empty.title') }}</h3>
                <p class="text-muted mb-6">{{ t.translate('books.list.empty.subtitle') }}</p>
                <button type="button" (click)="viewMode.set('create-space')" class="px-6 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 shadow-sm transition-all">{{ t.translate('books.list.empty.button') }}</button>
              </div>
            }
          </div>
        }

        <!-- View: Create Space -->
        @if (viewMode() === 'create-space') {
          <div class="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-secondary-200 p-8">
            <h2 class="text-2xl font-bold text-secondary-900 mb-6">{{ t.translate('books.create.title') }}</h2>
            <div class="space-y-6">
              <div>
                <label for="create-space-title" class="block text-sm font-bold text-secondary-700 mb-2">{{ t.translate('books.create.name') }}</label>
                <input id="create-space-title" [(ngModel)]="newSpaceData.title" type="text" [placeholder]="t.translate('books.create.namePlaceholder')" class="w-full px-4 py-3 rounded-xl border border-secondary-300 focus:ring-2 focus:ring-primary-500 outline-none">
              </div>
              <div>
                <label for="create-space-inspiration" class="block text-sm font-bold text-secondary-700 mb-2">{{ t.translate('books.create.inspiration') }}</label>
                <input id="create-space-inspiration" [(ngModel)]="newSpaceData.inspiration" type="text" [placeholder]="t.translate('books.create.inspirationPlaceholder')" class="w-full px-4 py-3 rounded-xl border border-secondary-300 focus:ring-2 focus:ring-primary-500 outline-none">
                <p class="text-[11px] text-muted mt-2 px-1">{{ t.translate('books.create.inspirationHint') }}</p>
              </div>
              <div>
                <label for="create-space-description" class="block text-sm font-bold text-secondary-700 mb-2">{{ t.translate('books.create.description') }}</label>
                <textarea id="create-space-description" [(ngModel)]="newSpaceData.description" rows="4" [placeholder]="t.translate('books.create.descriptionPlaceholder')" class="w-full px-4 py-3 rounded-xl border border-secondary-300 focus:ring-2 focus:ring-primary-500 outline-none resize-none"></textarea>
              </div>
              <div class="flex gap-4 pt-4">
                <button type="button" (click)="viewMode.set('list')" class="flex-1 px-6 py-3 rounded-xl border border-secondary-300 font-bold hover:bg-secondary-50 transition-colors">{{ t.translate('books.create.cancel') }}</button>
                <button type="button" (click)="createSpace()" [disabled]="!newSpaceData.title.trim() || isProcessing()" class="flex-1 px-6 py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 shadow-md transition-all disabled:opacity-50">
                  @if (isProcessing()) { <span class="animate-pulse">{{ t.translate('books.create.creating') }}</span> } @else { {{ t.translate('books.create.submit') }} }
                </button>
              </div>
            </div>
          </div>
        }

        <!-- View: Space Detail -->
        @if (viewMode() === 'space-detail' && currentSpace()) {
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in duration-500">
            <!-- Left: Space Info & Books -->
            <div class="lg:col-span-1 space-y-6">
              <div class="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6">
                <h2 class="text-2xl font-bold text-secondary-900 mb-2">{{ currentSpace()?.title }}</h2>
                @if (currentSpace()?.inspiration) {
                  <p class="text-sm font-medium text-primary-600 mb-4 flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    {{ t.translate('books.detail.inspiredBy') }} {{ currentSpace()?.inspiration }}
                  </p>
                }
                <p class="text-sm text-muted mb-6 leading-relaxed">{{ currentSpace()?.description || t.translate('books.detail.noDescription') }}</p>

                <div class="pt-6 border-t border-secondary-100">
                  <h3 class="text-sm font-bold text-secondary-700 mb-4 uppercase tracking-wider">{{ t.translate('books.detail.referenceBooks') }}</h3>
                  <div class="space-y-3 mb-6">
                    @for (book of currentSpace()?.books; track book.id) {
                      <div class="flex items-center justify-between p-3 bg-secondary-50 rounded-lg border border-secondary-200 group">
                        <span class="text-sm font-medium truncate pr-2 flex items-center gap-2">
                          <svg class="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                          {{ book.name }}
                        </span>
                        <button type="button" (click)="deleteBook(book.id)" [attr.aria-label]="t.translate('books.detail.deleteBook')" class="text-secondary-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                      </div>
                    }
                    @if (currentSpace()?.books?.length === 0) {
                      <p class="text-xs italic text-muted text-center py-2">{{ t.translate('books.detail.noBooks') }}</p>
                    }
                  </div>

                  <label class="block">
                    <span class="sr-only">{{ t.translate('books.detail.uploadBook') }}</span>
                    <input type="file" (change)="onFileSelected($event)" accept=".txt,.md" class="block w-full text-xs text-secondary-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"/>
                  </label>
                  <p class="text-[10px] text-muted mt-2">{{ t.translate('books.detail.uploadHint') }}</p>
                </div>
              </div>
            </div>

            <!-- Right: Practice Session Setup -->
            <div class="lg:col-span-2">
              <div class="bg-white rounded-2xl shadow-sm border border-secondary-200 p-8">
                <h2 class="text-2xl font-bold text-secondary-900 mb-2">{{ t.translate('books.practice.title') }}</h2>
                <p class="text-muted mb-8">{{ t.translate('books.practice.subtitle') }}</p>

                <div class="space-y-8">
                  <div>
                    <label class="block text-sm font-bold text-secondary-700 mb-4">{{ t.translate('books.practice.question') }}</label>
                    <div class="grid grid-cols-3 gap-4">
                      @for (type of ['book', 'paragraph', 'sentence']; track type) {
                        <button type="button" (click)="practiceType.set(type)" [class.border-primary-600]="practiceType() === type" [class.bg-primary-50]="practiceType() === type" [class.text-primary-700]="practiceType() === type" class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-secondary-100 hover:border-primary-200 transition-all text-center">
                          <span class="text-2xl">@if(type==='book'){📖}@else if(type==='paragraph'){📝}@else{🖋️}</span>
                          <span class="text-sm font-bold capitalize">{{ t.translate('books.practice.types.' + type) }}</span>
                        </button>
                      }
                    </div>
                  </div>

                  <div class="flex items-center justify-between p-4 bg-secondary-50 rounded-xl border border-secondary-200">
                    <div>
                      <h4 class="text-sm font-bold text-secondary-900">{{ t.translate('books.practice.sampleTitle') }}</h4>
                      <p class="text-xs text-muted">{{ t.translate('books.practice.sampleSubtitle') }}</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" [(ngModel)]="generateSample" class="sr-only peer">
                      <div class="w-11 h-6 bg-secondary-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <button type="button" (click)="startPractice()" [disabled]="isProcessing()" class="w-full py-4 rounded-xl bg-secondary-900 text-white font-bold hover:bg-black shadow-lg transition-all flex items-center justify-center gap-3">
                    @if (isProcessing()) {
                      <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      {{ t.translate('books.practice.creating') }}
                    } @else {
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      {{ t.translate('books.practice.submit') }}
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- View: Writing Interface -->
        @if (viewMode() === 'writing' && currentTask()) {
          <div class="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade-in duration-500">
            <!-- Task Sidebar -->
            <div class="lg:col-span-1 space-y-6">
              <div class="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6">
                <h3 class="text-sm font-bold text-secondary-500 uppercase tracking-widest mb-4">{{ t.translate('books.writing.characters') }}</h3>
                <div class="space-y-4">
                  @for (char of currentTask()?.characters; track char.name) {
                    <div class="p-4 rounded-xl bg-secondary-50 border border-secondary-100">
                      <h4 class="font-bold text-secondary-900 mb-1">{{ char.name }}</h4>
                      <p class="text-xs text-muted leading-relaxed">{{ char.description }}</p>
                    </div>
                  }
                </div>
              </div>
              <div class="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6">
                <h3 class="text-sm font-bold text-secondary-500 uppercase tracking-widest mb-2">{{ t.translate('books.writing.setting') }}</h3>
                <p class="text-sm text-secondary-900 italic mb-6">"{{ currentTask()?.setting }}"</p>

                <h3 class="text-sm font-bold text-secondary-500 uppercase tracking-widest mb-2">{{ t.translate('books.writing.task') }}</h3>
                <p class="text-sm font-bold text-primary-700">{{ currentTask()?.task }}</p>
              </div>
            </div>

            <!-- Editor -->
            <div class="lg:col-span-3 flex flex-col gap-6">
              <div class="bg-white rounded-2xl shadow-xl border border-secondary-200 overflow-hidden flex flex-col min-h-[600px]">
                <div class="px-8 py-4 bg-secondary-50 border-b border-secondary-100 flex justify-between items-center">
                  <span class="text-xs font-bold text-secondary-500 uppercase tracking-widest">{{ t.translate('books.writing.editor') }}</span>
                  <span class="text-xs text-muted">{{ writtenContent.length }} {{ t.translate('books.writing.charsCount') }}</span>
                </div>

                <div class="flex-1 p-8">
                  @if (currentTask()?.sample) {
                    <div class="mb-6 p-6 bg-primary-50 rounded-xl border border-primary-100 relative">
                      <span class="absolute -top-3 left-4 px-2 bg-white text-[10px] font-bold text-primary-600 uppercase tracking-widest border border-primary-100 rounded">{{ t.translate('books.writing.sampleStart') }}</span>
                      <p class="text-lg text-secondary-800 italic leading-relaxed">{{ currentTask()?.sample }}</p>
                    </div>
                  }
                  <textarea [(ngModel)]="writtenContent" [placeholder]="t.translate('books.writing.placeholder')" class="w-full h-full min-h-[400px] text-lg leading-relaxed text-secondary-900 bg-transparent outline-none resize-none placeholder:text-secondary-300"></textarea>
                </div>

                <div class="p-6 bg-secondary-50 border-t border-secondary-100 flex justify-end">
                  <button type="button" (click)="submitForEvaluation()" [disabled]="!writtenContent.trim() || isProcessing()" class="px-8 py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 shadow-lg transition-all flex items-center gap-2">
                    @if (isProcessing()) {
                      <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      {{ t.translate('books.writing.evaluating') }}
                    } @else {
                      {{ t.translate('books.writing.submit') }}
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- View: Evaluation -->
        @if (viewMode() === 'evaluation' && currentEvaluation()) {
          <div class="max-w-4xl mx-auto space-y-8 animate-fade-in duration-700">
            <!-- Overall Feedback -->
            <div class="bg-white rounded-2xl shadow-xl border border-secondary-200 overflow-hidden">
              <div class="p-8">
                <div class="flex items-center gap-4 mb-6">
                  <div class="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-2xl font-bold">✓</div>
                  <div>
                    <h2 class="text-2xl font-bold text-secondary-900">{{ t.translate('books.evaluation.title') }}</h2>
                    <p class="text-sm text-muted">{{ t.translate('books.evaluation.subtitle') }}</p>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 class="text-sm font-bold text-secondary-500 uppercase tracking-widest mb-3">{{ t.translate('books.evaluation.overall') }}</h3>
                    <div class="p-6 bg-secondary-50 rounded-2xl border border-secondary-100 text-secondary-800 leading-relaxed">
                      {{ currentEvaluation()?.overallFeedback }}
                    </div>
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-secondary-500 uppercase tracking-widest mb-3">{{ t.translate('books.evaluation.suggestions') }}</h3>
                    <div class="p-6 bg-primary-50 rounded-2xl border border-primary-100 text-secondary-800 leading-relaxed">
                      {{ currentEvaluation()?.suggestions }}
                    </div>
                  </div>
                </div>

                <h3 class="text-sm font-bold text-secondary-500 uppercase tracking-widest mb-4">{{ t.translate('books.evaluation.analysis') }}</h3>
                <div class="space-y-4">
                  @for (comment of currentEvaluation()?.inlineComments; track $index) {
                    <div class="flex gap-4 p-4 rounded-xl border border-secondary-100 hover:bg-secondary-50 transition-colors group">
                      <div class="flex-shrink-0 pt-1">
                        @if(comment.type === 'word'){<span class="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">{{ t.translate('books.evaluation.types.word') }}</span>}
                        @else if(comment.type === 'sentence'){<span class="px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold">{{ t.translate('books.evaluation.types.sentence') }}</span>}
                        @else {<span class="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold">{{ t.translate('books.evaluation.types.paragraph') }}</span>}
                      </div>
                      <div>
                        <p class="text-sm font-bold text-secondary-900 mb-1 group-hover:text-primary-600">"{{ comment.text }}"</p>
                        <p class="text-sm text-muted">{{ comment.comment }}</p>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div class="px-8 py-6 bg-secondary-50 border-t border-secondary-100 flex justify-between items-center">
                <button type="button" (click)="viewMode.set('writing')" class="text-sm font-bold text-secondary-600 hover:text-secondary-900 transition-colors flex items-center gap-2">
                  ← {{ t.translate('books.evaluation.back') }}
                </button>
                <button type="button" (click)="resetPractice()" class="px-8 py-3 rounded-xl bg-secondary-900 text-white font-bold hover:bg-black shadow-lg transition-all">
                  {{ t.translate('books.evaluation.finish') }}
                </button>
              </div>
            </div>
          </div>
        }

      </div>
    </div>
  `,
})
export class BooksPageComponent implements OnInit {
  protected t = inject(TranslationService);
  private booksService = inject(BooksService);

  viewMode = signal<'list' | 'create-space' | 'space-detail' | 'writing' | 'evaluation'>('list');
  spaces = signal<BookSpace[]>([]);
  currentSpace = signal<BookSpace | null>(null);
  error = signal<string | null>(null);
  isProcessing = signal(false);

  // New Space Data
  newSpaceData = {
    title: '',
    inspiration: '',
    description: ''
  };

  // Practice Setup
  practiceType = signal<any>('paragraph');
  generateSample = true;

  // Writing Session
  currentTask = signal<WritingTask | null>(null);
  writtenContent = '';
  currentEvaluation = signal<Evaluation | null>(null);

  async ngOnInit() {
    await this.loadSpaces();
  }

  async loadSpaces() {
    try {
      const data = await this.booksService.listSpaces();
      this.spaces.set(data);
    } catch (e) {
      this.error.set(this.t.translate('books.errors.loadSpaces'));
    }
  }

  async createSpace() {
    if (!this.newSpaceData.title.trim()) return;
    this.isProcessing.set(true);
    this.error.set(null);
    try {
      const space = await this.booksService.createSpace(this.newSpaceData);
      await this.loadSpaces();
      this.openSpace(space);
      this.newSpaceData = { title: '', inspiration: '', description: '' };
    } catch (e) {
      this.error.set(this.t.translate('books.errors.createSpace'));
    } finally {
      this.isProcessing.set(false);
    }
  }

  async deleteSpace(id: string) {
    if (!confirm(this.t.translate('books.confirm.deleteSpace'))) return;
    try {
      await this.booksService.deleteSpace(id);
      await this.loadSpaces();
      if (this.currentSpace()?.id === id) this.viewMode.set('list');
    } catch (e) {
      this.error.set(this.t.translate('books.errors.deleteSpace'));
    }
  }

  openSpace(space: BookSpace) {
    this.currentSpace.set(space);
    this.viewMode.set('space-detail');
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file || !this.currentSpace()) return;

    if (file.size > 10 * 1024 * 1024) {
      this.error.set(this.t.translate('books.errors.fileTooLarge'));
      event.target.value = '';
      return;
    }

    this.error.set(null);
    try {
      await this.booksService.uploadBook(this.currentSpace()!.id, file);
      const updated = await this.booksService.getSpace(this.currentSpace()!.id);
      this.currentSpace.set(updated);
      await this.loadSpaces();
    } catch (e: any) {
      const msg = e.error?.error === 'InvalidFileType' ? 'books.errors.invalidFileType' :
                  e.error?.error === 'UploadTooLarge' ? 'books.errors.fileTooLarge' :
                  'books.errors.uploadBook';
      this.error.set(this.t.translate(msg));
    } finally {
      (event.target as HTMLInputElement).value = '';
    }
  }

  async deleteBook(bookId: string) {
    if (!confirm(this.t.translate('books.confirm.deleteBook'))) return;
    try {
      await this.booksService.deleteBook(this.currentSpace()!.id, bookId);
      const updated = await this.booksService.getSpace(this.currentSpace()!.id);
      this.currentSpace.set(updated);
      await this.loadSpaces();
    } catch (e) {
      this.error.set(this.t.translate('books.errors.deleteBook'));
    }
  }

  async startPractice() {
    if (!this.currentSpace()) return;
    this.isProcessing.set(true);
    this.error.set(null);
    try {
      const task = await this.booksService.generateTask(this.currentSpace()!.id, this.practiceType(), this.generateSample);
      this.currentTask.set(task);
      this.writtenContent = '';
      this.viewMode.set('writing');
    } catch (e) {
      this.error.set(this.t.translate('books.errors.generateTask'));
    } finally {
      this.isProcessing.set(false);
    }
  }

  async submitForEvaluation() {
    if (!this.writtenContent.trim() || !this.currentSpace() || !this.currentTask()) return;
    this.isProcessing.set(true);
    this.error.set(null);
    try {
      const evaluation = await this.booksService.evaluateScene(this.currentSpace()!.id, this.currentTask()!, this.writtenContent);
      this.currentEvaluation.set(evaluation);
      this.viewMode.set('evaluation');
    } catch (e) {
      this.error.set(this.t.translate('books.errors.evaluate'));
    } finally {
      this.isProcessing.set(false);
    }
  }

  resetPractice() {
    this.currentTask.set(null);
    this.writtenContent = '';
    this.currentEvaluation.set(null);
    this.viewMode.set('space-detail');
  }
}
