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
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Dashboard</a>
          <a routerLink="/projects" routerLinkActive="active">Projects</a>
        </nav>
      </aside>

      <section class="workspace">
        <header class="topbar">
          <div>
            <p class="eyebrow">Sprint 3</p>
            <h1>Story Workspace</h1>
          </div>
          <a class="button secondary" routerLink="/projects">Open projects</a>
        </header>

        <router-outlet />
      </section>
    </div>
  `
})
export class AppLayoutComponent {}
