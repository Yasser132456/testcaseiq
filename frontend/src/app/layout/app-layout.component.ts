import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
          <a routerLink="/test-suites" routerLinkActive="active">
            <span class="nav-icon" aria-hidden="true">TS</span>
            Test Suites
          </a>
          @if (authService.hasRole(['ADMIN', 'QA_ENGINEER'])) {
            <a routerLink="/settings" routerLinkActive="active">
              <span class="nav-icon" aria-hidden="true">ST</span>
              Settings
            </a>
          }
          @if (authService.hasRole('ADMIN')) {
            <a routerLink="/admin/users" routerLinkActive="active">
              <span class="nav-icon" aria-hidden="true">US</span>
              Users
            </a>
            <a routerLink="/admin/audit" routerLinkActive="active">
              <span class="nav-icon" aria-hidden="true">AT</span>
              Audit Trail
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <span class="status-dot"></span>
          @if (authService.currentUser(); as user) {
            <span [class]="roleBadgeClass(user.role)">{{ user.role }}</span>
          } @else {
            <span>Demo mode</span>
          }
        </div>
      </aside>

      <section class="workspace">
        <header class="topbar">
          <h1>TestCaseIQ</h1>
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
          </div>
        </header>

        @if (accessRestricted()) {
          <div class="access-restricted-notice inline-note amber-note">
            <strong>Access restricted.</strong>
            You do not have permission to perform that action. Contact your administrator to request additional access.
          </div>
        }

        <router-outlet />
      </section>
    </div>
  `
})
export class AppLayoutComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly accessRestricted = signal(false);

  constructor() {
    inject(ActivatedRoute).queryParamMap.subscribe(params => {
      this.accessRestricted.set(params.get('access') === 'restricted');
    });
  }

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

  roleBadgeClass(role: string): string {
    if (role === 'VIEWER') return 'role-tag role-viewer';
    if (role === 'QA_ENGINEER') return 'role-tag role-qa';
    return 'role-tag role-admin';
  }
}
