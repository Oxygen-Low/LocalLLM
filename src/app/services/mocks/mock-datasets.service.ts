import { Injectable } from '@angular/core';
import { DatasetRow, GenerateDatasetResponse, SaveDatasetResponse } from '../datasets.service';

@Injectable({
  providedIn: 'root',
})
export class MockDatasetsService {
  async generate(
    instructions: string,
    provider: string,
    model: string,
    numTokens: number,
    retryOnFail: boolean = false
  ): Promise<GenerateDatasetResponse> {
    const estimatedRows = Math.max(1, Math.ceil(numTokens / 100));
    const rows: DatasetRow[] = [];
    for (let i = 0; i < estimatedRows; i++) {
      rows.push({
        instruction: `Sample instruction ${i + 1} based on: ${instructions.slice(0, 50)}`,
        input: `Sample input for row ${i + 1}`,
        output: `Sample output for row ${i + 1}`,
      });
    }
    return { success: true, rows, totalTokens: numTokens };
  }

  async save(
    name: string,
    description: string,
    rows: DatasetRow[]
  ): Promise<SaveDatasetResponse> {
    return {
      success: true,
      repoId: 'mock-dataset-repo-id',
      repoName: name,
    };
  }
}
