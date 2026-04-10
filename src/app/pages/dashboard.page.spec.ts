import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardPageComponent } from './dashboard.page';
import { TranslationService } from '../services/translation.service';
import { AuthService } from '../services/auth.service';
import { SecurityLoggerService } from '../services/security-logger.service';

describe('DashboardPageComponent', () => {
  let translationService: TranslationService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent, RouterModule.forRoot([])],
      providers: [
        AuthService,
        SecurityLoggerService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    translationService = TestBed.inject(TranslationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function flushAppSettings(riskyAppsEnabled = true): void {
    const req = httpMock.expectOne('/api/settings/apps');
    req.flush({ success: true, riskyAppsEnabled });
  }

  it('should create the component', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    flushAppSettings();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display translated dashboard title in English by default', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    flushAppSettings();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('AI Applications Hub');
  });

  it('should display translated dashboard title in Korean', () => {
    translationService.setLanguage({ code: 'ko', label: '한국어' });

    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    flushAppSettings();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('AI 애플리케이션 허브');
  });

  it('should display translated dashboard title in Japanese', () => {
    translationService.setLanguage({ code: 'ja', label: '日本語' });

    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    flushAppSettings();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('AIアプリケーションハブ');
  });

  it('should display translated dashboard title in Russian', () => {
    translationService.setLanguage({ code: 'ru', label: 'Русский' });

    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    flushAppSettings();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Центр ИИ-приложений');
  });

  it('should display translated badge text', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    flushAppSettings();

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.bg-primary-100');
    expect(badge?.textContent?.trim()).toContain('Dashboard');

    translationService.setLanguage({ code: 'ko', label: '한국어' });
    fixture.detectChanges();
    expect(badge?.textContent?.trim()).toContain('대시보드');
  });

  it('should display all app cards (Chat, Coding Agent, Repositories, Web Seo, Datasets, Roleplay, Train LLM, and Local Fix)', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    flushAppSettings();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const appCards = compiled.querySelectorAll('app-app-card');
    expect(appCards.length).toBe(8);
  });

  it('should disable coding agent card when risky apps are disabled', async () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    flushAppSettings(false);
    await fixture.whenStable();
    fixture.detectChanges();

    const instance = fixture.componentInstance;
    expect(instance.riskyAppsEnabled()).toBe(false);
    const codingAgent = instance.allApps.find(a => a.id === 'coding-agent');
    expect(codingAgent?.risky).toBe(true);
    expect(instance.isAppDisabled(codingAgent!)).toBe(true);
  });

  it('should not disable coding agent card when risky apps are enabled', async () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    flushAppSettings(true);
    await fixture.whenStable();
    fixture.detectChanges();

    const instance = fixture.componentInstance;
    expect(instance.riskyAppsEnabled()).toBe(true);
    const codingAgent = instance.allApps.find(a => a.id === 'coding-agent');
    expect(instance.isAppDisabled(codingAgent!)).toBe(false);
  });

  it('should start with risky apps disabled (fail-closed) before settings load', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    // Do NOT flush settings — simulates network delay or failure
    const instance = fixture.componentInstance;
    expect(instance.riskyAppsEnabled()).toBe(false);
    const codingAgent = instance.allApps.find(a => a.id === 'coding-agent');
    expect(instance.isAppDisabled(codingAgent!)).toBe(true);
    // Now flush to prevent afterEach httpMock.verify() from failing
    flushAppSettings();
  });

  it('should show localized "risky apps disabled" notice when disabled', async () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    flushAppSettings(false);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const notice = compiled.querySelector('p.mt-6.text-center');
    const expectedText = translationService.translate('dashboard.riskyAppsDisabled');
    expect(notice?.textContent?.trim()).toContain(expectedText);
  });

  it('should not display search input or filter buttons', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    flushAppSettings();

    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[type="text"]');
    expect(input).toBeNull();
  });
});
