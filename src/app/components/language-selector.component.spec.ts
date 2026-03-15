import { TestBed } from '@angular/core/testing';
import { LanguageSelectorComponent } from './language-selector.component';

describe('LanguageSelectorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageSelectorComponent],
    }).compileComponents();
  });

  it('should include Korean as a supported language option', () => {
    const fixture = TestBed.createComponent(LanguageSelectorComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    expect(component.languages).toEqual([
      { code: 'en', label: 'English' },
      { code: 'ko', label: '한국어' },
    ]);
  });

  it('should allow selecting Korean from the language menu', () => {
    const fixture = TestBed.createComponent(LanguageSelectorComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleDropdown();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const koreanOption = Array.from(compiled.querySelectorAll('button[role="option"]')).find(button =>
      button.textContent?.includes('한국어'),
    ) as HTMLButtonElement | undefined;

    expect(koreanOption).toBeTruthy();

    koreanOption?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.currentLanguage()).toEqual({ code: 'ko', label: '한국어' });
    const toggleButton = compiled.querySelector('button[aria-haspopup="listbox"]');
    expect(toggleButton?.textContent).toContain('한국어');
  });
});
