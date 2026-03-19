import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardPageComponent } from './dashboard.page';
import { TranslationService } from '../services/translation.service';
import { AuthService } from '../services/auth.service';
import { SecurityLoggerService } from '../services/security-logger.service';

describe('DashboardPageComponent', () => {
  let translationService: TranslationService;

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
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display translated dashboard title in English by default', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('AI Applications Hub');
  });

  it('should display translated dashboard title in Korean', () => {
    translationService.setLanguage({ code: 'ko', label: '한국어' });

    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('AI 애플리케이션 허브');
  });

  it('should display translated dashboard title in Japanese', () => {
    translationService.setLanguage({ code: 'ja', label: '日本語' });

    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('AIアプリケーションハブ');
  });

  it('should display translated dashboard title in Russian', () => {
    translationService.setLanguage({ code: 'ru', label: 'Русский' });

    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Центр ИИ-приложений');
  });

  it('should display translated badge text', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.bg-primary-100');
    expect(badge?.textContent?.trim()).toContain('Dashboard');

    translationService.setLanguage({ code: 'ko', label: '한국어' });
    fixture.detectChanges();
    expect(badge?.textContent?.trim()).toContain('대시보드');
  });

  it('should display the General Assistant app card', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const appCards = compiled.querySelectorAll('app-app-card');
    expect(appCards.length).toBe(1);
  });

  it('should not display search input or filter buttons', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[type="text"]');
    expect(input).toBeNull();
  });
});
