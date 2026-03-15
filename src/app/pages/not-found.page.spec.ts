import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { NotFoundPageComponent } from './not-found.page';
import { TranslationService } from '../services/translation.service';

describe('NotFoundPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundPageComponent, RouterModule.forRoot([])],
    }).compileComponents();
  });

  it('should create the not-found page', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the 404 code', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('404');
  });

  it('should display the page not found heading', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('h1');
    expect(heading?.textContent?.trim()).toBe('Page Not Found');
  });

  it('should display a subtitle message', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("doesn't exist or has been moved");
  });

  it('should have a back to home link', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const homeLink = compiled.querySelector('a[href="/"]');
    expect(homeLink).not.toBeNull();
    expect(homeLink?.textContent?.trim()).toBe('Back to Home');
  });

  it('should have a documentation link', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const docsLink = compiled.querySelector('a[href="/docs"]');
    expect(docsLink).not.toBeNull();
    expect(docsLink?.textContent?.trim()).toBe('View Documentation');
  });

  it('should translate content when language changes', () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    const translationService = TestBed.inject(TranslationService);
    const koreanLang = translationService.languages.find(l => l.code === 'ko')!;
    translationService.setLanguage(koreanLang);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('페이지를 찾을 수 없습니다');
  });
});
