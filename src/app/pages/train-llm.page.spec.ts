import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TrainLlmPageComponent } from './train-llm.page';
import { TranslationService } from '../services/translation.service';
import { AuthService } from '../services/auth.service';
import { SecurityLoggerService } from '../services/security-logger.service';

describe('TrainLlmPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TrainLlmPageComponent, RouterModule.forRoot([])],
      providers: [
        AuthService,
        SecurityLoggerService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function flushInitialRequests(): void {
    // Flush the training jobs list request
    const jobsReq = httpMock.expectOne('/api/train-llm/jobs');
    jobsReq.flush({ success: true, jobs: [] });

    // Flush models and datasets requests
    const modelsReq = httpMock.expectOne('/api/local-models');
    modelsReq.flush({ success: true, models: [] });

    const datasetsReq = httpMock.expectOne('/api/datasets');
    datasetsReq.flush({ success: true, datasets: [], storageUsed: 0 });
  }

  it('should create the component', () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();
    flushInitialRequests();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the page title', () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();
    flushInitialRequests();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.trim()).toContain('Train LLM');
  });

  it('should show empty state when no jobs exist', async () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();
    flushInitialRequests();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const emptyState = compiled.querySelector('.text-4xl');
    expect(emptyState?.textContent?.trim()).toBe('🎓');
  });

  it('should switch to create view when clicking new job button', async () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();
    flushInitialRequests();
    await fixture.whenStable();
    fixture.detectChanges();

    const instance = fixture.componentInstance;
    instance.showCreateView();
    fixture.detectChanges();

    expect(instance.pageView()).toBe('create');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent?.trim()).toContain('New Training Job');
  });

  it('should switch back to queue view', async () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();
    flushInitialRequests();
    await fixture.whenStable();
    fixture.detectChanges();

    const instance = fixture.componentInstance;
    instance.showCreateView();
    fixture.detectChanges();
    expect(instance.pageView()).toBe('create');

    instance.showQueueView();
    // Flush the jobs request triggered by showQueueView
    const jobsReq = httpMock.expectOne('/api/train-llm/jobs');
    jobsReq.flush({ success: true, jobs: [] });
    fixture.detectChanges();
    expect(instance.pageView()).toBe('queue');
  });

  it('should display jobs in the queue', async () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();

    // Flush with a job
    const jobsReq = httpMock.expectOne('/api/train-llm/jobs');
    jobsReq.flush({
      success: true,
      jobs: [
        {
          id: 'job-1',
          name: 'My Training',
          baseModelId: 'model-1',
          baseModelName: 'GPT-2',
          datasetId: 'ds-1',
          datasetName: 'My Dataset',
          postDatasetId: null,
          postDatasetName: null,
          outputModelId: 'out-1',
          status: 'training',
          progress: 45,
          phase: 'training',
          epochs: 3,
          learningRate: 0.00002,
          batchSize: 4,
          createdAt: '2024-01-01T00:00:00Z',
          completedAt: null,
          error: null,
        },
      ],
    });

    const modelsReq = httpMock.expectOne('/api/local-models');
    modelsReq.flush({ success: true, models: [] });

    const datasetsReq = httpMock.expectOne('/api/datasets');
    datasetsReq.flush({ success: true, datasets: [], storageUsed: 0 });

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h3')?.textContent?.trim()).toBe('My Training');
  });

  it('should show progress bar for active jobs', async () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();

    const jobsReq = httpMock.expectOne('/api/train-llm/jobs');
    jobsReq.flush({
      success: true,
      jobs: [
        {
          id: 'job-1',
          name: 'Active Job',
          baseModelId: 'model-1',
          baseModelName: 'GPT-2',
          datasetId: 'ds-1',
          datasetName: 'My Dataset',
          postDatasetId: null,
          postDatasetName: null,
          outputModelId: 'out-1',
          status: 'training',
          progress: 60,
          phase: 'training',
          epochs: 3,
          learningRate: 0.00002,
          batchSize: 4,
          createdAt: '2024-01-01T00:00:00Z',
          completedAt: null,
          error: null,
        },
      ],
    });

    const modelsReq = httpMock.expectOne('/api/local-models');
    modelsReq.flush({ success: true, models: [] });

    const datasetsReq = httpMock.expectOne('/api/datasets');
    datasetsReq.flush({ success: true, datasets: [], storageUsed: 0 });

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const progressBar = compiled.querySelector('.bg-primary-600');
    expect(progressBar).toBeTruthy();
    expect((progressBar as HTMLElement).style.width).toBe('60%');
  });

  it('should validate form before creating a job', async () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();
    flushInitialRequests();
    await fixture.whenStable();
    fixture.detectChanges();

    const instance = fixture.componentInstance;
    instance.showCreateView();
    fixture.detectChanges();

    // Try creating without filling required fields
    await instance.createJob();
    fixture.detectChanges();

    expect(instance.createError()).toBeTruthy();
  });

  it('should return correct status badge class', () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    const instance = fixture.componentInstance;

    expect(instance.getStatusBadgeClass('training')).toContain('bg-primary-100');
    expect(instance.getStatusBadgeClass('completed')).toContain('bg-green-100');
    expect(instance.getStatusBadgeClass('failed')).toContain('bg-red-100');
    expect(instance.getStatusBadgeClass('queued')).toContain('bg-yellow-100');
  });

  it('should format dates correctly', () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    const instance = fixture.componentInstance;

    expect(instance.formatDate('')).toBe('');
    const result = instance.formatDate('2024-01-15T10:30:00Z');
    expect(result).toBeTruthy();
  });
});
