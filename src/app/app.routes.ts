import { Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app-layout.component';
import { HomePageComponent } from './pages/home.page';
import { DashboardPageComponent } from './pages/dashboard.page';
import { LicensePageComponent } from './pages/license.page';
import { PlaceholderPageComponent } from './pages/placeholder.page';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: '', component: HomePageComponent },
      { path: 'dashboard', component: DashboardPageComponent },
      { path: 'license', component: LicensePageComponent },
      { path: 'app/:id', component: PlaceholderPageComponent },
      { path: '**', component: PlaceholderPageComponent },
    ],
  },
];
