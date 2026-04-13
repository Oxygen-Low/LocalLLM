import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DatasetsService, DatasetRow, GenerateDatasetResponse, SaveDatasetResponse, ImportDatasetResponse, RefineDatasetResponse, DatasetListResponse, DatasetRowsResponse, UpdateDatasetRowsResponse } from './datasets.service';

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
        retryOnFail: false,
        individualGeneration: false,
        numRows: 10,
        datasetType: 'standard',
      });
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.rows.length).toBe(1);
      expect((result.rows[0] as DatasetRow).instruction).toBe('Do X');
      expect(result.totalTokens).toBe(150);
    });

    it('should send retryOnFail flag when enabled', async () => {
      const mockResponse: GenerateDatasetResponse = {
        success: true,
        rows: [{ instruction: 'Do X', input: 'data', output: 'result' }],
        totalTokens: 150,
      };
      const promise = service.generate('Create Q&A pairs', 'openai', 'gpt-4', 1000, true);
      const req = httpMock.expectOne('/api/datasets/generate');
      expect(req.request.body).toEqual({
        instructions: 'Create Q&A pairs',
        provider: 'openai',
        model: 'gpt-4',
        numTokens: 1000,
        retryOnFail: true,
        individualGeneration: false,
        numRows: 10,
        datasetType: 'standard',
      });
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(true);
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
        datasetId: 'ds-123',
        datasetName: 'my-dataset',
      };
      const promise = service.save('my-dataset', 'A test dataset', rows);
      const req = httpMock.expectOne('/api/datasets/save');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        name: 'my-dataset',
        description: 'A test dataset',
        rows,
        datasetType: 'standard',
      });
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.datasetId).toBe('ds-123');
      expect(result.datasetName).toBe('my-dataset');
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
        datasetId: 'ds-456',
        datasetName: 'imported-ds',
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
      expect(result.datasetId).toBe('ds-456');
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

  describe('listDatasets', () => {
    it('should send GET request to /api/datasets', async () => {
      const mockResponse: DatasetListResponse = {
        success: true,
        datasets: [],
        storageUsed: 0,
      };
      const promise = service.listDatasets();
      const req = httpMock.expectOne('/api/datasets');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.datasets).toEqual([]);
    });
  });

  describe('deleteDataset', () => {
    it('should send DELETE request', async () => {
      const promise = service.deleteDataset('ds-123');
      const req = httpMock.expectOne('/api/datasets/ds-123');
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
      await promise;
    });
  });

  describe('archiveDataset', () => {
    it('should send POST request to archive endpoint', async () => {
      const promise = service.archiveDataset('ds-123');
      const req = httpMock.expectOne('/api/datasets/ds-123/archive');
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
      await promise;
    });
  });

  describe('unarchiveDataset', () => {
    it('should send POST request to unarchive endpoint', async () => {
      const promise = service.unarchiveDataset('ds-123');
      const req = httpMock.expectOne('/api/datasets/ds-123/unarchive');
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
      await promise;
    });
  });

  describe('refine', () => {
    it('should send POST request with provider, model, and instructions', async () => {
      const mockResponse: RefineDatasetResponse = {
        success: true,
        rows: [
          { instruction: 'Improved instruction', input: 'data', output: 'Improved result' },
        ],
        totalTokens: 200,
        originalName: 'my-dataset',
      };
      const promise = service.refine('ds-123', 'openai', 'gpt-4', 'Fix formal tone');
      const req = httpMock.expectOne('/api/datasets/ds-123/refine');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        provider: 'openai',
        model: 'gpt-4',
        instructions: 'Fix formal tone',
      });
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.rows.length).toBe(1);
      expect((result.rows[0] as DatasetRow).instruction).toBe('Improved instruction');
      expect(result.totalTokens).toBe(200);
      expect(result.originalName).toBe('my-dataset');
    });

    it('should send empty instructions when none provided', async () => {
      const mockResponse: RefineDatasetResponse = {
        success: true,
        rows: [{ instruction: 'Q1', input: '', output: 'A1' }],
        totalTokens: 50,
      };
      const promise = service.refine('ds-456', 'anthropic', 'claude-3');
      const req = httpMock.expectOne('/api/datasets/ds-456/refine');
      expect(req.request.body).toEqual({
        provider: 'anthropic',
        model: 'claude-3',
        instructions: '',
      });
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(true);
    });

    it('should return error response on failure', async () => {
      const mockResponse: RefineDatasetResponse = {
        success: false,
        rows: [],
        error: 'Dataset not found',
      };
      const promise = service.refine('ds-bad', 'openai', 'gpt-4', 'instructions');
      const req = httpMock.expectOne('/api/datasets/ds-bad/refine');
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Dataset not found');
      expect(result.rows).toEqual([]);
    });

    it('should handle multiple refined rows', async () => {
      const rows: DatasetRow[] = [
        { instruction: 'Q1', input: 'I1', output: 'O1' },
        { instruction: 'Q2', input: 'I2', output: 'O2' },
        { instruction: 'Q3', input: 'I3', output: 'O3' },
      ];
      const promise = service.refine('ds-multi', 'openai', 'gpt-4', '');
      const req = httpMock.expectOne('/api/datasets/ds-multi/refine');
      req.flush({ success: true, rows, totalTokens: 600 });
      const result = await promise;
      expect(result.rows.length).toBe(3);
      expect(result.totalTokens).toBe(600);
    });
  });

  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(service.formatBytes(0)).toBe('0 B');
    });

    it('should format KB', () => {
      expect(service.formatBytes(1024)).toBe('1 KB');
    });

    it('should format MB', () => {
      expect(service.formatBytes(1048576)).toBe('1 MB');
    });
  });

  describe('getDatasetRows', () => {
    it('should send GET request to /api/datasets/:id/rows', async () => {
      const mockResponse: DatasetRowsResponse = {
        success: true,
        rows: [
          { instruction: 'Do X', input: 'data', output: 'result' },
          { instruction: 'Do Y', input: '', output: 'answer' },
        ],
      };
      const promise = service.getDatasetRows('ds-123');
      const req = httpMock.expectOne('/api/datasets/ds-123/rows');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.rows.length).toBe(2);
      expect((result.rows[0] as DatasetRow).instruction).toBe('Do X');
    });

    it('should return error response on failure', async () => {
      const mockResponse: DatasetRowsResponse = {
        success: false,
        rows: [],
        error: 'Active dataset not found',
      };
      const promise = service.getDatasetRows('bad-id');
      const req = httpMock.expectOne('/api/datasets/bad-id/rows');
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Active dataset not found');
    });
  });

  describe('updateDatasetRows', () => {
    it('should send PUT request with rows', async () => {
      const rows: DatasetRow[] = [
        { instruction: 'Updated X', input: 'new data', output: 'new result' },
      ];
      const mockResponse: UpdateDatasetRowsResponse = {
        success: true,
        rowCount: 1,
        totalTokens: 50,
      };
      const promise = service.updateDatasetRows('ds-123', rows);
      const req = httpMock.expectOne('/api/datasets/ds-123/rows');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ rows });
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(1);
      expect(result.totalTokens).toBe(50);
    });

    it('should return error response on failure', async () => {
      const mockResponse: UpdateDatasetRowsResponse = {
        success: false,
        error: 'Row 1 has an empty or missing "instruction" field',
      };
      const promise = service.updateDatasetRows('ds-123', [{ instruction: '', input: '', output: 'x' }]);
      const req = httpMock.expectOne('/api/datasets/ds-123/rows');
      req.flush(mockResponse);
      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Row 1 has an empty or missing "instruction" field');
    });
  });
});
