import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-license',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-white to-secondary-50">
      <div class="container-custom py-12 sm:py-16 lg:py-20">
        <!-- Header -->
        <div class="max-w-3xl mb-12">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
            <span class="w-2 h-2 bg-primary-600 rounded-full"></span>
            Legal
          </div>
          <h1 class="text-4xl sm:text-5xl font-bold text-secondary-900 mb-4">
            MIT License
          </h1>
          <p class="text-lg text-muted">
            Local.LLM is released under the MIT License, one of the most permissive open-source licenses.
          </p>
        </div>

        <!-- License Content -->
        <div class="card p-8 sm:p-12 max-w-4xl">
          <div class="prose prose-lg max-w-none text-secondary-900">
            <pre class="bg-black text-white p-6 rounded-lg overflow-x-auto text-sm leading-relaxed font-mono border border-secondary-200">
Copyright (c) 2026 Oxygen Low's Software

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.</pre>
          </div>

          <div class="mt-8 pt-8 border-t border-secondary-200">
            <h3 class="text-lg font-bold text-secondary-900 mb-3">What this means:</h3>
            <ul class="space-y-3 text-secondary-900">
              <li class="flex gap-3">
                <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
                <span><strong>Use freely:</strong> You can use Local.LLM for commercial or personal projects</span>
              </li>
              <li class="flex gap-3">
                <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
                <span><strong>Modify:</strong> You can modify the source code for your needs</span>
              </li>
              <li class="flex gap-3">
                <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
                <span><strong>Distribute:</strong> You can distribute Local.LLM and your modifications</span>
              </li>
              <li class="flex gap-3">
                <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
                <span><strong>Include license:</strong> You must include the license and copyright notice in any distribution</span>
              </li>
            </ul>
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
export class LicensePageComponent {}
