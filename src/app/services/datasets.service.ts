import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DatasetRow {
  instruction: string;
  input: string;
  output: string;
}

export interface GenerateDatasetResponse {
  success: boolean;
  rows: DatasetRow[];
  totalTokens?: number;
  error?: string;
}

export interface SaveDatasetResponse {
  success: boolean;
  repoId?: string;
  repoName?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DatasetsService {
  private http = inject(HttpClient);

  async generate(
    instructions: string,
    provider: string,
    model: string,
    numTokens: number
  ): Promise<GenerateDatasetResponse> {
    const res = await firstValueFrom(
      this.http.post<GenerateDatasetResponse>(
        `${environment.apiUrl}/api/datasets/generate`,
        { instructions, provider, model, numTokens }
      )
    );
    return res;
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
}
