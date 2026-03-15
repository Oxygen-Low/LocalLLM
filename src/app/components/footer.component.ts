import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="border-t border-secondary-200 bg-white">
      <div class="container-custom py-8 sm:py-12">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <!-- Brand -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-lg">⚡</span>
              </div>
              <span class="text-lg font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Local.LLM
              </span>
            </div>
            <p class="text-sm text-muted">
              Unified AI hub. Cloud or self-hosted.
            </p>
          </div>

          <!-- Product -->
          <div>
            <h4 class="text-sm font-semibold text-secondary-900 mb-4">Product</h4>
            <ul class="space-y-2">
              <li><a href="#" class="text-sm text-muted hover:text-primary-600 transition-colors">Features</a></li>
              <li><a href="#" class="text-sm text-muted hover:text-primary-600 transition-colors">Documentation</a></li>
            </ul>
          </div>

          <!-- Company -->
          <div>
            <h4 class="text-sm font-semibold text-secondary-900 mb-4">Company</h4>
            <ul class="space-y-2">
              <li><a href="#" class="text-sm text-muted hover:text-primary-600 transition-colors">About</a></li>
            </ul>
          </div>

          <!-- Legal -->
          <div>
            <h4 class="text-sm font-semibold text-secondary-900 mb-4">Legal</h4>
            <ul class="space-y-2">
              <li><a routerLink="/privacy" class="text-sm text-muted hover:text-primary-600 transition-colors">Privacy</a></li>
              <li><a href="#" class="text-sm text-muted hover:text-primary-600 transition-colors">Terms</a></li>
              <li><a routerLink="/license" class="text-sm text-muted hover:text-primary-600 transition-colors">License</a></li>
            </ul>
          </div>
        </div>

        <div class="border-t border-secondary-200 pt-8">
          <p class="text-sm text-center text-muted">
            © 2024 Oxygen Low's Software. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
