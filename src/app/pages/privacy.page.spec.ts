import { TestBed } from '@angular/core/testing';
import { PrivacyPageComponent } from './privacy.page';
import { RouterModule } from '@angular/router';

describe('PrivacyPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyPageComponent, RouterModule.forRoot([])],
    }).compileComponents();
  });

  it('should create the privacy page', () => {
    const fixture = TestBed.createComponent(PrivacyPageComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should display Privacy Policy heading', () => {
    const fixture = TestBed.createComponent(PrivacyPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('h1');
    expect(heading?.textContent).toContain('Privacy Policy');
  });

  it('should include UK GDPR references', () => {
    const fixture = TestBed.createComponent(PrivacyPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';
    expect(text).toContain('UK GDPR');
    expect(text).toContain('Data Protection Act 2018');
  });

  it('should list data categories collected', () => {
    const fixture = TestBed.createComponent(PrivacyPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';
    expect(text).toContain('Username and password');
    expect(text).toContain('Chat messages and conversations');
  });

  it('should describe user rights', () => {
    const fixture = TestBed.createComponent(PrivacyPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';
    expect(text).toContain('Right of access');
    expect(text).toContain('Right to erasure');
    expect(text).toContain('Right to data portability');
  });

  it('should include ICO complaint information', () => {
    const fixture = TestBed.createComponent(PrivacyPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';
    expect(text).toContain('Information Commissioner');
    expect(text).toContain('ico.org.uk');
  });

  it('should have a back to home link', () => {
    const fixture = TestBed.createComponent(PrivacyPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const backLink = compiled.querySelector('a[href="/"]');
    expect(backLink).not.toBeNull();
    expect(backLink?.textContent).toContain('Back to Home');
  });
});
