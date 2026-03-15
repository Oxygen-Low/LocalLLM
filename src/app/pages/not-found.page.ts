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
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-6">
          <span class="w-2 h-2 bg-primary-600 rounded-full"></span>
          {{ t.translate('notFound.badge') }}
        </div>

        <div class="text-8xl sm:text-9xl font-bold text-secondary-200 mb-4 leading-none select-none">
          404
        </div>

        <h1 class="text-3xl sm:text-4xl font-bold text-secondary-900 mb-4">
          {{ t.translate('notFound.title') }}
        </h1>

        <p class="text-lg text-muted mb-10 max-w-xl mx-auto">
          {{ t.translate('notFound.subtitle') }}
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a routerLink="/" class="btn-primary inline-block">
            {{ t.translate('notFound.backHome') }}
          </a>
          <a routerLink="/docs" class="btn-secondary inline-block">
            {{ t.translate('notFound.viewDocs') }}
          </a>
        </div>
      </div>
    </div>
  `,
})
export class NotFoundPageComponent {
  protected t = inject(TranslationService);
}
