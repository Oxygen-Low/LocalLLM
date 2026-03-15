import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-white to-secondary-50 flex items-center justify-center">
      <div class="container-custom text-center py-12 sm:py-20">

        <!-- 404 number -->
        <p class="text-8xl sm:text-9xl font-extrabold text-primary-600 mb-4 leading-none select-none">
          {{ t.translate('notFound.code') }}
        </p>

        <!-- Icon -->
        <div class="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 class="text-3xl sm:text-4xl font-bold text-secondary-900 mb-4">
          {{ t.translate('notFound.title') }}
        </h1>

        <p class="text-lg text-muted mb-8 max-w-2xl mx-auto">
          {{ t.translate('notFound.subtitle') }}
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a routerLink="/" class="btn-primary inline-block">
            {{ t.translate('notFound.backHome') }}
          </a>
          <a routerLink="/docs" class="btn-secondary inline-block">
            {{ t.translate('notFound.goDocs') }}
          </a>
        </div>

      </div>
    </div>
  `,
})
export class NotFoundPageComponent {
  readonly t = inject(TranslationService);
}
