import { Component } from '@angular/core';
import { LocalizedDocsPageComponentBase } from './localized-docs-page.base';

@Component({
  selector: 'app-docs-deployment-docker',
  standalone: true,
  template: ` <div [innerHTML]="html()"></div> `,
})
export class DocsDeploymentDockerPageComponent extends LocalizedDocsPageComponentBase {
  protected readonly pageId = 'deployment-docker' as const;
}
