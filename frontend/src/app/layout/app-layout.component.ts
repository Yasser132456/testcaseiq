import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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
            <span class="nav-icon" aria-hidden="true">⊞</span>
            Dashboard
          </a>
          <a routerLink="/projects" routerLinkActive="active">
            <span class="nav-icon" aria-hidden="true">◈</span>
            Projects
          </a>
        </nav>

        <div class="sidebar-footer">
          <span class="status-dot"></span>
          <span>Sprint 10</span>
        </div>
      </aside>

      <section class="workspace">
        <header class="topbar">
          <div>
            <p class="eyebrow">Workspace</p>
            <h1>TestCaseIQ</h1>
          </div>
          <a class="button secondary" routerLink="/projects">Projects</a>
        </header>

        <router-outlet />
      </section>
    </div>
  `
})
export class AppLayoutComponent {}
