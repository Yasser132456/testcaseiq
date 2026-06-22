import { DatePipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { Priority, RiskLevel } from '../../core/models/analysis.model';
import {
  GeneratedTestCase,
  GeneratedTestData,
  GeneratedTestStep,
  GeneratedTestSuiteResult,
  ReviewStatus
} from '../../core/models/generated-test.model';
import { ReviewEvent, TestCaseResponse } from '../../core/models/review.model';
import { ReviewService } from '../../core/services/review.service';
import { ToastService } from '../../core/services/toast.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

interface ReviewDraft {
  title?: string;
  objective?: string;
  comment?: string;
  steps?: Record<number, Partial<GeneratedTestStep>>;
}

@Component({
  selector: 'app-story-test-cases-tab',
  standalone: true,
  imports: [DatePipe, StateMessageComponent, SkeletonComponent],
  templateUrl: './story-test-cases-tab.component.html'
})
export class StoryTestCasesTabComponent {
  private readonly reviewService = inject(ReviewService);
  private readonly toastService = inject(ToastService);

  readonly storyTitle = input('');
  readonly testSuites = input.required<GeneratedTestSuiteResult[]>();
  readonly loading = input(false);
  readonly error = input('');
  readonly canEdit = input(false);
  readonly generatingTests = input(false);
  readonly generateRequested = output<void>();
  readonly testCaseUpdated = output<{ original: GeneratedTestCase; updated: TestCaseResponse }>();

  readonly priorityOptions: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  readonly riskOptions: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  readonly reviewMessage = signal('');
  readonly reviewError = signal('');
  readonly reviewBusyByTestCaseId = signal<Record<string, string>>({});
  readonly reviewDrafts = signal<Record<string, ReviewDraft>>({});
  readonly selectedHistoryTestCaseId = signal<string | null>(null);
  readonly reviewEvents = signal<ReviewEvent[]>([]);
  readonly reviewHistoryLoading = signal(false);
  readonly reviewHistoryError = signal('');

  hasTestSuites(): boolean {
    return this.testSuites().some((suite) => suite.testCases.length > 0);
  }

  totalTestCases(): number {
    return this.testSuites().reduce((total, suite) => total + suite.testCases.length, 0);
  }

  suiteWarnings(suite: GeneratedTestSuiteResult): string[] {
    return suite.qaValidation?.warnings ?? [];
  }

  testObjective(testCase: GeneratedTestCase): string {
    return testCase.objective || testCase.description || 'Objective not provided.';
  }

  testDataValue(data: GeneratedTestData): string {
    if (!data.valueJson) return 'No value provided';
    try {
      return JSON.stringify(JSON.parse(data.valueJson), null, 2);
    } catch {
      return data.valueJson;
    }
  }

  reviewDraft(testCase: GeneratedTestCase): ReviewDraft | null {
    const testCaseId = testCase.id;
    return testCaseId ? this.reviewDrafts()[testCaseId] ?? null : null;
  }

  stepDraft(testCase: GeneratedTestCase, step: GeneratedTestStep): Partial<GeneratedTestStep> | null {
    return this.reviewDraft(testCase)?.steps?.[step.order] ?? null;
  }

  updateReviewDraft(testCase: GeneratedTestCase, field: 'title' | 'objective' | 'comment', value: string): void {
    const testCaseId = testCase.id;
    if (!testCaseId) return;
    this.reviewDrafts.update((drafts) => ({ ...drafts, [testCaseId]: { ...drafts[testCaseId], [field]: value } }));
  }

  updateReviewStepDraft(testCase: GeneratedTestCase, step: GeneratedTestStep, field: 'action' | 'expectedResult', value: string): void {
    const testCaseId = testCase.id;
    if (!testCaseId) return;
    const currentDraft = this.reviewDrafts()[testCaseId] ?? {};
    const currentSteps = currentDraft.steps ?? {};
    this.reviewDrafts.update((drafts) => ({
      ...drafts,
      [testCaseId]: { ...currentDraft, steps: { ...currentSteps, [step.order]: { ...currentSteps[step.order], [field]: value } } }
    }));
  }

  updateReviewStatus(testCase: GeneratedTestCase, status: ReviewStatus): void {
    const testCaseId = this.persistedTestCaseId(testCase);
    if (!testCaseId || this.isReviewBusy(testCase)) return;
    this.beginReviewUpdate(testCaseId, 'review-status');
    this.reviewService.updateReviewStatus(testCaseId, { status, comment: this.reviewDraft(testCase)?.comment || null }).subscribe({
      next: (updatedTestCase) => this.completeReviewUpdate(testCase, updatedTestCase, 'Review status was updated.'),
      error: () => this.failReviewUpdate(testCaseId, 'The review status could not be updated.')
    });
  }

  updatePriority(testCase: GeneratedTestCase, priority: Priority | ''): void {
    const testCaseId = this.persistedTestCaseId(testCase);
    if (!testCaseId || !priority || this.isReviewBusy(testCase)) return;
    this.beginReviewUpdate(testCaseId, 'priority');
    this.reviewService.updatePriority(testCaseId, { priority, comment: this.reviewDraft(testCase)?.comment || null }).subscribe({
      next: (updatedTestCase) => this.completeReviewUpdate(testCase, updatedTestCase, 'Priority was updated.'),
      error: () => this.failReviewUpdate(testCaseId, 'The priority could not be updated.')
    });
  }

  updateRisk(testCase: GeneratedTestCase, riskLevel: RiskLevel | ''): void {
    const testCaseId = this.persistedTestCaseId(testCase);
    if (!testCaseId || !riskLevel || this.isReviewBusy(testCase)) return;
    this.beginReviewUpdate(testCaseId, 'risk');
    this.reviewService.updateRisk(testCaseId, { riskLevel, comment: this.reviewDraft(testCase)?.comment || null }).subscribe({
      next: (updatedTestCase) => this.completeReviewUpdate(testCase, updatedTestCase, 'Risk was updated.'),
      error: () => this.failReviewUpdate(testCaseId, 'The risk could not be updated.')
    });
  }

  updateAutomationCandidate(testCase: GeneratedTestCase, automationCandidate: boolean): void {
    const testCaseId = this.persistedTestCaseId(testCase);
    if (!testCaseId || this.isReviewBusy(testCase)) return;
    this.beginReviewUpdate(testCaseId, 'automation');
    this.reviewService.updateAutomationCandidate(testCaseId, { automationCandidate, comment: this.reviewDraft(testCase)?.comment || null }).subscribe({
      next: (updatedTestCase) => this.completeReviewUpdate(testCase, updatedTestCase, 'Automation candidate flag was updated.'),
      error: () => this.failReviewUpdate(testCaseId, 'The automation candidate flag could not be updated.')
    });
  }

  saveTestCaseEdits(testCase: GeneratedTestCase): void {
    const testCaseId = this.persistedTestCaseId(testCase);
    if (!testCaseId || this.isReviewBusy(testCase)) return;
    const draft = this.reviewDraft(testCase);
    const title = (draft?.title ?? testCase.title).trim();
    if (!title) {
      this.reviewError.set('Test case title is required.');
      this.toastService.show('Test case title is required.', 'error');
      return;
    }
    this.beginReviewUpdate(testCaseId, 'content');
    this.reviewService.updateTestCase(testCaseId, {
      title,
      objective: draft?.objective ?? this.testObjective(testCase),
      steps: testCase.steps.map((step) => ({
        order: step.order,
        action: (draft?.steps?.[step.order]?.action ?? step.action).trim(),
        expectedResult: draft?.steps?.[step.order]?.expectedResult ?? step.expectedResult
      })),
      comment: draft?.comment || null
    }).subscribe({
      next: (updatedTestCase) => this.completeReviewUpdate(testCase, updatedTestCase, 'Test case edits were saved.'),
      error: () => this.failReviewUpdate(testCaseId, 'The test case edits could not be saved.')
    });
  }

  toggleReviewHistory(testCase: GeneratedTestCase): void {
    const testCaseId = this.persistedTestCaseId(testCase);
    if (!testCaseId) return;
    if (this.selectedHistoryTestCaseId() === testCaseId) {
      this.selectedHistoryTestCaseId.set(null);
      this.reviewEvents.set([]);
      this.reviewHistoryError.set('');
      return;
    }
    this.selectedHistoryTestCaseId.set(testCaseId);
    this.loadReviewHistory(testCaseId);
  }

  isReviewBusy(testCase: GeneratedTestCase): boolean {
    const testCaseId = testCase.id;
    return !!testCaseId && !!this.reviewBusyByTestCaseId()[testCaseId];
  }

  displayReviewStatus(testCase: GeneratedTestCase): ReviewStatus {
    return testCase.reviewStatus ?? 'DRAFT';
  }

  qualityColor(testCase: GeneratedTestCase): string {
    if (testCase.confidenceLevel === 'HIGH') return 'var(--color-green)';
    if (testCase.confidenceLevel === 'MEDIUM') return 'var(--color-amber)';
    return 'var(--color-red)';
  }

  formatScore(score: number | null | undefined): string {
    return score === null || score === undefined || score <= 0 ? 'N/A' : `${Math.round(score * 100)}%`;
  }

  formatLabel(value: string): string {
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private persistedTestCaseId(testCase: GeneratedTestCase): string | null {
    if (!testCase.id) {
      this.reviewError.set('This generated test case does not have a persisted backend ID yet.');
      this.toastService.show('This generated test case does not have a persisted backend ID yet.', 'warning');
      return null;
    }
    return testCase.id;
  }

  private beginReviewUpdate(testCaseId: string, action: string): void {
    this.reviewMessage.set('');
    this.reviewError.set('');
    this.reviewBusyByTestCaseId.update((busy) => ({ ...busy, [testCaseId]: action }));
  }

  private completeReviewUpdate(originalTestCase: GeneratedTestCase, updatedTestCase: TestCaseResponse, message: string): void {
    this.testCaseUpdated.emit({ original: originalTestCase, updated: updatedTestCase });
    this.reviewMessage.set(message);
    this.toastService.show(message, 'success');
    this.reviewBusyByTestCaseId.update((busy) => {
      const nextBusy = { ...busy };
      delete nextBusy[updatedTestCase.id];
      return nextBusy;
    });
    this.reviewDrafts.update((drafts) => ({
      ...drafts,
      [updatedTestCase.id]: { ...drafts[updatedTestCase.id], title: updatedTestCase.title, objective: updatedTestCase.objective ?? '', steps: {}, comment: '' }
    }));
    if (this.selectedHistoryTestCaseId() === updatedTestCase.id) this.loadReviewHistory(updatedTestCase.id);
  }

  private failReviewUpdate(testCaseId: string, message: string): void {
    this.reviewError.set(message);
    this.toastService.show(message, 'error');
    this.reviewBusyByTestCaseId.update((busy) => {
      const nextBusy = { ...busy };
      delete nextBusy[testCaseId];
      return nextBusy;
    });
  }

  private loadReviewHistory(testCaseId: string): void {
    this.reviewHistoryLoading.set(true);
    this.reviewHistoryError.set('');
    this.reviewEvents.set([]);
    this.reviewService.getReviewEvents(testCaseId).subscribe({
      next: (events) => {
        if (this.selectedHistoryTestCaseId() === testCaseId) this.reviewEvents.set(events);
        this.reviewHistoryLoading.set(false);
      },
      error: () => {
        this.reviewHistoryError.set('Review history could not be loaded.');
        this.reviewHistoryLoading.set(false);
      }
    });
  }
}
