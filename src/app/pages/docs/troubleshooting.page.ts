import { Component } from '@angular/core';
import { LocalizedDocsPageComponentBase } from './localized-docs-page.base';

@Component({
  selector: 'app-docs-troubleshooting',
  standalone: true,
  template: ` <div [innerHTML]="html()"></div> `,
})
export class DocsTroubleshootingPageComponent extends LocalizedDocsPageComponentBase {
  protected readonly pageId = 'troubleshooting' as const;
}
