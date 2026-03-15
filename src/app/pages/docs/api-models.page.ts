import { Component } from '@angular/core';
import { LocalizedDocsPageComponentBase } from './localized-docs-page.base';

@Component({
  selector: 'app-docs-api-models',
  standalone: true,
  template: ` <div [innerHTML]="html()"></div> `,
})
export class DocsApiModelsPageComponent extends LocalizedDocsPageComponentBase {
  protected readonly pageId = 'api-models' as const;
}
