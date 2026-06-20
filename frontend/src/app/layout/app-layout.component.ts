import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="layout-shell">
      <aside class="sidebar">
        <a class="brand" routerLink="/">
          <span class="brand-mark">TQ</span>
          <span>
            <strong>TestCaseIQ</strong>
            <small>QA workspace</small>
          </span>
        </a>

        <nav class="nav-list" aria-label="Primary navigation">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span class="nav-icon" aria-hidden="true">DX</span>
            Dashboard
          </a>
          <a routerLink="/projects" routerLinkActive="active">
            <span class="nav-icon" aria-hidden="true">PR</span>
            Projects
          </a>
        </nav>

        <div class="sidebar-footer">
          <span class="status-dot"></span>
          @if (authService.currentUser(); as user) {
            <span>{{ user.role }}</span>
          } @else {
            <span>Demo mode</span>
          }
        </div>
      </aside>

      <section class="workspace">
        <header class="topbar">
          <div>
            <p class="eyebrow">Workspace</p>
            <h1>TestCaseIQ</h1>
          </div>
          <div class="topbar-actions">
            @if (authService.currentUser(); as user) {
              <div class="user-chip" aria-label="Current user">
                <span>{{ initials(user.displayName) }}</span>
                <strong>{{ user.displayName }}</strong>
                <small>{{ user.role }}</small>
              </div>
              <button class="button secondary" type="button" (click)="logout()">Logout</button>
            } @else {
              <a class="button secondary" routerLink="/login">Sign in</a>
            }
            <a class="button secondary" routerLink="/projects">Projects</a>
          </div>
        </header>

        <router-outlet />
      </section>
    </div>
  `
})
export class AppLayoutComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  initials(displayName: string): string {
    return displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U';
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
