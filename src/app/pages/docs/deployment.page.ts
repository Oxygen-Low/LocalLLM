import { Component } from '@angular/core';
import { LocalizedDocsPageComponentBase } from './localized-docs-page.base';

@Component({
  selector: 'app-docs-deployment',
  standalone: true,
  template: ` <div [innerHTML]="html()"></div> `,
})
export class DocsDeploymentPageComponent extends LocalizedDocsPageComponentBase {
  protected readonly pageId = 'deployment' as const;
}
