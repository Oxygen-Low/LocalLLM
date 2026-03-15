import { TestBed } from '@angular/core/testing';
import { LanguageSelectorComponent } from './language-selector.component';

describe('LanguageSelectorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageSelectorComponent],
    }).compileComponents();
  });

  it('should include Japanese as a supported language option', () => {
    const fixture = TestBed.createComponent(LanguageSelectorComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    expect(component.languages).toEqual([
      { code: 'en', label: 'English' },
      { code: 'ko', label: '한국어' },
      { code: 'ja', label: '日本語' },
    ]);
  });

  it('should allow selecting Japanese from the language menu', () => {
    const fixture = TestBed.createComponent(LanguageSelectorComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleDropdown();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const japaneseOption = Array.from(compiled.querySelectorAll('button[role="option"]')).find(button =>
      button.textContent?.includes('日本語'),
    ) as HTMLButtonElement | undefined;

    expect(japaneseOption).toBeTruthy();

    japaneseOption?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.currentLanguage()).toEqual({ code: 'ja', label: '日本語' });
    const toggleButton = compiled.querySelector('button[aria-haspopup="listbox"]');
    expect(toggleButton?.textContent).toContain('日本語');
  });
});
