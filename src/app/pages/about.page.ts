import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-white to-secondary-50">
      <div class="container-custom py-12 sm:py-16 lg:py-20">
        <!-- Header -->
        <div class="max-w-3xl mb-12">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
            <span class="w-2 h-2 bg-primary-600 rounded-full"></span>
            Company
          </div>
          <h1 class="text-4xl sm:text-5xl font-bold text-secondary-900 mb-4">
            About Local.LLM
          </h1>
          <p class="text-lg text-muted">
            Local.LLM is a unified AI hub built by Oxygen Low's Software, designed to give you seamless access to AI models — whether hosted in the cloud or running entirely on your own hardware.
          </p>
        </div>

        <!-- Content -->
        <div class="card p-8 sm:p-12 max-w-4xl">
          <div class="prose prose-lg max-w-none text-secondary-900 space-y-10">

            <!-- Mission -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">Our Mission</h2>
              <p class="text-secondary-700">
                We believe AI should be accessible, private, and user-controlled. Local.LLM empowers developers and organisations to run large language models on their own infrastructure — keeping data in-house — while providing the same polished experience as any cloud-based AI platform.
              </p>
            </section>

            <!-- What We Build -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">What We Build</h2>
              <p class="text-secondary-700 mb-4">
                Local.LLM provides a single, unified interface for interacting with multiple AI models. Key capabilities include:
              </p>
              <ul class="list-disc list-inside text-secondary-700 space-y-2">
                <li>Self-hosted and cloud model support through a single dashboard</li>
                <li>Secure, privacy-first architecture — your data never leaves your environment unless you choose</li>
                <li>Open-source codebase with a permissive licence</li>
                <li>Simple deployment via Docker, Kubernetes, or bare metal</li>
                <li>Full API access for programmatic integration</li>
              </ul>
            </section>

            <!-- Open Source -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">Open Source</h2>
              <p class="text-secondary-700">
                Local.LLM is open source and developed in the open on GitHub. Contributions, bug reports, and feature requests are welcome from the community.
              </p>
              <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200 mt-3">
                <p class="text-secondary-700 text-sm">
                  <strong>GitHub:</strong>
                  <a href="https://github.com/Oxygen-Low/LocalLLM" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:text-primary-700">
                    github.com/Oxygen-Low/LocalLLM
                  </a>
                </p>
              </div>
            </section>

            <!-- Contact -->
            <section>
              <h2 class="text-2xl font-bold text-secondary-900 mb-3">Contact</h2>
              <p class="text-secondary-700">
                Have a question, found a bug, or want to get involved? Reach out through our GitHub repository — it's the best place to start a conversation.
              </p>
            </section>

          </div>
        </div>

        <!-- Back Link -->
        <div class="mt-8">
          <a routerLink="/" class="text-primary-600 hover:text-primary-700 font-medium transition-colors">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  `,
})
export class AboutPageComponent {}
