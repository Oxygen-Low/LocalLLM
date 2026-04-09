import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { riskyAppsGuard } from './guards/risky-apps.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.page').then(m => m.LoginPageComponent),
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup.page').then(m => m.SignupPageComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/app-layout.component').then(m => m.AppLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home.page').then(m => m.HomePageComponent),
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard.page').then(m => m.DashboardPageComponent),
        canActivate: [authGuard],
      },
      {
        path: 'personas',
        loadComponent: () => import('./pages/personas.page').then(m => m.PersonasPageComponent),
        canActivate: [authGuard],
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings.page').then(m => m.SettingsPageComponent),
        canActivate: [authGuard],
      },
      {
        path: 'admin',
        loadComponent: () => import('./pages/admin.page').then(m => m.AdminPageComponent),
        canActivate: [authGuard, adminGuard],
      },
      {
        path: 'license',
        loadComponent: () => import('./pages/license.page').then(m => m.LicensePageComponent),
      },
      {
        path: 'privacy',
        loadComponent: () => import('./pages/privacy.page').then(m => m.PrivacyPageComponent),
      },
      {
        path: 'terms',
        loadComponent: () => import('./pages/terms.page').then(m => m.TermsPageComponent),
      },
      {
        path: 'app/general-assistant',
        loadComponent: () => import('./pages/general-assistant.page').then(m => m.GeneralAssistantPageComponent),
        canActivate: [authGuard],
      },
      {
        path: 'app/coding-agent',
        loadComponent: () => import('./pages/coding-agent.page').then(m => m.CodingAgentPageComponent),
        canActivate: [authGuard, riskyAppsGuard],
      },
      {
        path: 'app/repositories',
        loadComponent: () => import('./pages/repositories.page').then(m => m.RepositoriesPageComponent),
        canActivate: [authGuard, riskyAppsGuard],
      },
      {
        path: 'app/web-seo',
        loadComponent: () => import('./pages/web-seo.page').then(m => m.WebSeoPageComponent),
        canActivate: [authGuard, riskyAppsGuard],
      },
      {
        path: 'app/datasets',
        loadComponent: () => import('./pages/datasets.page').then(m => m.DatasetsPageComponent),
        canActivate: [authGuard],
      },
      {
        path: 'app/roleplay',
        loadComponent: () => import('./pages/roleplay.page').then(m => m.RoleplayPageComponent),
        canActivate: [authGuard],
      },
      {
        path: 'app/train-llm',
        loadComponent: () => import('./pages/train-llm.page').then(m => m.TrainLlmPageComponent),
        canActivate: [authGuard],
      },
    ],
  },
  {
    path: 'docs',
    loadComponent: () => import('./layout/docs-layout.component').then(m => m.DocsLayoutComponent),
    children: [
      { path: '', redirectTo: 'getting-started', pathMatch: 'full' },
      {
        path: 'getting-started',
        loadComponent: () => import('./pages/docs/getting-started.page').then(m => m.DocsGettingStartedPageComponent),
      },
      {
        path: 'installation',
        loadComponent: () => import('./pages/docs/installation.page').then(m => m.DocsInstallationPageComponent),
      },
      {
        path: 'deployment',
        loadComponent: () => import('./pages/docs/deployment.page').then(m => m.DocsDeploymentPageComponent),
      },
      {
        path: 'deployment-docker',
        loadComponent: () => import('./pages/docs/deployment-docker.page').then(m => m.DocsDeploymentDockerPageComponent),
      },
      {
        path: 'deployment-kubernetes',
        loadComponent: () => import('./pages/docs/deployment-kubernetes.page').then(m => m.DocsDeploymentKubernetesPageComponent),
      },
      {
        path: 'configuration',
        loadComponent: () => import('./pages/docs/configuration.page').then(m => m.DocsConfigurationPageComponent),
      },
      {
        path: 'troubleshooting',
        loadComponent: () => import('./pages/docs/troubleshooting.page').then(m => m.DocsTroubleshootingPageComponent),
      },
      { path: 'api-reference', redirectTo: 'api-auth', pathMatch: 'full' },
      {
        path: 'api-auth',
        loadComponent: () => import('./pages/docs/api-auth.page').then(m => m.DocsApiAuthPageComponent),
      },
      {
        path: 'api-applications',
        loadComponent: () => import('./pages/docs/api-applications.page').then(m => m.DocsApiApplicationsPageComponent),
      },
      {
        path: 'api-models',
        loadComponent: () => import('./pages/docs/api-models.page').then(m => m.DocsApiModelsPageComponent),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found.page').then(m => m.NotFoundPageComponent),
  },
];
