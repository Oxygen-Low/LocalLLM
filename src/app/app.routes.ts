import { Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app-layout.component';
import { DocsLayoutComponent } from './layout/docs-layout.component';
import { HomePageComponent } from './pages/home.page';
import { DashboardPageComponent } from './pages/dashboard.page';
import { LicensePageComponent } from './pages/license.page';
import { PlaceholderPageComponent } from './pages/placeholder.page';
import { LoginPageComponent } from './pages/login.page';
import { SignupPageComponent } from './pages/signup.page';
import { DocsGettingStartedPageComponent } from './pages/docs/getting-started.page';
import { DocsInstallationPageComponent } from './pages/docs/installation.page';
import { DocsDeploymentPageComponent } from './pages/docs/deployment.page';
import { DocsDeploymentDockerPageComponent } from './pages/docs/deployment-docker.page';
import { DocsDeploymentKubernetesPageComponent } from './pages/docs/deployment-kubernetes.page';
import { DocsConfigurationPageComponent } from './pages/docs/configuration.page';
import { DocsTroubleshootingPageComponent } from './pages/docs/troubleshooting.page';
import { DocsApiAuthPageComponent } from './pages/docs/api-auth.page';
import { DocsApiApplicationsPageComponent } from './pages/docs/api-applications.page';
import { DocsApiModelsPageComponent } from './pages/docs/api-models.page';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'signup', component: SignupPageComponent },
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: '', component: HomePageComponent },
      { path: 'dashboard', component: DashboardPageComponent, canActivate: [authGuard] },
      { path: 'license', component: LicensePageComponent },
      { path: 'app/:id', component: PlaceholderPageComponent, canActivate: [authGuard] },
    ],
  },
  {
    path: 'docs',
    component: DocsLayoutComponent,
    children: [
      { path: '', redirectTo: 'getting-started', pathMatch: 'full' },
      { path: 'getting-started', component: DocsGettingStartedPageComponent },
      { path: 'installation', component: DocsInstallationPageComponent },
      { path: 'deployment', component: DocsDeploymentPageComponent },
      { path: 'deployment-docker', component: DocsDeploymentDockerPageComponent },
      { path: 'deployment-kubernetes', component: DocsDeploymentKubernetesPageComponent },
      { path: 'configuration', component: DocsConfigurationPageComponent },
      { path: 'troubleshooting', component: DocsTroubleshootingPageComponent },
      { path: 'api-reference', redirectTo: 'api-auth', pathMatch: 'full' },
      { path: 'api-auth', component: DocsApiAuthPageComponent },
      { path: 'api-applications', component: DocsApiApplicationsPageComponent },
      { path: 'api-models', component: DocsApiModelsPageComponent },
    ],
  },
  {
    path: '**',
    component: PlaceholderPageComponent,
  },
];
