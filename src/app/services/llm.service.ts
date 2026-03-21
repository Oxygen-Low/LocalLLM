import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
  thinking?: string;
  searches?: SearchEvent[];
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  provider: string | null;
  model: string | null;
}

export interface ChatSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  provider: string | null;
  model: string | null;
}

export interface ProviderInfo {
  id: string;
  name: string;
  model: string | null;
  available: boolean;
}

export interface SendMessageOptions {
  webSearch?: boolean;
  think?: boolean;
}

export interface ProviderKeyStatus {
  configured: boolean;
  selectedModel: string | null;
}

export interface SearchEvent {
  status: 'searching' | 'searched';
  query: string;
  url?: string;
}

export interface StreamCallbacks {
  onThinking?: (content: string) => void;
  onContent?: (content: string) => void;
  onSearch?: (data: SearchEvent) => void;
  onDone?: (data: StreamResult) => void;
  onError?: (error: string) => void;
}

export interface StreamResult {
  content: string;
  thinking: string;
  searches: SearchEvent[];
}

@Injectable({
  providedIn: 'root',
})
export class LlmService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // --- Providers ---

  async getProviders(): Promise<ProviderInfo[]> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; providers: ProviderInfo[] }>(
        `${environment.apiUrl}/api/providers`
      )
    );
    return res.providers || [];
  }

  // --- API Keys ---

  async getApiKeyStatus(): Promise<Record<string, ProviderKeyStatus>> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; providers: Record<string, ProviderKeyStatus> }>(
        `${environment.apiUrl}/api/user/api-keys`
      )
    );
    return res.providers || {};
  }

  async setApiKey(provider: string, apiKey: string, selectedModel?: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`${environment.apiUrl}/api/user/api-keys/${provider}`, {
        apiKey,
        selectedModel,
      })
    );
  }

  async removeApiKey(provider: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/user/api-keys/${provider}`)
    );
  }

  async setProviderModel(provider: string, selectedModel: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`${environment.apiUrl}/api/user/api-keys/${provider}/model`, {
        selectedModel,
      })
    );
  }

  // --- Kobold.cpp ---

  async getKoboldStatus(): Promise<{ available: boolean; model: string }> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; available: boolean; model?: string }>(
        `${environment.apiUrl}/api/kobold/status`
      )
    );
    return { available: res.available, model: res.model || '' };
  }

  // --- Chats ---

  async listChats(): Promise<ChatSummary[]> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; chats: ChatSummary[] }>(
        `${environment.apiUrl}/api/chats`
      )
    );
    return res.chats || [];
  }

  async createChat(provider?: string, model?: string): Promise<Chat> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; chat: Chat }>(
        `${environment.apiUrl}/api/chats`,
        { provider, model }
      )
    );
    return res.chat;
  }

  async getChat(id: string): Promise<Chat> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; chat: Chat }>(
        `${environment.apiUrl}/api/chats/${id}`
      )
    );
    return res.chat;
  }

  async updateChat(id: string, data: Partial<Chat>): Promise<Chat> {
    const res = await firstValueFrom(
      this.http.put<{ success: boolean; chat: Chat }>(
        `${environment.apiUrl}/api/chats/${id}`,
        data
      )
    );
    return res.chat;
  }

  async deleteChat(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/chats/${id}`)
    );
  }

  // --- Send message (streaming via SSE) ---

  async sendMessageStream(
    messages: ChatMessage[],
    provider: string,
    model: string,
    options?: SendMessageOptions,
    callbacks?: StreamCallbacks
  ): Promise<StreamResult> {
    const token = this.authService.getSessionToken();
    const body: Record<string, unknown> = { messages, provider, model };
    if (options?.webSearch) body['webSearch'] = true;
    if (options?.think) body['think'] = true;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${environment.apiUrl}/api/chat/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw { error: errorData };
    }

    const result: StreamResult = { content: '', thinking: '', searches: [] };
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split('\n\n');
        buffer = segments.pop() || '';

        for (const segment of segments) {
          if (!segment.trim()) continue;
          const lines = segment.split('\n');
          let eventType = '';
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            else if (line.startsWith('data: ')) eventData += line.slice(6);
            else if (line.startsWith('data:')) eventData += line.slice(5);
          }

          if (!eventType || !eventData) continue;

          try {
            const data = JSON.parse(eventData);
            switch (eventType) {
              case 'thinking':
                result.thinking += data.content || '';
                callbacks?.onThinking?.(data.content || '');
                break;
              case 'content':
                result.content += data.content || '';
                callbacks?.onContent?.(data.content || '');
                break;
              case 'search':
                result.searches.push(data);
                callbacks?.onSearch?.(data);
                break;
              case 'done':
                callbacks?.onDone?.(result);
                break;
              case 'error':
                callbacks?.onError?.(data.error || 'Unknown error');
                throw new Error(data.error || 'Stream error');
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message === 'Stream error') throw parseErr;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return result;
  }

  /** @deprecated Use sendMessageStream for streaming support */
  async sendMessage(
    messages: ChatMessage[],
    provider: string,
    model: string,
    options?: SendMessageOptions
  ): Promise<ChatMessage> {
    const body: Record<string, unknown> = { messages, provider, model };
    if (options?.webSearch) body['webSearch'] = true;
    if (options?.think) body['think'] = true;
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; message: ChatMessage }>(
        `${environment.apiUrl}/api/chat/send`,
        body
      )
    );
    return res.message;
  }
}
