import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TrainLlmService } from './train-llm.service';

describe('TrainLlmService', () => {
  let service: TrainLlmService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(TrainLlmService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should list training jobs', async () => {
    const promise = service.listJobs();

    const req = httpMock.expectOne('/api/train-llm/jobs');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, jobs: [] });

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.jobs).toEqual([]);
  });

  it('should create a training job', async () => {
    const promise = service.createJob({
      name: 'Test Training',
      trainingMode: 'fine-tune',
      baseModelId: 'model-1',
      datasetIds: ['ds-1'],
      epochs: 3,
    });

    const req = httpMock.expectOne('/api/train-llm/jobs');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.name).toBe('Test Training');
    req.flush({ success: true, job: { id: 'job-1', name: 'Test Training' } });

    const result = await promise;
    expect(result.success).toBe(true);
  });

  it('should cancel a training job', async () => {
    const promise = service.cancelJob('job-1');

    const req = httpMock.expectOne('/api/train-llm/jobs/job-1/cancel');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true });

    const result = await promise;
    expect(result.success).toBe(true);
  });

  it('should delete a training job', async () => {
    const promise = service.deleteJob('job-1');

    const req = httpMock.expectOne('/api/train-llm/jobs/job-1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true });

    const result = await promise;
    expect(result.success).toBe(true);
  });

  it('should get a single job', async () => {
    const promise = service.getJob('job-1');

    const req = httpMock.expectOne('/api/train-llm/jobs/job-1');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, job: { id: 'job-1', name: 'Test', status: 'training' } });

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.job?.id).toBe('job-1');
  });

  it('should return correct status labels', () => {
    expect(service.getStatusLabel('training')).toBe('Training');
    expect(service.getStatusLabel('completed')).toBe('Completed');
    expect(service.getStatusLabel('failed')).toBe('Failed');
    expect(service.getStatusLabel('queued')).toBe('Queued');
    expect(service.getStatusLabel('saving')).toBe('Saving Model...');
    expect(service.getStatusLabel('unknown')).toBe('unknown');
  });

  it('should identify active statuses', () => {
    expect(service.isActive('training')).toBe(true);
    expect(service.isActive('queued')).toBe(true);
    expect(service.isActive('post_training')).toBe(true);
    expect(service.isActive('completed')).toBe(false);
    expect(service.isActive('failed')).toBe(false);
    expect(service.isActive('cancelled')).toBe(false);
  });

  it('should make GET request for GGUF download', () => {
    // Mock createElement/appendChild/removeChild for the download mechanism
    const mockAnchor = { href: '', download: '', click: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor);
    vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});

    service.downloadGguf('job-1');

    const req = httpMock.expectOne('/api/train-llm/jobs/job-1/download-gguf');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');

    // Respond with a mock blob
    req.flush(new Blob(['test'], { type: 'application/octet-stream' }), {
      headers: { 'Content-Disposition': 'attachment; filename="model.gguf"' },
    });

    expect(mockAnchor.click).toHaveBeenCalled();
  });
});
