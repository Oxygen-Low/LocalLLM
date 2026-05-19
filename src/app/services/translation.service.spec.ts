import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslationService } from './translation.service';
import { AuthService } from './auth.service';
import { SecurityLoggerService } from './security-logger.service';

describe('TranslationService', () => {
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
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
  });

  function createService(): TranslationService {
    const service = TestBed.inject(TranslationService);
    flushAuthBootRequests(httpMock);
    return service;
  }

  function flushAuthBootRequests(mock: HttpTestingController): void {
    mock.match('/api/settings/supabase').forEach((req) => req.flush({ success: true, useSupabase: false }));
    mock.match((req) => req.url.includes('/api/auth/password-reset-status'))
      .forEach((req) => req.flush({ success: true, passwordResetRequired: false }));
  }

  it('should be created', () => {
    const service = createService();
    expect(service).toBeTruthy();
  });

  it('should default to English', () => {
    const service = createService();
    expect(service.currentLanguage().code).toBe('en');
    expect(service.currentLanguage().label).toBe('English');
  });

  it('should have English, Korean, Japanese, and Russian as supported languages', () => {
    const service = createService();
    expect(service.languages).toEqual([
      { code: 'en', label: 'English' },
      { code: 'ko', label: '한국어' },
      { code: 'ja', label: '日本語' },
      { code: 'ru', label: 'Русский' },
    ]);
  });

  it('should return English translations by default', () => {
    const service = createService();
    expect(service.translate('hero.headline')).toBe('Tools For Everyone');
    expect(service.translate('home.features.title')).toBe('Powerful Features');
  });

  it('should return Korean translations after switching language', () => {
    const service = createService();
    service.setLanguage({ code: 'ko', label: '한국어' });
    expect(service.translate('hero.headline')).toBe('모두를 위한 도구');
    expect(service.translate('home.features.title')).toBe('강력한 기능');
  });

  it('should return Japanese translations after switching language', () => {
    const service = createService();
    service.setLanguage({ code: 'ja', label: '日本語' });
    expect(service.translate('hero.headline')).toBe('すべての人のためのツール');
    expect(service.translate('home.features.title')).toBe('強力な機能');
  });

  it('should return Russian translations after switching language', () => {
    const service = createService();
    service.setLanguage({ code: 'ru', label: 'Русский' });
    expect(service.translate('hero.headline')).toBe('Инструменты для всех');
    expect(service.translate('home.features.title')).toBe('Мощные возможности');
  });

  it('should return the key for unknown translation keys', () => {
    const service = createService();
    expect(service.translate('unknown.key')).toBe('unknown.key');
  });

  it('should update currentLanguageCode when language changes', () => {
    const service = createService();
    expect(service.currentLanguageCode()).toBe('en');
    service.setLanguage({ code: 'ru', label: 'Русский' });
    expect(service.currentLanguageCode()).toBe('ru');
  });

  it('should persist language selection to localStorage when setLanguage is called', () => {
    const service = createService();
    service.setLanguage({ code: 'ko', label: '한국어' });
    expect(localStorage.getItem('localllm_language')).toBe('ko');
  });

  it('should restore language from localStorage on initialization', () => {
    localStorage.setItem('localllm_language', 'ja');
    const service = createService();
    expect(service.currentLanguage().code).toBe('ja');
    expect(service.currentLanguage().label).toBe('日本語');
  });

  it('should default to English when localStorage contains an unknown language code', () => {
    localStorage.setItem('localllm_language', 'fr');
    const service = createService();
    expect(service.currentLanguage().code).toBe('en');
  });

  it('should save language to server when user is authenticated', () => {
    sessionStorage.setItem('localllm_session', JSON.stringify({
      username: 'testuser',
      expiresAt: Date.now() + 86400000,
    }));
    const newService = TestBed.inject(TranslationService);
    const newHttpMock = TestBed.inject(HttpTestingController);

    const supabaseReq = newHttpMock.expectOne('/api/settings/supabase');
    supabaseReq.flush({ success: true, useSupabase: false });

    const statusReq = newHttpMock.expectOne((req) => req.url.includes('/api/auth/password-reset-status'));
    statusReq.flush({ success: true, passwordResetRequired: false });

    // The effect should trigger a server fetch for the authenticated user
    TestBed.flushEffects();
    const getReq = newHttpMock.expectOne(
      (req) => req.url === '/api/user/language'
    );
    getReq.flush({ success: true, language: 'ko' });

    expect(newService.currentLanguage().code).toBe('ko');

    // Now set a different language - should PUT to server
    newService.setLanguage({ code: 'ja', label: '日本語' });
    const putReq = newHttpMock.expectOne('/api/user/language');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({ language: 'ja' });
    putReq.flush({ success: true, language: 'ja' });

    newHttpMock.verify();
  });

  it('should not make server requests when user is not authenticated', () => {
    const service = createService();
    service.setLanguage({ code: 'ko', label: '한국어' });
    httpMock.expectNone('/api/user/language');
    expect(localStorage.getItem('localllm_language')).toBe('ko');
  });
});
