import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../services/translation.service';

export interface AIApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  color: 'blue' | 'purple' | 'orange' | 'green' | 'pink' | 'cyan';
  risky?: boolean;
}

@Component({
  selector: 'app-app-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="card p-6 sm:p-8 flex flex-col h-full group" [class.opacity-50]="disabled()" [class.grayscale]="disabled()">
      <!-- Icon -->
      <div [ngClass]="getColorClasses(app().color)" class="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
        {{ app().icon }}
      </div>

      <!-- Category + Risky badge -->
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs font-semibold text-primary-600 uppercase tracking-wider">
          {{ t.translate(app().category) }}
        </span>
        @if (app().risky) {
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            ⚠️ {{ t.translate('apps.status.risky') }}
          </span>
        }
      </div>

      <!-- Name -->
      <h3 class="text-xl font-bold text-secondary-900 mb-3 group-hover:text-primary-600 transition-colors">
        {{ t.translate(app().name) }}
      </h3>

      <!-- Description -->
      <p class="text-muted text-sm mb-6 flex-1 leading-relaxed">
        {{ t.translate(app().description) }}
      </p>

      @if (disabled()) {
        <!-- Disabled state: no navigation, show notice -->
        <button
          type="button"
          disabled
          aria-disabled="true"
          class="w-full px-4 py-2 rounded-lg border border-secondary-200 text-secondary-400 font-medium text-center text-sm cursor-not-allowed select-none"
        >
          {{ t.translate('apps.action.disabled') }}
        </button>
      } @else {
        <!-- Button -->
        <button
          [routerLink]="['/app', app().id]"
          class="w-full px-4 py-2 rounded-lg border border-primary-200 text-primary-600 font-medium hover:bg-primary-50 transition-colors group-hover:border-primary-600"
        >
          {{ t.translate('apps.action.launch') }}
        </button>
      }
    </div>
  `,
})
export class AppCardComponent {
  protected t = inject(TranslationService);
  readonly app = input.required<AIApp>();
  readonly disabled = input<boolean>(false);

  getColorClasses(color: string): string {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
      green: 'bg-green-100 text-green-600',
      pink: 'bg-pink-100 text-pink-600',
      cyan: 'bg-cyan-100 text-cyan-600',
    };
    return colors[color] || colors['blue'];
  }
}
