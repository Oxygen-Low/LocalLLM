import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Language {
  code: string;
  label: string;
}

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <button
        (click)="toggleDropdown()"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 text-secondary-700 font-medium text-sm transition-colors shadow-sm"
        aria-haspopup="listbox"
        [attr.aria-expanded]="isOpen()"
        aria-label="Select language"
      >
        <!-- Globe icon -->
        <svg class="w-4 h-4 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ currentLanguage().label }}</span>
        <!-- Chevron icon -->
        <svg
          class="w-4 h-4 text-secondary-400 transition-transform"
          [class.rotate-180]="isOpen()"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      @if (isOpen()) {
        <div
          class="absolute right-0 mt-1 w-40 rounded-lg border border-secondary-200 bg-white shadow-lg z-50"
          role="listbox"
          aria-label="Language options"
        >
          @for (lang of languages; track lang.code) {
            <button
              (click)="selectLanguage(lang)"
              class="w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center justify-between"
              role="option"
              [attr.aria-selected]="lang.code === currentLanguage().code"
            >
              <span>{{ lang.label }}</span>
              @if (lang.code === currentLanguage().code) {
                <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class LanguageSelectorComponent {
  readonly languages: Language[] = [
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
  ];

  currentLanguage = signal<Language>(this.languages[0]);
  isOpen = signal(false);

  toggleDropdown(): void {
    this.isOpen.update(v => !v);
  }

  selectLanguage(lang: Language): void {
    this.currentLanguage.set(lang);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }
    const target = event.target as HTMLElement;
    if (!target.closest('app-language-selector')) {
      this.isOpen.set(false);
    }
  }
}
