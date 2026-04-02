import { Component, inject, signal, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { marked } from 'marked';
import { LlmService, type Chat, type ChatMessage, type ChatSummary, type MessageAlternative, type ProviderInfo, type SendMessageOptions, type SearchEvent, type StreamResult, type UniverseSummary, type UniverseCharacterSummary, type Persona } from '../services/llm.service';

@Component({
  selector: 'app-general-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="h-[calc(100vh-64px)] flex bg-secondary-50">
      <!-- Sidebar -->
      <div
        class="flex flex-col bg-secondary-900 text-white transition-all duration-300"
        [ngClass]="sidebarOpen() ? 'w-72' : 'w-0 overflow-hidden'"
      >
        <!-- New Chat Button -->
        <div class="p-3">
          <button
            type="button"
            (click)="createNewChat()"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-secondary-700 hover:bg-secondary-800 transition-colors text-sm font-medium"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        <!-- Chat List -->
        <div class="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          @for (chat of chatList(); track chat.id) {
            <div
              class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group flex items-center justify-between cursor-pointer"
              [ngClass]="currentChatId() === chat.id ? 'bg-secondary-700' : 'hover:bg-secondary-800'"
            >
              <button
                (click)="loadChat(chat.id)"
                class="truncate flex-1 text-left bg-transparent border-none text-inherit p-0"
              >{{ chat.title }}</button>
              <button
                type="button"
                (click)="deleteExistingChat(chat.id, $event)"
                class="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 hover:text-red-400 transition-all"
                aria-label="Delete chat"
                title="Delete chat"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          }
          @if (chatList().length === 0) {
            <p class="text-secondary-500 text-xs text-center py-4">No conversations yet</p>
          }
        </div>

        <!-- Bottom links -->
        <div class="p-3 border-t border-secondary-700">
          <a routerLink="/dashboard" class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary-800 transition-colors text-sm text-secondary-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </a>
          <a routerLink="/settings" class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary-800 transition-colors text-sm text-secondary-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </a>
        </div>
      </div>

      <!-- Main Chat Area -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Top Bar -->
        <div class="flex items-center gap-3 px-4 py-3 border-b border-secondary-200 bg-white">
          <button
            type="button"
            (click)="toggleSidebar()"
            class="p-2 rounded-lg hover:bg-secondary-100 transition-colors"
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <svg class="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 class="text-lg font-semibold text-secondary-900 truncate">
            {{ currentChat()?.title || 'Chat' }}
          </h1>
        </div>

        <!-- Messages Area -->
        <div #messagesContainer class="flex-1 overflow-y-auto">
          @if (currentChat()?.messages?.length) {
            <div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
              @for (msg of currentChat()?.messages; track (msg.timestamp ?? $index)) {
                @if (msg.role !== 'system') {
                  <div
                    class="flex gap-4 group"
                    [ngClass]="msg.role === 'user' ? 'justify-end' : 'justify-start'"
                  >
                    @if (msg.role === 'assistant') {
                      <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span class="text-sm">🤖</span>
                      </div>
                    }
                    <div class="max-w-[80%] flex flex-col gap-2">
                      @if (msg.role === 'assistant' && msg.thinking) {
                        <details class="thinking-box">
                          <summary class="cursor-pointer text-sm font-medium text-secondary-500 hover:text-secondary-700 select-none px-3 py-1.5 rounded-lg bg-secondary-100 border border-secondary-200 w-fit">
                            💭 Thought
                          </summary>
                          <div class="mt-2 bg-secondary-50 border border-secondary-200 rounded-lg px-4 py-3 text-sm text-secondary-600 prose prose-sm prose-secondary max-w-none" [innerHTML]="renderMarkdown(msg.thinking)"></div>
                        </details>
                      }
                      @if (msg.role === 'assistant' && msg.searches?.length) {
                        @for (search of msg.searches; track $index) {
                          <div class="flex items-center gap-1.5 text-xs text-secondary-500">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span>Searched</span>
                            @if (search.url) {
                              <a [href]="search.url" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline truncate max-w-[300px]">{{ search.query }}</a>
                            } @else {
                              <span class="text-secondary-600">{{ search.query }}</span>
                            }
                          </div>
                        }
                      }
                      @if (editingMessageIndex() === $index) {
                        <!-- Inline edit mode for user messages -->
                        <div class="flex flex-col gap-2 min-w-[280px]">
                          <textarea
                            [(ngModel)]="editingContent"
                            rows="3"
                            class="resize-none rounded-xl border border-primary-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm leading-relaxed"
                            (keydown.escape)="cancelEdit()"
                          ></textarea>
                          <div class="flex gap-2 justify-end">
                            <button
                              (click)="cancelEdit()"
                              class="px-3 py-1.5 rounded-lg text-sm border border-secondary-200 hover:bg-secondary-50 transition-colors"
                            >Cancel</button>
                            <button
                              (click)="saveUserEdit($index)"
                              class="px-3 py-1.5 rounded-lg text-sm bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                            >Save &amp; Re-send</button>
                          </div>
                        </div>
                      } @else {
                        <div
                          class="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                          [ngClass]="msg.role === 'user'
                            ? 'bg-primary-600 text-white rounded-br-md prose-invert'
                            : 'bg-white border border-secondary-200 text-secondary-800 rounded-bl-md shadow-sm'"
                        ><div class="prose prose-sm max-w-none" [ngClass]="msg.role === 'user' ? 'prose-invert' : 'prose-secondary'" [innerHTML]="renderMarkdown(getContentAsString(msg.content))"></div></div>
                        <!-- Per-message action buttons -->
                        <div
                          class="flex items-center gap-0.5"
                          [ngClass]="msg.role === 'user' ? 'justify-end' : 'justify-start'"
                        >
                          @if (msg.role === 'assistant' && (msg.alternatives?.length ?? 0) > 1) {
                            <button
                              type="button"
                              (click)="navigateAlternative($index, -1)"
                              [disabled]="isLoading() || (msg.alternativeIndex ?? 0) === 0"
                              class="p-1 rounded text-secondary-400 hover:text-secondary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              aria-label="Previous response"
                              title="Previous response"
                            >
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <span class="text-xs text-secondary-400 select-none px-0.5">{{ (msg.alternativeIndex ?? 0) + 1 }}/{{ msg.alternatives?.length }}</span>
                            <button
                              type="button"
                              (click)="navigateAlternative($index, 1)"
                              [disabled]="isLoading() || (msg.alternativeIndex ?? 0) === (msg.alternatives?.length ?? 1) - 1"
                              class="p-1 rounded text-secondary-400 hover:text-secondary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              aria-label="Next response"
                              title="Next response"
                            >
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          }
                          @if (msg.role === 'assistant' && !isLoading()) {
                            <button
                              type="button"
                              (click)="retryAssistantMessage($index)"
                              [disabled]="editingMessageIndex() !== null"
                              class="p-1 rounded text-secondary-400 hover:text-secondary-600 transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Retry response"
                              title="Retry response"
                            >
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          }
                          @if (msg.role === 'user' && !isLoading()) {
                            <button
                              type="button"
                              (click)="startEditUserMessage($index)"
                              [disabled]="editingMessageIndex() !== null"
                              class="p-1 rounded text-secondary-400 hover:text-secondary-600 transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Edit message"
                              title="Edit message"
                            >
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          }
                          @if (!isLoading()) {
                            <button
                              type="button"
                              (click)="deleteMessage($index)"
                              [disabled]="editingMessageIndex() !== null"
                              class="p-1 rounded text-secondary-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Delete message"
                              title="Delete message"
                            >
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          }
                        </div>
                      }
                    </div>
                    @if (msg.role === 'user') {
                      <div class="w-8 h-8 rounded-full bg-secondary-200 flex items-center justify-center flex-shrink-0">
                        <svg class="w-4 h-4 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    }
                  </div>
                }
              }
              @if (isLoading()) {
                <div class="flex gap-4 justify-start">
                  <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span class="text-sm">🤖</span>
                  </div>
                  <div class="max-w-[80%] flex flex-col gap-2">
                    @if (streamingThinking()) {
                      <details [attr.open]="thinkingDone() ? null : ''" class="thinking-box">
                        <summary class="cursor-pointer text-sm font-medium text-secondary-500 hover:text-secondary-700 select-none px-3 py-1.5 rounded-lg border border-secondary-200 w-fit" [ngClass]="thinkingDone() ? 'bg-secondary-100' : 'bg-amber-50 border-amber-200 text-amber-700'">
                          {{ thinkingDone() ? '💭 Thought' : '💭 Thinking...' }}
                        </summary>
                        <div class="mt-2 bg-secondary-50 border border-secondary-200 rounded-lg px-4 py-3 text-sm text-secondary-600 prose prose-sm prose-secondary max-w-none" [innerHTML]="renderMarkdown(streamingThinking())"></div>
                      </details>
                    }
                    @for (search of streamingSearches(); track $index) {
                      <div class="flex items-center gap-1.5 text-xs" [ngClass]="search.status === 'searching' ? 'text-amber-600' : 'text-secondary-500'">
                        <svg class="w-3 h-3" [ngClass]="search.status === 'searching' ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>{{ search.status === 'searching' ? 'Searching' : 'Searched' }}</span>
                        @if (search.url) {
                          <a [href]="search.url" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline truncate max-w-[300px]">{{ search.query }}</a>
                        } @else {
                          <span>{{ search.query }}</span>
                        }
                      </div>
                    }
                    @if (streamingContent()) {
                      <div class="bg-white border border-secondary-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                        <div class="prose prose-sm prose-secondary max-w-none" [innerHTML]="renderMarkdown(streamingContent())"></div>
                      </div>
                    } @else if (!streamingThinking() && !streamingSearches().length) {
                      <div class="bg-white border border-secondary-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                        <div class="flex gap-1">
                          <span class="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                          <span class="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                          <span class="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- Welcome Screen -->
            <div class="flex items-center justify-center h-full">
              <div class="text-center max-w-lg px-4">
                <div class="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-6">
                  <span class="text-3xl">🤖</span>
                </div>
                <h2 class="text-2xl font-bold text-secondary-900 mb-3">Chat</h2>
                <p class="text-secondary-500 mb-8">
                  Ask me anything. I can help with writing, coding, analysis, creative tasks, and more.
                </p>
                <div class="grid grid-cols-2 gap-3">
                  <button (click)="sendQuickPrompt('Explain quantum computing in simple terms')" class="p-3 rounded-xl border border-secondary-200 bg-white hover:bg-secondary-50 text-left text-sm text-secondary-700 transition-colors">
                    💡 Explain quantum computing
                  </button>
                  <button (click)="sendQuickPrompt('Write a short poem about the ocean')" class="p-3 rounded-xl border border-secondary-200 bg-white hover:bg-secondary-50 text-left text-sm text-secondary-700 transition-colors">
                    ✍️ Write a short poem
                  </button>
                  <button (click)="sendQuickPrompt('Help me debug a JavaScript function')" class="p-3 rounded-xl border border-secondary-200 bg-white hover:bg-secondary-50 text-left text-sm text-secondary-700 transition-colors">
                    🔧 Debug JavaScript code
                  </button>
                  <button (click)="sendQuickPrompt('What are good habits for productivity?')" class="p-3 rounded-xl border border-secondary-200 bg-white hover:bg-secondary-50 text-left text-sm text-secondary-700 transition-colors">
                    📋 Productivity tips
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Error message -->
        @if (errorMessage()) {
          <div class="px-4">
            <div class="max-w-3xl mx-auto mb-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {{ errorMessage() }}
              <button
                type="button"
                (click)="errorMessage.set(null)"
                class="ml-auto text-red-500 hover:text-red-700"
                aria-label="Dismiss error"
                title="Dismiss error"
              >✕</button>
            </div>
          </div>
        }

        <!-- Input Area -->
        <div class="border-t border-secondary-200 bg-white px-4 py-4">
          <div class="max-w-3xl mx-auto">
            <!-- Provider Selector -->
            <div class="flex items-center gap-2 mb-3">
              <div class="relative" #providerDropdown>
                <button
                  type="button"
                  (click)="toggleProviderDropdown($event)"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-secondary-200 bg-secondary-50 hover:bg-secondary-100 text-sm transition-colors"
                >
                  <span class="w-2 h-2 rounded-full" [ngClass]="selectedProvider() ? 'bg-green-500' : 'bg-secondary-400'"></span>
                  <span class="text-secondary-700 max-w-[200px] truncate">
                    {{ selectedProvider()?.name || 'Select Provider' }}
                    @if (selectedProvider()?.model) {
                      <span class="text-secondary-400"> · {{ selectedProvider()?.model }}</span>
                    }
                  </span>
                  <svg class="w-3.5 h-3.5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                @if (showProviderDropdown()) {
                  <div class="absolute bottom-full left-0 mb-1 w-72 bg-white rounded-lg border border-secondary-200 shadow-lg py-1 z-50 max-h-80 overflow-y-auto">
                    @if (providers().length === 0) {
                      <div class="px-4 py-3 text-sm text-secondary-500">
                        No providers configured.
                        <a routerLink="/settings" class="text-primary-600 hover:underline">Set up API keys</a>
                      </div>
                    }
                    @for (p of providers(); track p.id) {
                      @if (p.models && p.models.length > 1) {
                        <div>
                          <button
                            (click)="toggleModelList(p, $event)"
                            class="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary-50 transition-colors flex items-center gap-3"
                            [ngClass]="selectedProvider()?.id === p.id ? 'bg-primary-50 text-primary-700' : 'text-secondary-700'"
                          >
                            <span class="w-2 h-2 rounded-full" [ngClass]="p.available ? 'bg-green-500' : 'bg-secondary-300'"></span>
                            <div class="flex-1 min-w-0">
                              <div class="font-medium">{{ p.name }}</div>
                              <div class="text-xs text-secondary-400 truncate">{{ p.models.length }} models available</div>
                            </div>
                            <svg class="w-3.5 h-3.5 text-secondary-400 transition-transform" [ngClass]="expandedProvider() === p.id ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          @if (expandedProvider() === p.id) {
                            <div class="border-t border-secondary-100 bg-secondary-50">
                              @for (m of p.models; track m) {
                                <button
                                  (click)="selectProviderModel(p, m)"
                                  class="w-full text-left pl-9 pr-4 py-2 text-sm hover:bg-secondary-100 transition-colors flex items-center gap-2"
                                  [ngClass]="selectedProvider()?.id === p.id && selectedProvider()?.model === m ? 'bg-primary-50 text-primary-700' : 'text-secondary-600'"
                                >
                                  <span class="w-1.5 h-1.5 rounded-full" [ngClass]="selectedProvider()?.id === p.id && selectedProvider()?.model === m ? 'bg-primary-600' : 'bg-secondary-300'"></span>
                                  <span class="truncate">{{ m }}</span>
                                </button>
                              }
                            </div>
                          }
                        </div>
                      } @else {
                        <button
                          (click)="selectProvider(p)"
                          class="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary-50 transition-colors flex items-center gap-3"
                          [ngClass]="selectedProvider()?.id === p.id ? 'bg-primary-50 text-primary-700' : 'text-secondary-700'"
                        >
                          <span class="w-2 h-2 rounded-full" [ngClass]="p.available ? 'bg-green-500' : 'bg-secondary-300'"></span>
                          <div class="flex-1 min-w-0">
                            <div class="font-medium">{{ p.name }}</div>
                            @if (p.model) {
                              <div class="text-xs text-secondary-400 truncate">{{ p.model }}</div>
                            }
                          </div>
                        </button>
                      }
                    }
                  </div>
                }
              </div>

              <!-- Web Search Toggle -->
              <button
                type="button"
                (click)="webSearchEnabled.set(!webSearchEnabled())"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors"
                [ngClass]="webSearchEnabled()
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-secondary-200 bg-secondary-50 text-secondary-500 hover:bg-secondary-100'"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>

              <!-- Think Toggle -->
              <button
                type="button"
                (click)="thinkEnabled.set(!thinkEnabled())"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors"
                [ngClass]="thinkEnabled()
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-secondary-200 bg-secondary-50 text-secondary-500 hover:bg-secondary-100'"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Think
              </button>

              <!-- Character Selector -->
              @if (universes().length > 0) {
                <div class="relative" #characterDropdown>
                  <button
                    type="button"
                    (click)="toggleCharacterDropdown($event)"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors"
                    [ngClass]="selectedCharacter()
                      ? 'border-purple-300 bg-purple-50 text-purple-700'
                      : 'border-secondary-200 bg-secondary-50 text-secondary-500 hover:bg-secondary-100'"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span class="max-w-[100px] truncate">{{ selectedCharacter()?.name || 'Character' }}</span>
                    <svg class="w-3 h-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  @if (showCharacterDropdown()) {
                    <div class="absolute bottom-full left-0 mb-1 w-64 bg-white rounded-lg border border-secondary-200 shadow-lg py-1 z-50 max-h-64 overflow-y-auto">
                      <button
                        (click)="selectCharacter(null)"
                        class="w-full text-left px-4 py-2 text-sm hover:bg-secondary-50 transition-colors"
                        [ngClass]="!selectedCharacter() ? 'bg-purple-50 text-purple-700' : 'text-secondary-700'"
                      >
                        <div class="font-medium">No character</div>
                        <div class="text-xs text-secondary-400">Default assistant behavior</div>
                      </button>
                      @for (universe of universes(); track universe.id) {
                        @if (universe.characters.length > 0) {
                          <div class="px-4 py-1.5 text-xs font-semibold text-secondary-400 uppercase tracking-wider bg-secondary-50">
                            {{ universe.name }}
                          </div>
                          @for (char of universe.characters; track char.id) {
                            <button
                              (click)="selectCharacter(char)"
                              class="w-full text-left px-4 py-2 text-sm hover:bg-secondary-50 transition-colors flex items-center gap-2"
                              [ngClass]="selectedCharacter()?.id === char.id ? 'bg-purple-50 text-purple-700' : 'text-secondary-700'"
                            >
                              <span class="font-medium">{{ char.name }}</span>
                            </button>
                          }
                        }
                      }
                    </div>
                  }
                </div>
              }

              <!-- Persona Selector -->
              <div class="relative" #personaDropdown>
                <button
                  type="button"
                  (click)="togglePersonaDropdown($event)"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors"
                  [ngClass]="selectedPersona()
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-secondary-200 bg-secondary-50 text-secondary-500 hover:bg-secondary-100'"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span class="max-w-[100px] truncate">{{ selectedPersona()?.name || 'Persona' }}</span>
                  <svg class="w-3 h-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                @if (showPersonaDropdown()) {
                  <div class="absolute bottom-full left-0 mb-1 w-64 bg-white rounded-lg border border-secondary-200 shadow-lg py-1 z-50 max-h-64 overflow-y-auto">
                    <button
                      (click)="selectPersona(null)"
                      class="w-full text-left px-4 py-2 text-sm hover:bg-secondary-50 transition-colors"
                      [ngClass]="!selectedPersona() ? 'bg-blue-50 text-blue-700' : 'text-secondary-700'"
                    >
                      <div class="font-medium">No persona</div>
                      <div class="text-xs text-secondary-400">AI sees you as a default user</div>
                    </button>
                    @if (personas().length > 0) {
                      <div class="px-4 py-1.5 text-xs font-semibold text-secondary-400 uppercase tracking-wider bg-secondary-50">
                        Your Personas
                      </div>
                      @for (p of personas(); track p.id) {
                        <button
                          (click)="selectPersona(p)"
                          class="w-full text-left px-4 py-2 text-sm hover:bg-secondary-50 transition-colors flex items-center gap-2"
                          [ngClass]="selectedPersona()?.id === p.id ? 'bg-blue-50 text-blue-700' : 'text-secondary-700'"
                        >
                          <span class="font-medium">{{ p.name }}</span>
                        </button>
                      }
                    }
                    <div class="border-t border-secondary-100 p-2">
                      <a routerLink="/personas" class="block w-full text-center px-3 py-1.5 rounded-lg bg-secondary-50 hover:bg-secondary-100 text-xs font-medium text-secondary-600 transition-colors">
                        Manage Personas
                      </a>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Text Input -->
            <div class="flex items-end gap-3">
              <div class="flex-1 relative">
                <textarea
                  #messageInput
                  [(ngModel)]="userMessage"
                  (keydown.enter)="onEnterKey($event)"
                  placeholder="Type your message..."
                  rows="1"
                  class="w-full resize-none rounded-xl border border-secondary-200 px-4 py-3 pr-12 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm leading-relaxed max-h-40 overflow-y-auto"
                  [disabled]="isLoading()"
                  (input)="autoResize($event)"
                ></textarea>
              </div>
              <button
                type="button"
                (click)="sendCurrentMessage()"
                [disabled]="isLoading() || !userMessage.trim() || !selectedProvider()"
                class="p-3 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                aria-label="Send message"
                title="Send message"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class GeneralAssistantPageComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('providerDropdown') providerDropdown!: ElementRef;
  @ViewChild('characterDropdown') characterDropdown!: ElementRef;
  @ViewChild('personaDropdown') personaDropdown!: ElementRef;

  private llmService = inject(LlmService);

  sidebarOpen = signal(true);
  chatList = signal<ChatSummary[]>([]);
  currentChatId = signal<string | null>(null);
  currentChat = signal<Chat | null>(null);
  providers = signal<ProviderInfo[]>([]);
  selectedProvider = signal<ProviderInfo | null>(null);
  showProviderDropdown = signal(false);
  expandedProvider = signal<string | null>(null);
  webSearchEnabled = signal(false);
  thinkEnabled = signal(false);
  userMessage = '';
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Character selection state
  universes = signal<UniverseSummary[]>([]);
  selectedCharacter = signal<UniverseCharacterSummary | null>(null);
  showCharacterDropdown = signal(false);

  // Persona selection state
  personas = signal<Persona[]>([]);
  selectedPersona = signal<Persona | null>(null);
  showPersonaDropdown = signal(false);

  // Streaming state
  streamingThinking = signal('');
  streamingContent = signal('');
  streamingSearches = signal<SearchEvent[]>([]);
  thinkingDone = signal(false);

  // Edit state
  editingMessageIndex = signal<number | null>(null);
  editingContent = '';

  private clickOutsideListener: ((e: Event) => void) | null = null;
  private providerPollTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly PROVIDER_POLL_INTERVAL_MS = 10_000;
  private static readonly PROVIDER_RETRY_COUNT = 3;
  private static readonly PROVIDER_RETRY_DELAY_MS = 2_000;

  async ngOnInit(): Promise<void> {
    // Close dropdown when clicking outside the dropdown area
    this.clickOutsideListener = (e: Event) => {
      if (this.showProviderDropdown() && this.providerDropdown &&
          !this.providerDropdown.nativeElement.contains(e.target as Node)) {
        this.showProviderDropdown.set(false);
        this.expandedProvider.set(null);
      }
      if (this.showCharacterDropdown() && this.characterDropdown &&
          !this.characterDropdown.nativeElement.contains(e.target as Node)) {
        this.showCharacterDropdown.set(false);
      }
      if (this.showPersonaDropdown() && this.personaDropdown &&
          !this.personaDropdown.nativeElement.contains(e.target as Node)) {
        this.showPersonaDropdown.set(false);
      }
    };
    document.addEventListener('click', this.clickOutsideListener);

    await Promise.all([
      this.loadProvidersWithRetry(),
      this.loadChatList(),
      this.loadUniverses(),
      this.loadPersonas(),
    ]);

    // Poll for providers periodically if no local model was detected
    this.startProviderPollingIfNeeded();

    // Auto-load the most recent chat
    const chats = this.chatList();
    if (chats.length > 0) {
      await this.loadChat(chats[0].id);
    }
  }

  ngOnDestroy(): void {
    if (this.clickOutsideListener) {
      document.removeEventListener('click', this.clickOutsideListener);
    }
    this.stopProviderPolling();
  }

  private hasLocalProvider(): boolean {
    return this.providers().some(p => p.id === 'kobold' || p.id === 'ollama');
  }

  private startProviderPollingIfNeeded(): void {
    if (this.hasLocalProvider()) return;
    this.providerPollTimer = setInterval(async () => {
      await this.loadProviders();
      if (this.hasLocalProvider()) {
        this.stopProviderPolling();
      }
    }, GeneralAssistantPageComponent.PROVIDER_POLL_INTERVAL_MS);
  }

  private stopProviderPolling(): void {
    if (this.providerPollTimer) {
      clearInterval(this.providerPollTimer);
      this.providerPollTimer = null;
    }
  }

  private async loadProvidersWithRetry(): Promise<void> {
    for (let attempt = 0; attempt < GeneralAssistantPageComponent.PROVIDER_RETRY_COUNT; attempt++) {
      await this.loadProviders();
      if (this.providers().length > 0) return;
      if (attempt < GeneralAssistantPageComponent.PROVIDER_RETRY_COUNT - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, GeneralAssistantPageComponent.PROVIDER_RETRY_DELAY_MS)
        );
      }
    }
  }

  async loadProviders(): Promise<void> {
    try {
      const providers = await this.llmService.getProviders();
      this.providers.set(providers);
      if (providers.length > 0 && !this.selectedProvider()) {
        this.selectedProvider.set(providers[0]);
      }
    } catch {
      // Silent failure
    }
  }

  toggleProviderDropdown(event: Event): void {
    event.stopPropagation();
    const opening = !this.showProviderDropdown();
    this.showProviderDropdown.set(opening);
    if (!opening) {
      this.expandedProvider.set(null);
    }
  }

  async loadChatList(): Promise<void> {
    try {
      const chats = await this.llmService.listChats();
      this.chatList.set(chats);
    } catch {
      // Silent failure
    }
  }

  async createNewChat(): Promise<void> {
    try {
      const provider = this.selectedProvider();

      // If we don't have a persona selected, try to use the default one
      if (!this.selectedPersona()) {
        const defaultId = await this.llmService.getDefaultPersonaId();
        if (defaultId) {
          const persona = this.personas().find(p => p.id === defaultId);
          if (persona) this.selectedPersona.set(persona);
        }
      }

      const chat = await this.llmService.createChat(
        provider?.id || undefined,
        provider?.model || undefined,
        this.selectedCharacter()?.id || undefined,
        this.selectedPersona()?.id || undefined
      );
      this.currentChat.set(chat);
      this.currentChatId.set(chat.id);
      await this.loadChatList();
    } catch {
      this.errorMessage.set('Failed to create new chat');
    }
  }

  async loadChat(chatId: string): Promise<void> {
    try {
      const chat = await this.llmService.getChat(chatId);
      this.currentChat.set(chat);
      this.currentChatId.set(chatId);

      // Restore character selection
      if (chat.characterId) {
        let foundChar: UniverseCharacterSummary | null = null;
        for (const u of this.universes()) {
          foundChar = u.characters.find(c => c.id === chat.characterId) || null;
          if (foundChar) break;
        }
        this.selectedCharacter.set(foundChar);
      } else {
        this.selectedCharacter.set(null);
      }

      // Restore persona selection
      if (chat.personaId) {
        const persona = this.personas().find(p => p.id === chat.personaId) || null;
        this.selectedPersona.set(persona);
      } else {
        this.selectedPersona.set(null);
      }

      this.scrollToBottom();
    } catch {
      this.errorMessage.set('Failed to load chat');
    }
  }

  async deleteExistingChat(chatId: string, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.llmService.deleteChat(chatId);
      if (this.currentChatId() === chatId) {
        this.currentChat.set(null);
        this.currentChatId.set(null);
      }
      await this.loadChatList();
    } catch {
      this.errorMessage.set('Failed to delete chat');
    }
  }

  selectProvider(provider: ProviderInfo): void {
    this.selectedProvider.set(provider);
    this.showProviderDropdown.set(false);
    this.expandedProvider.set(null);
  }

  toggleModelList(provider: ProviderInfo, event: Event): void {
    event.stopPropagation();
    if (this.expandedProvider() === provider.id) {
      this.expandedProvider.set(null);
    } else {
      this.expandedProvider.set(provider.id);
    }
  }

  selectProviderModel(provider: ProviderInfo, model: string): void {
    this.selectedProvider.set({ ...provider, model });
    this.showProviderDropdown.set(false);
    this.expandedProvider.set(null);
  }

  async loadUniverses(): Promise<void> {
    try {
      const universes = await this.llmService.getUniverses();
      this.universes.set(universes);
    } catch {
      // Silent failure – character selection is optional
    }
  }

  toggleCharacterDropdown(event: Event): void {
    event.stopPropagation();
    this.showCharacterDropdown.set(!this.showCharacterDropdown());
  }

  selectCharacter(character: UniverseCharacterSummary | null): void {
    this.selectedCharacter.set(character);
    this.showCharacterDropdown.set(false);
    this.updateCurrentChatSettings();
  }

  async loadPersonas(): Promise<void> {
    try {
      const personas = await this.llmService.getPersonas();
      this.personas.set(personas);
    } catch {
      // Silent failure
    }
  }

  togglePersonaDropdown(event: Event): void {
    event.stopPropagation();
    this.showPersonaDropdown.set(!this.showPersonaDropdown());
  }

  selectPersona(persona: Persona | null): void {
    this.selectedPersona.set(persona);
    this.showPersonaDropdown.set(false);
    this.updateCurrentChatSettings();
  }

  private async updateCurrentChatSettings(): Promise<void> {
    const chat = this.currentChat();
    if (!chat) return;

    try {
      await this.llmService.updateChat(chat.id, {
        characterId: this.selectedCharacter()?.id || null,
        personaId: this.selectedPersona()?.id || null
      });
    } catch {
      // Silent failure
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  onEnterKey(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      ke.preventDefault();
      this.sendCurrentMessage();
    }
  }

  sendQuickPrompt(prompt: string): void {
    this.userMessage = prompt;
    this.sendCurrentMessage();
  }

  async sendCurrentMessage(): Promise<void> {
    const message = this.userMessage.trim();
    const provider = this.selectedProvider();

    if (!message || !provider || this.isLoading()) return;

    this.errorMessage.set(null);
    this.userMessage = '';

    // Create chat if none exists
    if (!this.currentChat()) {
      await this.createNewChat();
    }

    const chat = this.currentChat();
    if (!chat) return;

    // Add user message
    const userMsg: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...(chat.messages || []), userMsg];
    this.currentChat.set({ ...chat, messages: updatedMessages });
    this.scrollToBottom();

    // Generate title from first user message
    let title = chat.title;
    if (chat.title === 'New Chat' && updatedMessages.filter(m => m.role === 'user').length === 1) {
      title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
    }

    let result: StreamResult;
    try {
      result = await this.runStreamRequest(this.buildLlmMessages(updatedMessages));
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.errorMessage.set(err.message);
      } else {
        const error = err as { error?: { error?: string } };
        this.errorMessage.set(error?.error?.error || 'Failed to get response. Check your provider settings.');
      }
      return;
    }

    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: result.content,
      thinking: result.thinking || undefined,
      searches: result.searches?.length ? result.searches : undefined,
      timestamp: new Date().toISOString(),
    };

    const finalMessages = [...updatedMessages, assistantMsg];

    try {
      // Save to server
      const updated = await this.llmService.updateChat(chat.id, {
        messages: finalMessages,
        title,
        provider: provider.id,
        model: provider.model,
      });

      this.currentChat.set(updated);
      await this.loadChatList();
    } catch {
      this.errorMessage.set('Failed to save chat');
    }
  }

  /** Retry the assistant message at `msgIndex`, keeping the old response as an alternative. */
  async retryAssistantMessage(msgIndex: number): Promise<void> {
    const chat = this.currentChat();
    if (!chat || this.isLoading()) return;

    const msg = chat.messages[msgIndex];
    if (!msg || msg.role !== 'assistant') return;

    // Warn before discarding subsequent messages
    const hasFollowing = msgIndex < chat.messages.length - 1;
    if (hasFollowing && !confirm('Retrying this response will remove the messages that follow it. Continue?')) {
      return;
    }

    this.errorMessage.set(null);

    // Build context: everything before this assistant message
    const contextMessages = chat.messages.slice(0, msgIndex);

    let result: StreamResult;
    try {
      result = await this.runStreamRequest(this.buildLlmMessages(contextMessages));
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.errorMessage.set(err.message);
      } else {
        this.errorMessage.set('Failed to get response.');
      }
      return;
    }

    // Build the alternatives list: seed with the current response if not already tracked
    const existingAlts: MessageAlternative[] = msg.alternatives?.length
      ? msg.alternatives
      : [{ content: this.getContentAsString(msg.content), thinking: msg.thinking, searches: msg.searches }];
    const newAlt: MessageAlternative = {
      content: result.content,
      thinking: result.thinking || undefined,
      searches: result.searches?.length ? result.searches : undefined,
    };
    const alternatives = [...existingAlts, newAlt];
    const newIndex = alternatives.length - 1;

    const updatedMsg: ChatMessage = {
      ...msg,
      content: result.content,
      thinking: result.thinking || undefined,
      searches: result.searches?.length ? result.searches : undefined,
      alternatives,
      alternativeIndex: newIndex,
      timestamp: new Date().toISOString(),
    };

    // Replace the retried message and drop all subsequent messages (they depended on the old response)
    const updatedMessages = [...chat.messages.slice(0, msgIndex), updatedMsg];

    try {
      const updated = await this.llmService.updateChat(chat.id, { messages: updatedMessages });
      this.currentChat.set(updated);
      await this.loadChatList();
    } catch {
      this.errorMessage.set('Failed to save updated chat');
    }
  }

  /** Navigate between stored response alternatives for an assistant message. */
  async navigateAlternative(msgIndex: number, direction: number): Promise<void> {
    const chat = this.currentChat();
    if (!chat || this.isLoading()) return;

    const msg = chat.messages[msgIndex];
    if (!msg?.alternatives?.length) return;

    const currentIndex = msg.alternativeIndex ?? 0;
    const newIndex = Math.max(0, Math.min(msg.alternatives.length - 1, currentIndex + direction));
    if (newIndex === currentIndex) return;

    const alt = msg.alternatives[newIndex];
    const updatedMsg: ChatMessage = {
      ...msg,
      content: alt.content,
      thinking: alt.thinking,
      searches: alt.searches,
      alternativeIndex: newIndex,
    };

    const updatedMessages = [
      ...chat.messages.slice(0, msgIndex),
      updatedMsg,
      ...chat.messages.slice(msgIndex + 1),
    ];

    try {
      const updated = await this.llmService.updateChat(chat.id, { messages: updatedMessages });
      this.currentChat.set(updated);
      await this.loadChatList();
    } catch {
      this.errorMessage.set('Failed to save updated chat');
    }
  }

  /** Delete a message. If deleting a user message, the immediately following assistant response is also removed. */
  async deleteMessage(msgIndex: number): Promise<void> {
    const chat = this.currentChat();
    if (!chat || this.isLoading()) return;

    const msgs = [...chat.messages];
    const msg = msgs[msgIndex];
    if (!msg || msg.role === 'system') return;

    this.errorMessage.set(null);

    // When deleting a user message also remove the paired assistant response that follows it
    if (msg.role === 'user' && msgIndex + 1 < msgs.length && msgs[msgIndex + 1].role === 'assistant') {
      msgs.splice(msgIndex, 2);
    } else {
      msgs.splice(msgIndex, 1);
    }

    try {
      const updated = await this.llmService.updateChat(chat.id, { messages: msgs });
      this.currentChat.set(updated);
      await this.loadChatList();
    } catch {
      this.errorMessage.set('Failed to delete message');
    }
  }

  /** Enter inline-edit mode for the user message at `msgIndex`. */
  startEditUserMessage(msgIndex: number): void {
    const chat = this.currentChat();
    if (!chat) return;
    const msg = chat.messages[msgIndex];
    if (!msg || msg.role !== 'user') return;
    this.editingMessageIndex.set(msgIndex);
    this.editingContent = this.getContentAsString(msg.content);
  }

  /** Cancel inline editing without saving. */
  cancelEdit(): void {
    this.editingMessageIndex.set(null);
    this.editingContent = '';
  }

  /** Save the edited user message and re-send from that point in the conversation. */
  async saveUserEdit(msgIndex: number): Promise<void> {
    const newContent = this.editingContent.trim();
    const chat = this.currentChat();
    if (!newContent || !chat || this.isLoading()) return;

    this.errorMessage.set(null);
    this.editingMessageIndex.set(null);
    this.editingContent = '';

    // Replace user message, discard all subsequent messages
    const updatedUserMsg: ChatMessage = {
      ...chat.messages[msgIndex],
      content: newContent,
      timestamp: new Date().toISOString(),
    };

    const messagesUpToEdit = [...chat.messages.slice(0, msgIndex), updatedUserMsg];

    // Optimistic UI update
    this.currentChat.set({ ...chat, messages: messagesUpToEdit });
    this.scrollToBottom();

    let result: StreamResult;
    try {
      result = await this.runStreamRequest(this.buildLlmMessages(messagesUpToEdit));
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.errorMessage.set(err.message);
      } else {
        this.errorMessage.set('Failed to get response.');
      }
      return;
    }

    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: result.content,
      thinking: result.thinking || undefined,
      searches: result.searches?.length ? result.searches : undefined,
      timestamp: new Date().toISOString(),
    };

    const finalMessages = [...messagesUpToEdit, assistantMsg];

    try {
      const updated = await this.llmService.updateChat(chat.id, { messages: finalMessages });
      this.currentChat.set(updated);
      await this.loadChatList();
    } catch {
      this.errorMessage.set('Failed to save updated chat');
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Prepend the system prompt and strip any stored system messages from the chat history. */
  private buildLlmMessages(chatMessages: ChatMessage[]): ChatMessage[] {
    const systemPrompt: ChatMessage = {
      role: 'system',
      content: 'You are a helpful, knowledgeable, and friendly AI assistant. Provide clear, accurate, and well-structured responses. When appropriate, use markdown formatting like headings, lists, code blocks, and emphasis for readability.',
    };
    return [systemPrompt, ...chatMessages.filter(m => m.role !== 'system')];
  }

  /** Set up streaming state, call the LLM, and clean up when done. */
  private async runStreamRequest(llmMessages: ChatMessage[]): Promise<StreamResult> {
    const provider = this.selectedProvider();
    if (!provider) throw new Error('No provider selected');

    this.isLoading.set(true);
    this.streamingThinking.set('');
    this.streamingContent.set('');
    this.streamingSearches.set([]);
    this.thinkingDone.set(false);

    const options: SendMessageOptions = {};
    if (this.webSearchEnabled()) options.webSearch = true;
    if (this.thinkEnabled()) options.think = true;
    if (this.selectedCharacter()) options.characterId = this.selectedCharacter()?.id;
    if (this.selectedPersona()) options.personaId = this.selectedPersona()?.id;

    try {
      return await this.llmService.sendMessageStream(
        llmMessages,
        provider.id,
        provider.model || '',
        options,
        {
          onThinking: (content) => {
            this.streamingThinking.update(t => t + content);
            this.scrollToBottom();
          },
          onContent: (content) => {
            if (!this.thinkingDone() && this.streamingThinking()) {
              this.thinkingDone.set(true);
            }
            this.streamingContent.update(c => c + content);
            this.scrollToBottom();
          },
          onSearch: (data) => {
            this.streamingSearches.update(s => {
              // Replace a "searching" event with "searched" for the same query
              if (data.status === 'searched') {
                const idx = s.findIndex(e => e.status === 'searching' && e.query === data.query);
                if (idx >= 0) {
                  const updated = [...s];
                  updated[idx] = data;
                  return updated;
                }
              }
              return [...s, data];
            });
            this.scrollToBottom();
          },
          onDone: () => {
            this.thinkingDone.set(true);
          },
        }
      );
    } finally {
      this.isLoading.set(false);
      this.streamingThinking.set('');
      this.streamingContent.set('');
      this.streamingSearches.set([]);
      this.thinkingDone.set(false);
      this.scrollToBottom();
    }
  }

  private static readonly MARKDOWN_CACHE_MAX_SIZE = 500;
  private readonly markdownCache = new Map<string, string>();

  renderMarkdown(text: string): string {
    if (!text) {
      return '';
    }

    const cached = this.markdownCache.get(text);
    if (cached !== undefined) {
      return cached;
    }

    // Escape raw HTML so it is treated as text by marked and cannot produce live elements
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    try {
      // marked.parse with default settings converts markdown to HTML.
      // Angular's [innerHTML] binding sanitizes the output (strips <script>, event handlers, etc.)
      // providing defense-in-depth against XSS from AI/user content.
      const html = marked.parse(escapedText, { breaks: true, gfm: true }) as string;
      if (this.markdownCache.size >= GeneralAssistantPageComponent.MARKDOWN_CACHE_MAX_SIZE) {
        this.markdownCache.clear();
      }
      this.markdownCache.set(text, html);
      return html;
    } catch {
      // Fallback: return the safely escaped text if markdown parsing fails
      if (this.markdownCache.size >= GeneralAssistantPageComponent.MARKDOWN_CACHE_MAX_SIZE) {
        this.markdownCache.clear();
      }
      this.markdownCache.set(text, escapedText);
      return escapedText;
    }
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer?.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }

  getContentAsString(content: string | any[]): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map(p => p.text || '').join('\n');
    }
    return '';
  }
}
