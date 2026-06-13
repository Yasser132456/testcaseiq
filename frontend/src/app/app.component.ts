import { Component } from '@angular/core';
import { HealthCheckComponent } from './health-check/health-check.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HealthCheckComponent],
  template: `
    <main class="app-shell">
      <section class="hero">
        <p class="eyebrow">TestCaseIQ</p>
        <h1>Turn product intent into reliable test intelligence.</h1>
        <p class="summary">
          TestCaseIQ is an early foundation for a technical QA platform. This public scaffold keeps the surface narrow:
          frontend, backend, infrastructure, and a live API health check.
        </p>
      </section>

      <app-health-check />
    </main>
  `,
  styles: [`
    .app-shell {
      display: grid;
      gap: 3rem;
      width: min(1120px, calc(100% - 2rem));
      margin: 0 auto;
      padding: 6rem 0;
    }

    .hero {
      display: grid;
      gap: 1.25rem;
      max-width: 880px;
    }

    .eyebrow {
      margin: 0;
      color: #2dd4bf;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      max-width: 12ch;
      font-size: clamp(3rem, 8vw, 6.5rem);
      line-height: 1;
    }

    .summary {
      margin: 0;
      max-width: 700px;
      color: #aab7ca;
      font-size: 1.08rem;
      line-height: 1.7;
    }
  `]
})
export class AppComponent {}
