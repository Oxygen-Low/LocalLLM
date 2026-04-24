import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LocalFixService, type LocalFixSession, type LocalFixLog, type LocalFixCommand, type ScriptInfo } from '../services/local-fix.service';
import { TranslationService } from '../services/translation.service';
import { LlmService, type ProviderInfo } from '../services/llm.service';

type WizardStep = 'setup' | 'configure' | 'describe-issue' | 'active-session' | 'completed';

@Component({
  selector: 'app-local-fix',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="h-[calc(100vh-64px)] flex flex-col bg-secondary-50">
      @switch (currentStep()) {

        <!-- Step 1: Setup - Run Script -->
        @case ('setup') {
          <div class="flex-1 flex items-center justify-center">
            <div class="max-w-lg w-full mx-4">
              <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-8 text-center">
                <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <span class="text-3xl">🔧</span>
                </div>
                <h1 class="text-2xl font-bold text-secondary-900 mb-3">{{ t.translate('localFix.title') }}</h1>
                <p class="text-muted mb-6">{{ t.translate('localFix.setup.description') }}</p>

                <div class="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm text-left">
                  <p class="font-semibold mb-2">{{ t.translate('localFix.setup.instructions') }}</p>
                  <ol class="list-decimal list-inside space-y-1">
                    <li>{{ t.translate('localFix.setup.step1') }}</li>
                    <li>{{ t.translate('localFix.setup.step2') }}</li>
                    <li>{{ t.translate('localFix.setup.step3') }}</li>
                  </ol>
                </div>

                <button (click)="goToStep('configure')" class="btn-primary w-full">
                  {{ t.translate('localFix.setup.continue') }}
                </button>

                <a routerLink="/dashboard" class="inline-block mt-4 text-sm text-muted hover:text-secondary-700 transition-colors">
                  ← {{ t.translate('localFix.back') }}
                </a>
              </div>
            </div>
          </div>
        }

        <!-- Step 2: Configure Instance -->
        @case ('configure') {
          <div class="flex-1 flex items-center justify-center">
            <div class="max-w-lg w-full mx-4">
              <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-8">
                <button (click)="goToStep('setup')" class="text-sm text-muted hover:text-secondary-700 transition-colors mb-4 inline-flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  {{ t.translate('localFix.back') }}
                </button>

                <h2 class="text-xl font-bold text-secondary-900 mb-6">{{ t.translate('localFix.configure.title') }}</h2>

                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-1">{{ t.translate('localFix.configure.instanceUrl') }}</label>
                    <input
                      type="text"
                      [(ngModel)]="instanceUrl"
                      placeholder="http://localhost:3000"
                      class="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p class="text-xs text-muted mt-1">{{ t.translate('localFix.configure.instanceUrlHint') }}</p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-1">{{ t.translate('localFix.configure.userId') }}</label>
                    <input
                      type="text"
                      [(ngModel)]="userId"
                      placeholder="user123"
                      class="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p class="text-xs text-muted mt-1">{{ t.translate('localFix.configure.userIdHint') }}</p>
                  </div>
                </div>

                @if (configError()) {
                  <div class="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {{ configError() }}
                  </div>
                }

                <button
                  (click)="goToStep('describe-issue')"
                  [disabled]="!instanceUrl || !userId"
                  class="btn-primary w-full mt-6"
                  [class.opacity-50]="!instanceUrl || !userId"
                  [class.cursor-not-allowed]="!instanceUrl || !userId"
                >
                  {{ t.translate('localFix.configure.next') }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Step 3: Describe Issue -->
        @case ('describe-issue') {
          <div class="flex-1 flex items-center justify-center">
            <div class="max-w-lg w-full mx-4">
              <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-8">
                <button (click)="goToStep('configure')" class="text-sm text-muted hover:text-secondary-700 transition-colors mb-4 inline-flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  {{ t.translate('localFix.back') }}
                </button>

                <h2 class="text-xl font-bold text-secondary-900 mb-6">{{ t.translate('localFix.issue.title') }}</h2>

                <div class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-secondary-700 mb-1">AI Provider</label>
                      <select
                        [ngModel]="selectedProvider()"
                        (ngModelChange)="onProviderChange($event)"
                        class="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                      >
                        @for (p of providers(); track p.id) {
                          <option [value]="p.id">{{ p.name }}</option>
                        }
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-secondary-700 mb-1">Model</label>
                      <select
                        [ngModel]="selectedModel()"
                        (ngModelChange)="selectedModel.set($event)"
                        class="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                      >
                        @for (m of availableModels(); track m) {
                          <option [value]="getModelId(m)">{{ getModelName(m) }}</option>
                        }
                      </select>
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-1">{{ t.translate('localFix.issue.description') }}</label>
                    <textarea
                      [(ngModel)]="issueDescription"
                      rows="4"
                      placeholder="Describe the problem you're experiencing..."
                      class="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    ></textarea>
                  </div>

                  <div class="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="allowCommands"
                      [(ngModel)]="allowCommands"
                      class="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                    />
                    <label for="allowCommands" class="text-sm text-secondary-700">
                      {{ t.translate('localFix.issue.allowCommands') }}
                    </label>
                  </div>

                  @if (allowCommands) {
                    <div class="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                      <p class="font-semibold mb-1">⚠️ {{ t.translate('localFix.issue.commandWarningTitle') }}</p>
                      <p>{{ t.translate('localFix.issue.commandWarning') }}</p>
                    </div>
                  }
                </div>

                @if (sessionError()) {
                  <div class="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {{ sessionError() }}
                  </div>
                }

                <button
                  (click)="startSession()"
                  [disabled]="!issueDescription || isLoading()"
                  class="btn-primary w-full mt-6"
                  [class.opacity-50]="!issueDescription || isLoading()"
                  [class.cursor-not-allowed]="!issueDescription || isLoading()"
                >
                  @if (isLoading()) {
                    <span class="inline-flex items-center gap-2">
                      <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {{ t.translate('localFix.issue.starting') }}
                    </span>
                  } @else {
                    {{ t.translate('localFix.issue.start') }}
                  }
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Step 4: Active Session -->
        @case ('active-session') {
          <div class="flex-1 flex flex-col h-full overflow-hidden">
            <!-- Header -->
            <div class="bg-white border-b border-secondary-200 px-4 sm:px-6 py-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <span class="text-lg">🔧</span>
                  </div>
                  <div>
                    <h2 class="text-lg font-semibold text-secondary-900">{{ t.translate('localFix.session.title') }}</h2>
                    <p class="text-xs text-muted">{{ currentSession()?.issueDescription }}</p>
                  </div>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="currentSession()?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-secondary-100 text-secondary-700'">
                    {{ currentSession()?.status === 'active' ? '● Active' : '○ ' + currentSession()?.status }}
                  </span>
                </div>
                <button
                  (click)="endSession()"
                  [disabled]="isLoading()"
                  class="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                >
                  {{ t.translate('localFix.session.end') }}
                </button>
              </div>
            </div>

            <!-- Main content area -->
            <div class="flex-1 flex overflow-hidden">
              <!-- Logs panel -->
              <div class="flex-1 flex flex-col overflow-hidden">
                <div #logsContainer class="flex-1 overflow-y-auto p-4 space-y-3">
                  @for (log of sessionLogs(); track log.id) {
                    <div class="flex gap-3" [ngClass]="{
                      'justify-end': log.type === 'command',
                      'justify-start': log.type !== 'command'
                    }">
                      <div class="max-w-[85%] rounded-lg p-3 text-sm" [ngClass]="{
                        'bg-blue-50 border border-blue-200 text-blue-800': log.type === 'llm',
                        'bg-secondary-100 border border-secondary-200 text-secondary-800': log.type === 'info',
                        'bg-green-50 border border-green-200 text-green-800 font-mono': log.type === 'command',
                        'bg-secondary-50 border border-secondary-200 text-secondary-700 font-mono': log.type === 'output',
                        'bg-red-50 border border-red-200 text-red-700': log.type === 'error',
                        'bg-amber-50 border border-amber-200 text-amber-800': log.type === 'file-read' || log.type === 'file-write'
                      }">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="font-semibold text-xs uppercase tracking-wider">
                            @switch (log.type) {
                              @case ('llm') { 🤖 AI }
                              @case ('command') { ⌨️ Command }
                              @case ('output') { 📋 Output }
                              @case ('info') { ℹ️ Info }
                              @case ('error') { ❌ Error }
                              @case ('file-read') { 📖 File Read }
                              @case ('file-write') { ✏️ File Write }
                            }
                          </span>
                          <span class="text-xs text-muted">{{ formatTimestamp(log.timestamp) }}</span>
                        </div>
                        <p class="whitespace-pre-wrap break-words">{{ log.content }}</p>
                      </div>
                    </div>
                  }

                  @if (sessionLogs().length === 0) {
                    <div class="text-center text-muted py-12">
                      <p class="text-lg mb-2">{{ t.translate('localFix.session.noLogs') }}</p>
                      <p class="text-sm">{{ t.translate('localFix.session.noLogsHint') }}</p>
                    </div>
                  }
                </div>

                <!-- Pending commands -->
                @if (pendingCommands().length > 0) {
                  <div class="border-t border-secondary-200 bg-amber-50 p-4">
                    <p class="text-sm font-semibold text-amber-800 mb-2">{{ t.translate('localFix.session.pendingCommands') }}</p>
                    @for (cmd of pendingCommands(); track cmd.id) {
                      <div class="flex items-center justify-between bg-white rounded-lg border border-amber-200 p-3 mb-2">
                        <code class="text-sm font-mono text-secondary-800 break-all">{{ cmd.command }}</code>
                        <div class="flex gap-2 ml-4 flex-shrink-0">
                          <button
                            (click)="approveCommand(cmd.id)"
                            class="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                          >
                            ✓ {{ t.translate('localFix.session.approve') }}
                          </button>
                          <button
                            (click)="rejectCommand(cmd.id)"
                            class="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                          >
                            ✗ {{ t.translate('localFix.session.reject') }}
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }

                <!-- Chat input -->
                <div class="border-t border-secondary-200 bg-white p-4">
                  <div class="flex gap-2">
                    <input
                      type="text"
                      [(ngModel)]="chatMessage"
                      (keydown.enter)="sendMessage()"
                      placeholder="Describe what you need help with..."
                      class="flex-1 px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      [disabled]="isSending()"
                    />
                    <button
                      (click)="sendMessage()"
                      [disabled]="!chatMessage || isSending()"
                      class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      @if (isSending()) {
                        <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      } @else {
                        {{ t.translate('localFix.session.send') }}
                      }
                    </button>
                  </div>
                </div>
              </div>

              <!-- Script panel (collapsible) -->
              @if (showScriptPanel()) {
                <div class="w-80 border-l border-secondary-200 bg-white flex flex-col overflow-hidden">
                  <div class="p-4 border-b border-secondary-200 flex items-center justify-between">
                    <h3 class="font-semibold text-secondary-900 text-sm">{{ t.translate('localFix.session.setupScript') }}</h3>
                    <button (click)="showScriptPanel.set(false)" class="text-secondary-400 hover:text-secondary-600">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div class="flex-1 overflow-y-auto p-4 space-y-4">
                    <div>
                      <div class="flex items-center justify-between mb-2">
                        <p class="text-xs font-semibold text-secondary-700 uppercase">Windows (.bat)</p>
                        <button (click)="copyScript('bat')" class="text-xs text-primary-600 hover:text-primary-700">
                          {{ t.translate('localFix.session.copy') }}
                        </button>
                      </div>
                      <pre class="bg-secondary-50 border border-secondary-200 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{{ scriptInfo()?.bat }}</pre>
                    </div>
                    <div>
                      <div class="flex items-center justify-between mb-2">
                        <p class="text-xs font-semibold text-secondary-700 uppercase">Linux/Mac (.sh)</p>
                        <button (click)="copyScript('sh')" class="text-xs text-primary-600 hover:text-primary-700">
                          {{ t.translate('localFix.session.copy') }}
                        </button>
                      </div>
                      <pre class="bg-secondary-50 border border-secondary-200 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{{ scriptInfo()?.sh }}</pre>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Step 5: Completed -->
        @case ('completed') {
          <div class="flex-1 flex items-center justify-center">
            <div class="max-w-md w-full mx-4">
              <div class="bg-white rounded-xl border border-secondary-200 shadow-sm p-8 text-center">
                <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <span class="text-3xl">✅</span>
                </div>
                <h2 class="text-2xl font-bold text-secondary-900 mb-3">{{ t.translate('localFix.completed.title') }}</h2>
                <p class="text-muted mb-4">{{ t.translate('localFix.completed.description') }}</p>

                <ul class="text-sm text-left text-secondary-700 mb-6 space-y-2 bg-secondary-50 rounded-lg p-4">
                  <li class="flex items-center gap-2">
                    <span class="text-green-600">✓</span> {{ t.translate('localFix.completed.sessionRemoved') }}
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="text-green-600">✓</span> {{ t.translate('localFix.completed.scriptDeleted') }}
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="text-green-600">✓</span> {{ t.translate('localFix.completed.computerRemoved') }}
                  </li>
                </ul>

                <button (click)="resetWizard()" class="btn-primary w-full mb-3">
                  {{ t.translate('localFix.completed.newSession') }}
                </button>
                <a routerLink="/dashboard" class="inline-block text-sm text-muted hover:text-secondary-700 transition-colors">
                  ← {{ t.translate('localFix.back') }}
                </a>
              </div>
            </div>
          </div>
        }

      }
    </div>
  `,
})
export class LocalFixPageComponent implements OnInit, OnDestroy {
  protected t = inject(TranslationService);
  private localFixService = inject(LocalFixService);
  private llmService = inject(LlmService);

  // Wizard state
  currentStep = signal<WizardStep>('setup');
  isLoading = signal(false);
  isSending = signal(false);
  configError = signal<string | null>(null);
  sessionError = signal<string | null>(null);

  // Form data
  instanceUrl = '';
  userId = '';
  issueDescription = '';
  allowCommands = false;
  chatMessage = '';

  // LLM Selection
  providers = signal<ProviderInfo[]>([]);
  selectedProvider = signal('');
  selectedModel = signal('');
  availableModels = signal<Array<string | { id: string; name: string }>>([]);

  // Session data
  currentSession = signal<LocalFixSession | null>(null);
  sessionLogs = signal<LocalFixLog[]>([]);
  pendingCommands = signal<LocalFixCommand[]>([]);
  scriptInfo = signal<ScriptInfo | null>(null);
  showScriptPanel = signal(false);

  // Polling
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  @ViewChild('logsContainer') logsContainer?: ElementRef<HTMLDivElement>;

  async ngOnInit(): Promise<void> {
    // Load providers
    try {
      const providers = await this.llmService.getProviders();
      this.providers.set(providers);
      if (providers.length > 0) {
        this.onProviderChange(providers[0].id);
      }
    } catch (err) {
      console.error('Failed to load LLM providers', err);
    }

    // Check for existing sessions
    try {
      const sessions = await this.localFixService.listSessions();
      const active = sessions.find(s => s.status === 'active');
      if (active) {
        this.currentSession.set(active);
        this.sessionLogs.set(active.logs || []);
        this.currentStep.set('active-session');
        this.startPolling();
        await this.loadScript(active.id);
      }
    } catch {
      // No existing sessions, start fresh
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  goToStep(step: WizardStep): void {
    this.configError.set(null);
    this.sessionError.set(null);
    this.currentStep.set(step);
  }

  async startSession(): Promise<void> {
    if (!this.issueDescription || !this.instanceUrl || !this.userId) return;

    this.isLoading.set(true);
    this.sessionError.set(null);

    try {
      const session = await this.localFixService.createSession(
        this.instanceUrl,
        this.userId,
        this.issueDescription,
        this.allowCommands,
        this.selectedProvider(),
        this.selectedModel()
      );
      this.currentSession.set(session);
      this.sessionLogs.set(session.logs || []);
      this.currentStep.set('active-session');
      this.startPolling();
      await this.loadScript(session.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create session';
      this.sessionError.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadScript(sessionId: string): Promise<void> {
    try {
      const script = await this.localFixService.getSetupScript(sessionId);
      this.scriptInfo.set(script);
      this.showScriptPanel.set(true);
    } catch {
      // Script loading is optional
    }
  }

  async sendMessage(): Promise<void> {
    const message = this.chatMessage.trim();
    if (!message || !this.currentSession()) return;

    this.isSending.set(true);
    const sessionId = this.currentSession()!.id;

    // Add user message to logs optimistically
    const userLog: LocalFixLog = {
      id: crypto.randomUUID(),
      type: 'info',
      content: `User: ${message}`,
      timestamp: new Date().toISOString(),
    };
    this.sessionLogs.update(logs => [...logs, userLog]);
    this.chatMessage = '';
    this.scrollToBottom();

    try {
      const result = await this.localFixService.sendMessage(sessionId, message);
      const aiLog: LocalFixLog = {
        id: crypto.randomUUID(),
        type: 'llm',
        content: result.response,
        timestamp: new Date().toISOString(),
      };
      this.sessionLogs.update(logs => [...logs, aiLog]);
      this.scrollToBottom();

      // Refresh pending commands after AI response
      await this.refreshPendingCommands();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to send message';
      const errorLog: LocalFixLog = {
        id: crypto.randomUUID(),
        type: 'error',
        content: errMsg,
        timestamp: new Date().toISOString(),
      };
      this.sessionLogs.update(logs => [...logs, errorLog]);
    } finally {
      this.isSending.set(false);
    }
  }

  async approveCommand(commandId: string): Promise<void> {
    const sessionId = this.currentSession()?.id;
    if (!sessionId) return;

    try {
      const result = await this.localFixService.approveCommand(sessionId, commandId);
      const cmd = this.pendingCommands().find(c => c.id === commandId);

      // Add command + output to logs
      if (cmd) {
        this.sessionLogs.update(logs => [
          ...logs,
          { id: crypto.randomUUID(), type: 'command', content: cmd.command, timestamp: new Date().toISOString() },
          { id: crypto.randomUUID(), type: 'output', content: result.output, timestamp: new Date().toISOString() },
        ]);
      }

      // Remove from pending
      this.pendingCommands.update(cmds => cmds.filter(c => c.id !== commandId));
      this.scrollToBottom();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to execute command';
      this.sessionLogs.update(logs => [
        ...logs,
        { id: crypto.randomUUID(), type: 'error', content: errMsg, timestamp: new Date().toISOString() },
      ]);
    }
  }

  async rejectCommand(commandId: string): Promise<void> {
    const sessionId = this.currentSession()?.id;
    if (!sessionId) return;

    try {
      await this.localFixService.rejectCommand(sessionId, commandId);
      this.pendingCommands.update(cmds => cmds.filter(c => c.id !== commandId));

      this.sessionLogs.update(logs => [
        ...logs,
        { id: crypto.randomUUID(), type: 'info', content: 'Command rejected by user', timestamp: new Date().toISOString() },
      ]);
    } catch {
      // Silently handle
    }
  }

  async endSession(): Promise<void> {
    const sessionId = this.currentSession()?.id;
    if (!sessionId) return;

    this.isLoading.set(true);
    try {
      await this.localFixService.removeSession(sessionId);
      this.stopPolling();
      this.currentStep.set('completed');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to end session';
      this.sessionLogs.update(logs => [
        ...logs,
        { id: crypto.randomUUID(), type: 'error', content: errMsg, timestamp: new Date().toISOString() },
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  resetWizard(): void {
    this.currentStep.set('setup');
    this.instanceUrl = '';
    this.userId = '';
    this.issueDescription = '';
    this.allowCommands = false;
    this.chatMessage = '';
    this.currentSession.set(null);
    this.sessionLogs.set([]);
    this.pendingCommands.set([]);
    this.scriptInfo.set(null);
    this.showScriptPanel.set(false);
    this.configError.set(null);
    this.sessionError.set(null);
  }

  onProviderChange(providerId: string): void {
    this.selectedProvider.set(providerId);
    const provider = this.providers().find(p => p.id === providerId);
    if (provider) {
      this.availableModels.set(provider.models || []);
      const defaultModel = provider.models?.[0];
      if (defaultModel !== undefined) {
        this.selectedModel.set(this.getModelId(defaultModel));
      } else {
        this.selectedModel.set('');
      }
    }
  }

  getModelId(model: string | { id: string; name: string }): string {
    return typeof model === 'string' ? model : model.id;
  }

  getModelName(model: string | { id: string; name: string }): string {
    return typeof model === 'string' ? model : (model.name || model.id);
  }

  copyScript(type: 'bat' | 'sh'): void {
    const content = type === 'bat' ? this.scriptInfo()?.bat : this.scriptInfo()?.sh;
    if (content) {
      navigator.clipboard.writeText(content);
    }
  }

  formatTimestamp(timestamp: string): string {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return timestamp;
    }
  }

  // --- Private helpers ---

  private startPolling(): void {
    this.stopPolling();
    this.pollInterval = setInterval(() => this.pollSession(), 5000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async pollSession(): Promise<void> {
    const sessionId = this.currentSession()?.id;
    if (!sessionId) return;

    try {
      const [logs, commands] = await Promise.all([
        this.localFixService.getLogs(sessionId),
        this.localFixService.getPendingCommands(sessionId),
      ]);
      this.sessionLogs.set(logs);
      this.pendingCommands.set(commands.filter(c => c.status === 'pending'));
    } catch {
      // If session is gone, move to completed
      this.stopPolling();
      this.currentStep.set('completed');
    }
  }

  private async refreshPendingCommands(): Promise<void> {
    const sessionId = this.currentSession()?.id;
    if (!sessionId) return;

    try {
      const commands = await this.localFixService.getPendingCommands(sessionId);
      this.pendingCommands.set(commands.filter(c => c.status === 'pending'));
    } catch {
      // Silently handle
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.logsContainer?.nativeElement) {
        this.logsContainer.nativeElement.scrollTop = this.logsContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }
}
