import { DatePipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { LucideCheckSquare2, LucideDynamicIcon } from '@lucide/angular';
import { Subscription, forkJoin, fromEvent } from 'rxjs';
import { TestCaseSummary, TestSuiteDetail, TestSuitePage } from '../../core/models/test-suite.model';
import { OnboardingProgressService } from '../../core/services/onboarding-progress.service';
import { ReviewService } from '../../core/services/review.service';
import { TestSuiteService } from '../../core/services/test-suite.service';
import { ToastService } from '../../core/services/toast.service';
import { BadgeComponent, BadgeStatus } from '../../shared/components/badge.component';
import { ButtonComponent, ButtonState } from '../../shared/components/button.component';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

interface ReviewCaseItem {
  suite: TestSuiteDetail;
  testCase: TestCaseSummary;
}

@Component({
  selector: 'app-review-board-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    LucideDynamicIcon,
    BadgeComponent,
    ButtonComponent,
    StateMessageComponent,
    SkeletonComponent,
    EmptyStateComponent
  ],
  template: `
    <section class="page-stack">
      <div class="section-header">
        <h2>Review Board</h2>
      </div>

      @if (loading()) {
        <app-skeleton [rows]="5" [cols]="5" />
      } @else if (loadError()) {
        <app-state-message title="Could not load review board" [message]="loadError()" tone="error" />
        <button class="button secondary" type="button" (click)="load()">Try again</button>
      } @else if (reviewCases().length === 0) {
        <div class="panel">
          @if (sessionReviewCount() > 0) {
            <div class="session-complete-state">
              <span class="session-complete-icon" aria-hidden="true">
                <svg [lucideIcon]="LucideCheckSquare2" [size]="24" [strokeWidth]="1.8"></svg>
              </span>
              <div>
                <h3>All done: {{ sessionReviewCount() }} cases reviewed this session</h3>
                <p>Suite is ready for export</p>
              </div>
              @if (showExportHubNudge()) {
                <div class="activation-nudge" aria-live="polite">
                  <span class="progress-pill">{{ onboardingProgress.progressLabel() }}</span>
                  <span>Export the approved suite for handoff.</span>
                  <button class="button ghost small" type="button" (click)="onboardingProgress.dismiss('export-hub')">Dismiss</button>
                </div>
              }
              <a class="button approve-button" routerLink="/export">Go to Export Hub</a>
            </div>
          } @else {
            <app-empty-state
              [icon]="LucideCheckSquare2"
              title="Queue cleared"
              message="No test cases are waiting in the review queue. Generate new suites from stories to continue coverage."
            />
          }
        </div>
      } @else {
        <div class="review-master-detail glass-surface glass-surface--2 glass-surface--flat">
          <div class="sr-only" aria-live="polite" aria-atomic="true">{{ liveAnnouncement() }}</div>
          <aside class="review-case-list" aria-label="Test cases">
            @for (item of reviewCases(); track item.testCase.id) {
              <button
                class="review-case-item"
                type="button"
                [class.is-active]="item.testCase.id === selectedCaseId()"
                [class.is-success]="statusForBadge(item.testCase) === 'APPROVED'"
                [class.is-error]="statusForBadge(item.testCase) === 'REJECTED'"
                [attr.aria-current]="item.testCase.id === selectedCaseId() ? 'true' : null"
                (click)="selectCase(item.testCase.id)"
              >
                <span class="review-case-title">{{ item.testCase.title }}</span>
                <span class="review-case-story">{{ item.suite.storyTitle }}</span>
                <span class="review-case-meta">
                  <span class="case-meta-badge">{{ item.testCase.type ?? 'TYPE' }}</span>
                  <span class="case-meta-badge">{{ item.testCase.priority ?? 'PRIORITY' }}</span>
                  <app-badge [status]="statusForBadge(item.testCase)" />
                </span>
              </button>
            }
          </aside>

          @if (selectedCase(); as item) {
            <section class="review-detail-panel glass-readable-scrim glass-scrim--2">
              <div class="quality-readout" aria-label="Quality score" (mousemove)="onQualityMouseMove($event)" (mouseleave)="onQualityMouseLeave()">
                <svg class="quality-gauge" viewBox="0 0 80 80" role="img" [attr.aria-label]="'Quality score ' + qualityScore(item.testCase)">
                  <circle class="quality-gauge-track" cx="40" cy="40" r="32"></circle>
                  <circle
                    class="quality-gauge-progress"
                    cx="40"
                    cy="40"
                    r="32"
                    [attr.stroke]="qualityColor(item.testCase)"
                    [attr.stroke-dasharray]="qualityCircumference"
                    [attr.stroke-dashoffset]="qualityDashOffset(item.testCase)"
                  ></circle>
                  <text x="40" y="44">{{ qualityScore(item.testCase) }}</text>
                </svg>
                <span class="confidence-badge">{{ item.testCase.confidenceLevel ?? 'UNKNOWN' }} confidence</span>
              </div>

              <div class="review-detail-main">
                <div class="review-detail-heading">
                  <div>
                    <p class="review-suite-name">{{ item.suite.name }}</p>
                    <h3>{{ item.testCase.title }}</h3>
                  </div>
                  <app-badge [status]="statusForBadge(item.testCase)" />
                </div>

                <dl class="review-detail-grid">
                  <div>
                    <dt>Project</dt>
                    <dd>{{ item.suite.projectName }}</dd>
                  </div>
                  <div>
                    <dt>Story</dt>
                    <dd>
                      <a [routerLink]="['/stories', item.suite.storyId]" class="review-detail-link">
                        {{ item.suite.storyTitle }}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>{{ item.testCase.type ?? 'Not set' }}</dd>
                  </div>
                  <div>
                    <dt>Priority</dt>
                    <dd>{{ item.testCase.priority ?? 'Not set' }}</dd>
                  </div>
                  <div>
                    <dt>Automation</dt>
                    <dd>{{ item.testCase.automationCandidate ? 'Candidate' : 'Manual review' }}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{{ item.suite.createdAt | date:'mediumDate' }}</dd>
                  </div>
                </dl>

                @if (item.suite.explainabilitySummary) {
                  <div class="inline-note">{{ item.suite.explainabilitySummary }}</div>
                }
              </div>

              @if (isReviewable(item.testCase)) {
                <div class="review-sticky-actions">
                  <div class="shortcut-group">
                    <span><kbd>A</kbd> approve</span>
                    <span><kbd>R</kbd> reject</span>
                    <span><kbd>J</kbd>/<kbd>K</kbd> navigate</span>
                  </div>
                  <div class="review-action-buttons">
                    <app-button
                      variant="approve"
                      [loading]="reviewBusy() && pendingAction() === 'APPROVED'"
                      [state]="approveState()"
                      (click)="approveSelected()"
                    >
                      Approve
                    </app-button>
                    <app-button
                      variant="danger"
                      [loading]="reviewBusy() && pendingAction() === 'REJECTED'"
                      [state]="rejectState()"
                      (click)="rejectSelected()"
                    >
                      Reject
                    </app-button>
                  </div>
                </div>
              }
            </section>
          }
        </div>

        <div class="pagination-bar">
          <button class="button secondary" type="button"
            [disabled]="page()?.first" (click)="goToPage(currentPage() - 1)">Previous</button>
          <span class="page-info">
            Page {{ (page()?.number ?? 0) + 1 }} of {{ page()?.totalPages ?? 1 }}
            &nbsp;({{ page()?.totalElements ?? 0 }} suites)
          </span>
          <button class="button secondary" type="button"
            [disabled]="page()?.last" (click)="goToPage(currentPage() + 1)">Next</button>
        </div>
      }
    </section>
  `,
  styles: [`
    .review-master-detail{--b:1px solid var(--glass-edge);display:grid;grid-template-columns:320px 1fr;min-height:34rem;border:var(--b);border-radius:var(--radius-lg);background:var(--glass-bg-2);backdrop-filter:var(--glass-blur-md);-webkit-backdrop-filter:var(--glass-blur-md);box-shadow:var(--glass-border-highlight);overflow:hidden}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .review-case-list{display:grid;align-content:start;max-height:calc(100vh - 14rem);overflow-y:auto;border-right:var(--b);background:var(--glass-bg-1)}
    .review-case-item{display:grid;gap:var(--space-sm);width:100%;min-height:6.25rem;padding:var(--space-md) var(--space-base);border:0;border-bottom:var(--b);background:transparent;color:var(--color-text);text-align:left;cursor:pointer;transition:background var(--dur) var(--ease),color var(--dur) var(--ease),transform var(--dur) var(--ease)}
    .review-case-item:hover:not(:disabled){background:rgba(255,255,255,.03);transform:translateX(2px)}
    .review-case-item:focus-visible{outline:2px solid var(--color-accent);outline-offset:-2px}
    .review-case-item:active:not(:disabled){transform:translateX(2px) scale(.97)}
    .review-case-item:disabled{cursor:not-allowed;opacity:.45}.review-case-item.is-error{color:var(--color-red)}.review-case-item.is-success{color:var(--color-green)}
    .review-case-item.is-active{background:var(--color-accent-bg);color:var(--color-accent);transform:translateX(2px)}
    .review-case-title{min-width:0;font-weight:500;line-height:1.35}.review-case-story{min-width:0;overflow:hidden;color:var(--color-text-2);font-family:var(--font-mono);font-size:.72rem;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.review-case-meta,.shortcut-group,.review-action-buttons{display:flex;align-items:center;gap:var(--space-xs);flex-wrap:wrap}
    .case-meta-badge,.confidence-badge{display:inline-flex;align-items:center;min-height:1.65rem;padding:0 .55rem;border:var(--b);border-radius:var(--radius-sm);background:var(--glass-bg-1);color:var(--color-text-2);font-family:var(--font-mono);font-size:.72rem;font-weight:500}
    .review-detail-panel{position:relative;display:grid;align-content:start;min-width:0;min-height:34rem;background:var(--glass-bg-2)}
    .review-detail-main{display:grid;gap:var(--space-lg);padding:var(--space-xl);padding-right:8rem}.review-detail-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-base)}
    .review-detail-heading h3,.review-suite-name{margin:0}.review-suite-name{color:var(--color-cyan);font-family:var(--font-mono);font-size:.75rem}
    .review-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-base);margin:0}.review-detail-grid div{display:grid;gap:.25rem;padding:var(--space-md);border:var(--b);border-radius:var(--radius-md);background:var(--glass-bg-1);box-shadow:var(--glass-border-highlight)}
    .review-detail-grid dt{color:var(--color-text-2);font-family:var(--font-mono);font-size:.7rem}.review-detail-grid dd{margin:0;overflow-wrap:anywhere}
    .quality-readout{position:absolute;top:var(--space-lg);right:var(--space-lg);display:grid;justify-items:center;gap:var(--space-xs);perspective:280px}.quality-gauge{width:80px;height:80px;overflow:visible;transform-style:preserve-3d}
    .quality-gauge-track,.quality-gauge-progress{fill:none;stroke-width:7}.quality-gauge-track{stroke:var(--color-border-subtle)}.quality-gauge-progress{stroke-linecap:round;transform:rotate(-90deg);transform-origin:40px 40px}
    .quality-gauge text{fill:var(--color-text);font-family:var(--font-mono);font-size:1rem;font-weight:700;text-anchor:middle}.confidence-badge{min-height:auto;padding:.2rem .45rem;font-size:.7rem}
    .review-sticky-actions{position:sticky;bottom:0;display:flex;align-items:center;justify-content:space-between;gap:var(--space-base);padding:var(--space-md) var(--space-lg);border-top:var(--b);background:var(--glass-bg-2);z-index:var(--z-sticky)}
    .shortcut-group{color:var(--color-text-2);font-size:.8rem}
    .session-complete-state{display:grid;justify-items:center;gap:var(--space-base);padding:var(--space-xl);text-align:center}
    .session-complete-icon{display:grid;width:3rem;height:3rem;place-items:center;border:1px solid var(--color-green-border);border-radius:8px;background:var(--color-green-bg);color:var(--color-green)}
    .session-complete-state h3{margin:0;color:var(--color-green);font-size:1.25rem}
    .session-complete-state p{margin:.35rem 0 0;color:var(--color-text-2)}
    .activation-nudge{display:flex;align-items:center;justify-content:center;gap:var(--space-sm);max-width:42rem;padding:var(--space-sm) var(--space-base);border:1px solid var(--color-accent-border);border-radius:var(--radius-md);background:linear-gradient(var(--color-accent-bg),var(--color-accent-bg)),var(--glass-bg-2);box-shadow:var(--glass-border-highlight);color:var(--color-text);font-size:.9rem;font-weight:600}
    .progress-pill{display:inline-flex;align-items:center;min-height:1.55rem;padding:0 var(--space-sm);border:1px solid var(--color-accent-border);border-radius:var(--radius-sm);background:var(--color-accent-bg);color:var(--color-accent);font-family:var(--font-mono);font-size:.72rem;font-weight:700}
    @media (max-width:900px){.review-master-detail{grid-template-columns:1fr}.review-case-list{max-height:22rem;border-right:0;border-bottom:var(--b)}.review-detail-main{padding-right:var(--space-xl)}.review-detail-grid{grid-template-columns:1fr}.quality-readout{position:static;justify-self:start;padding:var(--space-lg) var(--space-lg) 0}.review-sticky-actions{align-items:flex-start;flex-direction:column}}
  `]
})
export class ReviewBoardPageComponent implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly testSuiteService = inject(TestSuiteService);
  private readonly reviewService = inject(ReviewService);
  private readonly toastService = inject(ToastService);
  readonly onboardingProgress = inject(OnboardingProgressService);
  private keyboardSubscription: Subscription | null = null;

  readonly LucideCheckSquare2 = LucideCheckSquare2;
  readonly qualityCircumference = 2 * Math.PI * 32;
  readonly page = signal<TestSuitePage | null>(null);
  readonly suites = signal<TestSuiteDetail[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly currentPage = signal(0);
  readonly selectedCaseId = signal<string | null>(null);
  readonly reviewBusy = signal(false);
  readonly pendingAction = signal<'APPROVED' | 'REJECTED' | null>(null);
  readonly approveState = signal<ButtonState>('default');
  readonly rejectState = signal<ButtonState>('default');
  readonly reviewMessage = signal('');
  readonly reviewError = signal('');
  readonly liveAnnouncement = signal('');
  readonly sessionReviewCount = signal(0);
  readonly showExportHubNudge = computed(() => this.onboardingProgress.shouldShowNudge(
    'export-hub',
    this.onboardingProgress.isComplete('first-approval') && this.sessionReviewCount() > 0
  ));

  readonly reviewCases = computed<ReviewCaseItem[]>(() => this.suites().flatMap((suite) => (
    suite.testCases.map((testCase) => ({ suite, testCase }))
  )));

  readonly selectedCase = computed<ReviewCaseItem | null>(() => (
    this.reviewCases().find((item) => item.testCase.id === this.selectedCaseId()) ?? this.reviewCases()[0] ?? null
  ));

  ngOnInit(): void {
    this.load();
    this.keyboardSubscription = fromEvent<KeyboardEvent>(document, 'keydown').subscribe((event) => {
      this.handleShortcut(event);
    });
  }

  ngOnDestroy(): void {
    this.keyboardSubscription?.unsubscribe();
  }

  goToPage(n: number): void {
    this.currentPage.set(n);
    this.load();
  }

  selectCase(testCaseId: string): void {
    if (this.selectedCaseId() === testCaseId) {
      return;
    }
    this.selectedCaseId.set(testCaseId);
    this.liveAnnouncement.set(`Selected: ${this.selectedCase()?.testCase.title ?? ''}`);
    this.animateDetailEntrance();
    this.animateQualityGauge();
  }

  approveSelected(): void {
    this.updateSelectedStatus('APPROVED');
  }

  rejectSelected(): void {
    this.updateSelectedStatus('REJECTED');
  }

  pendingCount(suite: { totalCases: number; approvedCases: number; rejectedCases: number }): number {
    return Math.max(0, suite.totalCases - suite.approvedCases - suite.rejectedCases);
  }

  statusForBadge(testCase: TestCaseSummary): BadgeStatus {
    const status = testCase.reviewStatus ?? 'DRAFT';
    if (status === 'APPROVED' || status === 'NEEDS_REVIEW' || status === 'REJECTED' || status === 'EXPORTED') {
      return status;
    }
    return status === 'NEEDS_CLARIFICATION' ? 'NEEDS_CLARIFICATION' : 'DRAFT';
  }

  isReviewable(testCase: TestCaseSummary): boolean {
    const status = testCase.reviewStatus ?? 'DRAFT';
    return status === 'NEEDS_REVIEW' || status === 'DRAFT';
  }

  qualityScore(testCase: TestCaseSummary): number {
    return Math.max(0, Math.min(100, Math.round(testCase.qualityScore ?? 0)));
  }

  qualityColor(testCase: TestCaseSummary): string {
    const score = this.qualityScore(testCase);
    if (score < 60) return 'var(--color-red)';
    if (score < 80) return 'var(--color-amber)';
    return 'var(--color-green)';
  }

  qualityDashOffset(testCase: TestCaseSummary): number {
    return this.qualityCircumference * (1 - this.qualityScore(testCase) / 100);
  }

  onQualityMouseMove(event: MouseEvent): void {
    if (this.prefersReducedMotion()) return;
    const panel = event.currentTarget as HTMLElement | null;
    const gauge = panel?.querySelector('.quality-gauge');
    if (!panel || !gauge) return;
    const rect = panel.getBoundingClientRect();
    const offsetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const offsetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    gsap.to(gauge, { rotateX: offsetY * 4, rotateY: offsetX * -4, duration: 0.4, ease: 'power2.out' });
  }

  onQualityMouseLeave(): void {
    if (this.prefersReducedMotion()) return;
    const gauge = this.host.nativeElement.querySelector('.quality-gauge');
    if (gauge) {
      gsap.to(gauge, { rotateX: 0, rotateY: 0, duration: 0.6 });
    }
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.reviewMessage.set('');
    this.reviewError.set('');
    this.testSuiteService.listSuites({}, this.currentPage()).subscribe({
      next: (p) => {
        this.page.set(p);
        if (p.content.length === 0) {
          this.suites.set([]);
          this.selectedCaseId.set(null);
          this.loading.set(false);
          return;
        }
        forkJoin(p.content.map((suite) => this.testSuiteService.getSuite(suite.id))).subscribe({
          next: (suites) => {
            this.suites.set(suites);
            const cases = this.reviewCases();
            const currentStillExists = cases.some((item) => item.testCase.id === this.selectedCaseId());
            if (!currentStillExists) {
              this.selectedCaseId.set(cases[0]?.testCase.id ?? null);
            }
            this.loading.set(false);
            this.animateQualityGauge();
          },
          error: () => {
            this.loadError.set('Unable to load review board details.');
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.loadError.set('Unable to load review board.');
        this.loading.set(false);
      }
    });
  }

  private updateSelectedStatus(status: 'APPROVED' | 'REJECTED'): void {
    const item = this.selectedCase();
    if (!item || this.reviewBusy()) {
      return;
    }
    this.reviewBusy.set(true);
    this.pendingAction.set(status);
    this.approveState.set('default');
    this.rejectState.set('default');
    this.reviewMessage.set('');
    this.reviewError.set('');
    this.reviewService.updateReviewStatus(item.testCase.id, { status, comment: null }).subscribe({
      next: (updated) => {
        this.suites.update((suites) => suites.map((suite) => ({
          ...suite,
          testCases: suite.testCases
            .filter((testCase) => testCase.id !== updated.id)
            .map((testCase) => ({ ...testCase }))
        })));
        this.sessionReviewCount.update((count) => count + 1);
        if (status === 'APPROVED') {
          this.onboardingProgress.complete('first-approval');
        }
        const message = status === 'APPROVED' ? 'Test case approved.' : 'Test case rejected.';
        this.reviewMessage.set(message);
        this.liveAnnouncement.set(status === 'APPROVED' ? 'Approved' : 'Rejected');
        this.toastService.show(message, 'success');
        this.approveState.set(status === 'APPROVED' ? 'success' : 'default');
        this.rejectState.set(status === 'REJECTED' ? 'success' : 'default');
        this.reviewBusy.set(false);
        this.pendingAction.set(null);
      },
      error: () => {
        const message = status === 'APPROVED' ? 'The test case could not be approved.' : 'The test case could not be rejected.';
        this.reviewError.set(message);
        this.toastService.show(message, 'error');
        this.approveState.set(status === 'APPROVED' ? 'error' : 'default');
        this.rejectState.set(status === 'REJECTED' ? 'error' : 'default');
        this.reviewBusy.set(false);
        this.pendingAction.set(null);
      }
    });
  }

  private handleShortcut(event: KeyboardEvent): void {
    const tagName = document.activeElement?.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'a') {
      event.preventDefault();
      this.approveSelected();
    } else if (key === 'r') {
      event.preventDefault();
      this.rejectSelected();
    } else if (key === 'j') {
      event.preventDefault();
      this.selectRelativeCase(1);
    } else if (key === 'k') {
      event.preventDefault();
      this.selectRelativeCase(-1);
    }
  }

  private selectRelativeCase(delta: number): void {
    const cases = this.reviewCases();
    if (cases.length === 0) {
      return;
    }
    const currentIndex = Math.max(0, cases.findIndex((item) => item.testCase.id === this.selectedCaseId()));
    const nextIndex = Math.max(0, Math.min(cases.length - 1, currentIndex + delta));
    this.selectCase(cases[nextIndex].testCase.id);
  }

  private animateDetailEntrance(): void {
    if (this.prefersReducedMotion()) {
      return;
    }
    queueMicrotask(() => {
      const detailPanel = this.host.nativeElement.querySelector('.review-detail-panel');
      if (detailPanel) {
        gsap.from(detailPanel, { x: 16, opacity: 0, duration: 0.25, ease: 'power2.out' });
      }
    });
  }

  private animateQualityGauge(): void {
    if (this.prefersReducedMotion()) {
      return;
    }
    queueMicrotask(() => {
      const item = this.selectedCase();
      const gauge = this.host.nativeElement.querySelector('.quality-gauge-progress') as SVGCircleElement | null;
      if (!item || !gauge) {
        return;
      }
      gsap.fromTo(
        gauge,
        { strokeDashoffset: this.qualityCircumference },
        { strokeDashoffset: this.qualityDashOffset(item.testCase), duration: 0.35, ease: 'power2.out' }
      );
    });
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
