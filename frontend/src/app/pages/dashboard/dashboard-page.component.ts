import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardMetrics } from '../../core/models/dashboard.model';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [DatePipe, RouterLink, StateMessageComponent, SkeletonComponent],
  template: `
    <section class="page-stack">
      <div class="hero-panel">
        <h2>QA workspace.</h2>
        <p>Track generated test assets, review status, export readiness, and recent platform activity.</p>
      </div>

      @if (loading()) {
        <app-skeleton [rows]="3" [cols]="4" />
      } @else if (error()) {
        <app-state-message title="Dashboard unavailable" [message]="error()" tone="error" />
      } @else if (metrics()) {
        <!-- KPI cards -->
        <div class="metric-grid kpi-grid">
          <article class="metric-card">
            <span>Projects</span>
            <strong>{{ metrics()!.totalProjects }}</strong>
          </article>
          <article class="metric-card">
            <span>Stories</span>
            <strong>{{ metrics()!.totalStories }}</strong>
          </article>
          <article class="metric-card">
            <span>Test suites</span>
            <strong>{{ metrics()!.totalTestSuites }}</strong>
          </article>
          <article class="metric-card">
            <span>Test cases</span>
            <strong>{{ metrics()!.totalTestCases }}</strong>
          </article>
          <article class="metric-card green">
            <span>Approved</span>
            <strong>{{ metrics()!.approvedTestCases }}</strong>
          </article>
          <article class="metric-card amber">
            <span>Pending review</span>
            <strong>{{ metrics()!.pendingReviewTestCases }}</strong>
          </article>
          <article class="metric-card">
            <span>Exports</span>
            <strong>{{ metrics()!.totalExports }}</strong>
          </article>
        </div>

        <!-- Quality rates + coverage -->
        <div class="content-grid">
          <section class="panel">
            <div class="section-header">
              <h3>Quality workflow</h3>
            </div>
            <div class="rate-list">
              <div class="rate-item">
                <div class="rate-header">
                  <span>Approval rate</span>
                  <strong class="rate-val green-val">{{ metrics()!.approvalRate }}%</strong>
                </div>
                <div class="rate-bar-track">
                  <div class="rate-bar-fill green-fill" [style.width.%]="metrics()!.approvalRate"></div>
                </div>
              </div>
              <div class="rate-item">
                <div class="rate-header">
                  <span>Pending review</span>
                  <strong class="rate-val amber-val">{{ metrics()!.pendingReviewRate }}%</strong>
                </div>
                <div class="rate-bar-track">
                  <div class="rate-bar-fill amber-fill" [style.width.%]="metrics()!.pendingReviewRate"></div>
                </div>
              </div>
              <div class="rate-item">
                <div class="rate-header">
                  <span>Rejection rate</span>
                  <strong class="rate-val red-val">{{ metrics()!.rejectionRate }}%</strong>
                </div>
                <div class="rate-bar-track">
                  <div class="rate-bar-fill red-fill" [style.width.%]="metrics()!.rejectionRate"></div>
                </div>
              </div>
              <div class="rate-item">
                <div class="rate-header">
                  <span>Export readiness</span>
                  <strong class="rate-val green-val">{{ metrics()!.exportReadinessRate }}%</strong>
                </div>
                <div class="rate-bar-track">
                  <div class="rate-bar-fill green-fill" [style.width.%]="metrics()!.exportReadinessRate"></div>
                </div>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="section-header">
              <h3>Test asset coverage</h3>
            </div>
            <div class="rate-list">
              <div class="coverage-row">
                <span>Stories with generated tests</span>
                <strong class="green-val">{{ metrics()!.storiesWithGeneratedTests }}</strong>
              </div>
              <div class="coverage-row">
                <span>Stories without tests</span>
                <strong class="amber-val">{{ metrics()!.storiesWithoutGeneratedTests }}</strong>
              </div>
              <div class="coverage-row">
                <span>Test suites created</span>
                <strong>{{ metrics()!.totalTestSuites }}</strong>
              </div>
              <div class="coverage-row">
                <span>Avg cases per suite</span>
                <strong>{{ avgCasesPerSuite() }}</strong>
              </div>
            </div>
          </section>
        </div>

        <!-- Recent activity -->
        <section class="panel">
          <div class="section-header">
            <h3>Recent activity</h3>
            @if (isAdmin()) {
              <a routerLink="/admin/audit">View full log</a>
            }
          </div>
          @if (metrics()!.recentActivity.length === 0) {
            <app-state-message title="No activity yet" message="Events will appear here as the platform is used." />
          } @else {
            <div class="list-stack compact">
              @for (item of metrics()!.recentActivity; track item.timestamp + item.action) {
                <div class="activity-row">
                  <div class="activity-main">
                    <span class="activity-action">{{ formatAction(item.action) }}</span>
                    @if (item.actorEmail) {
                      <small class="activity-actor">{{ item.actorEmail }}</small>
                    }
                  </div>
                  <div class="activity-meta">
                    <span [class]="outcomeClass(item.outcome)">{{ item.outcome }}</span>
                    <small class="text-muted">{{ item.timestamp | date:'short' }}</small>
                  </div>
                </div>
              }
            </div>
          }
        </section>

        <!-- Quick actions -->
        <section class="panel">
          <div class="section-header">
            <h3>Quick actions</h3>
          </div>
          <div class="action-grid">
            <a class="button secondary" routerLink="/projects">Open projects</a>
            @if (canMutate()) {
              <a class="button secondary" [routerLink]="['/projects']" [queryParams]="{ create: '1' }">New project</a>
            }
            <a class="button secondary" routerLink="/test-suites">Browse test suites</a>
            @if (isAdmin()) {
              <a class="button secondary" routerLink="/admin/users">User administration</a>
              <a class="button secondary" routerLink="/admin/audit">Activity log</a>
            }
          </div>
        </section>
      }
    </section>
  `,
  styles: [`
    .kpi-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
    .metric-card.green strong { color: var(--green); }
    .metric-card.amber strong { color: var(--amber); }
    .metric-card.red strong   { color: var(--red); }
    .rate-list { display: grid; gap: 1rem; }
    .rate-item { display: grid; gap: 0.35rem; }
    .rate-header { display: flex; justify-content: space-between; align-items: baseline; }
    .rate-header span { font-size: 0.85rem; color: var(--text-2); }
    .rate-val { font-size: 0.88rem; }
    .rate-bar-track { height: 6px; border-radius: 3px; background: var(--surface-2); overflow: hidden; }
    .rate-bar-fill { height: 100%; border-radius: 3px; min-width: 2px; transition: width 0.4s; }
    .green-fill { background: var(--green); }
    .amber-fill { background: var(--amber); }
    .red-fill   { background: var(--red); }
    .green-val { color: var(--green); }
    .amber-val { color: var(--amber); }
    .red-val   { color: var(--red); }
    .coverage-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
    .coverage-row span { color: var(--text-2); }
    .activity-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.5rem 0.75rem; border-radius: 6px; }
    .activity-row:hover { background: rgba(255,255,255,0.03); }
    .activity-main { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
    .activity-action { font-size: 0.82rem; font-family: monospace; }
    .activity-actor { color: var(--text-2); font-size: 0.75rem; }
    .activity-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.1rem; flex-shrink: 0; }
    .outcome-ok { color: var(--green); font-size: 0.75rem; font-weight: 600; }
    .outcome-fail { color: var(--red); font-size: 0.75rem; font-weight: 600; }
    .outcome-other { color: var(--amber); font-size: 0.75rem; font-weight: 600; }
    .text-muted { color: var(--text-2); font-size: 0.72rem; }
    .action-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
  `]
})
export class DashboardPageComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  readonly authService = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly metrics = signal<DashboardMetrics | null>(null);

  ngOnInit(): void {
    this.dashboardService.getMetrics().subscribe({
      next: (m) => {
        this.metrics.set(m);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load dashboard metrics. Confirm the backend is running.');
        this.loading.set(false);
      }
    });
  }

  isAdmin(): boolean {
    return this.authService.hasRole('ADMIN');
  }

  canMutate(): boolean {
    return this.authService.hasRole(['ADMIN', 'QA_ENGINEER']);
  }

  avgCasesPerSuite(): string {
    const m = this.metrics();
    if (!m || m.totalTestSuites === 0) return '—';
    return (m.totalTestCases / m.totalTestSuites).toFixed(1);
  }

  formatAction(action: string): string {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  outcomeClass(outcome: string): string {
    if (outcome === 'SUCCESS') return 'outcome-ok';
    if (outcome === 'FAILURE') return 'outcome-fail';
    return 'outcome-other';
  }
}
