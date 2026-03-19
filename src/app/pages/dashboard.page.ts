import { Component, inject } from '@angular/core';
import { AppCardComponent, type AIApp } from '../components/app-card.component';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LanguageSelectorComponent } from '../components/language-selector.component';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AppCardComponent, RouterLink, LanguageSelectorComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-white to-secondary-50">
      <div class="container-custom py-12 sm:py-16 lg:py-20">
        <!-- Header -->
        <div class="max-w-3xl mb-12 sm:mb-16">
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
                <span class="w-2 h-2 bg-primary-600 rounded-full"></span>
                {{ t.translate('dashboard.badge') }}
              </div>
              <h1 class="text-4xl sm:text-5xl font-bold text-secondary-900 mb-4">
                {{ t.translate('dashboard.title') }}
              </h1>
              <p class="text-lg text-muted">
                {{ t.translate('dashboard.subtitle') }}
              </p>
            </div>
            <a
              routerLink="/settings"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-700 font-medium text-sm transition-colors shadow-sm flex-shrink-0"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {{ t.translate('dashboard.settings') }}
            </a>
            <app-language-selector class="flex-shrink-0"></app-language-selector>
          </div>
        </div>

        <!-- Apps Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          @for (app of apps; track app.id) {
            <app-app-card [app]="app"></app-app-card>
          }
        </div>
      </div>
    </div>
  `,
})
export class DashboardPageComponent {
  protected t = inject(TranslationService);
  apps: AIApp[] = [
    {
      id: 'general-assistant',
      name: 'General Assistant',
      description: 'A versatile AI assistant for conversations, questions, writing, coding, and more. Connect your preferred AI provider or use a local model.',
      icon: '🤖',
      category: 'Assistant',
      color: 'blue',
    },
  ];
}
