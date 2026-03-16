import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslationService } from './translation.service';
import { AuthService } from './auth.service';
import { SecurityLoggerService } from './security-logger.service';

describe('TranslationService', () => {
  let service: TranslationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        SecurityLoggerService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(TranslationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default to English', () => {
    expect(service.currentLanguage().code).toBe('en');
    expect(service.currentLanguage().label).toBe('English');
  });

  it('should have English, Korean, Japanese, and Russian as supported languages', () => {
    expect(service.languages).toEqual([
      { code: 'en', label: 'English' },
      { code: 'ko', label: '한국어' },
      { code: 'ja', label: '日本語' },
      { code: 'ru', label: 'Русский' },
    ]);
  });

  it('should return English translations by default', () => {
    expect(service.translate('hero.headline')).toBe('Tools For Everyone');
    expect(service.translate('home.features.title')).toBe('Powerful Features');
  });

  it('should return Korean translations after switching language', () => {
    service.setLanguage({ code: 'ko', label: '한국어' });
    expect(service.translate('hero.headline')).toBe('모두를 위한 도구');
    expect(service.translate('home.features.title')).toBe('강력한 기능');
  });

  it('should return Japanese translations after switching language', () => {
    service.setLanguage({ code: 'ja', label: '日本語' });
    expect(service.translate('hero.headline')).toBe('すべての人のためのツール');
    expect(service.translate('home.features.title')).toBe('強力な機能');
  });

  it('should return Russian translations after switching language', () => {
    service.setLanguage({ code: 'ru', label: 'Русский' });
    expect(service.translate('hero.headline')).toBe('Инструменты для всех');
    expect(service.translate('home.features.title')).toBe('Мощные возможности');
  });

  it('should return the key for unknown translation keys', () => {
    expect(service.translate('unknown.key')).toBe('unknown.key');
  });

  it('should update currentLanguageCode when language changes', () => {
    expect(service.currentLanguageCode()).toBe('en');
    service.setLanguage({ code: 'ru', label: 'Русский' });
    expect(service.currentLanguageCode()).toBe('ru');
  });

  it('should persist language selection to localStorage when setLanguage is called', () => {
    service.setLanguage({ code: 'ko', label: '한국어' });
    expect(localStorage.getItem('localllm_language')).toBe('ko');
  });

  it('should restore language from localStorage on initialization', () => {
    localStorage.setItem('localllm_language', 'ja');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        SecurityLoggerService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const newService = TestBed.inject(TranslationService);
    expect(newService.currentLanguage().code).toBe('ja');
    expect(newService.currentLanguage().label).toBe('日本語');
  });

  it('should default to English when localStorage contains an unknown language code', () => {
    localStorage.setItem('localllm_language', 'fr');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        SecurityLoggerService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const newService = TestBed.inject(TranslationService);
    expect(newService.currentLanguage().code).toBe('en');
  });

  it('should save language to server when user is authenticated', () => {
    const authService = TestBed.inject(AuthService);
    // Simulate an authenticated user by directly setting session
    sessionStorage.setItem('localllm_session', JSON.stringify({
      username: 'testuser',
      token: 'fake-token',
      expiresAt: Date.now() + 86400000,
    }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        SecurityLoggerService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const newService = TestBed.inject(TranslationService);
    const newHttpMock = TestBed.inject(HttpTestingController);

    const statusReq = newHttpMock.expectOne(
      (req) => req.url.includes('/api/auth/password-reset-status') && req.params.get('username') === 'testuser'
    );
    statusReq.flush({ success: true, passwordResetRequired: false });

    // The effect should trigger a server fetch for the authenticated user
    TestBed.flushEffects();
    const getReq = newHttpMock.expectOne(
      (req) => req.url === '/api/user/language' && req.params.get('username') === 'testuser'
    );
    getReq.flush({ success: true, language: 'ko' });

    expect(newService.currentLanguage().code).toBe('ko');

    // Now set a different language - should PUT to server
    newService.setLanguage({ code: 'ja', label: '日本語' });
    const putReq = newHttpMock.expectOne('/api/user/language');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({ username: 'testuser', language: 'ja' });
    putReq.flush({ success: true, language: 'ja' });

    newHttpMock.verify();
  });

  it('should not make server requests when user is not authenticated', () => {
    service.setLanguage({ code: 'ko', label: '한국어' });
    httpMock.expectNone('/api/user/language');
    expect(localStorage.getItem('localllm_language')).toBe('ko');
  });
});
