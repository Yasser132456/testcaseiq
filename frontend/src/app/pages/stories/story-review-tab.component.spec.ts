import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { defer, Subject } from 'rxjs';
import { ReviewOperationState } from '../../core/motion/async-operation-state';
import { GeneratedTestCase, GeneratedTestSuiteResult, ReviewStatus } from '../../core/models/generated-test.model';
import { TestCaseResponse } from '../../core/models/review.model';
import { ReviewService } from '../../core/services/review.service';
import { ToastService } from '../../core/services/toast.service';
import { StoryReviewTabComponent } from './story-review-tab.component';

describe('StoryReviewTabComponent verdict states', () => {
  let fixture: ComponentFixture<StoryReviewTabComponent>;
  let reviewService: jasmine.SpyObj<ReviewService>;
  let operationState: ReturnType<typeof signal<ReviewOperationState>>;
  let response$: Subject<TestCaseResponse>;

  beforeEach(async () => {
    response$ = new Subject<TestCaseResponse>();
    operationState = signal({ phase: 'idle', testCaseId: null, verdict: null, sequence: 0 });
    reviewService = jasmine.createSpyObj<ReviewService>('ReviewService', ['updateReviewStatus']);
    Object.defineProperty(reviewService, 'operationState', { value: operationState.asReadonly() });
    reviewService.updateReviewStatus.and.callFake((testCaseId, request) => defer(() => {
      operationState.set({ phase: 'running', testCaseId, verdict: request.status, sequence: 1 });
      return response$;
    }));

    await TestBed.configureTestingModule({
      imports: [StoryReviewTabComponent],
      providers: [
        { provide: ReviewService, useValue: reviewService },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['show']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StoryReviewTabComponent);
    fixture.componentRef.setInput('testSuites', [suiteFixture()]);
    fixture.detectChanges();
  });

  it('optimistically emits approval and exposes the decisive approval state', () => {
    const optimistic = jasmine.createSpy('optimistic');
    const completed = jasmine.createSpy('completed');
    fixture.componentInstance.verdictOptimistic.subscribe(optimistic);
    fixture.componentInstance.testCaseUpdated.subscribe(completed);

    click('Approve');

    expect(reviewService.updateReviewStatus).toHaveBeenCalledWith('tc-1', { status: 'APPROVED', comment: null });
    expect(optimistic).toHaveBeenCalledWith(jasmine.objectContaining({ status: 'APPROVED' }));
    expect(fixture.nativeElement.querySelector('.review-detail-panel').classList).toContain('is-verdict-approve');
    expect(fixture.nativeElement.querySelector('.review-verdict-pill').textContent).toContain('Approving');

    operationState.set({ phase: 'success', testCaseId: 'tc-1', verdict: 'APPROVED', sequence: 1 });
    response$.next(responseFixture('APPROVED'));
    fixture.detectChanges();
    expect(completed).toHaveBeenCalled();
  });

  it('optimistically emits rejection and exposes the rejection exit state', () => {
    const optimistic = jasmine.createSpy('optimistic');
    fixture.componentInstance.verdictOptimistic.subscribe(optimistic);

    click('Reject');

    expect(optimistic).toHaveBeenCalledWith(jasmine.objectContaining({ status: 'REJECTED' }));
    expect(fixture.nativeElement.querySelector('.review-detail-panel').classList).toContain('is-verdict-reject');
    expect(fixture.nativeElement.querySelector('.review-verdict-pill').textContent).toContain('Rejecting');
  });

  function click(label: string): void {
    const button = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((candidate) => (candidate as HTMLButtonElement).textContent?.trim() === label) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
  }

  function suiteFixture(): GeneratedTestSuiteResult {
    return {
      id: 'suite-1', storyId: 'story-1', suiteName: 'Checkout', testCases: [testCaseFixture()],
      qaValidation: { requirementQualityScore: 90, testabilityScore: 90, warnings: [] },
      provider: 'mock', generatedAt: '2026-07-21T00:00:00Z', explainabilitySummary: null
    };
  }

  function testCaseFixture(): GeneratedTestCase {
    return {
      id: 'tc-1', title: 'Checkout succeeds', description: null, objective: 'Verify checkout.',
      type: 'FUNCTIONAL', testLayer: 'UI', priority: 'HIGH', riskLevel: 'HIGH', automationCandidate: true,
      confidenceScore: 0.9, reviewStatus: 'NEEDS_REVIEW', linkedRequirementReferences: [], sourceEvidence: null,
      preconditions: null, bddScenario: null, steps: [], testData: [], qualityScore: 90, confidenceLevel: 'HIGH',
      generationRationale: null, linkedAcceptanceCriteriaText: null
    };
  }

  function responseFixture(status: ReviewStatus): TestCaseResponse {
    return {
      id: 'tc-1', testSuiteId: 'suite-1', title: 'Checkout succeeds', objective: 'Verify checkout.',
      type: 'FUNCTIONAL', testLayer: 'UI', priority: 'HIGH', riskLevel: 'HIGH', reviewStatus: status,
      automationCandidate: true, preconditions: null, bddScenario: null, linkedRequirementReferences: [], steps: [],
      createdAt: '2026-07-21T00:00:00Z', updatedAt: '2026-07-21T00:00:00Z'
    };
  }
});
