import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LocalFixPageComponent } from './local-fix.page';
import { TranslationService } from '../services/translation.service';
import { AuthService } from '../services/auth.service';
import { SecurityLoggerService } from '../services/security-logger.service';

describe('LocalFixPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LocalFixPageComponent, RouterModule.forRoot([])],
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
    // Flush any pending listSessions request from ngOnInit
    httpMock.match('/api/local-fix/sessions');
    httpMock.verify();
    localStorage.clear();
  });

  function flushInitialListSessions(): void {
    const reqs = httpMock.match('/api/local-fix/sessions');
    for (const req of reqs) {
      req.flush({ success: true, sessions: [] });
    }
  }

  it('should create the component', () => {
    const fixture = TestBed.createComponent(LocalFixPageComponent);
    fixture.detectChanges();
    flushInitialListSessions();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start at the setup step', () => {
    const fixture = TestBed.createComponent(LocalFixPageComponent);
    fixture.detectChanges();
    flushInitialListSessions();
    expect(fixture.componentInstance.currentStep()).toBe('setup');
  });

  it('should display the Local Fix title', () => {
    const fixture = TestBed.createComponent(LocalFixPageComponent);
    fixture.detectChanges();
    flushInitialListSessions();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Local Fix');
  });

  it('should navigate to configure step', () => {
    const fixture = TestBed.createComponent(LocalFixPageComponent);
    fixture.detectChanges();
    flushInitialListSessions();

    fixture.componentInstance.goToStep('configure');
    fixture.detectChanges();
    expect(fixture.componentInstance.currentStep()).toBe('configure');
  });

  it('should navigate to describe-issue step', () => {
    const fixture = TestBed.createComponent(LocalFixPageComponent);
    fixture.detectChanges();
    flushInitialListSessions();

    fixture.componentInstance.instanceUrl = 'http://localhost:3000';
    fixture.componentInstance.userId = 'testuser';
    fixture.componentInstance.goToStep('describe-issue');
    fixture.detectChanges();
    expect(fixture.componentInstance.currentStep()).toBe('describe-issue');
  });

  it('should reset wizard state correctly', () => {
    const fixture = TestBed.createComponent(LocalFixPageComponent);
    fixture.detectChanges();
    flushInitialListSessions();

    const instance = fixture.componentInstance;
    instance.instanceUrl = 'http://test.com';
    instance.userId = 'user1';
    instance.issueDescription = 'Some issue';
    instance.allowCommands = true;

    instance.resetWizard();
    expect(instance.currentStep()).toBe('setup');
    expect(instance.instanceUrl).toBe('');
    expect(instance.userId).toBe('');
    expect(instance.issueDescription).toBe('');
    expect(instance.allowCommands).toBe(false);
  });

  it('should format timestamps correctly', () => {
    const fixture = TestBed.createComponent(LocalFixPageComponent);
    fixture.detectChanges();
    flushInitialListSessions();

    const instance = fixture.componentInstance;
    const ts = '2026-01-15T10:30:00.000Z';
    const formatted = instance.formatTimestamp(ts);
    expect(formatted).toBeTruthy();
    expect(formatted).not.toBe(ts); // Should format it
  });

  it('should handle invalid timestamps gracefully', () => {
    const fixture = TestBed.createComponent(LocalFixPageComponent);
    fixture.detectChanges();
    flushInitialListSessions();

    const instance = fixture.componentInstance;
    const result = instance.formatTimestamp('not-a-date');
    expect(result).toBeTruthy();
  });
});
