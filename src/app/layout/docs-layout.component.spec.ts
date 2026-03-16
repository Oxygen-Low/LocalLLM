import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DocsLayoutComponent } from './docs-layout.component';
import { TranslationService } from '../services/translation.service';
import { AuthService } from '../services/auth.service';
import { SecurityLoggerService } from '../services/security-logger.service';

describe('DocsLayoutComponent', () => {
  let translationService: TranslationService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DocsLayoutComponent, RouterModule.forRoot([])],
      providers: [
        AuthService,
        SecurityLoggerService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    translationService = TestBed.inject(TranslationService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(DocsLayoutComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display translated navigation labels in English by default', () => {
    const fixture = TestBed.createComponent(DocsLayoutComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const navLinks = compiled.querySelectorAll('aside nav a');
    const navTexts = Array.from(navLinks).map(el => el.textContent?.trim());

    expect(navTexts).toContain('Getting Started');
    expect(navTexts).toContain('Installation');
    expect(navTexts).toContain('Deployment');
    expect(navTexts).toContain('API Reference');
    expect(navTexts).toContain('Configuration');
    expect(navTexts).toContain('Troubleshooting');
  });

  it('should display translated navigation labels in Korean', () => {
    translationService.setLanguage({ code: 'ko', label: '한국어' });

    const fixture = TestBed.createComponent(DocsLayoutComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const navLinks = compiled.querySelectorAll('aside nav a');
    const navTexts = Array.from(navLinks).map(el => el.textContent?.trim());

    expect(navTexts).toContain('시작하기');
    expect(navTexts).toContain('설치');
    expect(navTexts).toContain('배포');
    expect(navTexts).toContain('API 레퍼런스');
    expect(navTexts).toContain('구성');
    expect(navTexts).toContain('문제 해결');
  });

  it('should display translated navigation labels in Japanese', () => {
    translationService.setLanguage({ code: 'ja', label: '日本語' });

    const fixture = TestBed.createComponent(DocsLayoutComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const navLinks = compiled.querySelectorAll('aside nav a');
    const navTexts = Array.from(navLinks).map(el => el.textContent?.trim());

    expect(navTexts).toContain('はじめに');
    expect(navTexts).toContain('インストール');
    expect(navTexts).toContain('デプロイ');
    expect(navTexts).toContain('APIリファレンス');
    expect(navTexts).toContain('設定');
    expect(navTexts).toContain('トラブルシューティング');
  });

  it('should display translated navigation labels in Russian', () => {
    translationService.setLanguage({ code: 'ru', label: 'Русский' });

    const fixture = TestBed.createComponent(DocsLayoutComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const navLinks = compiled.querySelectorAll('aside nav a');
    const navTexts = Array.from(navLinks).map(el => el.textContent?.trim());

    expect(navTexts).toContain('Начало работы');
    expect(navTexts).toContain('Установка');
    expect(navTexts).toContain('Развёртывание');
    expect(navTexts).toContain('Справочник API');
    expect(navTexts).toContain('Конфигурация');
    expect(navTexts).toContain('Устранение неполадок');
  });

  it('should have navigation items with translation keys', () => {
    const fixture = TestBed.createComponent(DocsLayoutComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.docNavigation[0].labelKey).toBe('docs.nav.getting-started');
    expect(component.docNavigation[1].labelKey).toBe('docs.nav.installation');
    expect(component.docNavigation[1].children?.[0].labelKey).toBe('docs.nav.cloud-hosted');
    expect(component.docNavigation[1].children?.[1].labelKey).toBe('docs.nav.self-hosted');
  });
});
