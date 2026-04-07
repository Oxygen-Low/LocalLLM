import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { environment } from '../environments/environment';
import { AuthService } from './services/auth.service';
import { LlmService } from './services/llm.service';
import { RepositoriesService } from './services/repositories.service';
import { AdminService } from './services/admin.service';
import { CodingAgentService } from './services/coding-agent.service';
import { WebSeoService } from './services/web-seo.service';
import { RoleplayService } from './services/roleplay.service';
import { MockAuthService } from './services/mocks/mock-auth.service';
import { MockLlmService } from './services/mocks/mock-llm.service';
import { MockRepositoriesService } from './services/mocks/mock-repositories.service';
import { MockAdminService } from './services/mocks/mock-admin.service';
import { MockCodingAgentService } from './services/mocks/mock-coding-agent.service';
import { MockWebSeoService } from './services/mocks/mock-web-seo.service';
import { MockRoleplayService } from './services/mocks/mock-roleplay.service';
import { DatasetsService } from './services/datasets.service';
import { MockDatasetsService } from './services/mocks/mock-datasets.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    ...(environment.preview
      ? [
          { provide: AuthService, useClass: MockAuthService },
          { provide: LlmService, useClass: MockLlmService },
          { provide: RepositoriesService, useClass: MockRepositoriesService },
          { provide: AdminService, useClass: MockAdminService },
          { provide: CodingAgentService, useClass: MockCodingAgentService },
          { provide: WebSeoService, useClass: MockWebSeoService },
          { provide: RoleplayService, useClass: MockRoleplayService },
          { provide: DatasetsService, useClass: MockDatasetsService },
        ]
      : []),
  ]
};
