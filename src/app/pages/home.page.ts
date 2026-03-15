import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroComponent } from '../components/hero.component';
import { LanguageSelectorComponent } from '../components/language-selector.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeroComponent, RouterLink, LanguageSelectorComponent],
  template: `
    <div>
      <!-- Language selector bar -->
      <div class="bg-white border-b border-secondary-100">
        <div class="container-custom py-2 flex justify-end">
          <app-language-selector></app-language-selector>
        </div>
      </div>
      <app-hero></app-hero>

      <!-- Features Section -->
      <section class="section-padding bg-white">
        <div class="container-custom">
          <div class="max-w-2xl mx-auto text-center mb-12 sm:mb-16">
            <h2 class="text-3xl sm:text-4xl font-bold text-secondary-900 mb-4">
              Powerful Features
            </h2>
            <p class="text-lg text-muted">
              Everything you need to run, manage, and scale local AI applications
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <!-- Feature 1 -->
            <div class="card p-6 sm:p-8">
              <div class="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-secondary-900 mb-2">Lightning Fast</h3>
              <p class="text-muted text-sm">
                Cloud deployment with ultra-low latency, or self-host for local AI processing. Instant responses and complete control.
              </p>
            </div>

            <!-- Feature 2 -->
            <div class="card p-6 sm:p-8">
              <div class="w-12 h-12 rounded-lg bg-accent-100 flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-secondary-900 mb-2">Data Security</h3>
              <p class="text-muted text-sm">
                Choose cloud hosting for convenience or self-host for complete data privacy. Your choice, your data, your control.
              </p>
            </div>

            <!-- Feature 3 -->
            <div class="card p-6 sm:p-8">
              <div class="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-secondary-900 mb-2">Open Source</h3>
              <p class="text-muted text-sm">
                Transparent, community-driven development. Deploy anywhere, extend, and customize for your needs.
              </p>
            </div>

            <!-- Feature 4 -->
            <div class="card p-6 sm:p-8">
              <div class="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-secondary-900 mb-2">Easy Integration</h3>
              <p class="text-muted text-sm">
                Simple APIs and web interface. Integrate AI into your workflow whether cloud or self-hosted.
              </p>
            </div>

            <!-- Feature 5 -->
            <div class="card p-6 sm:p-8">
              <div class="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-secondary-900 mb-2">Performance Monitor</h3>
              <p class="text-muted text-sm">
                Real-time metrics and insights into model performance and resource usage across all deployments.
              </p>
            </div>

            <!-- Feature 6 -->
            <div class="card p-6 sm:p-8">
              <div class="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-secondary-900 mb-2">Flexible Deployment</h3>
              <p class="text-muted text-sm">
                Deploy on our cloud infrastructure or host it yourself on your own servers. Full flexibility.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="section-padding gradient-primary border-t border-secondary-200">
        <div class="container-custom text-center">
          <h2 class="text-3xl sm:text-4xl font-bold text-secondary-900 mb-4">
            Ready to Get Started?
          </h2>
          <p class="text-lg text-muted mb-8 max-w-2xl mx-auto">
            Access your dashboard and start running powerful AI applications on the cloud or self-hosted.
          </p>
          <a routerLink="/dashboard" class="btn-primary inline-block">
            Launch Dashboard
          </a>
        </div>
      </section>
    </div>
  `,
})
export class HomePageComponent {}
