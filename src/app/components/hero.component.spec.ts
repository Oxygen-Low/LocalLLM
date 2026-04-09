import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HeroComponent } from './hero.component';
import { TranslationService } from '../services/translation.service';
import { AuthService } from '../services/auth.service';
import { SecurityLoggerService } from '../services/security-logger.service';

describe('HeroComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HeroComponent, RouterModule.forRoot([])],
      providers: [
        AuthService,
        SecurityLoggerService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the hero component', () => {
    const fixture = TestBed.createComponent(HeroComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the hero section', () => {
    const fixture = TestBed.createComponent(HeroComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('section');
    expect(section).not.toBeNull();
  });

  it('should display the headline text', () => {
    const fixture = TestBed.createComponent(HeroComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const h1 = compiled.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1?.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('should have a Dashboard CTA link', () => {
    const fixture = TestBed.createComponent(HeroComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const dashLink = compiled.querySelector('a[href="/dashboard"]');
    expect(dashLink).not.toBeNull();
  });

  it('should have a Docs CTA link', () => {
    const fixture = TestBed.createComponent(HeroComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const docsLink = compiled.querySelector('a[href="/docs"]');
    expect(docsLink).not.toBeNull();
  });

  it('should have a GitHub CTA link', () => {
    const fixture = TestBed.createComponent(HeroComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const githubLink = compiled.querySelector('a[href="https://github.com/Oxygen-Low/LocalLLM"]');
    expect(githubLink).not.toBeNull();
    expect(githubLink?.getAttribute('target')).toBe('_blank');
  });

  it('should display three feature items', () => {
    const fixture = TestBed.createComponent(HeroComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // Features are in a 3-column grid
    const grid = compiled.querySelector('.grid');
    expect(grid).not.toBeNull();
    const featureItems = grid?.querySelectorAll(':scope > div');
    expect(featureItems?.length).toBe(3);
  });

  it('should translate headline to Korean', () => {
    const fixture = TestBed.createComponent(HeroComponent);
    const translationService = TestBed.inject(TranslationService);
    translationService.setLanguage({ code: 'ko', label: '한국어' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const h1 = compiled.querySelector('h1');
    // Korean headline should be different from English
    expect(h1?.textContent?.trim()).not.toContain('Your Private AI');
  });
});
