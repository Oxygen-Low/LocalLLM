import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, HttpResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;

  const mockAuthService = {
    getSessionToken: () => 'test-token-123',
    isAuthenticated: () => true,
    getSessionServerId: () => 'server-abc',
    logout: vi.fn(),
  };

  beforeEach(() => {
    mockAuthService.logout.mockClear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Authorization header when token is available', () => {
    httpClient.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-123');
    req.flush({});
  });

  it('should not add Authorization header when no token', () => {
    mockAuthService.getSessionToken = () => null as any;
    httpClient.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    mockAuthService.getSessionToken = () => 'test-token-123';
  });

  it('should logout and redirect on 401 when authenticated', () => {
    httpClient.get('/api/test').subscribe({
      error: () => {},
    });
    const req = httpMock.expectOne('/api/test');
    req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should not logout on 401 when not authenticated', () => {
    mockAuthService.isAuthenticated = () => false;
    httpClient.get('/api/test').subscribe({
      error: () => {},
    });
    const req = httpMock.expectOne('/api/test');
    req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(mockAuthService.logout).not.toHaveBeenCalled();
    mockAuthService.isAuthenticated = () => true;
  });

  it('should not logout on non-401 errors', () => {
    httpClient.get('/api/test').subscribe({
      error: () => {},
    });
    const req = httpMock.expectOne('/api/test');
    req.flush({ error: 'Server Error' }, { status: 500, statusText: 'Internal Server Error' });

    expect(mockAuthService.logout).not.toHaveBeenCalled();
  });

  it('should logout when server instance ID does not match session', () => {
    mockAuthService.getSessionServerId = () => 'old-server-id';

    httpClient.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    req.flush({}, {
      headers: { 'X-Server-Instance-ID': 'new-server-id' },
    });

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    mockAuthService.getSessionServerId = () => 'server-abc';
  });

  it('should not logout when server instance ID matches session', () => {
    httpClient.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    req.flush({}, {
      headers: { 'X-Server-Instance-ID': 'server-abc' },
    });

    expect(mockAuthService.logout).not.toHaveBeenCalled();
  });

  it('should logout when session has no server ID but response has one', () => {
    mockAuthService.getSessionServerId = () => null as any;

    httpClient.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    req.flush({}, {
      headers: { 'X-Server-Instance-ID': 'some-server-id' },
    });

    expect(mockAuthService.logout).toHaveBeenCalled();
    mockAuthService.getSessionServerId = () => 'server-abc';
  });

  it('should not check server ID when response has no X-Server-Instance-ID header', () => {
    httpClient.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    req.flush({});

    expect(mockAuthService.logout).not.toHaveBeenCalled();
  });
});
