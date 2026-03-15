import { Component, OnInit, signal, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageSelectorComponent } from '../components/language-selector.component';
import { TranslationService } from '../services/translation.service';

export interface DocNavItem {
  labelKey: string;
  path: string;
  children?: DocNavItem[];
}

@Component({
  selector: 'app-docs-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LanguageSelectorComponent],
  template: `
    <div class="flex flex-col min-h-screen bg-white">
      <div class="flex flex-1">
        <!-- Sidebar -->
        <aside class="w-64 border-r border-secondary-200 bg-secondary-50 hidden lg:block sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto">
          <div class="px-6 pt-4 pb-2">
            <a
              routerLink="/"
              aria-label="Close documentation and return to home"
              class="inline-flex items-center justify-center w-8 h-8 rounded-full text-secondary-500 hover:text-secondary-900 hover:bg-secondary-200 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </a>
          </div>
          <nav class="px-6 pb-6 space-y-1">
            @for (item of docNavigation; track item.path) {
              <div>
                <a
                  [routerLink]="item.path"
                  routerLinkActive="text-primary-600 bg-primary-50 font-semibold"
                  [routerLinkActiveOptions]="{ exact: false }"
                  class="block px-4 py-2 rounded-lg text-secondary-700 hover:text-primary-600 hover:bg-primary-50 transition-colors text-sm"
                >
                  {{ t.translate(item.labelKey) }}
                </a>
                @if (item.children && item.children.length > 0) {
                  <div class="ml-2 mt-1 space-y-1 pl-2 border-l border-secondary-300">
                    @for (child of item.children; track child.path) {
                      <a
                        [routerLink]="child.path"
                        routerLinkActive="text-primary-600 font-semibold"
                        [routerLinkActiveOptions]="{ exact: false }"
                        class="block px-3 py-1.5 rounded text-secondary-600 hover:text-primary-600 transition-colors text-xs"
                      >
                        {{ t.translate(child.labelKey) }}
                      </a>
                    }
                  </div>
                }
              </div>
            }
          </nav>
          <div class="px-6 pb-4">
            <app-language-selector></app-language-selector>
          </div>
        </aside>

        <!-- Mobile Sidebar Toggle Button -->
        <button
          (click)="toggleMobileSidebar()"
          class="lg:hidden fixed bottom-8 right-8 z-40 p-3 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-lg"
          [attr.aria-label]="mobileSidebarOpen() ? 'Close sidebar' : 'Open sidebar'"
        >
          <svg
            class="w-6 h-6"
            [ngClass]="mobileSidebarOpen() ? 'hidden' : ''"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg
            class="w-6 h-6"
            [ngClass]="!mobileSidebarOpen() ? 'hidden' : ''"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Mobile Sidebar Overlay -->
        @if (mobileSidebarOpen()) {
          <div
            (click)="mobileSidebarOpen.set(false)"
            class="fixed inset-0 bg-black/50 lg:hidden z-30"
          ></div>
          <aside class="fixed inset-y-0 left-0 w-64 bg-secondary-50 border-r border-secondary-200 z-40 pt-20 overflow-y-auto">
            <div class="px-6 pt-4 pb-2">
              <a
                routerLink="/"
                aria-label="Close documentation and return to home"
                (click)="mobileSidebarOpen.set(false)"
                class="inline-flex items-center justify-center w-8 h-8 rounded-full text-secondary-500 hover:text-secondary-900 hover:bg-secondary-200 transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </a>
            </div>
            <nav class="px-6 pb-6 space-y-1">
              @for (item of docNavigation; track item.path) {
                <div>
                  <a
                    [routerLink]="item.path"
                    routerLinkActive="text-primary-600 bg-primary-50 font-semibold"
                    [routerLinkActiveOptions]="{ exact: false }"
                    (click)="mobileSidebarOpen.set(false)"
                    class="block px-4 py-2 rounded-lg text-secondary-700 hover:text-primary-600 hover:bg-primary-50 transition-colors text-sm"
                  >
                    {{ t.translate(item.labelKey) }}
                  </a>
                  @if (item.children && item.children.length > 0) {
                    <div class="ml-2 mt-1 space-y-1 pl-2 border-l border-secondary-300">
                      @for (child of item.children; track child.path) {
                        <a
                          [routerLink]="child.path"
                          routerLinkActive="text-primary-600 font-semibold"
                          [routerLinkActiveOptions]="{ exact: false }"
                          (click)="mobileSidebarOpen.set(false)"
                          class="block px-3 py-1.5 rounded text-secondary-600 hover:text-primary-600 transition-colors text-xs"
                        >
                          {{ t.translate(child.labelKey) }}
                        </a>
                      }
                    </div>
                  }
                </div>
              }
            </nav>
            <div class="px-6 pb-4">
              <app-language-selector></app-language-selector>
            </div>
          </aside>
        }

        <!-- Main Content -->
        <main class="flex-1 min-w-0">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
})
export class DocsLayoutComponent implements OnInit {
  protected t = inject(TranslationService);

  constructor(private titleService: Title) {}

  ngOnInit() {
    this.titleService.setTitle('Local.LLM Docs');
  }

  mobileSidebarOpen = signal(false);

  docNavigation: DocNavItem[] = [
    {
      labelKey: 'docs.nav.getting-started',
      path: '/docs/getting-started',
    },
    {
      labelKey: 'docs.nav.installation',
      path: '/docs/installation',
      children: [
        { labelKey: 'docs.nav.cloud-hosted', path: '/docs/installation' },
        { labelKey: 'docs.nav.self-hosted', path: '/docs/installation-self-hosted' },
      ],
    },
    {
      labelKey: 'docs.nav.deployment',
      path: '/docs/deployment',
      children: [
        { labelKey: 'docs.nav.docker', path: '/docs/deployment-docker' },
        { labelKey: 'docs.nav.kubernetes', path: '/docs/deployment-kubernetes' },
      ],
    },
    {
      labelKey: 'docs.nav.api-reference',
      path: '/docs/api',
      children: [
        { labelKey: 'docs.nav.authentication', path: '/docs/api-auth' },
        { labelKey: 'docs.nav.applications', path: '/docs/api-applications' },
        { labelKey: 'docs.nav.models', path: '/docs/api-models' },
      ],
    },
    {
      labelKey: 'docs.nav.configuration',
      path: '/docs/configuration',
    },
    {
      labelKey: 'docs.nav.troubleshooting',
      path: '/docs/troubleshooting',
    },
  ];

  toggleMobileSidebar() {
    this.mobileSidebarOpen.update(value => !value);
  }
}
