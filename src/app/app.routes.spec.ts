import { routes } from './app.routes';

describe('App Routes', () => {
  it('should have routes defined', () => {
    expect(routes).toBeTruthy();
    expect(routes.length).toBeGreaterThan(0);
  });

  it('should have a login route', () => {
    const loginRoute = routes.find(r => r.path === 'login');
    expect(loginRoute).toBeTruthy();
    expect(loginRoute?.loadComponent).toBeDefined();
  });

  it('should have a signup route', () => {
    const signupRoute = routes.find(r => r.path === 'signup');
    expect(signupRoute).toBeTruthy();
    expect(signupRoute?.loadComponent).toBeDefined();
  });

  it('should have a root layout route with children', () => {
    const layoutRoute = routes.find(r => r.path === '');
    expect(layoutRoute).toBeTruthy();
    expect(layoutRoute?.children).toBeDefined();
    expect(layoutRoute?.children?.length).toBeGreaterThan(0);
  });

  it('should have a docs route with children', () => {
    const docsRoute = routes.find(r => r.path === 'docs');
    expect(docsRoute).toBeTruthy();
    expect(docsRoute?.children).toBeDefined();
    expect(docsRoute?.children?.length).toBeGreaterThan(0);
  });

  it('should have a wildcard route for 404', () => {
    const wildcardRoute = routes.find(r => r.path === '**');
    expect(wildcardRoute).toBeTruthy();
    expect(wildcardRoute?.loadComponent).toBeDefined();
  });

  it('should protect dashboard with authGuard', () => {
    const layoutRoute = routes.find(r => r.path === '');
    const dashboardRoute = layoutRoute?.children?.find(r => r.path === 'dashboard');
    expect(dashboardRoute).toBeTruthy();
    expect(dashboardRoute?.canActivate).toBeDefined();
    expect(dashboardRoute?.canActivate?.length).toBeGreaterThan(0);
  });

  it('should protect admin with both authGuard and adminGuard', () => {
    const layoutRoute = routes.find(r => r.path === '');
    const adminRoute = layoutRoute?.children?.find(r => r.path === 'admin');
    expect(adminRoute).toBeTruthy();
    expect(adminRoute?.canActivate?.length).toBe(2);
  });

  it('should protect coding-agent with authGuard and riskyAppsGuard', () => {
    const layoutRoute = routes.find(r => r.path === '');
    const codingAgentRoute = layoutRoute?.children?.find(r => r.path === 'app/coding-agent');
    expect(codingAgentRoute).toBeTruthy();
    expect(codingAgentRoute?.canActivate?.length).toBe(2);
  });

  it('should not protect public pages like license, privacy, terms', () => {
    const layoutRoute = routes.find(r => r.path === '');
    const licenseRoute = layoutRoute?.children?.find(r => r.path === 'license');
    const privacyRoute = layoutRoute?.children?.find(r => r.path === 'privacy');
    const termsRoute = layoutRoute?.children?.find(r => r.path === 'terms');

    expect(licenseRoute?.canActivate).toBeUndefined();
    expect(privacyRoute?.canActivate).toBeUndefined();
    expect(termsRoute?.canActivate).toBeUndefined();
  });

  it('should have all expected child routes under layout', () => {
    const layoutRoute = routes.find(r => r.path === '');
    const childPaths = layoutRoute?.children?.map(r => r.path) || [];

    expect(childPaths).toContain('');
    expect(childPaths).toContain('dashboard');
    expect(childPaths).toContain('personas');
    expect(childPaths).toContain('settings');
    expect(childPaths).toContain('admin');
    expect(childPaths).toContain('license');
    expect(childPaths).toContain('privacy');
    expect(childPaths).toContain('terms');
    expect(childPaths).toContain('app/general-assistant');
    expect(childPaths).toContain('app/coding-agent');
    expect(childPaths).toContain('app/repositories');
    expect(childPaths).toContain('app/web-seo');
    expect(childPaths).toContain('app/datasets');
    expect(childPaths).toContain('app/roleplay');
    expect(childPaths).toContain('app/train-llm');
    expect(childPaths).toContain('app/local-fix');
  });

  it('should have all expected doc child routes', () => {
    const docsRoute = routes.find(r => r.path === 'docs');
    const docPaths = docsRoute?.children?.map(r => r.path) || [];

    expect(docPaths).toContain('getting-started');
    expect(docPaths).toContain('installation');
    expect(docPaths).toContain('deployment');
    expect(docPaths).toContain('configuration');
    expect(docPaths).toContain('troubleshooting');
  });

  it('should redirect docs root to getting-started', () => {
    const docsRoute = routes.find(r => r.path === 'docs');
    const rootDoc = docsRoute?.children?.find(r => r.path === '');
    expect(rootDoc?.redirectTo).toBe('getting-started');
    expect(rootDoc?.pathMatch).toBe('full');
  });

  it('should redirect api-reference to api-auth', () => {
    const docsRoute = routes.find(r => r.path === 'docs');
    const apiRef = docsRoute?.children?.find(r => r.path === 'api-reference');
    expect(apiRef?.redirectTo).toBe('api-auth');
  });
});
