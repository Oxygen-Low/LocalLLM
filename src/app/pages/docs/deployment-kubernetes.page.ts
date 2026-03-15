import { Component } from '@angular/core';
import { LocalizedDocsPageComponentBase } from './localized-docs-page.base';

@Component({
  selector: 'app-docs-deployment-kubernetes',
  standalone: true,
  template: ` <div [innerHTML]="html()"></div> `,
})
export class DocsDeploymentKubernetesPageComponent extends LocalizedDocsPageComponentBase {
  protected readonly pageId = 'deployment-kubernetes' as const;
}
