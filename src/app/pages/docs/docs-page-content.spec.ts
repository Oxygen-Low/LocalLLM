import { docsPageIds, getDocsPageHtml, supportedDocLanguages } from './docs-page-content';

describe('docs page content', () => {
  it('provides content for every supported language on every docs page', () => {
    for (const pageId of docsPageIds) {
      const english = getDocsPageHtml(pageId, 'en');
      expect(english).toContain('max-w-4xl');

      for (const language of supportedDocLanguages) {
        expect(getDocsPageHtml(pageId, language)).toContain('max-w-4xl');
      }
    }
  });

  it('provides localized content instead of reusing the English document for non-English languages', () => {
    for (const pageId of docsPageIds) {
      const english = getDocsPageHtml(pageId, 'en');

      expect(getDocsPageHtml(pageId, 'ko')).not.toEqual(english);
      expect(getDocsPageHtml(pageId, 'ja')).not.toEqual(english);
      expect(getDocsPageHtml(pageId, 'ru')).not.toEqual(english);
    }
  });
});
