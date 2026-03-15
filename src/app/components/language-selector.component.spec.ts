import { TestBed } from '@angular/core/testing';
import { LanguageSelectorComponent } from './language-selector.component';

describe('LanguageSelectorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageSelectorComponent],
    }).compileComponents();
  });

  it('should include Japanese in the supported languages', () => {
    const fixture = TestBed.createComponent(LanguageSelectorComponent);
    const component = fixture.componentInstance;

    expect(component.languages).toEqual([
      { code: 'en', label: 'English' },
      { code: 'ja', label: '日本語' },
    ]);
  });

  it('should update the selected language when Japanese is chosen', () => {
    const fixture = TestBed.createComponent(LanguageSelectorComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.isOpen.set(true);
    component.selectLanguage(component.languages[1]);
    fixture.detectChanges();

    expect(component.currentLanguage()).toEqual({ code: 'ja', label: '日本語' });
    expect(component.isOpen()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('日本語');
  });
});
