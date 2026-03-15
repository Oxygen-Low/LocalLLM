import { TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { RouterModule } from '@angular/router';

describe('FooterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent, RouterModule.forRoot([])],
    }).compileComponents();
  });

  it('should create the footer', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should link Features to the home page features section', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('a'));
    const featuresLink = links.find(a => a.textContent?.trim() === 'Features');
    expect(featuresLink).not.toBeNull();
    expect(featuresLink?.getAttribute('href')).toBe('/#features');
  });

  it('should link Documentation to /docs', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('a'));
    const docsLink = links.find(a => a.textContent?.trim() === 'Documentation');
    expect(docsLink).not.toBeNull();
    expect(docsLink?.getAttribute('href')).toBe('/docs');
  });

  it('should link About to /about', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('a'));
    const aboutLink = links.find(a => a.textContent?.trim() === 'About');
    expect(aboutLink).not.toBeNull();
    expect(aboutLink?.getAttribute('href')).toBe('/about');
  });

  it('should not have any href="#" links', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const brokenLinks = compiled.querySelectorAll('a[href="#"]');
    expect(brokenLinks.length).toBe(0);
  });
});
