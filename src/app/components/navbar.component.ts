import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="border-b border-secondary-200 bg-white sticky top-0 z-50">
      <div class="container-custom">
        <div class="flex items-center justify-between h-16 sm:h-20">
          <!-- Logo -->
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">⚡</span>
            </div>
            <span class="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              Local.LLM
            </span>
          </div>

          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center gap-8">
            <a
              routerLink="/"
              routerLinkActive="text-primary-600"
              [routerLinkActiveOptions]="{ exact: true }"
              class="text-secondary-700 hover:text-primary-600 font-medium transition-colors"
            >
              Home
            </a>
            <a
              routerLink="/dashboard"
              routerLinkActive="text-primary-600"
              class="text-secondary-700 hover:text-primary-600 font-medium transition-colors"
            >
              Dashboard
            </a>
            <a href="#" class="text-secondary-700 hover:text-primary-600 font-medium transition-colors">
              Docs
            </a>
          </div>

          <!-- Mobile Menu Button -->
          <button
            (click)="toggleMobileMenu()"
            class="md:hidden p-2 rounded-lg hover:bg-secondary-100 transition-colors"
            [attr.aria-label]="mobileMenuOpen() ? 'Close menu' : 'Open menu'"
          >
            <svg
              class="w-6 h-6"
              [ngClass]="mobileMenuOpen() ? 'hidden' : ''"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg
              class="w-6 h-6"
              [ngClass]="!mobileMenuOpen() ? 'hidden' : ''"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Mobile Navigation -->
        @if (mobileMenuOpen()) {
          <div class="md:hidden border-t border-secondary-200 py-4 space-y-3">
            <a
              routerLink="/"
              routerLinkActive="text-primary-600 bg-primary-50"
              [routerLinkActiveOptions]="{ exact: true }"
              (click)="mobileMenuOpen.set(false)"
              class="block px-4 py-2 rounded-lg text-secondary-700 hover:bg-secondary-100 transition-colors font-medium"
            >
              Home
            </a>
            <a
              routerLink="/dashboard"
              routerLinkActive="text-primary-600 bg-primary-50"
              (click)="mobileMenuOpen.set(false)"
              class="block px-4 py-2 rounded-lg text-secondary-700 hover:bg-secondary-100 transition-colors font-medium"
            >
              Dashboard
            </a>
            <a
              href="#"
              (click)="mobileMenuOpen.set(false)"
              class="block px-4 py-2 rounded-lg text-secondary-700 hover:bg-secondary-100 transition-colors font-medium"
            >
              Docs
            </a>
          </div>
        }
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  mobileMenuOpen = signal(false);

  toggleMobileMenu() {
    this.mobileMenuOpen.update(value => !value);
  }
}
