import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface SeoFinding {
  category: string;
  type: 'error' | 'warning' | 'success';
  message: string;
  suggestion: string | null;
}

export interface SeoReport {
  totalScore: number;
  categories: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  summary: string;
  findings: SeoFinding[];
  visionWarning: boolean;
}

export interface SeoCheckResult {
  id: string;
  timestamp: string;
  report: SeoReport;
  screenshot: string;
}

export interface SeoApp {
  id: string;
  name: string;
  type: 'url' | 'repo';
  url: string | null;
  repoFullName: string | null;
  cloneUrl: string | null;
  buildCommand: string | null;
  startCommand: string | null;
  createdAt: string;
  lastCheck: SeoCheckResult | null;
}

export interface SeoProgress {
  step: string;
  message: string;
  status: 'running' | 'completed' | 'failed';
}

@Injectable({
  providedIn: 'root',
})
export class WebSeoService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  async listApps(): Promise<SeoApp[]> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; apps: SeoApp[] }>(
        `${environment.apiUrl}/api/web-seo/apps`
      )
    );
    return res.apps || [];
  }

  async createApp(app: Partial<SeoApp>): Promise<SeoApp> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; app: SeoApp }>(
        `${environment.apiUrl}/api/web-seo/apps`,
        app
      )
    );
    return res.app;
  }

  async deleteApp(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/web-seo/apps/${id}`)
    );
  }

  runCheck(id: string): Observable<any> {
    const token = this.authService.getSessionToken();
    const url = `${environment.apiUrl}/api/web-seo/check/${id}`;

    return new Observable(observer => {
      const eventSource = new (window as any).EventSource(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      // EventSource doesn't support custom headers natively in all browsers.
      // If it fails, we'll need a different approach (e.g. fetch + readable stream)
      // but let's try this first as it matches other parts of the app.
      // Actually, standard EventSource doesn't support headers.
      // Let's use fetch instead to be safe.

      const abortController = new AbortController();

      (async () => {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'text/event-stream'
            },
            signal: abortController.signal
          });

          if (!response.ok) {
            observer.error(await response.json());
            return;
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            observer.error('Failed to get reader');
            return;
          }

          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';

            for (const part of parts) {
              if (!part.trim()) continue;
              const lines = part.split('\n');
              let eventType = '';
              let eventData = '';

              for (const line of lines) {
                if (line.startsWith('event: ')) eventType = line.slice(7).trim();
                else if (line.startsWith('data: ')) eventData = line.slice(6).trim();
              }

              if (eventData) {
                try {
                  const data = JSON.parse(eventData);
                  observer.next({ type: eventType, data });
                } catch (e) {}
              }
            }
          }
          observer.complete();
        } catch (err) {
          observer.error(err);
        }
      })();

      return () => {
        abortController.abort();
      };
    });
  }
}
