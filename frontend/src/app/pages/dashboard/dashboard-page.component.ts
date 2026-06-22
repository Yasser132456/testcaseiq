import {
  Component, ElementRef, Injector, OnDestroy, OnInit, ViewChild,
  afterNextRender, computed, inject, signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CountUp } from 'countup.js';
import { gsap } from 'gsap';
import VanillaTilt from 'vanilla-tilt';
import { DashboardMetrics } from '../../core/models/dashboard.model';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { BadgeComponent } from '../../shared/components/badge.component';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, BadgeComponent, StateMessageComponent, SkeletonComponent],
  styleUrl: './dashboard-page.component.css',
  template: `
    <section class="page-stack">
      @if (loading()) {
        <app-skeleton [rows]="3" [cols]="4" />
      } @else if (error()) {
        <app-state-message title="Dashboard unavailable" [message]="error()" tone="error" />
      } @else if (metrics()) {
        <!-- KPI grid -->
        <div class="kpi-grid">
          <article class="metric-card card--accent">
            <span class="metric-label">Projects</span>
            <span class="metric-value" data-count="totalProjects">0</span>
          </article>
          <article class="metric-card card--accent">
            <span class="metric-label">Stories</span>
            <span class="metric-value" data-count="totalStories">0</span>
          </article>
          <article class="metric-card card--accent">
            <span class="metric-label">Test suites</span>
            <span class="metric-value" data-count="totalTestSuites">0</span>
          </article>
          <article class="metric-card card--accent">
            <span class="metric-label">Test cases</span>
            <span class="metric-value" data-count="totalTestCases">0</span>
          </article>
          <article class="metric-card card--green">
            <span class="metric-label">Approved</span>
            <span class="metric-value" data-count="approvedTestCases">0</span>
          </article>
          <article class="metric-card card--amber">
            <span class="metric-label">Pending review</span>
            <span class="metric-value" data-count="pendingReviewTestCases">0</span>
          </article>
          <article class="metric-card card--red">
            <span class="metric-label">Rejected</span>
            <span class="metric-value" data-count="rejectedTestCases">0</span>
          </article>
          <article class="metric-card card--accent">
            <span class="metric-label">Exports</span>
            <span class="metric-value" data-count="totalExports">0</span>
          </article>
        </div>

        <!-- Attention chip strip -->
        <div class="chip-strip">
          @if (metrics()!.pendingReviewTestCases > 0) {
            <span class="chip-group">
              <app-badge status="NEEDS_REVIEW" />
              <span class="chip-detail">{{ metrics()!.pendingReviewTestCases }} cases awaiting review</span>
            </span>
          }
          @if (metrics()!.rejectedTestCases > 0) {
            <span class="chip-group">
              <app-badge status="REJECTED" />
              <span class="chip-detail">{{ metrics()!.rejectedTestCases }} cases rejected</span>
            </span>
          }
          @if (isAllClear()) {
            <span class="chip-group">
              <app-badge status="APPROVED" />
              <span class="chip-detail">All test cases reviewed — no pending items</span>
            </span>
          }
        </div>

        <!-- Quality workflow + coverage donut -->
        <div class="content-grid">
          <section class="panel">
            <div class="section-header"><h3>Quality workflow</h3></div>
            <div class="rate-list">
              <div class="rate-item">
                <div class="rate-header">
                  <span>Approval rate</span>
                  <strong class="green-val rate-val">
                    <span data-count="approvalRate" data-rate="1">0%</span>
                  </strong>
                </div>
                <div class="rate-bar-track">
                  <div class="rate-bar-fill green-fill approval-fill"></div>
                </div>
              </div>
              <div class="rate-item">
                <div class="rate-header">
                  <span>Pending rate</span>
                  <strong class="amber-val rate-val">
                    <span data-count="pendingReviewRate" data-rate="1">0%</span>
                  </strong>
                </div>
                <div class="rate-bar-track">
                  <div class="rate-bar-fill amber-fill pending-fill"></div>
                </div>
              </div>
              <div class="rate-item">
                <div class="rate-header">
                  <span>Rejection rate</span>
                  <strong class="red-val rate-val">
                    <span data-count="rejectionRate" data-rate="1">0%</span>
                  </strong>
                </div>
                <div class="rate-bar-track">
                  <div class="rate-bar-fill red-fill rejection-fill"></div>
                </div>
              </div>
              <div class="rate-item">
                <div class="rate-header">
                  <span>Export readiness</span>
                  <strong class="green-val rate-val">
                    <span data-count="exportReadinessRate" data-rate="1">0%</span>
                  </strong>
                </div>
                <div class="rate-bar-track">
                  <div class="rate-bar-fill green-fill export-fill"></div>
                </div>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="section-header"><h3>Story coverage</h3></div>
            <div class="donut-wrap">
              <svg class="donut-svg" viewBox="0 0 100 100"
                role="img" [attr.aria-label]="'Story coverage: ' + coveragePct()">
                <circle class="donut-bg" cx="50" cy="50" r="44" />
                <circle #donutArc class="donut-arc" cx="50" cy="50" r="44"
                  transform="rotate(-90 50 50)" />
                <text x="50" y="50" class="donut-text">{{ coveragePct() }}</text>
              </svg>
              <div class="donut-legend">
                <div class="legend-row">
                  <span class="dot dot--green"></span>
                  <span>{{ metrics()!.storiesWithGeneratedTests }} with tests</span>
                </div>
                <div class="legend-row">
                  <span class="dot dot--text3"></span>
                  <span>{{ metrics()!.storiesWithoutGeneratedTests }} without</span>
                </div>
                <div class="legend-row">
                  <span class="legend-note">Avg {{ avgCasesPerSuite() }} cases / suite</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Activity timeline -->
        <section class="panel">
          <div class="section-header">
            <h3>Recent activity</h3>
            @if (isAdmin()) {
              <a routerLink="/admin/audit" class="view-all-link">View audit trail →</a>
            }
          </div>
          @if (metrics()!.recentActivity.length === 0) {
            <p class="empty-note">No activity yet — events will appear here as the platform is used.</p>
          } @else {
            <div class="timeline">
              @for (item of metrics()!.recentActivity.slice(0, 10); track item.timestamp + item.action) {
                <div class="timeline-entry">
                  <span [class]="dotClass(item.outcome)"></span>
                  <div class="timeline-body">
                    <span class="timeline-action">{{ formatAction(item.action) }}</span>
                    <span class="timeline-meta">
                      @if (item.actorEmail) { {{ item.actorEmail }} · }{{ relativeTime(item.timestamp) }}
                    </span>
                  </div>
                </div>
              }
            </div>
          }
        </section>

        <!-- Quick actions -->
        <section class="panel">
          <div class="section-header"><h3>Quick actions</h3></div>
          <div class="action-grid">
            <a class="button secondary" routerLink="/projects">Open projects</a>
            @if (canMutate()) {
              <a class="button secondary" routerLink="/projects">New project</a>
            }
            <a class="button secondary" routerLink="/test-suites">Browse test suites</a>
            <a class="button secondary" routerLink="/review-board">Review board</a>
            @if (isAdmin()) {
              <a class="button secondary" routerLink="/admin/users">User administration</a>
              <a class="button secondary" routerLink="/admin/audit">Activity log</a>
            }
          </div>
        </section>
      }
    </section>
  `
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  @ViewChild('donutArc') private donutArc?: ElementRef<SVGCircleElement>;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly metrics = signal<DashboardMetrics | null>(null);
  readonly hasAnimated = signal(false);

  readonly coveragePct = computed(() => {
    const m = this.metrics();
    if (!m || m.totalStories === 0) return '0%';
    return `${Math.round(m.storiesWithGeneratedTests / m.totalStories * 100)}%`;
  });

  private tiltTargets: HTMLElement[] = [];

  ngOnInit(): void {
    this.dashboardService.getMetrics().subscribe({
      next: (m) => {
        this.metrics.set(m);
        this.loading.set(false);
        afterNextRender(() => this.runAnimations(m), { injector: this.injector });
      },
      error: () => {
        this.error.set('Unable to load dashboard metrics. Confirm the backend is running.');
        this.loading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.tiltTargets.forEach(el => (el as HTMLElement & { vanillaTilt?: { destroy(): void } }).vanillaTilt?.destroy());
  }

  isAdmin(): boolean { return this.authService.hasRole('ADMIN'); }
  canMutate(): boolean { return this.authService.hasRole(['ADMIN', 'QA_ENGINEER']); }

  isAllClear(): boolean {
    const m = this.metrics();
    return !!m && m.totalTestCases > 0 && m.pendingReviewTestCases === 0 && m.rejectedTestCases === 0;
  }

  avgCasesPerSuite(): string {
    const m = this.metrics();
    if (!m || m.totalTestSuites === 0) return '—';
    return (m.totalTestCases / m.totalTestSuites).toFixed(1);
  }

  formatAction(action: string): string {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  dotClass(outcome: string): string {
    const base = 'timeline-dot ';
    if (outcome === 'SUCCESS') return base + 'dot--outcome-ok';
    if (outcome === 'FAILURE') return base + 'dot--outcome-fail';
    if (outcome === 'BLOCKED') return base + 'dot--outcome-block';
    return base + 'dot--outcome-other';
  }

  outcomeClass(outcome: string): string {
    if (outcome === 'SUCCESS') return 'outcome-ok';
    if (outcome === 'FAILURE') return 'outcome-fail';
    return 'outcome-other';
  }

  relativeTime(ts: string): string {
    const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (mins < 60) return `${Math.max(0, mins)}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  private runAnimations(m: DashboardMetrics): void {
    if (this.hasAnimated()) return;
    this.hasAnimated.set(true);
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.initTilt(rm);
    this.runCountUp(m, rm);
    this.animateRateBars(m, rm);
    this.animateDonut(m, rm);
    if (!rm) this.animateTimeline();
  }

  private initTilt(rm: boolean): void {
    if (rm) return;
    const cards = Array.from(this.el.nativeElement.querySelectorAll<HTMLElement>('.metric-card'));
    if (!cards.length) return;
    VanillaTilt.init(cards, { max: 6, speed: 500, glare: true, 'max-glare': 0.08, scale: 1.02, gyroscope: false });
    this.tiltTargets = cards;
  }

  private runCountUp(m: DashboardMetrics, rm: boolean): void {
    this.el.nativeElement.querySelectorAll<HTMLElement>('[data-count]').forEach((el: HTMLElement) => {
      const key = el.dataset['count'] as keyof DashboardMetrics;
      const value = m[key] as number;
      const isRate = el.dataset['rate'] === '1';
      if (rm) { el.textContent = isRate ? `${value.toFixed(1)}%` : value.toLocaleString(); return; }
      const cu = new CountUp(el, value, {
        duration: 1.2, useEasing: true, useGrouping: true, separator: ',',
        ...(isRate ? { suffix: '%', decimalPlaces: 1 } : {})
      });
      cu.start();
    });
  }

  private animateRateBars(m: DashboardMetrics, rm: boolean): void {
    const fills = [
      { selector: '.approval-fill', width: m.approvalRate },
      { selector: '.pending-fill', width: m.pendingReviewRate },
      { selector: '.rejection-fill', width: m.rejectionRate },
      { selector: '.export-fill', width: m.exportReadinessRate }
    ];

    fills.forEach(({ selector, width }) => {
      const fill = this.el.nativeElement.querySelector<HTMLElement>(selector);
      if (!fill) return;
      if (rm) {
        fill.style.transition = 'none';
        fill.style.width = `${width}%`;
        return;
      }
      gsap.to(fill, { width: `${width}%`, duration: 1.2, ease: 'power2.out' });
    });
  }

  private animateDonut(m: DashboardMetrics, rm: boolean): void {
    const arc = this.donutArc?.nativeElement;
    if (!arc) return;
    const c = 2 * Math.PI * 44;
    const rate = m.totalStories > 0 ? m.storiesWithGeneratedTests / m.totalStories : 0;
    const target = c * (1 - rate);
    arc.style.strokeDasharray = `${c}`;
    if (rm) { arc.style.strokeDashoffset = `${target}`; return; }
    arc.style.strokeDashoffset = `${c}`;
    gsap.to(arc, { strokeDashoffset: target, duration: 1.1, ease: 'power2.out', delay: 0.2 });
  }

  private animateTimeline(): void {
    const entries = this.el.nativeElement.querySelectorAll('.timeline-entry');
    if (!entries.length) return;
    gsap.from(entries, { x: 12, opacity: 0, stagger: 0.06, duration: 0.35, ease: 'power2.out', clearProps: 'all' });
  }
}
