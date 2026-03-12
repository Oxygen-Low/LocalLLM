import { Component } from '@angular/core';

@Component({
  selector: 'app-docs-installation',
  standalone: true,
  template: `
    <div class="p-6 sm:p-8 lg:p-12 max-w-4xl">
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
          Choose your installation method: cloud-hosted or self-hosted.
        </p>
      </div>

      <!-- Content -->
      <div class="prose prose-lg max-w-none space-y-8">
        <!-- Cloud Installation -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Cloud Hosted Installation</h2>
          <p class="text-secondary-700 leading-relaxed">
            The quickest way to get started with Local.LLM is to use our managed cloud service. No installation needed!
          </p>

          <div class="mt-4 space-y-3">
            <div class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">1.</span>
              <span class="text-secondary-700">Visit <a href="#" class="text-primary-600 hover:text-primary-700">local.llm</a></span>
            </div>
            <div class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">2.</span>
              <span class="text-secondary-700">Click "Sign Up" and create your account</span>
            </div>
            <div class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">3.</span>
              <span class="text-secondary-700">Verify your email and log in</span>
            </div>
            <div class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">4.</span>
              <span class="text-secondary-700">Start using AI applications immediately</span>
            </div>
          </div>

          <div class="mt-4 bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
            <p class="text-sm text-blue-900">
              <strong>Tip:</strong> Cloud hosted accounts include free trial credits. No credit card required.
            </p>
          </div>
        </section>

        <!-- Self-Hosted Installation -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Self-Hosted Installation</h2>
          <p class="text-secondary-700 leading-relaxed">
            For complete control and privacy, you can self-host Local.LLM on your own infrastructure.
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
