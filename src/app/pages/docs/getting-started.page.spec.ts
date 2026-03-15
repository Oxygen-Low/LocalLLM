import { TestBed } from '@angular/core/testing';
import { DocsGettingStartedPageComponent } from './getting-started.page';
import { TranslationService } from '../../services/translation.service';

describe('DocsGettingStartedPageComponent', () => {
  let translationService: TranslationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocsGettingStartedPageComponent],
    }).compileComponents();

    translationService = TestBed.inject(TranslationService);
  });

  it('renders English content by default', () => {
    const fixture = TestBed.createComponent(DocsGettingStartedPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Getting Started');
    expect(fixture.nativeElement.textContent).toContain('Quick Start');
  });

  it('renders translated content when the language changes', () => {
    translationService.setLanguage({ code: 'ko', label: '한국어' });

    const fixture = TestBed.createComponent(DocsGettingStartedPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('시작하기');
    expect(fixture.nativeElement.textContent).toContain('빠른 시작');
  });
});
