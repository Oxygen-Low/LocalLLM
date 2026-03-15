import { Component } from '@angular/core';
import { LocalizedDocsPageComponentBase } from './localized-docs-page.base';

@Component({
  selector: 'app-docs-configuration',
  standalone: true,
  template: ` <div [innerHTML]="html()"></div> `,
})
export class DocsConfigurationPageComponent extends LocalizedDocsPageComponentBase {
  protected readonly pageId = 'configuration' as const;
}
