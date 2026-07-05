import {
  Component, ElementRef, Injector, OnInit, ViewChild,
  afterNextRender, computed, inject, signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CountUp } from 'countup.js';
import { gsap } from 'gsap';
import { DashboardMetrics } from '../../core/models/dashboard.model';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { OnboardingProgressService } from '../../core/services/onboarding-progress.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { TiltDirective } from '../../shared/directives/tilt.directive';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, StateMessageComponent, SkeletonComponent, TiltDirective],
  styleUrl: './dashboard-page.component.css',
  template: `
    <section class="page-stack dashboard-page">
      @if (loading()) {
        <app-skeleton [rows]="3" [cols]="4" />
      } @else if (error()) {
        <app-state-message title="Dashboard unavailable" [message]="error()" tone="error" />
        <button class="button secondary" type="button" (click)="loadMetrics()">Try again</button>
      } @else if (metrics()) {
        @if (isFirstRun()) {
          <section class="getting-started-card t-stagger is-shown" aria-labelledby="getting-started-title">
            <div class="getting-started-copy">
              <span class="progress-pill" aria-live="polite">{{ onboardingProgress.progressLabel() }}</span>
              <h2 id="getting-started-title" class="t-stagger-line t-stagger-line--1">Create your first project</h2>
              <p class="t-stagger-line t-stagger-line--2">
                Add a project, then move one story through analysis, generation, review, and export.
              </p>
              @if (canMutate()) {
                <a class="button" routerLink="/projects" [queryParams]="{ create: 'project' }">Create your first project</a>
              }
            </div>
            <ol class="workflow-preview" aria-label="First workflow preview">
              @for (step of workflowPreview; track step.label) {
                <li [attr.data-tone]="step.tone">
                  <span>{{ step.index }}</span>
                  <strong>{{ step.label }}</strong>
                  <small>{{ step.copy }}</small>
                </li>
              }
            </ol>
          </section>
        } @else {
          <section class="next-action-card">
            <span class="section-kicker">NEXT ACTION</span>
            <h2>{{ nextActionMessage() }}</h2>
            @if (nextActionKind() !== 'clear') {
              <div class="hero-actions">
                @if (nextActionKind() === 'start') {
                  <a class="button" routerLink="/projects">Get started</a>
                }
                @if (nextActionKind() === 'review') {
                  <a class="button" routerLink="/review-board">Review Board</a>
                  <a class="button secondary" routerLink="/dashboard" fragment="coverage" (click)="scrollToCoverage($event)">
                    View coverage &rarr;
                  </a>
                }
                @if (nextActionKind() === 'export') {
                  <a class="button" routerLink="/export">Export</a>
                }
              </div>
            }
          </section>
        }

        <nav class="kpi-chip-row" aria-label="Dashboard totals">
          <a class="kpi-chip glass-surface glass-surface--2 glass-surface--interactive" routerLink="/projects" glassTilt [glassTiltGlare]="true" [glassTiltMaxDeg]="4" [glassTiltMaxGlare]="0.08">
            <span>Projects</span>
            <strong data-count="totalProjects">{{ metrics()!.totalProjects.toLocaleString() }}</strong>
          </a>
          <a class="kpi-chip glass-surface glass-surface--2 glass-surface--interactive" routerLink="/stories" glassTilt [glassTiltGlare]="true" [glassTiltMaxDeg]="4" [glassTiltMaxGlare]="0.08">
            <span>Stories</span>
            <strong data-count="totalStories">{{ metrics()!.totalStories.toLocaleString() }}</strong>
          </a>
          <a class="kpi-chip glass-surface glass-surface--2 glass-surface--interactive" routerLink="/test-suites" glassTilt [glassTiltGlare]="true" [glassTiltMaxDeg]="4" [glassTiltMaxGlare]="0.08">
            <span>Test Suites</span>
            <strong data-count="totalTestSuites">{{ metrics()!.totalTestSuites.toLocaleString() }}</strong>
          </a>
          <a class="kpi-chip glass-surface glass-surface--2 glass-surface--interactive" routerLink="/review-board" glassTilt [glassTiltGlare]="true" [glassTiltMaxDeg]="4" [glassTiltMaxGlare]="0.08">
            <span>Test Cases</span>
            <strong data-count="totalTestCases">{{ metrics()!.totalTestCases.toLocaleString() }}</strong>
          </a>
        </nav>

        <div class="dashboard-metrics-grid">
          <section class="panel quality-panel">
            <div class="section-header"><h3>QUALITY PIPELINE</h3></div>
            <div class="pipeline-list">
              @for (row of pipelineRows(); track row.label) {
                <div class="pipeline-item">
                  <div class="pipeline-header">
                    <span>{{ row.label }}</span>
                    <strong>{{ row.value.toFixed(1) }}%</strong>
                  </div>
                  <div class="pipeline-track">
                    <div class="pipeline-fill" [attr.data-width]="row.value"></div>
                  </div>
                </div>
              }
            </div>
          </section>

          <section class="panel coverage-panel" id="coverage">
            <div class="section-header"><h3>STORY COVERAGE</h3></div>
            <div class="coverage-content">
              <svg class="donut-svg" viewBox="0 0 100 100"
                role="img" [attr.aria-label]="'Story coverage: ' + coveragePct()">
                <circle class="donut-bg" cx="50" cy="50" r="44" />
                <circle #donutArc class="donut-arc" cx="50" cy="50" r="44"
                  transform="rotate(-90 50 50)" />
                <text x="50" y="50" class="donut-text">{{ coveragePct() }}</text>
              </svg>
              <div class="coverage-copy">
                <strong>{{ coveragePct() }} stories have tests</strong>
                <span>{{ metrics()!.storiesWithGeneratedTests }} covered / {{ metrics()!.totalStories }} total</span>
                <span>Avg {{ avgCasesPerSuite() }} cases / suite</span>
              </div>
            </div>
          </section>
        </div>

        <section class="panel activity-panel">
          <div class="section-header">
            <h3>RECENT ACTIVITY</h3>
            @if (isAdmin()) {
              <a routerLink="/admin/audit" class="view-all-link">View audit &rarr;</a>
            }
          </div>
          @if (metrics()!.recentActivity.length === 0) {
            <p class="empty-note">No activity yet. Events will appear here as the platform is used.</p>
          } @else {
            <div class="timeline">
              @for (item of metrics()!.recentActivity.slice(0, 10); track item.timestamp + item.action) {
                <div class="timeline-entry">
                  <span [class]="dotClass(item.outcome)"></span>
                  <div class="timeline-body">
                    <span class="timeline-action">{{ formatAction(item.action) }}</span>
                    <span class="timeline-meta">
                      @if (item.actorEmail) { {{ item.actorEmail }} &middot; }{{ relativeTime(item.timestamp) }}
                    </span>
                  </div>
                </div>
              }
            </div>
          }
        </section>

        <section class="panel recent-projects-panel">
          <div class="section-header"><h3>RECENT PROJECTS</h3></div>
          @if (recentProjects().length === 0) {
            <p class="empty-note">No projects yet.</p>
          } @else {
            <div class="project-card-row">
              @for (project of recentProjects(); track project.id) {
                <a class="project-card glass-surface glass-surface--2 glass-surface--interactive" [routerLink]="['/projects', project.id]" [attr.data-accent]="projectAccent(project.key)" glassTilt [glassTiltGlare]="true" [glassTiltMaxDeg]="4" [glassTiltMaxGlare]="0.06">
                  <span class="project-key">{{ project.key }}</span>
                  <strong>{{ project.name }}</strong>
                  @if (project.description) {
                    <span>{{ project.description }}</span>
                  }
                  <time>{{ relativeTime(project.updatedAt) }}</time>
                </a>
              }
            </div>
          }
          <div class="project-actions">
            @if (canMutate()) {
              <a class="button secondary" routerLink="/projects">+ New project</a>
            }
          </div>
        </section>
      }
    </section>
  `
})
export class DashboardPageComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  readonly onboardingProgress = inject(OnboardingProgressService);

  @ViewChild('donutArc') private donutArc?: ElementRef<SVGCircleElement>;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly metrics = signal<DashboardMetrics | null>(null);
  readonly hasAnimated = signal(false);
  readonly workflowPreview = [
    { index: '01', label: 'Analyze', copy: 'Extract requirements and risks from the story.', tone: 'analysis' },
    { index: '02', label: 'Generate', copy: 'Create draft test cases from the analysis.', tone: 'generate' },
    { index: '03', label: 'Review', copy: 'Approve the cases that are ready to ship.', tone: 'review' },
    { index: '04', label: 'Export', copy: 'Download approved QA assets for handoff.', tone: 'export' }
  ];

  readonly isFirstRun = computed(() => (this.metrics()?.totalProjects ?? 0) === 0 || this.onboardingProgress.isFreshAccount());

  readonly nextActionKind = computed(() => {
    const m = this.metrics();
    if (!m || m.totalProjects === 0) return 'start';
    if (m.pendingReviewTestCases > 0) return 'review';
    if (m.approvedTestCases > 0) return 'export';
    return 'clear';
  });

  readonly nextActionMessage = computed(() => {
    const m = this.metrics();
    if (!m || this.nextActionKind() === 'start') return 'Create your first project to begin';
    if (this.nextActionKind() === 'review') {
      return `${m.pendingReviewTestCases.toLocaleString()} test cases are waiting for review`;
    }
    if (this.nextActionKind() === 'export') {
      return `${m.approvedTestCases.toLocaleString()} cases approved and ready to export`;
    }
    return "You're all caught up. Great work.";
  });

  readonly pipelineRows = computed(() => {
    const m = this.metrics();
    return [
      { label: 'Approval', value: m?.approvalRate ?? 0 },
      { label: 'Pending', value: m?.pendingReviewRate ?? 0 },
      { label: 'Rejection', value: m?.rejectionRate ?? 0 },
      { label: 'Export ready', value: m?.exportReadinessRate ?? 0 }
    ];
  });

  readonly recentProjects = computed(() => this.metrics()?.recentProjects.slice(0, 3) ?? []);

  readonly coveragePct = computed(() => {
    const m = this.metrics();
    if (!m || m.totalStories === 0) return '0%';
    return `${Math.round(m.storiesWithGeneratedTests / m.totalStories * 100)}%`;
  });

  ngOnInit(): void {
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.loading.set(true);
    this.error.set('');
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

  isAdmin(): boolean { return this.authService.hasRole('ADMIN'); }
  canMutate(): boolean { return this.authService.hasRole(['ADMIN', 'QA_ENGINEER']); }

  projectAccent(key: string): string {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xffff;
    const palette = ['accent', 'cyan', 'purple', 'green', 'amber'];
    return palette[h % palette.length];
  }

  avgCasesPerSuite(): string {
    const m = this.metrics();
    if (!m || m.totalTestSuites === 0) return '-';
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

  relativeTime(ts: string): string {
    const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (mins < 60) return `${Math.max(0, mins)}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  scrollToCoverage(event: Event): void {
    event.preventDefault();
    document.getElementById('coverage')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private runAnimations(m: DashboardMetrics): void {
    if (this.hasAnimated()) return;
    this.hasAnimated.set(true);
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.runCountUp(m, rm);
    this.staggerKpiChips(rm);
    this.animatePipeline(rm);
    this.animateDonut(m, rm);
    if (!rm) this.animateTimeline();
  }

  private runCountUp(m: DashboardMetrics, rm: boolean): void {
    this.el.nativeElement.querySelectorAll<HTMLElement>('[data-count]').forEach((el: HTMLElement) => {
      const key = el.dataset['count'] as keyof DashboardMetrics;
      const value = m[key] as number;
      if (rm) {
        el.textContent = value.toLocaleString();
        return;
      }
      const cu = new CountUp(el, value, {
        duration: 1.2, useEasing: true, useGrouping: true, separator: ','
      });
      cu.start();
    });
  }

  private animatePipeline(rm: boolean): void {
    this.el.nativeElement.querySelectorAll<HTMLElement>('.pipeline-fill').forEach((fill) => {
      const width = Number(fill.dataset['width'] ?? 0);
      if (rm) {
        fill.style.transition = 'none';
        fill.style.width = `${width}%`;
        return;
      }
      gsap.to(fill, { width: `${width}%`, duration: 1.2, ease: 'power2.out' });
    });
  }

  private staggerKpiChips(rm: boolean): void {
    const chips = this.el.nativeElement.querySelectorAll('.kpi-chip-row .kpi-chip');
    if (rm || !chips.length) return;
    gsap.from(chips, { y: 8, opacity: 0, stagger: 0.05, duration: 0.28, ease: 'power2.out', clearProps: 'all' });
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
    const entries = this.el.nativeElement.querySelectorAll('.timeline-entry, .project-card');
    if (!entries.length) return;
    gsap.from(entries, { x: 12, opacity: 0, stagger: 0.06, duration: 0.35, ease: 'power2.out', clearProps: 'all' });
  }
}
