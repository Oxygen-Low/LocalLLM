import { Component } from '@angular/core';
import { LocalizedDocsPageComponentBase } from './localized-docs-page.base';

@Component({
  selector: 'app-docs-api-auth',
  standalone: true,
  template: ` <div [innerHTML]="html()"></div> `,
})
export class DocsApiAuthPageComponent extends LocalizedDocsPageComponentBase {
  protected readonly pageId = 'api-auth' as const;
}
