import { Injectable } from '@angular/core';
import {
  Chat,
  ChatMessage,
  ChatSummary,
  LlmService,
  ProviderInfo,
  ProviderKeyStatus,
  SendMessageOptions,
  StreamCallbacks,
  StreamResult,
  UniverseSummary,
} from '../llm.service';

@Injectable({
  providedIn: 'root',
})
export class MockLlmService {
  async getProviders(): Promise<ProviderInfo[]> {
    return [
      { id: 'openai', name: 'OpenAI', model: 'gpt-4o', available: true, models: ['gpt-4o', 'gpt-4o-mini'] },
      { id: 'anthropic', name: 'Anthropic', model: 'claude-3-5-sonnet', available: true, models: ['claude-3-5-sonnet', 'claude-3-opus'] },
    ];
  }

  async getApiKeyStatus(): Promise<Record<string, ProviderKeyStatus>> {
    return {
      openai: { configured: true, selectedModel: 'gpt-4o' },
      anthropic: { configured: true, selectedModel: 'claude-3-5-sonnet' },
    };
  }

  async setApiKey(provider: string, apiKey: string, selectedModel?: string): Promise<void> {}
  async removeApiKey(provider: string): Promise<void> {}
  async setProviderModel(provider: string, selectedModel: string): Promise<void> {}

  async getKoboldStatus(): Promise<{ available: boolean; model: string }> {
    return { available: false, model: '' };
  }

  async getOllamaStatus(): Promise<{ available: boolean; models: string[] }> {
    return { available: false, models: [] };
  }

  async getUniverses(): Promise<UniverseSummary[]> {
    return [];
  }

  async listChats(): Promise<ChatSummary[]> {
    return [
      { id: '1', title: 'Welcome Chat', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), provider: 'openai', model: 'gpt-4o' },
      { id: '2', title: 'Code Refactor', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), provider: 'anthropic', model: 'claude-3-5-sonnet' },
    ];
  }

  async createChat(provider?: string, model?: string): Promise<Chat> {
    return {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New Preview Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provider: provider || 'openai',
      model: model || 'gpt-4o',
    };
  }

  async getChat(id: string): Promise<Chat> {
    return {
      id,
      title: id === '1' ? 'Welcome Chat' : 'Code Refactor',
      messages: [
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'This is a preview response.\n\nHere is some example code:\n\n```python\nprint("Hello, World!")\n```\n\nHope you enjoy the preview!' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provider: 'openai',
      model: 'gpt-4o',
    };
  }

  async updateChat(id: string, data: Partial<Chat>): Promise<Chat> {
    const chat = await this.getChat(id);
    return { ...chat, ...data };
  }

  async deleteChat(id: string): Promise<void> {}

  async sendMessageStream(
    messages: ChatMessage[],
    provider: string,
    model: string,
    options?: SendMessageOptions,
    callbacks?: StreamCallbacks
  ): Promise<StreamResult> {
    const content = 'This is a preview response.\n\nIn preview mode, all AI interactions are simulated to show you how the interface looks and feels.\n\nHere is an example of what a code block looks like:\n\n```typescript\nfunction greet(name: string) {\n  console.log(`Hello, ${name}!`);\n}\n```\n\nFeel free to explore the rest of the application!';
    const thinking = 'Thinking about how to provide a helpful preview response...';

    // Simulate streaming
    const chunks = content.split(' ');
    for (let i = 0; i < chunks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      callbacks?.onContent?.(chunks[i] + (i === chunks.length - 1 ? '' : ' '));
    }

    const result = { content, thinking, searches: [] };
    callbacks?.onDone?.(result);
    return result;
  }
}
