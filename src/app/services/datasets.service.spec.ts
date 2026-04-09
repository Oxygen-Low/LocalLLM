import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DatasetsService, DatasetRow, GenerateDatasetResponse, SaveDatasetResponse, ImportDatasetResponse } from './datasets.service';

describe('DatasetsService', () => {
  let service: DatasetsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DatasetsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(DatasetsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generate', () => {
    it('should send POST request with correct body', async () => {
      const mockResponse: GenerateDatasetResponse = {
        success: true,
        rows: [{ instruction: 'Do X', input: 'data', output: 'result' }],
        totalTokens: 150,
      };
      const promise = service.generate('Create Q&A pairs', 'openai', 'gpt-4', 1000);
      const req = httpMock.expectOne('/api/datasets/generate');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        instructions: 'Create Q&A pairs',
        provider: 'openai',
        model: 'gpt-4',
        numTokens: 1000,
      });
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].instruction).toBe('Do X');
      expect(result.totalTokens).toBe(150);
    });

    it('should return error response on failure', async () => {
      const mockResponse: GenerateDatasetResponse = {
        success: false,
        rows: [],
        error: 'Invalid provider',
      };
      const promise = service.generate('instructions', 'bad-provider', 'model', 500);
      const req = httpMock.expectOne('/api/datasets/generate');
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid provider');
      expect(result.rows).toEqual([]);
    });

    it('should handle multiple rows in response', async () => {
      const rows: DatasetRow[] = [
        { instruction: 'Q1', input: 'I1', output: 'O1' },
        { instruction: 'Q2', input: 'I2', output: 'O2' },
        { instruction: 'Q3', input: 'I3', output: 'O3' },
      ];
      const promise = service.generate('Generate dataset', 'anthropic', 'claude-3', 2000);
      const req = httpMock.expectOne('/api/datasets/generate');
      req.flush({ success: true, rows, totalTokens: 500 });
      const result = await promise;
      expect(result.rows.length).toBe(3);
    });
  });

  describe('save', () => {
    it('should send POST request with name, description, and rows', async () => {
      const rows: DatasetRow[] = [
        { instruction: 'Do X', input: 'data', output: 'result' },
      ];
      const mockResponse: SaveDatasetResponse = {
        success: true,
        repoId: 'repo-123',
        repoName: 'my-dataset',
      };
      const promise = service.save('my-dataset', 'A test dataset', rows);
      const req = httpMock.expectOne('/api/datasets/save');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        name: 'my-dataset',
        description: 'A test dataset',
        rows,
      });
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.repoId).toBe('repo-123');
      expect(result.repoName).toBe('my-dataset');
    });

    it('should return error response on failure', async () => {
      const mockResponse: SaveDatasetResponse = {
        success: false,
        error: 'Storage full',
      };
      const promise = service.save('ds', 'desc', []);
      const req = httpMock.expectOne('/api/datasets/save');
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage full');
    });
  });

  describe('importFromHuggingFace', () => {
    it('should send POST request with import parameters', async () => {
      const mockResponse: ImportDatasetResponse = {
        success: true,
        repoId: 'repo-456',
        repoName: 'imported-ds',
        rowCount: 100,
        totalTokens: 5000,
      };
      const promise = service.importFromHuggingFace('org/dataset', 'imported-ds', 'train', 100);
      const req = httpMock.expectOne('/api/datasets/import-huggingface');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        datasetId: 'org/dataset',
        name: 'imported-ds',
        split: 'train',
        maxRows: 100,
      });
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.repoId).toBe('repo-456');
      expect(result.rowCount).toBe(100);
      expect(result.totalTokens).toBe(5000);
    });

    it('should return error response on failure', async () => {
      const mockResponse: ImportDatasetResponse = {
        success: false,
        error: 'Dataset not found',
      };
      const promise = service.importFromHuggingFace('nonexistent/ds', 'name', 'train', 50);
      const req = httpMock.expectOne('/api/datasets/import-huggingface');
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Dataset not found');
    });
  });
});
