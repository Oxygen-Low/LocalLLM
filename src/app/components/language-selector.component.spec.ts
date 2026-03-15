import { TestBed } from '@angular/core/testing';
import { LanguageSelectorComponent } from './language-selector.component';

describe('LanguageSelectorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageSelectorComponent],
    }).compileComponents();
  });

  it('should include Russian in the language options', () => {
    const fixture = TestBed.createComponent(LanguageSelectorComponent);
    fixture.componentInstance.toggleDropdown();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const optionLabels = Array.from(compiled.querySelectorAll('[role="option"]')).map(option =>
      option.textContent?.trim(),
    );

    expect(optionLabels).toContain('English');
    expect(optionLabels).toContain('Русский');
  });

  it('should switch to Russian when selected', () => {
    const fixture = TestBed.createComponent(LanguageSelectorComponent);
    const component = fixture.componentInstance;
    const russian = component.languages.find(language => language.code === 'ru');

    expect(russian).toBeTruthy();

    component.selectLanguage(russian!);
    fixture.detectChanges();

    expect(component.currentLanguage()).toEqual(russian);
    expect(component.isOpen()).toBe(false);
  });
});
