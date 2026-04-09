import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LocalRepo {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
  username: string;
  defaultBranch: string;
  createdAt: string;
  lastActivity: number;
  archivedAt: string | null;
  containerId: string | null;
  containerName: string | null;
  /** Only present when fetching a single repo (GET /:id) */
  authKey?: string;
  /** Byte size on disk; present when fetching a single repo */
  size?: number;
}

export interface RepoListResponse {
  repos: LocalRepo[];
  storageUsed: number;
  storageMax: number;
}

@Injectable({ providedIn: 'root' })
export class RepositoriesService {
  private http = inject(HttpClient);

  async listRepos(): Promise<RepoListResponse> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean } & RepoListResponse>(`${environment.apiUrl}/api/repositories`)
    );
    return { repos: res.repos, storageUsed: res.storageUsed, storageMax: res.storageMax };
  }

  async getRepo(id: string): Promise<LocalRepo> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; repo: LocalRepo }>(`${environment.apiUrl}/api/repositories/${id}`)
    );
    return res.repo;
  }

  async createRepo(name: string, description: string, initReadme: boolean): Promise<LocalRepo> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; repo: LocalRepo }>(
        `${environment.apiUrl}/api/repositories`,
        { name, description, initReadme }
      )
    );
    return res.repo;
  }

  async deleteRepo(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${environment.apiUrl}/api/repositories/${id}`));
  }

  async archiveRepo(id: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/api/repositories/${id}/archive`, {})
    );
  }

  async unarchiveRepo(id: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/api/repositories/${id}/unarchive`, {})
    );
  }

  async regenerateKey(id: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; authKey: string }>(
        `${environment.apiUrl}/api/repositories/${id}/regenerate-key`,
        {}
      )
    );
    return res.authKey;
  }

  async importFromGitHub(cloneUrl: string, name: string, description: string): Promise<LocalRepo> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; repo: LocalRepo }>(
        `${environment.apiUrl}/api/repositories/import-github`,
        { cloneUrl, name, description }
      )
    );
    return res.repo;
  }

  async exportToGitHub(
    id: string,
    newRepoName: string,
    isPrivate: boolean,
    deleteLocal: boolean
  ): Promise<{ githubUrl: string; githubCloneUrl: string }> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; githubUrl: string; githubCloneUrl: string }>(
        `${environment.apiUrl}/api/repositories/${id}/export-github`,
        { newRepoName, isPrivate, deleteLocal }
      )
    );
    return { githubUrl: res.githubUrl, githubCloneUrl: res.githubCloneUrl };
  }

  /** Used by the coding agent to list active local repos for container creation. */
  async listActiveRepos(): Promise<LocalRepo[]> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; repos: LocalRepo[] }>(`${environment.apiUrl}/api/local-repositories`)
    );
    return res.repos || [];
  }

  /** Build the git clone URL for a local repo (served by the app server). */
  getCloneUrl(repoId: string): string {
    return `${environment.apiUrl}/api/repositories/${repoId}/git/`;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}
