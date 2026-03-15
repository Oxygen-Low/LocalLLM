import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LanguageSelectorComponent } from './language-selector.component';
import { AuthService } from '../services/auth.service';
import { SecurityLoggerService } from '../services/security-logger.service';

describe('LanguageSelectorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageSelectorComponent],
      providers: [
        AuthService,
        SecurityLoggerService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('should include Russian as a supported language option', () => {
    const fixture = TestBed.createComponent(LanguageSelectorComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    expect(component.languages).toEqual([
      { code: 'en', label: 'English' },
      { code: 'ko', label: '한국어' },
      { code: 'ja', label: '日本語' },
      { code: 'ru', label: 'Русский' },
    ]);
  });

  it('should allow selecting Russian from the language menu', () => {
    const fixture = TestBed.createComponent(LanguageSelectorComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleDropdown();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const russianOption = Array.from(compiled.querySelectorAll('button[role="option"]')).find(button =>
      button.textContent?.includes('Русский'),
    ) as HTMLButtonElement | undefined;

    expect(russianOption).toBeTruthy();

    russianOption?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.currentLanguage()).toEqual({ code: 'ru', label: 'Русский' });
    const toggleButton = compiled.querySelector('button[aria-haspopup="listbox"]');
    expect(toggleButton?.textContent).toContain('Русский');
  });
});
