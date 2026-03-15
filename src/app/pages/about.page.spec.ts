import { TestBed } from '@angular/core/testing';
import { AboutPageComponent } from './about.page';
import { RouterModule } from '@angular/router';

describe('AboutPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutPageComponent, RouterModule.forRoot([])],
    }).compileComponents();
  });

  it('should create the about page', () => {
    const fixture = TestBed.createComponent(AboutPageComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should display About heading', () => {
    const fixture = TestBed.createComponent(AboutPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('h1');
    expect(heading?.textContent).toContain('About Local.LLM');
  });

  it('should contain mission and open source sections', () => {
    const fixture = TestBed.createComponent(AboutPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';
    expect(text).toContain('Our Mission');
    expect(text).toContain('Open Source');
  });

  it('should link to GitHub repository', () => {
    const fixture = TestBed.createComponent(AboutPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const githubLink = compiled.querySelector('a[href="https://github.com/Oxygen-Low/LocalLLM"]');
    expect(githubLink).not.toBeNull();
  });

  it('should have a back to home link', () => {
    const fixture = TestBed.createComponent(AboutPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const backLink = compiled.querySelector('a[href="/"]');
    expect(backLink).not.toBeNull();
    expect(backLink?.textContent).toContain('Back to Home');
  });
});
