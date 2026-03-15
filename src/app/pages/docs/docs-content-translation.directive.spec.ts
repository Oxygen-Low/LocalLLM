import { TestBed } from '@angular/core/testing';
import { TranslationService } from '../../services/translation.service';
import { DocsApiAuthPageComponent } from './api-auth.page';
import { DocsGettingStartedPageComponent } from './getting-started.page';

describe('Docs content translations', () => {
  let translationService: TranslationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocsGettingStartedPageComponent, DocsApiAuthPageComponent],
    }).compileComponents();

    translationService = TestBed.inject(TranslationService);
  });

  it('should translate getting started content in Korean', async () => {
    translationService.setLanguage({ code: 'ko', label: '한국어' });

    const fixture = TestBed.createComponent(DocsGettingStartedPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('시작하기');
    expect(compiled.textContent).toContain('몇 분 안에 Local.LLM을 시작하고 실행하는 방법을 알아보세요.');
    expect(compiled.textContent).toContain('주요 기능');
    expect(compiled.textContent).toContain('다음 단계');
  });

  it('should translate API authentication content in Japanese', async () => {
    translationService.setLanguage({ code: 'ja', label: '日本語' });

    const fixture = TestBed.createComponent(DocsApiAuthPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('認証');
    expect(compiled.textContent).toContain('API キーと JWT トークンを使って Local.LLM API リクエストを認証する方法を学びましょう。');
    expect(compiled.textContent).toContain('概要');
    expect(compiled.textContent).toContain('API キー認証（Bearer トークン）');
  });
});
