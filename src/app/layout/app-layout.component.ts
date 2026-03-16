import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../components/navbar.component';
import { FooterComponent } from '../components/footer.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, NavbarComponent, FooterComponent],
  template: `
    <div class="flex flex-col min-h-screen bg-white">
      <app-navbar></app-navbar>
      @if (authService.passwordResetRequired()) {
        <div class="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
          <div class="container-custom py-3 flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856C18.403 19.403 19 18.552 19 17.6V6.4c0-.952-.597-1.803-1.623-2.4L12 2 6.623 4C5.597 4.597 5 5.448 5 6.4v11.2c0 .952.597 1.803 1.623 2.4z" />
              </svg>
              <span class="font-medium">Password update required</span>
            </div>
            <a
              routerLink="/settings"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors text-xs font-semibold"
            >
              Update password now
            </a>
          </div>
        </div>
      }
      <main class="flex-1">
        <router-outlet></router-outlet>
      </main>
      <app-footer></app-footer>
    </div>
  `,
})
export class AppLayoutComponent implements OnInit {
  constructor(
    private titleService: Title,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.titleService.setTitle('Local.LLM');
  }
}
