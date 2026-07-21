import { Component, ElementRef, computed, inject, output, signal, input } from '@angular/core';
import { commitReviewVerdictMotion } from '../../core/motion/review-verdict-motion';
import { MotionService } from '../../core/motion/motion.service';
import { GeneratedTestCase, GeneratedTestSuiteResult } from '../../core/models/generated-test.model';
import { TestCaseResponse } from '../../core/models/review.model';
import { ReviewService } from '../../core/services/review.service';
import { ToastService } from '../../core/services/toast.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';

@Component({
  selector: 'app-story-review-tab',
  standalone: true,
  imports: [StateMessageComponent],
  template: `
    <section class="story-review-tab" tabindex="0" (keydown)="handleShortcut($event)" aria-label="Story review queue">
      <div class="review-tab-header">
        <div>
          <h3>Inline review</h3>
          <p>{{ selectedPosition() }} of {{ pendingCases().length }} pending</p>
        </div>
        <div class="shortcut-group" aria-label="Keyboard shortcuts">
          <span><kbd>A</kbd> approve</span>
          <span><kbd>R</kbd> reject</span>
          <span><kbd>J</kbd>/<kbd>K</kbd> navigate</span>
        </div>
      </div>

      @if (pendingCases().length === 0) {
        <app-state-message title="Review queue cleared" message="No generated test cases are waiting for review on this story." tone="success" />
      } @else {
        <div class="story-review-layout glass-surface glass-surface--2 glass-surface--flat">
          <aside class="review-case-list" aria-label="Pending story test cases">
            @for (testCase of pendingCases(); track testCase.id) {
              <button
                class="review-case-item"
                type="button"
                [class.is-active]="testCase.id === selectedCase().id"
                [attr.aria-current]="testCase.id === selectedCase().id ? 'true' : null"
                (click)="selectCase(testCase.id ?? null)"
              >
                <span class="review-case-title">{{ testCase.title }}</span>
                <span class="review-case-meta">
                  <span class="case-meta-badge">{{ testCase.type }}</span>
                  <span class="case-meta-badge">{{ testCase.priority ?? 'PRIORITY' }}</span>
                </span>
              </button>
            }
          </aside>

          @if (selectedCase(); as testCase) {
            <section
              class="review-detail-panel glass-readable-scrim glass-scrim--2"
              [class.is-verdict-approve]="activeVerdict() === 'APPROVED'"
              [class.is-verdict-reject]="activeVerdict() === 'REJECTED'"
            >
              <div class="review-detail-heading">
                <div>
                  <p class="review-suite-name">Story queue</p>
                  <h3>{{ testCase.title }}</h3>
                </div>
                <span class="badge review-attention review-verdict-pill">
                  {{ activeVerdict() === 'APPROVED' ? 'Approving...' : activeVerdict() === 'REJECTED' ? 'Rejecting...' : 'Needs Review' }}
                </span>
              </div>
              @if (activeVerdict(); as verdict) {
                <span class="sr-only" role="status" aria-live="polite">{{ verdict === 'APPROVED' ? 'Approving test case.' : 'Rejecting test case.' }}</span>
              }
              <dl class="review-detail-grid">
                <div><dt>Type</dt><dd>{{ testCase.type }}</dd></div>
                <div><dt>Priority</dt><dd>{{ testCase.priority ?? 'Not set' }}</dd></div>
                <div><dt>Risk</dt><dd>{{ testCase.riskLevel ?? 'Not set' }}</dd></div>
                <div><dt>Automation</dt><dd>{{ testCase.automationCandidate ? 'Candidate' : 'Manual review' }}</dd></div>
              </dl>
              <div class="inline-note">{{ testCase.objective || testCase.description || 'Objective not provided.' }}</div>
              <div class="review-sticky-actions">
                <div class="shortcut-group">
                  <span><kbd>A</kbd> approve</span>
                  <span><kbd>R</kbd> reject</span>
                </div>
                <div class="review-action-buttons">
                  <button class="button approve-button" type="button" (click)="approveSelected()" [disabled]="reviewBusy()">Approve</button>
                  <button class="button danger" type="button" (click)="rejectSelected()" [disabled]="reviewBusy()">Reject</button>
                </div>
              </div>
            </section>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .story-review-tab{display:grid;gap:var(--space-base);outline:none}
    .story-review-tab:focus-visible{outline:2px solid var(--color-accent);outline-offset:2px}
    .review-tab-header{display:flex;align-items:center;justify-content:space-between;gap:var(--space-base)}
    .review-tab-header h3,.review-tab-header p,.review-detail-heading h3,.review-suite-name{margin:0}
    .review-tab-header p{color:var(--color-text-2);font-size:.88rem}
    .shortcut-group,.review-action-buttons,.review-case-meta{display:flex;align-items:center;gap:var(--space-xs);flex-wrap:wrap}
    .shortcut-group{color:var(--color-text-2);font-size:.8rem}
    .story-review-layout{--b:1px solid var(--glass-edge);display:grid;grid-template-columns:320px 1fr;min-height:30rem;border:var(--b);border-radius:var(--radius-lg);background:var(--glass-bg-2);backdrop-filter:var(--glass-blur-md);-webkit-backdrop-filter:var(--glass-blur-md);box-shadow:var(--glass-border-highlight);overflow:hidden}
    .review-case-list{display:grid;align-content:start;max-height:calc(100vh - 20rem);overflow-y:auto;border-right:var(--b);background:var(--glass-bg-1)}
    .review-case-item{display:grid;gap:var(--space-sm);width:100%;min-height:5.5rem;padding:var(--space-md) var(--space-base);border:0;border-bottom:var(--b);background:transparent;color:var(--color-text);text-align:left;cursor:pointer;transition:background var(--dur) var(--ease),color var(--dur) var(--ease),transform var(--dur) var(--ease)}
    .review-case-item:hover{background:var(--glass-bg-1);transform:translateX(2px)}
    .review-case-item:focus-visible{outline:2px solid var(--color-accent);outline-offset:-2px}
    .review-case-item.is-active{background:var(--color-accent-bg);color:var(--color-accent);transform:translateX(2px)}
    .review-case-title{min-width:0;font-weight:500;line-height:1.35}
    .case-meta-badge{display:inline-flex;align-items:center;min-height:1.65rem;padding:0 .55rem;border:var(--b);border-radius:var(--radius-sm);background:var(--glass-bg-1);color:var(--color-text-2);font-family:var(--font-mono);font-size:.72rem;font-weight:500}
    .review-detail-panel{position:relative;display:grid;align-content:start;gap:var(--space-lg);min-width:0;min-height:30rem;padding:var(--space-xl);background:var(--glass-bg-2)}
    .review-detail-panel.is-verdict-approve{border-color:var(--color-green-border)}
    .review-detail-panel.is-verdict-reject{border-color:var(--color-red-border)}
    .review-verdict-pill{transition:background 140ms var(--ease),border-color 140ms var(--ease),color 140ms var(--ease)}
    .is-verdict-approve .review-verdict-pill,.review-verdict-pill.is-approved{background:var(--color-green-bg);border-color:var(--color-green-border);color:var(--color-green)}
    .is-verdict-reject .review-verdict-pill,.review-verdict-pill.is-rejected{background:var(--color-red-bg);border-color:var(--color-red-border);color:var(--color-red)}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .review-detail-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-base)}
    .review-suite-name{color:var(--color-cyan);font-family:var(--font-mono);font-size:.75rem}
    .review-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-base);margin:0}
    .review-detail-grid div{display:grid;gap:.25rem;padding:var(--space-md);border:1px solid var(--glass-edge);border-radius:var(--radius-md);background:var(--glass-bg-1);box-shadow:var(--glass-border-highlight)}
    .review-detail-grid dt{color:var(--color-text-2);font-family:var(--font-mono);font-size:.7rem}.review-detail-grid dd{margin:0;overflow-wrap:anywhere}
    .review-sticky-actions{position:sticky;bottom:0;display:flex;align-items:center;justify-content:space-between;gap:var(--space-base);margin:var(--space-lg) calc(var(--space-xl) * -1) calc(var(--space-xl) * -1);padding:var(--space-md) var(--space-lg);border-top:1px solid var(--glass-edge);background:var(--glass-bg-2);z-index:var(--z-sticky)}
    @media (max-width:900px){.review-tab-header,.review-sticky-actions{align-items:flex-start;flex-direction:column}.story-review-layout{grid-template-columns:1fr}.review-case-list{max-height:18rem;border-right:0;border-bottom:var(--b)}.review-detail-grid{grid-template-columns:1fr}}
  `]
})
export class StoryReviewTabComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly reviewService = inject(ReviewService);
  private readonly toastService = inject(ToastService);
  private readonly motion = inject(MotionService);

  readonly testSuites = input.required<GeneratedTestSuiteResult[]>();
  readonly testCaseUpdated = output<{ original: GeneratedTestCase; updated: TestCaseResponse }>();
  readonly verdictOptimistic = output<{ original: GeneratedTestCase; status: 'APPROVED' | 'REJECTED' }>();
  readonly verdictRollback = output<{ original: GeneratedTestCase }>();
  readonly selectedCaseId = signal<string | null>(null);
  readonly reviewBusy = signal(false);
  readonly reviewOperationState = this.reviewService.operationState;
  readonly activeVerdict = computed(() => {
    const operation = this.reviewOperationState();
    const selected = this.selectedCase();
    return operation.phase === 'running' && operation.testCaseId === selected?.id ? operation.verdict : null;
  });

  readonly pendingCases = computed(() => this.testSuites().flatMap((suite) => suite.testCases).filter((testCase) => testCase.reviewStatus === 'NEEDS_REVIEW'));
  readonly selectedCase = computed(() => {
    const pending = this.pendingCases();
    return pending.find((testCase) => testCase.id === this.selectedCaseId()) ?? pending[0] ?? null;
  });
  readonly selectedPosition = computed(() => {
    const selected = this.selectedCase();
    if (!selected) return 0;
    return this.pendingCases().findIndex((testCase) => testCase.id === selected.id) + 1;
  });

  selectCase(testCaseId: string | null): void {
    if (testCaseId) this.selectedCaseId.set(testCaseId);
  }

  approveSelected(): void {
    this.updateSelectedStatus('APPROVED');
  }

  rejectSelected(): void {
    this.updateSelectedStatus('REJECTED');
  }

  handleShortcut(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, button')) return;
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

  private updateSelectedStatus(status: 'APPROVED' | 'REJECTED'): void {
    const testCase = this.selectedCase();
    if (!testCase?.id || this.reviewBusy()) return;
    this.reviewBusy.set(true);
    this.reviewService.updateReviewStatus(testCase.id, { status, comment: null }).subscribe({
      next: (updated) => {
        this.testCaseUpdated.emit({ original: testCase, updated });
        this.toastService.show(status === 'APPROVED' ? 'Test case approved.' : 'Test case rejected.', 'success');
        this.reviewBusy.set(false);
      },
      error: () => {
        this.verdictRollback.emit({ original: testCase });
        this.toastService.show(status === 'APPROVED' ? 'The test case could not be approved.' : 'The test case could not be rejected.', 'error');
        this.reviewBusy.set(false);
      }
    });
    commitReviewVerdictMotion({
      container: this.host.nativeElement,
      card: this.host.nativeElement.querySelector('.review-detail-panel'),
      verdict: status,
      reducedMotion: this.motion.reducedMotion(),
      commit: () => this.verdictOptimistic.emit({ original: testCase, status })
    });
  }

  private selectRelativeCase(delta: number): void {
    const cases = this.pendingCases();
    if (cases.length === 0) return;
    const currentIndex = Math.max(0, cases.findIndex((testCase) => testCase.id === this.selectedCase()?.id));
    const nextIndex = Math.max(0, Math.min(cases.length - 1, currentIndex + delta));
    this.selectCase(cases[nextIndex].id ?? null);
  }
}
