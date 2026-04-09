import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WebSeoService, SeoApp } from './web-seo.service';
import { AuthService } from './auth.service';
import { vi } from 'vitest';

describe('WebSeoService', () => {
  let service: WebSeoService;
  let httpMock: HttpTestingController;

  const mockAuthService = {
    getSessionToken: () => 'test-token',
  };

  const mockApp: SeoApp = {
    id: 'app-1',
    name: 'Test App',
    type: 'url',
    url: 'https://example.com',
    repoFullName: null,
    cloneUrl: null,
    buildCommand: null,
    startCommand: null,
    createdAt: '2025-01-01T00:00:00Z',
    lastCheck: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WebSeoService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
    service = TestBed.inject(WebSeoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listApps', () => {
    it('should fetch app list', async () => {
      const promise = service.listApps();
      const req = httpMock.expectOne('/api/web-seo/apps');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, apps: [mockApp] });
      const result = await promise;
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Test App');
    });

    it('should return empty array when apps is undefined', async () => {
      const promise = service.listApps();
      const req = httpMock.expectOne('/api/web-seo/apps');
      req.flush({ success: true });
      const result = await promise;
      expect(result).toEqual([]);
    });

    it('should return empty array when no apps exist', async () => {
      const promise = service.listApps();
      const req = httpMock.expectOne('/api/web-seo/apps');
      req.flush({ success: true, apps: [] });
      const result = await promise;
      expect(result).toEqual([]);
    });
  });

  describe('createApp', () => {
    it('should send POST request with app data', async () => {
      const newApp: Partial<SeoApp> = {
        name: 'New App',
        type: 'url',
        url: 'https://newapp.com',
      };
      const promise = service.createApp(newApp);
      const req = httpMock.expectOne('/api/web-seo/apps');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newApp);
      req.flush({ success: true, app: { ...mockApp, ...newApp, id: 'app-2' } });
      const result = await promise;
      expect(result.name).toBe('New App');
    });

    it('should handle repo-type app creation', async () => {
      const repoApp: Partial<SeoApp> = {
        name: 'Repo App',
        type: 'repo',
        repoFullName: 'user/repo',
        cloneUrl: 'https://github.com/user/repo.git',
        buildCommand: 'npm run build',
        startCommand: 'npm start',
      };
      const promise = service.createApp(repoApp);
      const req = httpMock.expectOne('/api/web-seo/apps');
      expect(req.request.body).toEqual(repoApp);
      req.flush({ success: true, app: { ...mockApp, ...repoApp, id: 'app-3', type: 'repo' } });
      const result = await promise;
      expect(result.type).toBe('repo');
    });
  });

  describe('deleteApp', () => {
    it('should send DELETE request for app', async () => {
      const promise = service.deleteApp('app-1');
      const req = httpMock.expectOne('/api/web-seo/apps/app-1');
      expect(req.request.method).toBe('DELETE');
      req.flush({});
      await promise;
    });
  });

  describe('runCheck', () => {
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

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should use fetch with correct URL and auth header', () => {
      const stream = createSSEStream([
        'event: progress\ndata: {"step":"init","message":"Starting","status":"running"}\n\n',
        'event: done\ndata: {"report":{}}\n\n',
      ]);
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
        headers: new Headers(),
      } as Response);

      const subscription = service.runCheck('app-1').subscribe();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/web-seo/check/app-1');
      expect(options.method).toBe('POST');
      expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token');
      expect((options.headers as Record<string, string>)['Accept']).toBe('text/event-stream');

      subscription.unsubscribe();
    });

    it('should parse SSE events and emit them', async () => {
      const stream = createSSEStream([
        'event: progress\ndata: {"step":"analyze","message":"Analyzing...","status":"running"}\n\n',
        'event: complete\ndata: {"report":{"totalScore":85}}\n\n',
      ]);
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
        headers: new Headers(),
      } as Response);

      const events: any[] = [];
      await new Promise<void>((resolve, reject) => {
        service.runCheck('app-1').subscribe({
          next: (e) => events.push(e),
          complete: () => resolve(),
          error: (err) => reject(err),
        });
      });

      expect(events.length).toBe(2);
      expect(events[0].type).toBe('progress');
      expect(events[0].data.step).toBe('analyze');
      expect(events[1].type).toBe('complete');
    });

    it('should emit error for non-ok response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
        headers: new Headers(),
      } as unknown as Response);

      await new Promise<void>((resolve) => {
        service.runCheck('app-1').subscribe({
          error: (err) => {
            expect(err).toEqual({ error: 'Server error' });
            resolve();
          },
        });
      });
    });

    it('should abort fetch on unsubscribe', () => {
      const stream = new ReadableStream({
        start() {
          // Never close - simulates long-running stream
        },
      });
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
        headers: new Headers(),
      } as Response);

      const subscription = service.runCheck('app-1').subscribe();
      subscription.unsubscribe();
      // The unsubscribe triggers the teardown which calls abortController.abort()
      // If no error is thrown, the test passes
    });
  });
});
