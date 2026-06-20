import { DatePipe, JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

type HealthState =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'healthy'; data: HealthResponse }
  | { state: 'offline'; message: string };

@Component({
  selector: 'app-health-check',
  standalone: true,
  imports: [DatePipe, JsonPipe],
  template: `
    <section class="health-panel" aria-labelledby="health-title">
      <div class="panel-copy">
        <h2 id="health-title">Backend health check</h2>
        <p>Call the Spring Boot API through the Angular proxy and confirm the foundation is connected.</p>
      </div>

      @let current = health();

      <button type="button" (click)="checkHealth()" [disabled]="current.state === 'loading'">
        {{ current.state === 'loading' ? 'Checking API...' : 'Check API health' }}
      </button>

      @if (current.state === 'idle') {
      <div class="result">
        <span class="status-dot idle"></span>
        <p>Ready to call <code>/api/health</code>.</p>
      </div>
      }

      @if (current.state === 'loading') {
      <div class="result">
        <span class="status-dot pending"></span>
        <p>Contacting backend...</p>
      </div>
      }

      @if (current.state === 'healthy') {
      <div class="result">
        <span class="status-dot healthy"></span>
        <div>
          <strong>{{ current.data.status }}</strong>
          <p>{{ current.data.service }}</p>
          <small>{{ current.data.timestamp | date:'medium' }}</small>
          <pre>{{ current.data | json }}</pre>
        </div>
      </div>
      }

      @if (current.state === 'offline') {
      <div class="result">
        <span class="status-dot offline"></span>
        <div>
          <strong>Unavailable</strong>
          <p>{{ current.message }}</p>
        </div>
      </div>
      }
    </section>
  `,
  styles: [`
    .health-panel {
      display: grid;
      gap: 1.5rem;
      max-width: 720px;
      padding: 1.5rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface-1);
    }

    .panel-copy {
      display: grid;
      gap: 0.45rem;
    }

    h2,
    p {
      margin: 0;
    }

    h2 {
      font-size: 1.4rem;
    }

    p,
    small {
      color: var(--text-2);
      line-height: 1.6;
    }

    button {
      width: fit-content;
      min-height: 2.75rem;
      padding: 0 1rem;
      border: none;
      border-radius: 8px;
      background: var(--accent);
      color: var(--bg);
      font-weight: 800;
      cursor: pointer;
      transition: box-shadow 150ms var(--ease);
    }

    button:hover:not(:disabled) {
      box-shadow: 0 0 0 3px var(--accent-glow);
    }

    button:disabled {
      cursor: progress;
      opacity: 0.72;
    }

    code,
    pre {
      color: var(--text-2);
      font-family: var(--font-mono);
    }

    pre {
      overflow: auto;
      margin: 0.9rem 0 0;
      padding: 1rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg);
      font-size: 0.82rem;
    }

    .result {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      min-height: 4rem;
      padding: 1rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface-2);
    }

    .status-dot {
      width: 0.85rem;
      height: 0.85rem;
      flex: 0 0 auto;
      margin-top: 0.35rem;
      border-radius: 999px;
    }

    .idle {
      background: var(--text-3);
      box-shadow: 0 0 0 6px rgba(113, 113, 122, 0.12);
    }

    .healthy {
      background: var(--green);
      box-shadow: 0 0 0 6px var(--green-bg);
    }

    .pending {
      background: var(--amber);
      box-shadow: 0 0 0 6px var(--amber-bg);
    }

    .offline {
      background: var(--red);
      box-shadow: 0 0 0 6px var(--red-bg);
    }
  `]
})
export class HealthCheckComponent {
  private readonly http = inject(HttpClient);

  readonly health = signal<HealthState>({ state: 'idle' });

  checkHealth(): void {
    this.health.set({ state: 'loading' });

    this.http.get<HealthResponse>('/api/health').subscribe({
      next: (data) => this.health.set({ state: 'healthy', data }),
      error: () => this.health.set({
        state: 'offline',
        message: 'Start the Spring Boot backend on port 8080, then try again.'
      })
    });
  }
}
