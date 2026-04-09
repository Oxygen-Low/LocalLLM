import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { AppCardComponent, AIApp } from './app-card.component';
import { TranslationService } from '../services/translation.service';
import { AuthService } from '../services/auth.service';
import { SecurityLoggerService } from '../services/security-logger.service';

// Wrapper component to provide required input
@Component({
  standalone: true,
  imports: [AppCardComponent],
  template: `<app-app-card [app]="app" [disabled]="disabled" />`,
})
class TestHostComponent {
  app: AIApp = {
    id: 'test-app',
    name: 'apps.general_assistant.name',
    description: 'apps.general_assistant.desc',
    icon: '🤖',
    category: 'apps.category.ai',
    color: 'blue',
  };
  disabled = false;
}

describe('AppCardComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, RouterModule.forRoot([])],
      providers: [
        AuthService,
        SecurityLoggerService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the app card component', () => {
    const appCard = fixture.nativeElement.querySelector('app-app-card');
    expect(appCard).not.toBeNull();
  });

  it('should display the app icon', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('🤖');
  });

  it('should show the launch button when not disabled', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('button'));
    const launchBtn = buttons.find(b => !b.hasAttribute('disabled'));
    expect(launchBtn).toBeTruthy();
  });

  it('should show disabled button when disabled is true', () => {
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const disabledBtn = compiled.querySelector('button[disabled]');
    expect(disabledBtn).not.toBeNull();
  });

  it('should apply opacity and grayscale when disabled', () => {
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled.querySelector('.card');
    expect(card?.classList.contains('opacity-50')).toBe(true);
    expect(card?.classList.contains('grayscale')).toBe(true);
  });

  it('should not apply opacity and grayscale when not disabled', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled.querySelector('.card');
    expect(card?.classList.contains('opacity-50')).toBe(false);
    expect(card?.classList.contains('grayscale')).toBe(false);
  });

  it('should show risky badge when app is risky', () => {
    fixture.componentInstance.app = { ...fixture.componentInstance.app, risky: true };
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('⚠️');
  });

  it('should not show risky badge when app is not risky', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const badges = compiled.querySelectorAll('.bg-amber-100');
    expect(badges.length).toBe(0);
  });

  describe('getColorClasses', () => {
    it('should return blue classes for blue color', () => {
      const cardComponent = fixture.debugElement.children[0].componentInstance as AppCardComponent;
      expect(cardComponent.getColorClasses('blue')).toBe('bg-blue-100 text-blue-600');
    });

    it('should return purple classes for purple color', () => {
      const cardComponent = fixture.debugElement.children[0].componentInstance as AppCardComponent;
      expect(cardComponent.getColorClasses('purple')).toBe('bg-purple-100 text-purple-600');
    });

    it('should return orange classes for orange color', () => {
      const cardComponent = fixture.debugElement.children[0].componentInstance as AppCardComponent;
      expect(cardComponent.getColorClasses('orange')).toBe('bg-orange-100 text-orange-600');
    });

    it('should return green classes for green color', () => {
      const cardComponent = fixture.debugElement.children[0].componentInstance as AppCardComponent;
      expect(cardComponent.getColorClasses('green')).toBe('bg-green-100 text-green-600');
    });

    it('should return pink classes for pink color', () => {
      const cardComponent = fixture.debugElement.children[0].componentInstance as AppCardComponent;
      expect(cardComponent.getColorClasses('pink')).toBe('bg-pink-100 text-pink-600');
    });

    it('should return cyan classes for cyan color', () => {
      const cardComponent = fixture.debugElement.children[0].componentInstance as AppCardComponent;
      expect(cardComponent.getColorClasses('cyan')).toBe('bg-cyan-100 text-cyan-600');
    });

    it('should default to blue for unknown color', () => {
      const cardComponent = fixture.debugElement.children[0].componentInstance as AppCardComponent;
      expect(cardComponent.getColorClasses('unknown')).toBe('bg-blue-100 text-blue-600');
    });
  });
});
