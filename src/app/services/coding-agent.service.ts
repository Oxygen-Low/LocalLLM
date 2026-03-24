import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  defaultBranch: string;
  language: string | null;
  updatedAt: string;
  htmlUrl: string;
  cloneUrl: string;
}

export interface ContainerInfo {
  id: string;
  dockerId: string;
  dockerName: string;
  repoFullName: string;
  branch: string;
  mode: 'background' | 'manual';
  status: 'running' | 'stopped' | 'creating';
  createdAt: string;
  lastActivity: number;
}

export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
}

@Injectable({
  providedIn: 'root',
})
export class CodingAgentService {
  private http = inject(HttpClient);

  // --- GitHub Integration ---

  async getGitHubStatus(): Promise<{ configured: boolean; username: string | null }> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; configured: boolean; username: string | null }>(
        `${environment.apiUrl}/api/user/integrations/github/status`
      )
    );
    return { configured: res.configured, username: res.username };
  }

  async setGitHubToken(token: string): Promise<{ username: string }> {
    const res = await firstValueFrom(
      this.http.put<{ success: boolean; username: string; error?: string }>(
        `${environment.apiUrl}/api/user/integrations/github`,
        { token }
      )
    );
    return { username: res.username };
  }

  async removeGitHubToken(): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/user/integrations/github`)
    );
  }

  async getGitHubRepos(page = 1, search = ''): Promise<GitHubRepo[]> {
    const params: Record<string, string> = { page: String(page) };
    if (search) params['search'] = search;

    const res = await firstValueFrom(
      this.http.get<{ success: boolean; repos: GitHubRepo[] }>(
        `${environment.apiUrl}/api/user/integrations/github/repos`,
        { params }
      )
    );
    return res.repos || [];
  }

  // --- Docker ---

  async getDockerStatus(): Promise<{ available: boolean }> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; available: boolean }>(
        `${environment.apiUrl}/api/coding-agent/docker/status`
      )
    );
    return { available: res.available };
  }

  // --- Containers ---

  async createContainer(repoFullName: string, cloneUrl: string, mode: 'background' | 'manual', branch?: string): Promise<ContainerInfo> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; container: ContainerInfo }>(
        `${environment.apiUrl}/api/coding-agent/containers`,
        { repoFullName, cloneUrl, branch, mode }
      )
    );
    return res.container;
  }

  async listContainers(): Promise<ContainerInfo[]> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; containers: ContainerInfo[] }>(
        `${environment.apiUrl}/api/coding-agent/containers`
      )
    );
    return res.containers || [];
  }

  async getContainer(id: string): Promise<ContainerInfo> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; container: ContainerInfo }>(
        `${environment.apiUrl}/api/coding-agent/containers/${id}`
      )
    );
    return res.container;
  }

  async stopContainer(id: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/api/coding-agent/containers/${id}/stop`, {})
    );
  }

  async startContainer(id: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/api/coding-agent/containers/${id}/start`, {})
    );
  }

  async removeContainer(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/coding-agent/containers/${id}`)
    );
  }

  async execInContainer(id: string, command: string): Promise<{ output: string; exitCode?: number }> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; output: string; exitCode?: number }>(
        `${environment.apiUrl}/api/coding-agent/containers/${id}/exec`,
        { command }
      )
    );
    return { output: res.output || '', exitCode: res.exitCode };
  }

  // --- Files ---

  async listFiles(containerId: string, dirPath = '.'): Promise<FileEntry[]> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; files: FileEntry[] }>(
        `${environment.apiUrl}/api/coding-agent/containers/${containerId}/files`,
        { params: { path: dirPath } }
      )
    );
    return res.files || [];
  }

  async readFile(containerId: string, filePath: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; content: string }>(
        `${environment.apiUrl}/api/coding-agent/containers/${containerId}/file`,
        { params: { path: filePath } }
      )
    );
    return res.content || '';
  }

  async writeFile(containerId: string, filePath: string, content: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`${environment.apiUrl}/api/coding-agent/containers/${containerId}/file`, {
        path: filePath,
        content,
      })
    );
  }
}
