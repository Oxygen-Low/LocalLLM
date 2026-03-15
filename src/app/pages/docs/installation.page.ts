import { Component } from '@angular/core';
import { LocalizedDocsPageComponentBase } from './localized-docs-page.base';

@Component({
  selector: 'app-docs-installation',
  standalone: true,
  template: ` <div [innerHTML]="html()"></div> `,
})
export class DocsInstallationPageComponent extends LocalizedDocsPageComponentBase {
  protected readonly pageId = 'installation' as const;
}
