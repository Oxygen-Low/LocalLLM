import { DestroyRef, Directive, ElementRef, NgZone, effect, inject } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { translateDocsContentText } from './docs-content-translations';

@Directive({
  selector: '[appDocsContentTranslation]',
  standalone: true,
})
export class DocsContentTranslationDirective {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly translationService = inject(TranslationService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly originalTextByNode = new WeakMap<Text, string>();
  private readonly mutationObserver = new MutationObserver(() => {
    if (!this.isApplyingTranslations) {
      this.scheduleTranslation();
    }
  });

  private isApplyingTranslations = false;
  private translationScheduled = false;

  constructor() {
    this.ngZone.runOutsideAngular(() => {
      this.mutationObserver.observe(this.elementRef.nativeElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    });

    this.destroyRef.onDestroy(() => this.mutationObserver.disconnect());

    effect(() => {
      this.translationService.currentLanguageCode();
      this.scheduleTranslation();
    });

    this.scheduleTranslation();
  }

  private scheduleTranslation(): void {
    if (this.translationScheduled) {
      return;
    }

    this.translationScheduled = true;
    queueMicrotask(() => {
      this.translationScheduled = false;
      this.applyTranslations();
    });
  }

  private applyTranslations(): void {
    const languageCode = this.translationService.currentLanguageCode();
    const textWalker = document.createTreeWalker(this.elementRef.nativeElement, NodeFilter.SHOW_TEXT);

    this.isApplyingTranslations = true;

    try {
      let currentNode = textWalker.nextNode();

      while (currentNode) {
        const textNode = currentNode as Text;

        if (!this.shouldSkipNode(textNode)) {
          const originalText = this.originalTextByNode.get(textNode) ?? textNode.data;
          this.originalTextByNode.set(textNode, originalText);

          const translatedText = this.translateTextPreservingWhitespace(originalText, languageCode);

          if (translatedText !== textNode.data) {
            textNode.data = translatedText;
          }
        }

        currentNode = textWalker.nextNode();
      }
    } finally {
      this.isApplyingTranslations = false;
    }
  }

  private shouldSkipNode(textNode: Text): boolean {
    if (!textNode.data.trim()) {
      return true;
    }

    const parentElement = textNode.parentElement;
    if (!parentElement) {
      return true;
    }

    return ['CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA'].includes(parentElement.tagName);
  }

  private translateTextPreservingWhitespace(text: string, languageCode: string): string {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return text;
    }

    const translatedText = translateDocsContentText(trimmedText, languageCode) ?? trimmedText;
    const leadingWhitespace = text.match(/^\s*/)?.[0] ?? '';
    const trailingWhitespace = text.match(/\s*$/)?.[0] ?? '';

    return `${leadingWhitespace}${translatedText}${trailingWhitespace}`;
  }
}
