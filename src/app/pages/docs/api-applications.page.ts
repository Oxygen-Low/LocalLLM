import { Component } from '@angular/core';
import { LocalizedDocsPageComponentBase } from './localized-docs-page.base';

@Component({
  selector: 'app-docs-api-applications',
  standalone: true,
  template: ` <div [innerHTML]="html()"></div> `,
})
export class DocsApiApplicationsPageComponent extends LocalizedDocsPageComponentBase {
  protected readonly pageId = 'api-applications' as const;
}
