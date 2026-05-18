import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface MessageAlternative {
  content: string;
  thinking?: string;
  searches?: SearchEvent[];
}

export interface MessageContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContentPart[];
  displayContent?: string;
  timestamp?: string;
  thinking?: string;
  searches?: SearchEvent[];
  /** Stored alternatives for AI messages (populated on retry). */
  alternatives?: MessageAlternative[];
  /** Index into `alternatives` for the currently displayed response. */
  alternativeIndex?: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  provider: string | null;
  model: string | null;
  characterId?: string | null;
  personaId?: string | null;
}

export interface ChatSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  provider: string | null;
  model: string | null;
  characterId?: string | null;
  personaId?: string | null;
}

export interface ProviderInfo {
  id: string;
  name: string;
  model: string | null;
  models?: Array<string | { id: string; name: string }>;
  available: boolean;
}

export interface SendMessageOptions {
  webSearch?: boolean;
  think?: boolean;
  characterId?: string;
  personaId?: string;
  mcpServerIds?: string[];
}

export interface McpServerInfo {
  id: string;
  name: string;
  description: string;
  authRequired: boolean;
  authDescription: string;
  authenticated: boolean;
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

export interface UniverseCharacterSummary {
  id: string;
  name: string;
}

export interface UniverseSummary {
  id: string;
  name: string;
  characters: UniverseCharacterSummary[];
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdventureBookEntry {
  entry: string;
  timestamp: string;
  type: 'narrator' | 'action';
}

export interface Adventure {
  id: string;
  title: string;
  status: 'playing' | 'ended';
  universeId: string;
  universeName: string;
  personaId: string;
  personaName: string;
  npcIds: string[];
  npcNames?: Array<{ id: string; name: string }>;
  narratorConfig: { provider: string; model: string };
  characterConfig: { provider: string; model: string };
  books: Record<string, AdventureBookEntry[]>;
  createdAt: string;
  updatedAt: string;
}

export interface AdventureSummary {
  id: string;
  title: string;
  status: 'playing' | 'ended';
  universeName: string;
  personaName: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class LlmService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private supabase: SupabaseClient | null = null;
  private useSupabase = signal(false);
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.checkSupabaseMode();
  }

  /** Ensures the service and its dependencies (AuthService) are fully initialized before use. */
  async ensureInitialized(): Promise<void> {
    await this.initPromise;
    await this.authService.ensureInitialized();
  }

  private async checkSupabaseMode(): Promise<void> {
    try {
      const resp = await firstValueFrom(
        this.http.get<{ success: boolean; useSupabase: boolean }>(`${environment.apiUrl}/api/settings/supabase`)
      );
      if (resp.useSupabase && environment.supabaseUrl && environment.supabaseKey) {
        this.useSupabase.set(true);
        this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
      }
    } catch {
      // Ignore
    }
  }

  // --- Providers ---

  async getProviders(): Promise<ProviderInfo[]> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; providers: ProviderInfo[] }>(
        `${environment.apiUrl}/api/providers`
      )
    );
    return res.providers || [];
  }

  // --- API Keys ---

  async getApiKeyStatus(): Promise<Record<string, ProviderKeyStatus>> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; providers: Record<string, ProviderKeyStatus> }>(
        `${environment.apiUrl}/api/user/api-keys`
      )
    );
    return res.providers || {};
  }

  async setApiKey(provider: string, apiKey: string, selectedModel?: string): Promise<void> {
    await this.ensureInitialized();
    await firstValueFrom(
      this.http.put(`${environment.apiUrl}/api/user/api-keys/${provider}`, {
        apiKey,
        selectedModel,
      })
    );
  }

  async removeApiKey(provider: string): Promise<void> {
    await this.ensureInitialized();
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/user/api-keys/${provider}`)
    );
  }

  // --- HuggingFace Integration ---

  async getHuggingFaceStatus(): Promise<{ configured: boolean; username: string | null }> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; configured: boolean; username: string | null }>(
        `${environment.apiUrl}/api/user/integrations/huggingface/status`
      )
    );
    return { configured: res.configured, username: res.username };
  }

  async setHuggingFaceToken(token: string): Promise<{ username: string | null }> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.put<{ success: boolean; username: string | null }>(
        `${environment.apiUrl}/api/user/integrations/huggingface`,
        { token }
      )
    );
    return { username: res.username };
  }

  async removeHuggingFaceToken(): Promise<void> {
    await this.ensureInitialized();
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/user/integrations/huggingface`)
    );
  }

  async setProviderModel(provider: string, selectedModel: string): Promise<void> {
    await this.ensureInitialized();
    await firstValueFrom(
      this.http.put(`${environment.apiUrl}/api/user/api-keys/${provider}/model`, {
        selectedModel,
      })
    );
  }

  // --- Local Models ---

  async getLocalModels(): Promise<{ id: string; name: string; huggingFaceId: string; type?: string; size: number; downloadedAt: string }[]> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; models: { id: string; name: string; huggingFaceId: string; type?: string; size: number; downloadedAt: string }[] }>(
        `${environment.apiUrl}/api/local-models`
      )
    );
    return res.models || [];
  }

  // --- Universes ---

  async getUniverses(): Promise<UniverseSummary[]> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; universes: UniverseSummary[] }>(
        `${environment.apiUrl}/api/universes`
      )
    );
    return res.universes || [];
  }

  // --- Personas ---

  async getPersonas(): Promise<Persona[]> {
    await this.ensureInitialized();
    if (this.useSupabase() && this.authService.username() !== 'admin' && this.supabase) {
      const { data: userData } = await this.supabase.auth.getUser();
      if (!userData.user) return [];

      const { data, error } = await this.supabase
        .from('personas')
        .select('id, data, created_at, updated_at')
        .eq('user_id', userData.user.id);

      if (error) throw error;
      return (data || []).map(p => ({
        id: p.id,
        ...p.data,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));
    }

    const res = await firstValueFrom(
      this.http.get<{ success: boolean; personas: Persona[] }>(
        `${environment.apiUrl}/api/user/personas`
      )
    );
    return res.personas || [];
  }

  async createPersona(name: string, description: string): Promise<Persona> {
    await this.ensureInitialized();
    if (this.useSupabase() && this.authService.username() !== 'admin' && this.supabase) {
      const { data: userData } = await this.supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated with Supabase');

      const personaData = { name, description };
      const { data, error } = await this.supabase
        .from('personas')
        .insert([{ user_id: userData.user.id, data: personaData }])
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        ...data.data,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }

    const res = await firstValueFrom(
      this.http.post<{ success: boolean; persona: Persona }>(
        `${environment.apiUrl}/api/user/personas`,
        { name, description }
      )
    );
    return res.persona;
  }

  async updatePersona(id: string, name: string, description: string): Promise<Persona> {
    await this.ensureInitialized();
    if (this.useSupabase() && this.authService.username() !== 'admin' && this.supabase) {
      const personaData = { name, description };
      const { data, error } = await this.supabase
        .from('personas')
        .update({ data: personaData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        ...data.data,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }

    const res = await firstValueFrom(
      this.http.put<{ success: boolean; persona: Persona }>(
        `${environment.apiUrl}/api/user/personas/${id}`,
        { name, description }
      )
    );
    return res.persona;
  }

  async deletePersona(id: string): Promise<void> {
    await this.ensureInitialized();
    if (this.useSupabase() && this.authService.username() !== 'admin' && this.supabase) {
      const { error } = await this.supabase
        .from('personas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return;
    }

    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/user/personas/${id}`)
    );
  }

  async getDefaultPersonaId(): Promise<string | null> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; defaultPersonaId: string | null }>(
        `${environment.apiUrl}/api/user/settings/default-persona`
      )
    );
    return res.defaultPersonaId;
  }

  async setDefaultPersonaId(personaId: string | null): Promise<void> {
    await this.ensureInitialized();
    await firstValueFrom(
      this.http.put(`${environment.apiUrl}/api/user/settings/default-persona`, {
        personaId,
      })
    );
  }

  // --- Chats ---

  async listChats(): Promise<ChatSummary[]> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; chats: ChatSummary[] }>(
        `${environment.apiUrl}/api/chats`
      )
    );
    return res.chats || [];
  }

  async createChat(provider?: string, model?: string, characterId?: string, personaId?: string): Promise<Chat> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; chat: Chat }>(
        `${environment.apiUrl}/api/chats`,
        { provider, model, characterId, personaId }
      )
    );
    return res.chat;
  }

  async getChat(id: string): Promise<Chat> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; chat: Chat }>(
        `${environment.apiUrl}/api/chats/${id}`
      )
    );
    return res.chat;
  }

  async updateChat(id: string, data: Partial<Chat>): Promise<Chat> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.put<{ success: boolean; chat: Chat }>(
        `${environment.apiUrl}/api/chats/${id}`,
        data
      )
    );
    return res.chat;
  }

  async deleteChat(id: string): Promise<void> {
    await this.ensureInitialized();
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/chats/${id}`)
    );
  }

  // --- Adventures ---

  async listAdventures(): Promise<AdventureSummary[]> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; adventures: AdventureSummary[] }>(
        `${environment.apiUrl}/api/adventures`
      )
    );
    return res.adventures || [];
  }

  async createAdventure(data: {
    title?: string;
    universeId: string;
    personaId: string;
    npcIds: string[];
    narratorConfig: { provider: string; model: string };
    characterConfig: { provider: string; model: string };
  }): Promise<Adventure> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; adventure: Adventure }>(
        `${environment.apiUrl}/api/adventures`,
        data
      )
    );
    return res.adventure;
  }

  async getAdventure(id: string): Promise<Adventure> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; adventure: Adventure }>(
        `${environment.apiUrl}/api/adventures/${id}`
      )
    );
    return res.adventure;
  }

  async executeAdventureTurn(id: string, action: string | 'skip'): Promise<{
    adventure: Adventure; somethingHappened: boolean }> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; adventure: Adventure; somethingHappened: boolean }>(
        `${environment.apiUrl}/api/adventures/${id}/turn`,
        { action }
      )
    );
    return { adventure: res.adventure, somethingHappened: res.somethingHappened };
  }

  async updateAdventureState(id: string, status: 'playing' | 'ended'): Promise<Adventure> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; adventure: Adventure }>(
        `${environment.apiUrl}/api/adventures/${id}/state`,
        { status }
      )
    );
    return res.adventure;
  }

  async deleteAdventure(id: string): Promise<void> {
    await this.ensureInitialized();
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/adventures/${id}`)
    );
  }

  // --- Send message (streaming via SSE) ---

  async sendMessageStream(messages: ChatMessage[],
    provider: string,
    model: string,
    options?: SendMessageOptions,
    callbacks?: StreamCallbacks
  ): Promise<StreamResult> {
    await this.ensureInitialized();
    const token = this.authService.getSessionToken();
    const body: Record<string, unknown> = { messages, provider, model };
    if (options?.webSearch) body['webSearch'] = true;
    if (options?.think) body['think'] = true;
    if (options?.characterId) body['characterId'] = options.characterId;
    if (options?.personaId) body['personaId'] = options.personaId;
    if (options?.mcpServerIds?.length) body['mcpServerIds'] = options.mcpServerIds;

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
    const responseBody = response.body;
    if (!responseBody) {
      throw new Error(
        'Streaming response body is missing. The server may have returned an empty response or the stream was already consumed.'
      );
    }
    const reader = (responseBody as ReadableStream<Uint8Array>).getReader();
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
              case 'done': {
                // Use the server's finalized payload to correct any missed/incomplete data
                if (data.content != null) result.content = data.content;
                if (data.thinking != null) result.thinking = data.thinking;
                if (Array.isArray(data.searches)) result.searches = data.searches;
                callbacks?.onDone?.(result);
                break;
              }
              case 'error': {
                const errMsg = data.error || 'Stream error';
                callbacks?.onError?.(errMsg);
                const streamErr = new Error(errMsg);
                streamErr.name = 'StreamError';
                throw streamErr;
              }
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.name === 'StreamError') throw parseErr;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return result;
  }

  /** @deprecated Use sendMessageStream for streaming support */
  async sendMessage(messages: ChatMessage[],
    provider: string,
    model: string,
    options?: SendMessageOptions
  ): Promise<ChatMessage> {
    await this.ensureInitialized();
    const body: Record<string, unknown> = { messages, provider, model };
    if (options?.webSearch) body['webSearch'] = true;
    if (options?.think) body['think'] = true;
    if (options?.characterId) body['characterId'] = options.characterId;
    if (options?.personaId) body['personaId'] = options.personaId;
    if (options?.mcpServerIds?.length) body['mcpServerIds'] = options.mcpServerIds;
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; message: ChatMessage }>(
        `${environment.apiUrl}/api/chat/send`,
        body
      )
    );
    return res.message;
  }

  // --- MCP Servers ---

  async getMcpServers(): Promise<McpServerInfo[]> {
    await this.ensureInitialized();
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; servers: McpServerInfo[] }>(
        `${environment.apiUrl}/api/mcp-servers`
      )
    );
    return res.servers || [];
  }

  async setMcpAuth(serverId: string, token: string): Promise<{ success: boolean }> {
    await this.ensureInitialized();
    return firstValueFrom(
      this.http.put<{ success: boolean }>(
        `${environment.apiUrl}/api/user/mcp-auth/${serverId}`,
        { token }
      )
    );
  }

  async removeMcpAuth(serverId: string): Promise<{ success: boolean }> {
    await this.ensureInitialized();
    return firstValueFrom(
      this.http.delete<{ success: boolean }>(
        `${environment.apiUrl}/api/user/mcp-auth/${serverId}`
      )
    );
  }

  async getMcpAuthStatus(serverId: string): Promise<{ configured: boolean; serverName: string; authRequired: boolean }> {
    await this.ensureInitialized();
    return firstValueFrom(
      this.http.get<{ configured: boolean; serverName: string; authRequired: boolean }>(
        `${environment.apiUrl}/api/user/mcp-auth/${serverId}/status`
      )
    );
  }
}
