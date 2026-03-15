import { Component } from '@angular/core';
import { LocalizedDocsPageComponentBase } from './localized-docs-page.base';

@Component({
  selector: 'app-docs-getting-started',
  standalone: true,
  template: ` <div [innerHTML]="html()"></div> `,
})
export class DocsGettingStartedPageComponent extends LocalizedDocsPageComponentBase {
  protected readonly pageId = 'getting-started' as const;
}
