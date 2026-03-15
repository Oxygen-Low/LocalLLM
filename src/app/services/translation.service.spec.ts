import { TestBed } from '@angular/core/testing';
import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TranslationService);
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
});
