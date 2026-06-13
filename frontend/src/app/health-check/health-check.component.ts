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
        <p class="label">System handshake</p>
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
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.78);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
      backdrop-filter: blur(16px);
    }

    .panel-copy {
      display: grid;
      gap: 0.45rem;
    }

    .label {
      color: #2dd4bf;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
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
      color: #9fb0c8;
      line-height: 1.6;
    }

    button {
      width: fit-content;
      min-height: 2.75rem;
      padding: 0 1rem;
      border: 1px solid rgba(45, 212, 191, 0.45);
      border-radius: 8px;
      background: #2dd4bf;
      color: #04111d;
      font-weight: 800;
      cursor: pointer;
    }

    button:disabled {
      cursor: progress;
      opacity: 0.72;
    }

    code,
    pre {
      color: #cbd5e1;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    }

    pre {
      overflow: auto;
      margin: 0.9rem 0 0;
      padding: 1rem;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.65);
      font-size: 0.82rem;
    }

    .result {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      min-height: 4rem;
      padding: 1rem;
      border: 1px solid rgba(148, 163, 184, 0.14);
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.42);
    }

    .status-dot {
      width: 0.85rem;
      height: 0.85rem;
      flex: 0 0 auto;
      margin-top: 0.35rem;
      border-radius: 999px;
    }

    .idle {
      background: #64748b;
      box-shadow: 0 0 0 6px rgba(100, 116, 139, 0.12);
    }

    .healthy {
      background: #22c55e;
      box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.12);
    }

    .pending {
      background: #f59e0b;
      box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.14);
    }

    .offline {
      background: #ef4444;
      box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.12);
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
