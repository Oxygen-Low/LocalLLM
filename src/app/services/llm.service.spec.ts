import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LlmService } from './llm.service';
import { AuthService } from './auth.service';
import { vi } from 'vitest';

describe('LlmService', () => {
  let service: LlmService;
  let httpMock: HttpTestingController;

  const mockAuthService = {
    getSessionToken: () => 'test-token',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LlmService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
    service = TestBed.inject(LlmService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getProviders', () => {
    it('should fetch provider list', async () => {
      const mockProviders = [
        { id: 'openai', name: 'OpenAI', model: 'gpt-4', available: true },
      ];
      const promise = service.getProviders();
      const req = httpMock.expectOne('/api/providers');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, providers: mockProviders });
      const result = await promise;
      expect(result).toEqual(mockProviders);
    });

    it('should return empty array when providers is undefined', async () => {
      const promise = service.getProviders();
      const req = httpMock.expectOne('/api/providers');
      req.flush({ success: true });
      const result = await promise;
      expect(result).toEqual([]);
    });
  });

  describe('getApiKeyStatus', () => {
    it('should fetch API key status for all providers', async () => {
      const mockStatus = {
        openai: { configured: true, selectedModel: 'gpt-4' },
        anthropic: { configured: false, selectedModel: null },
      };
      const promise = service.getApiKeyStatus();
      const req = httpMock.expectOne('/api/user/api-keys');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, providers: mockStatus });
      const result = await promise;
      expect(result).toEqual(mockStatus);
    });
  });

  describe('setApiKey', () => {
    it('should send PUT request with API key and model', async () => {
      const promise = service.setApiKey('openai', 'sk-test-key', 'gpt-4');
      const req = httpMock.expectOne('/api/user/api-keys/openai');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ apiKey: 'sk-test-key', selectedModel: 'gpt-4' });
      req.flush({ success: true });
      await promise;
    });
  });

  describe('removeApiKey', () => {
    it('should send DELETE request for provider', async () => {
      const promise = service.removeApiKey('openai');
      const req = httpMock.expectOne('/api/user/api-keys/openai');
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
      await promise;
    });
  });

  describe('listChats', () => {
    it('should fetch chat list', async () => {
      const mockChats = [
        { id: '1', title: 'Chat 1', createdAt: '2026-01-01', updatedAt: '2026-01-01', provider: null, model: null },
      ];
      const promise = service.listChats();
      const req = httpMock.expectOne('/api/chats');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, chats: mockChats });
      const result = await promise;
      expect(result).toEqual(mockChats);
    });
  });

  describe('createChat', () => {
    it('should create a new chat', async () => {
      const mockChat = {
        id: '123', title: 'New Chat', messages: [],
        createdAt: '2026-01-01', updatedAt: '2026-01-01',
        provider: 'openai', model: 'gpt-4',
      };
      const promise = service.createChat('openai', 'gpt-4');
      const req = httpMock.expectOne('/api/chats');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ provider: 'openai', model: 'gpt-4' });
      req.flush({ success: true, chat: mockChat });
      const result = await promise;
      expect(result.id).toBe('123');
    });
  });

  describe('getChat', () => {
    it('should fetch a specific chat by ID', async () => {
      const mockChat = {
        id: 'abc', title: 'Test', messages: [],
        createdAt: '2026-01-01', updatedAt: '2026-01-01',
        provider: null, model: null,
      };
      const promise = service.getChat('abc');
      const req = httpMock.expectOne('/api/chats/abc');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, chat: mockChat });
      const result = await promise;
      expect(result.id).toBe('abc');
    });
  });

  describe('updateChat', () => {
    it('should send PUT request with update data', async () => {
      const mockChat = {
        id: 'abc', title: 'Updated', messages: [],
        createdAt: '2026-01-01', updatedAt: '2026-01-01',
        provider: null, model: null,
      };
      const promise = service.updateChat('abc', { title: 'Updated' });
      const req = httpMock.expectOne('/api/chats/abc');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ title: 'Updated' });
      req.flush({ success: true, chat: mockChat });
      const result = await promise;
      expect(result.title).toBe('Updated');
    });
  });

  describe('deleteChat', () => {
    it('should send DELETE request for chat', async () => {
      const promise = service.deleteChat('abc');
      const req = httpMock.expectOne('/api/chats/abc');
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
      await promise;
    });
  });

  describe('sendMessage', () => {
    it('should send messages and return assistant response', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const mockResponse = { role: 'assistant' as const, content: 'Hi there!' };
      const promise = service.sendMessage(messages, 'openai', 'gpt-4');
      const req = httpMock.expectOne('/api/chat/send');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ messages, provider: 'openai', model: 'gpt-4' });
      req.flush({ success: true, message: mockResponse });
      const result = await promise;
      expect(result.role).toBe('assistant');
      expect(result.content).toBe('Hi there!');
    });

    it('should include webSearch flag when enabled', async () => {
      const messages = [{ role: 'user' as const, content: 'Search something' }];
      const mockResponse = { role: 'assistant' as const, content: 'Found it!' };
      const promise = service.sendMessage(messages, 'openai', 'gpt-4', { webSearch: true });
      const req = httpMock.expectOne('/api/chat/send');
      expect(req.request.body).toEqual({ messages, provider: 'openai', model: 'gpt-4', webSearch: true });
      req.flush({ success: true, message: mockResponse });
      await promise;
    });

    it('should include think flag when enabled', async () => {
      const messages = [{ role: 'user' as const, content: 'Think about this' }];
      const mockResponse = { role: 'assistant' as const, content: 'Thought about it!' };
      const promise = service.sendMessage(messages, 'openai', 'gpt-4', { think: true });
      const req = httpMock.expectOne('/api/chat/send');
      expect(req.request.body).toEqual({ messages, provider: 'openai', model: 'gpt-4', think: true });
      req.flush({ success: true, message: mockResponse });
      await promise;
    });

    it('should include both flags when both enabled', async () => {
      const messages = [{ role: 'user' as const, content: 'Search and think' }];
      const mockResponse = { role: 'assistant' as const, content: 'Done!' };
      const promise = service.sendMessage(messages, 'openai', 'gpt-4', { webSearch: true, think: true });
      const req = httpMock.expectOne('/api/chat/send');
      expect(req.request.body).toEqual({ messages, provider: 'openai', model: 'gpt-4', webSearch: true, think: true });
      req.flush({ success: true, message: mockResponse });
      await promise;
    });

    it('should not include flags when options are false', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const mockResponse = { role: 'assistant' as const, content: 'Hi!' };
      const promise = service.sendMessage(messages, 'openai', 'gpt-4', { webSearch: false, think: false });
      const req = httpMock.expectOne('/api/chat/send');
      expect(req.request.body).toEqual({ messages, provider: 'openai', model: 'gpt-4' });
      req.flush({ success: true, message: mockResponse });
      await promise;
    });
  });

  describe('getLocalModels', () => {
    it('should fetch local models list', async () => {
      const promise = service.getLocalModels();
      const req = httpMock.expectOne('/api/local-models');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, models: [{ id: 'abc', name: 'Test Model', huggingFaceId: 'test/model', size: 1024, downloadedAt: '2025-01-01' }] });
      const result = await promise;
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Test Model');
    });

    it('should return empty array when no models', async () => {
      const promise = service.getLocalModels();
      const req = httpMock.expectOne('/api/local-models');
      req.flush({ success: true, models: [] });
      const result = await promise;
      expect(result).toEqual([]);
    });
  });

  describe('sendMessageStream', () => {
    // Helper to create a ReadableStream from SSE event strings
    function createSSEStream(events: string[]): ReadableStream<Uint8Array> {
      const encoder = new TextEncoder();
      const sseText = events.join('');
      return new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(sseText));
          controller.close();
        },
      });
    }

    function mockFetchResponse(status: number, body: ReadableStream<Uint8Array> | object): void {
      const isStream = body instanceof ReadableStream;
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: status >= 200 && status < 300,
        status,
        body: isStream ? body : null,
        json: () => Promise.resolve(body),
        headers: new Headers(),
      } as Response);
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should parse SSE content events and return result', async () => {
      const stream = createSSEStream([
        'event: content\ndata: {"content":"Hello "}\n\n',
        'event: content\ndata: {"content":"world!"}\n\n',
        'event: done\ndata: {}\n\n',
      ]);
      mockFetchResponse(200, stream);

      const result = await service.sendMessageStream(
        [{ role: 'user', content: 'Hi' }],
        'openai',
        'gpt-4'
      );

      expect(result.content).toBe('Hello world!');
      expect(result.thinking).toBe('');
    });

    it('should parse SSE thinking events', async () => {
      const stream = createSSEStream([
        'event: thinking\ndata: {"content":"Let me think..."}\n\n',
        'event: content\ndata: {"content":"The answer is 42"}\n\n',
        'event: done\ndata: {}\n\n',
      ]);
      mockFetchResponse(200, stream);

      const result = await service.sendMessageStream(
        [{ role: 'user', content: 'Think about this' }],
        'openai',
        'gpt-4',
        { think: true }
      );

      expect(result.thinking).toBe('Let me think...');
      expect(result.content).toBe('The answer is 42');
    });

    it('should parse SSE search events', async () => {
      const stream = createSSEStream([
        'event: search\ndata: {"status":"searching","query":"test query"}\n\n',
        'event: content\ndata: {"content":"Found results"}\n\n',
        'event: search\ndata: {"status":"searched","query":"test query","url":"https://example.com"}\n\n',
        'event: done\ndata: {}\n\n',
      ]);
      mockFetchResponse(200, stream);

      const result = await service.sendMessageStream(
        [{ role: 'user', content: 'Search for something' }],
        'openai',
        'gpt-4',
        { webSearch: true }
      );

      expect(result.searches.length).toBe(2);
      expect(result.searches[0].status).toBe('searching');
      expect(result.searches[1].status).toBe('searched');
      expect(result.searches[1].url).toBe('https://example.com');
    });

    it('should call callbacks for each event type', async () => {
      const stream = createSSEStream([
        'event: thinking\ndata: {"content":"hmm"}\n\n',
        'event: content\ndata: {"content":"ok"}\n\n',
        'event: search\ndata: {"status":"searched","query":"q"}\n\n',
        'event: done\ndata: {}\n\n',
      ]);
      mockFetchResponse(200, stream);

      const thinkingChunks: string[] = [];
      const contentChunks: string[] = [];
      const searchEvents: unknown[] = [];
      let doneCalled = false;

      await service.sendMessageStream(
        [{ role: 'user', content: 'test' }],
        'openai',
        'gpt-4',
        {},
        {
          onThinking: (c) => thinkingChunks.push(c),
          onContent: (c) => contentChunks.push(c),
          onSearch: (d) => searchEvents.push(d),
          onDone: () => { doneCalled = true; },
        }
      );

      expect(thinkingChunks).toEqual(['hmm']);
      expect(contentChunks).toEqual(['ok']);
      expect(searchEvents.length).toBe(1);
      expect(doneCalled).toBe(true);
    });

    it('should throw on non-ok response', async () => {
      mockFetchResponse(400, { success: false, error: 'Bad request' });

      await expect(
        service.sendMessageStream(
          [{ role: 'user', content: 'test' }],
          'openai',
          'gpt-4'
        )
      ).rejects.toEqual({ error: { success: false, error: 'Bad request' } });
    });

    it('should throw on SSE error event', async () => {
      const stream = createSSEStream([
        'event: error\ndata: {"error":"Something went wrong"}\n\n',
      ]);
      mockFetchResponse(200, stream);

      await expect(
        service.sendMessageStream(
          [{ role: 'user', content: 'test' }],
          'openai',
          'gpt-4'
        )
      ).rejects.toThrow('Something went wrong');
    });

    it('should include auth token and request body correctly', async () => {
      const stream = createSSEStream([
        'event: content\ndata: {"content":"hi"}\n\n',
        'event: done\ndata: {}\n\n',
      ]);

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
        headers: new Headers(),
      } as Response);

      await service.sendMessageStream(
        [{ role: 'user', content: 'test' }],
        'openai',
        'gpt-4',
        { webSearch: true, think: true }
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/chat/send');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body as string);
      expect(body.messages).toEqual([{ role: 'user', content: 'test' }]);
      expect(body.provider).toBe('openai');
      expect(body.model).toBe('gpt-4');
      expect(body.webSearch).toBe(true);
      expect(body.think).toBe(true);
    });
    it('should use done event payload to finalize result', async () => {
      const stream = createSSEStream([
        'event: content\ndata: {"content":"partial"}\n\n',
        'event: search\ndata: {"status":"searching","query":"test"}\n\n',
        'event: done\ndata: {"content":"full content","thinking":"full thinking","searches":[{"status":"searched","query":"test","url":"https://example.com"}]}\n\n',
      ]);
      mockFetchResponse(200, stream);

      const result = await service.sendMessageStream(
        [{ role: 'user', content: 'test' }],
        'openai',
        'gpt-4'
      );

      // Done event should overwrite accumulated results with finalized data
      expect(result.content).toBe('full content');
      expect(result.thinking).toBe('full thinking');
      expect(result.searches.length).toBe(1);
      expect(result.searches[0].status).toBe('searched');
      expect(result.searches[0].url).toBe('https://example.com');
    });
  });

  describe('setProviderModel', () => {
    it('should send PUT request to update model', async () => {
      const promise = service.setProviderModel('openai', 'gpt-4-turbo');
      const req = httpMock.expectOne('/api/user/api-keys/openai/model');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ selectedModel: 'gpt-4-turbo' });
      req.flush({ success: true });
      await promise;
    });
  });

  describe('getUniverses', () => {
    it('should fetch universe list with character summaries', async () => {
      const mockUniverses = [
        {
          id: 'u1',
          name: 'Fantasy World',
          characters: [
            { id: 'c1', name: 'Wizard' },
            { id: 'c2', name: 'Knight' },
          ],
        },
      ];
      const promise = service.getUniverses();
      const req = httpMock.expectOne('/api/universes');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, universes: mockUniverses });
      const result = await promise;
      expect(result).toEqual(mockUniverses);
      expect(result[0].characters.length).toBe(2);
    });

    it('should return empty array when universes is undefined', async () => {
      const promise = service.getUniverses();
      const req = httpMock.expectOne('/api/universes');
      req.flush({ success: true });
      const result = await promise;
      expect(result).toEqual([]);
    });

    it('should return empty array when no universes exist', async () => {
      const promise = service.getUniverses();
      const req = httpMock.expectOne('/api/universes');
      req.flush({ success: true, universes: [] });
      const result = await promise;
      expect(result).toEqual([]);
    });
  });

  describe('sendMessage with characterId', () => {
    it('should include characterId when provided', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const mockResponse = { role: 'assistant' as const, content: 'Hi!' };
      const promise = service.sendMessage(messages, 'openai', 'gpt-4', { characterId: 'char-123' });
      const req = httpMock.expectOne('/api/chat/send');
      expect(req.request.body).toEqual({ messages, provider: 'openai', model: 'gpt-4', characterId: 'char-123' });
      req.flush({ success: true, message: mockResponse });
      await promise;
    });

    it('should not include characterId when not provided', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const mockResponse = { role: 'assistant' as const, content: 'Hi!' };
      const promise = service.sendMessage(messages, 'openai', 'gpt-4');
      const req = httpMock.expectOne('/api/chat/send');
      expect(req.request.body).toEqual({ messages, provider: 'openai', model: 'gpt-4' });
      req.flush({ success: true, message: mockResponse });
      await promise;
    });
  });
});
