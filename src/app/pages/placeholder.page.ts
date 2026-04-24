import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-white to-secondary-50 flex items-center justify-center">
      <div class="container-custom text-center py-12 sm:py-20">
        <div class="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>

        <h1 class="text-3xl sm:text-4xl font-bold text-secondary-900 mb-4">
          Coming Soon
        </h1>

        <p class="text-lg text-muted mb-8 max-w-2xl mx-auto">
          This page is currently under development. Let us know what features you'd like to see here!
        </p>

        <a routerLink="/" class="btn-primary inline-block">
          Back to Home
        </a>
      </div>
    </div>
  `,
})
export class PlaceholderPageComponent {}
