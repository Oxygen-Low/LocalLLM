import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { NotFoundPageComponent } from './not-found.page';
import { TranslationService } from '../services/translation.service';

describe('NotFoundPageComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [NotFoundPageComponent, RouterModule.forRoot([])],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the not-found page', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should display the 404 number', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';
    expect(text).toContain('404');
  });

  it('should display the Page Not Found heading in English', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('h1');
    expect(heading?.textContent?.trim()).toBe('Page Not Found');
  });

  it('should display the badge label in English', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';
    expect(text).toContain('404 Error');
  });

  it('should display the subtitle message in English', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';
    expect(text).toContain("The page you're looking for doesn't exist or has been moved.");
  });

  it('should have a Back to Home link pointing to /', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const homeLink = compiled.querySelector('a[href="/"]');
    expect(homeLink).not.toBeNull();
    expect(homeLink?.textContent?.trim()).toBe('Back to Home');
  });

  it('should have a View Documentation link pointing to /docs', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const docsLink = compiled.querySelector('a[href="/docs"]');
    expect(docsLink).not.toBeNull();
    expect(docsLink?.textContent?.trim()).toBe('View Documentation');
  });

  it('should translate heading to Korean', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    const translationService = TestBed.inject(TranslationService);
    translationService.setLanguage({ code: 'ko', label: '한국어' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('h1');
    expect(heading?.textContent?.trim()).toBe('페이지를 찾을 수 없습니다');
  });

  it('should translate heading to Japanese', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    const translationService = TestBed.inject(TranslationService);
    translationService.setLanguage({ code: 'ja', label: '日本語' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('h1');
    expect(heading?.textContent?.trim()).toBe('ページが見つかりません');
  });

  it('should translate heading to Russian', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    const translationService = TestBed.inject(TranslationService);
    translationService.setLanguage({ code: 'ru', label: 'Русский' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('h1');
    expect(heading?.textContent?.trim()).toBe('Страница не найдена');
  });
});
