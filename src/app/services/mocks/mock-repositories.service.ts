import { Injectable } from '@angular/core';
import { LocalRepo, RepoListResponse } from '../repositories.service';

@Injectable({
  providedIn: 'root',
})
export class MockRepositoriesService {
  async listRepos(): Promise<RepoListResponse> {
    return {
      repos: [
        {
          id: '1',
          name: 'Demo Project',
          description: 'An example repository for the preview.',
          status: 'active',
          username: 'demo_user',
          defaultBranch: 'main',
          createdAt: new Date().toISOString(),
          lastActivity: Date.now(),
          archivedAt: null,
          containerId: null,
          containerName: null,
        },
        {
          id: '2',
          name: 'Preview App',
          description: 'Another demo project.',
          status: 'active',
          username: 'demo_user',
          defaultBranch: 'master',
          createdAt: new Date().toISOString(),
          lastActivity: Date.now() - 3600000,
          archivedAt: null,
          containerId: null,
          containerName: null,
        },
      ],
      storageUsed: 1024 * 1024 * 10,
      storageMax: 1024 * 1024 * 1024,
    };
  }

  async getRepo(id: string): Promise<LocalRepo> {
    const repos = (await this.listRepos()).repos;
    const repo = repos.find(r => r.id === id) || repos[0];
    return { ...repo, size: 5 * 1024 * 1024, authKey: 'mock-key' };
  }

  async createRepo(name: string, description: string, initReadme: boolean): Promise<LocalRepo> {
    const repo = (await this.listRepos()).repos[0];
    return { ...repo, name, description };
  }

  async deleteRepo(id: string): Promise<void> {}
  async archiveRepo(id: string): Promise<void> {}
  async unarchiveRepo(id: string): Promise<void> {}
  async regenerateKey(id: string): Promise<string> {
    return 'new-mock-key';
  }
  async importFromGitHub(cloneUrl: string, name: string, description: string): Promise<LocalRepo> {
    const repo = (await this.listRepos()).repos[0];
    return { ...repo, name, description };
  }
  async exportToGitHub(id: string, newRepoName: string, isPrivate: boolean, deleteLocal: boolean): Promise<{ githubUrl: string; githubCloneUrl: string }> {
    return { githubUrl: 'https://github.com/demo/preview', githubCloneUrl: 'https://github.com/demo/preview.git' };
  }
  async listActiveRepos(): Promise<LocalRepo[]> {
    return (await this.listRepos()).repos;
  }
  getCloneUrl(repoId: string): string {
    return `https://demo.local-llm.com/git/${repoId}`;
  }
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}
