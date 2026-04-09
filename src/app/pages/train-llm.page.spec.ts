import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TrainLlmPageComponent } from './train-llm.page';
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
    // Flush any outstanding requests from polling or async calls
    httpMock.match(() => true).forEach(req => {
      if (!req.cancelled) {
        try { req.flush({ success: true, jobs: [], models: [], datasets: [] }); } catch { /* ignore */ }
      }
    });
    localStorage.clear();
  });

  function flushAllPending(): void {
    // Flush training jobs
    httpMock.match('/api/train-llm/jobs').forEach(r => {
      try { r.flush({ success: true, jobs: [] }); } catch { /* ignore */ }
    });
    // Flush models and datasets
    httpMock.match('/api/local-models').forEach(r => {
      try { r.flush({ success: true, models: [] }); } catch { /* ignore */ }
    });
    httpMock.match('/api/datasets').forEach(r => {
      try { r.flush({ success: true, datasets: [], storageUsed: 0 }); } catch { /* ignore */ }
    });
  }

  it('should create the component', () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();
    flushAllPending();
    expect(fixture.componentInstance).toBeTruthy();
    fixture.destroy();
  });

  it('should display the page title', () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();
    flushAllPending();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.trim()).toContain('Train LLM');
    fixture.destroy();
  });

  it('should show empty state when no jobs exist', () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();
    flushAllPending();

    const instance = fixture.componentInstance;
    // After flushAllPending, async calls may not have resolved yet.
    // Force the signal states directly:
    instance.isLoading.set(false);
    instance.jobs.set([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const emptyText = compiled.textContent || '';
    expect(emptyText).toContain('No Training Jobs Yet');
    fixture.destroy();
  });

  it('should switch to create view when clicking new job button', () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();
    flushAllPending();
    fixture.detectChanges();

    const instance = fixture.componentInstance;
    instance.showCreateView();
    fixture.detectChanges();

    expect(instance.pageView()).toBe('create');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent?.trim()).toContain('New Training Job');
    fixture.destroy();
  });

  it('should switch back to queue view', () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();
    flushAllPending();
    fixture.detectChanges();

    const instance = fixture.componentInstance;
    instance.showCreateView();
    fixture.detectChanges();
    expect(instance.pageView()).toBe('create');

    instance.showQueueView();
    flushAllPending();
    fixture.detectChanges();
    expect(instance.pageView()).toBe('queue');
    fixture.destroy();
  });

  it('should display jobs in the queue', () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();
    flushAllPending();

    const instance = fixture.componentInstance;
    instance.isLoading.set(false);
    instance.jobs.set([
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
        status: 'completed',
        progress: 100,
        phase: 'done',
        epochs: 3,
        learningRate: 0.00002,
        batchSize: 4,
        createdAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T01:00:00Z',
        error: null,
      },
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h3')?.textContent?.trim()).toBe('My Training');
    fixture.destroy();
  });

  it('should show progress bar for active jobs', () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();
    flushAllPending();

    const instance = fixture.componentInstance;
    instance.isLoading.set(false);
    instance.jobs.set([
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
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    // The progress bar div should exist within the w-full container
    const progressContainer = compiled.querySelector('.bg-secondary-200');
    expect(progressContainer).toBeTruthy();
    // The percentage text should display
    const text = compiled.textContent || '';
    expect(text).toContain('60%');
    fixture.destroy();
  });

  it('should validate form before creating a job', () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    fixture.detectChanges();
    flushAllPending();
    fixture.detectChanges();

    const instance = fixture.componentInstance;
    instance.showCreateView();
    fixture.detectChanges();

    // Call createJob synchronously (validation is sync before async API call)
    instance.createJob();
    fixture.detectChanges();

    expect(instance.createError()).toBeTruthy();
    fixture.destroy();
  });

  it('should return correct status badge class', () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    const instance = fixture.componentInstance;

    expect(instance.getStatusBadgeClass('training')).toContain('bg-primary-100');
    expect(instance.getStatusBadgeClass('completed')).toContain('bg-green-100');
    expect(instance.getStatusBadgeClass('failed')).toContain('bg-red-100');
    expect(instance.getStatusBadgeClass('queued')).toContain('bg-yellow-100');
    fixture.destroy();
  });

  it('should format dates correctly', () => {
    const fixture = TestBed.createComponent(TrainLlmPageComponent);
    const instance = fixture.componentInstance;

    expect(instance.formatDate('')).toBe('');
    const result = instance.formatDate('2024-01-15T10:30:00Z');
    expect(result).toBeTruthy();
    fixture.destroy();
  });
});
