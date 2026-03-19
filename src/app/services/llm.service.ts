import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
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

export interface ProviderKeyStatus {
  configured: boolean;
  selectedModel: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class LlmService {
  private http = inject(HttpClient);

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

  // --- Send message ---

  async sendMessage(
    messages: ChatMessage[],
    provider: string,
    model: string
  ): Promise<ChatMessage> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; message: ChatMessage }>(
        `${environment.apiUrl}/api/chat/send`,
        { messages, provider, model }
      )
    );
    return res.message;
  }
}
