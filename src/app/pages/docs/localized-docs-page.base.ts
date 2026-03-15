import { computed, inject } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { DocsPageId, getDocsPageHtml } from './docs-page-content';

export abstract class LocalizedDocsPageComponentBase {
  protected readonly t = inject(TranslationService);
  protected abstract readonly pageId: DocsPageId;
  protected readonly html = computed(() => getDocsPageHtml(this.pageId, this.t.currentLanguageCode()));
}
