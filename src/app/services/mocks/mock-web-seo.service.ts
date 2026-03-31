import { Injectable } from '@angular/core';
import { SeoApp, SeoReport } from '../web-seo.service';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MockWebSeoService {
  private apps: SeoApp[] = [
    {
      id: '1',
      name: 'Demo Website',
      type: 'url',
      url: 'https://example.com',
      repoFullName: null,
      cloneUrl: null,
      buildCommand: null,
      startCommand: null,
      createdAt: new Date().toISOString(),
      lastCheck: {
        id: 'c1',
        timestamp: new Date().toISOString(),
        report: {
          totalScore: 88,
          categories: { performance: 80, accessibility: 95, bestPractices: 85, seo: 92 },
          summary: "This is a mock SEO report for the preview mode.",
          findings: [
            { category: "SEO", type: "success", message: "Canonical tags are correct", suggestion: null },
            { category: "Performance", type: "warning", message: "Large images found", suggestion: "Compress your images" }
          ],
          visionWarning: false
        },
        screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
      }
    }
  ];

  async listApps(): Promise<SeoApp[]> {
    return this.apps;
  }

  async createApp(app: Partial<SeoApp>): Promise<SeoApp> {
    const newApp: SeoApp = {
      id: Math.random().toString(36).substring(7),
      name: app.name || 'New App',
      type: app.type || 'url',
      url: app.url || null,
      repoFullName: app.repoFullName || null,
      cloneUrl: app.cloneUrl || null,
      buildCommand: app.buildCommand || null,
      startCommand: app.startCommand || null,
      createdAt: new Date().toISOString(),
      lastCheck: null
    };
    this.apps.push(newApp);
    return newApp;
  }

  async deleteApp(id: string): Promise<void> {
    this.apps = this.apps.filter(a => a.id !== id);
  }

  runCheck(id: string): Observable<any> {
    return new Observable(observer => {
      observer.next({ type: 'progress', data: { step: 'init', message: 'Starting mock check...', status: 'completed' } });
      setTimeout(() => {
        observer.next({ type: 'progress', data: { step: 'analyze', message: 'Analyzing mock website...', status: 'completed' } });
        setTimeout(() => {
          observer.next({ type: 'progress', data: { step: 'ai', message: 'Generating AI findings...', status: 'completed' } });
          setTimeout(() => {
            const report: SeoReport = {
              totalScore: 92,
              categories: { performance: 85, accessibility: 90, bestPractices: 95, seo: 100 },
              summary: "Excellent results! Your site is well optimized.",
              findings: [
                { category: "SEO", type: "success", message: "Title tags look great", suggestion: null },
                { category: "Best Practices", type: "success", message: "HTTPS is enabled", suggestion: null }
              ],
              visionWarning: false
            };
            const result = {
              report,
              screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
            };
            observer.next({ type: 'result', data: result });
            observer.complete();
          }, 1000);
        }, 1000);
      }, 1000);
    });
  }
}
