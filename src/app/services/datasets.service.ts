import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface DatasetRow {
  instruction: string;
  input: string;
  output: string;
}

export interface DatasetEntry {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
  username: string;
  rowCount: number;
  totalTokens: number;
  createdAt: string;
  archivedAt: string | null;
  size?: number;
}

export interface DatasetListResponse {
  success: boolean;
  datasets: DatasetEntry[];
  storageUsed: number;
}

export interface GenerateDatasetResponse {
  success: boolean;
  rows: DatasetRow[];
  totalTokens?: number;
  error?: string;
}

export interface SaveDatasetResponse {
  success: boolean;
  datasetId?: string;
  datasetName?: string;
  error?: string;
}

export interface ImportDatasetResponse {
  success: boolean;
  datasetId?: string;
  datasetName?: string;
  rowCount?: number;
  totalTokens?: number;
  error?: string;
}

export interface RefineDatasetResponse {
  success: boolean;
  rows: DatasetRow[];
  totalTokens?: number;
  originalName?: string;
  error?: string;
}

export interface DatasetRowsResponse {
  success: boolean;
  rows: DatasetRow[];
  error?: string;
}

export interface UpdateDatasetRowsResponse {
  success: boolean;
  rowCount?: number;
  totalTokens?: number;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DatasetsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  async generate(
    instructions: string,
    provider: string,
    model: string,
    numTokens: number,
    retryOnFail: boolean = false,
    individualGeneration: boolean = false,
    numRows: number = 10,
    onProgress?: (completed: number, total: number) => void
  ): Promise<GenerateDatasetResponse> {
    // Use SSE streaming for individual generation to get progress updates
    if (individualGeneration && onProgress) {
      return this.generateWithProgress(instructions, provider, model, numTokens, retryOnFail, numRows, onProgress);
    }
    const res = await firstValueFrom(
      this.http.post<GenerateDatasetResponse>(
        `${environment.apiUrl}/api/datasets/generate`,
        { instructions, provider, model, numTokens, retryOnFail, individualGeneration, numRows }
      )
    );
    return res;
  }

  private async generateWithProgress(
    instructions: string,
    provider: string,
    model: string,
    numTokens: number,
    retryOnFail: boolean,
    numRows: number,
    onProgress: (completed: number, total: number) => void
  ): Promise<GenerateDatasetResponse> {
    const token = this.authService.getSessionToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${environment.apiUrl}/api/datasets/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        instructions, provider, model, numTokens,
        retryOnFail, individualGeneration: true, numRows,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Request failed' }));
      throw { error: errorBody };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw { error: { error: 'Streaming not supported' } };
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let result: GenerateDatasetResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'progress') {
              onProgress(data.completed, data.total);
            } else if (data.type === 'done') {
              result = {
                success: data.success,
                rows: data.rows || [],
                totalTokens: data.totalTokens,
                error: data.error,
              };
            }
          } catch { /* ignore malformed SSE data */ }
        }
      }
    }

    if (!result) {
      return { success: false, rows: [], error: 'No response received from server' };
    }
    return result;
  }

  async save(
    name: string,
    description: string,
    rows: DatasetRow[]
  ): Promise<SaveDatasetResponse> {
    const res = await firstValueFrom(
      this.http.post<SaveDatasetResponse>(
        `${environment.apiUrl}/api/datasets/save`,
        { name, description, rows }
      )
    );
    return res;
  }

  async importFromHuggingFace(
    datasetId: string,
    name: string,
    split: string,
    maxRows: number
  ): Promise<ImportDatasetResponse> {
    const res = await firstValueFrom(
      this.http.post<ImportDatasetResponse>(
        `${environment.apiUrl}/api/datasets/import-huggingface`,
        { datasetId, name, split, maxRows }
      )
    );
    return res;
  }

  async refine(
    datasetId: string,
    provider: string,
    model: string,
    instructions: string = ''
  ): Promise<RefineDatasetResponse> {
    const res = await firstValueFrom(
      this.http.post<RefineDatasetResponse>(
        `${environment.apiUrl}/api/datasets/${datasetId}/refine`,
        { provider, model, instructions }
      )
    );
    return res;
  }

  async listDatasets(): Promise<DatasetListResponse> {
    const res = await firstValueFrom(
      this.http.get<DatasetListResponse>(
        `${environment.apiUrl}/api/datasets`
      )
    );
    return res;
  }

  async getDataset(id: string): Promise<DatasetEntry> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; dataset: DatasetEntry }>(
        `${environment.apiUrl}/api/datasets/${id}`
      )
    );
    return res.dataset;
  }

  async getDatasetRows(id: string): Promise<DatasetRowsResponse> {
    const res = await firstValueFrom(
      this.http.get<DatasetRowsResponse>(
        `${environment.apiUrl}/api/datasets/${id}/rows`
      )
    );
    return res;
  }

  async updateDatasetRows(id: string, rows: DatasetRow[]): Promise<UpdateDatasetRowsResponse> {
    const res = await firstValueFrom(
      this.http.put<UpdateDatasetRowsResponse>(
        `${environment.apiUrl}/api/datasets/${id}/rows`,
        { rows }
      )
    );
    return res;
  }

  async deleteDataset(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/api/datasets/${id}`)
    );
  }

  async archiveDataset(id: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/api/datasets/${id}/archive`, {})
    );
  }

  async unarchiveDataset(id: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/api/datasets/${id}/unarchive`, {})
    );
  }

  getDownloadUrl(id: string): string {
    return `${environment.apiUrl}/api/datasets/${id}/download`;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}
