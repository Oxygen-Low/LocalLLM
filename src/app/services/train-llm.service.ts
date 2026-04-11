import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TrainingJob {
  id: string;
  name: string;
  trainingMode: 'fine-tune' | 'from-scratch';
  baseModelId: string;
  baseModelName: string;
  datasetIds: string[];
  datasetNames: string[];
  postDatasetIds: string[] | null;
  postDatasetNames: string[] | null;
  outputModelId: string;
  status: string;
  progress: number;
  phase: string;
  epochs: number;
  learningRate: number;
  batchSize: number;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

export interface TrainingJobsResponse {
  success: boolean;
  jobs: TrainingJob[];
  error?: string;
}

export interface CreateTrainingJobResponse {
  success: boolean;
  job?: TrainingJob;
  error?: string;
}

export interface TrainingJobResponse {
  success: boolean;
  job?: TrainingJob;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TrainLlmService {
  private http = inject(HttpClient);

  async listJobs(): Promise<TrainingJobsResponse> {
    const res = await firstValueFrom(
      this.http.get<TrainingJobsResponse>(
        `${environment.apiUrl}/api/train-llm/jobs`
      )
    );
    return res;
  }

  async getJob(id: string): Promise<TrainingJobResponse> {
    const res = await firstValueFrom(
      this.http.get<TrainingJobResponse>(
        `${environment.apiUrl}/api/train-llm/jobs/${id}`
      )
    );
    return res;
  }

  async createJob(params: {
    name: string;
    trainingMode: 'fine-tune' | 'from-scratch';
    baseModelId?: string;
    datasetIds: string[];
    postDatasetIds?: string[];
    epochs?: number;
    learningRate?: number;
    batchSize?: number;
  }): Promise<CreateTrainingJobResponse> {
    const res = await firstValueFrom(
      this.http.post<CreateTrainingJobResponse>(
        `${environment.apiUrl}/api/train-llm/jobs`,
        params
      )
    );
    return res;
  }

  async cancelJob(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; error?: string }>(
        `${environment.apiUrl}/api/train-llm/jobs/${id}/cancel`,
        {}
      )
    );
    return res;
  }

  async deleteJob(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await firstValueFrom(
      this.http.delete<{ success: boolean; error?: string }>(
        `${environment.apiUrl}/api/train-llm/jobs/${id}`
      )
    );
    return res;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      queued: 'Queued',
      starting: 'Starting...',
      loading_model: 'Loading Model...',
      loading_dataset: 'Loading Dataset...',
      training: 'Training',
      post_training: 'Post-Training',
      saving: 'Saving Model...',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  }

  isActive(status: string): boolean {
    return ['queued', 'starting', 'loading_model', 'loading_dataset', 'training', 'post_training', 'saving'].includes(status);
  }
}
