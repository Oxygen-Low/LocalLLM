import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent, RouterModule.forRoot([])],
    }).compileComponents();
  });

  it('should create the footer component', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have a Features link pointing to the home features section', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const featuresLink = compiled.querySelector('a[href="/#features"]');
    expect(featuresLink).not.toBeNull();
    expect(featuresLink?.textContent?.trim()).toBe('Features');
  });

  it('should have a Documentation link pointing to /docs', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const docsLink = compiled.querySelector('a[href="/docs"]');
    expect(docsLink).not.toBeNull();
    expect(docsLink?.textContent?.trim()).toBe('Documentation');
  });

  it('should have an About link pointing to the GitHub repository', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const aboutLink = compiled.querySelector('a[href="https://github.com/Oxygen-Low/LocalLLM"]');
    expect(aboutLink).not.toBeNull();
    expect(aboutLink?.textContent?.trim()).toBe('About');
  });

  it('should have Privacy, Terms, and License legal links', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('a')).map(a => a.textContent?.trim());
    expect(links).toContain('Privacy');
    expect(links).toContain('Terms');
    expect(links).toContain('License');
  });
});
