import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="relative gradient-primary overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <svg class="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" stroke-width="0.5"/>
            </pattern>
          </defs>
          <rect width="1200" height="600" fill="url(#grid)" />
        </svg>
      </div>

      <div class="relative container-custom py-20 sm:py-28 lg:py-36">
        <div class="max-w-3xl mx-auto text-center">
          <!-- Badge -->
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-6 sm:mb-8">
            <span class="w-2 h-2 bg-primary-600 rounded-full"></span>
            Unified AI Hub for Your Desktop
          </div>

          <!-- Headline -->
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary-900 mb-6 leading-tight">
            Run AI Applications Locally
          </h1>

          <!-- Subheading -->
          <p class="text-lg sm:text-xl text-muted mb-8 sm:mb-10 leading-relaxed">
            Local.LLM is your unified platform for accessing and managing multiple AI applications right on your machine. Fast, private, and completely under your control.
          </p>

          <!-- Features Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 sm:mb-12">
            <div class="flex items-center justify-center sm:justify-start gap-3">
              <div class="w-5 h-5 rounded-full bg-accent-600 flex-shrink-0 flex items-center justify-center">
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <span class="text-secondary-700 font-medium">100% Private</span>
            </div>
            <div class="flex items-center justify-center sm:justify-start gap-3">
              <div class="w-5 h-5 rounded-full bg-accent-600 flex-shrink-0 flex items-center justify-center">
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <span class="text-secondary-700 font-medium">Lightning Fast</span>
            </div>
            <div class="flex items-center justify-center sm:justify-start gap-3">
              <div class="w-5 h-5 rounded-full bg-accent-600 flex-shrink-0 flex items-center justify-center">
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <span class="text-secondary-700 font-medium">Open Source</span>
            </div>
          </div>

          <!-- CTA Buttons -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              routerLink="/dashboard"
              class="btn-primary w-full sm:w-auto text-center"
            >
              Launch Dashboard
            </a>
            <a
              href="#"
              class="btn-ghost w-full sm:w-auto text-center"
            >
              View Documentation
            </a>
          </div>
        </div>
      </div>

      <!-- Floating Elements (Decorative) -->
      <div class="absolute top-20 right-10 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div class="absolute bottom-0 left-20 w-72 h-72 bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
    </section>
  `,
})
export class HeroComponent {}
