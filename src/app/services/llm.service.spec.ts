import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LlmService } from './llm.service';

describe('LlmService', () => {
  let service: LlmService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LlmService,
        provideHttpClient(),
        provideHttpClientTesting(),
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

  describe('getKoboldStatus', () => {
    it('should fetch kobold status', async () => {
      const promise = service.getKoboldStatus();
      const req = httpMock.expectOne('/api/kobold/status');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, available: true, model: 'llama-7b' });
      const result = await promise;
      expect(result.available).toBe(true);
      expect(result.model).toBe('llama-7b');
    });

    it('should return empty model string when not available', async () => {
      const promise = service.getKoboldStatus();
      const req = httpMock.expectOne('/api/kobold/status');
      req.flush({ success: true, available: false });
      const result = await promise;
      expect(result.available).toBe(false);
      expect(result.model).toBe('');
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
});
