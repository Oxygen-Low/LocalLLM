import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DocsContentTranslationDirective } from './docs-content-translation.directive';

@Component({
  selector: 'app-docs-installation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocsContentTranslationDirective],
  template: `
    <div appDocsContentTranslation class="p-6 sm:p-8 lg:p-12 max-w-4xl">
      <!-- Breadcrumb -->
      <div class="mb-6">
        <a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a>
        <span class="text-secondary-400 mx-2">/</span>
        <span class="text-secondary-600 text-sm">Installation</span>
      </div>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-secondary-900 mb-4">Installation</h1>
        <p class="text-lg text-secondary-600">
          Follow this guide to install Local.LLM on your infrastructure.
        </p>
      </div>

      <!-- Content -->
      <div class="prose prose-lg max-w-none space-y-8">
        <section>
          <p class="text-secondary-700 leading-relaxed">
            Local.LLM is designed to run on your own infrastructure for complete control and privacy.
          </p>

          <h3 class="text-xl font-semibold text-secondary-900 mt-6 mb-3">Requirements</h3>
          <ul class="space-y-2 text-secondary-700">
            <li class="flex gap-2">
              <span class="text-primary-600">•</span>
              <span>Docker and Docker Compose (recommended)</span>
            </li>
            <li class="flex gap-2">
              <span class="text-primary-600">•</span>
              <span>At least 2GB RAM</span>
            </li>
            <li class="flex gap-2">
              <span class="text-primary-600">•</span>
              <span>Linux, macOS, or Windows (with WSL2)</span>
            </li>
            <li class="flex gap-2">
              <span class="text-primary-600">•</span>
              <span>Open ports 8000 (API) and 3000 (Web UI)</span>
            </li>
          </ul>

          <h3 class="text-xl font-semibold text-secondary-900 mt-6 mb-3">Installation Steps</h3>
          <p class="text-secondary-700 text-sm mb-3">See the <a href="/docs/installation-self-hosted" class="text-primary-600 hover:text-primary-700 font-medium">Self-Hosted Installation Guide</a> for detailed instructions.</p>
        </section>

        <!-- System Requirements -->
        <section class="bg-secondary-50 rounded-lg p-6">
          <h3 class="font-semibold text-secondary-900 mb-4">System Requirements</h3>
          <div class="space-y-4 text-secondary-700 text-sm">
            <div>
              <p class="font-medium text-secondary-900 mb-1">Minimum (Development)</p>
              <p>2GB RAM, 2 CPU cores, 10GB storage</p>
            </div>
            <div>
              <p class="font-medium text-secondary-900 mb-1">Recommended (Production)</p>
              <p>8GB+ RAM, 4+ CPU cores, 50GB+ storage</p>
            </div>
            <div>
              <p class="font-medium text-secondary-900 mb-1">GPU Support (Optional)</p>
              <p>NVIDIA GPUs with CUDA support for accelerated inference</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class DocsInstallationPageComponent {}
