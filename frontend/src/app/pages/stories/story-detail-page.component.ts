import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideCheck, LucideDynamicIcon } from '@lucide/angular';
import { gsap } from 'gsap';
import {
  AmbiguitySeverity,
  CoverageCategory,
  ExtractedRequirement,
  RequirementType,
  StoryAnalysisResult
} from '../../core/models/analysis.model';
import { GeneratedTestCase, GeneratedTestSuiteResult } from '../../core/models/generated-test.model';
import { TestCaseResponse } from '../../core/models/review.model';
import { STORY_TYPES, Story, StoryStatus, StoryType } from '../../core/models/story.model';
import { AnalysisService } from '../../core/services/analysis.service';
import { AuthService } from '../../core/services/auth.service';
import { OnboardingProgressService } from '../../core/services/onboarding-progress.service';
import { StoryService } from '../../core/services/story.service';
import { TestGenerationService } from '../../core/services/test-generation.service';
import { ToastService } from '../../core/services/toast.service';
import { StoryStatusPillComponent } from '../../components/story-status-pill/story-status-pill.component';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { VtNameDirective } from '../../shared/directives/vt-name.directive';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { StoryReviewTabComponent } from './story-review-tab.component';
import { StoryTestCasesTabComponent } from './story-test-cases-tab.component';

type StoryDetailTab = 'story' | 'test-cases' | 'review';
type StoryDisplayStatus = 'DRAFT' | 'ANALYZED' | 'TESTS_GENERATED' | 'NEEDS_REVIEW' | 'ALL_REVIEWED';

@Component({
  selector: 'app-story-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    LucideDynamicIcon,
    StoryStatusPillComponent,
    StateMessageComponent,
    SkeletonComponent,
    VtNameDirective,
    RevealDirective,
    StoryTestCasesTabComponent,
    StoryReviewTabComponent
  ],
  templateUrl: './story-detail-page.component.html',
  styleUrl: './story-detail-page.component.css'
})
export class StoryDetailPageComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly storyService = inject(StoryService);
  private readonly analysisService = inject(AnalysisService);
  private readonly testGenerationService = inject(TestGenerationService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  readonly onboardingProgress = inject(OnboardingProgressService);
  private readonly projectContext = (this.router.getCurrentNavigation()?.extras.state?.['projectContext'] ?? window.history.state?.projectContext) as { name?: string } | null;
  private storyId = '';
  private stickyObserver?: IntersectionObserver;
  private analyzeTimer: ReturnType<typeof setInterval> | null = null;
  private generateTimer: ReturnType<typeof setInterval> | null = null;

  readonly LucideCheck = LucideCheck;
  readonly storyTypes = STORY_TYPES;
  readonly storyStatuses: StoryDisplayStatus[] = ['DRAFT', 'ANALYZED', 'TESTS_GENERATED', 'NEEDS_REVIEW', 'ALL_REVIEWED'];
  readonly requirementTypes: RequirementType[] = ['FUNCTIONAL', 'ACCEPTANCE_CRITERION', 'BUSINESS_RULE', 'DATA_RULE', 'SECURITY', 'ROLE_PERMISSION', 'NON_FUNCTIONAL', 'INTEGRATION'];
  readonly ambiguitySeverities: AmbiguitySeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  readonly coverageCategories: CoverageCategory[] = ['HAPPY_PATH', 'NEGATIVE_PATH', 'BOUNDARY', 'ROLE_BASED', 'API', 'E2E', 'SECURITY', 'PERFORMANCE', 'ACCESSIBILITY', 'REGRESSION'];
  readonly workflowSteps = [
    { key: 'analyze', index: 1, label: 'Analyze', color: 'var(--color-purple)' },
    { key: 'generate', index: 2, label: 'Generate', color: 'var(--color-cyan)' },
    { key: 'review', index: 3, label: 'Review', color: 'var(--color-green)' },
    { key: 'export', index: 4, label: 'Export', color: 'var(--color-accent)' }
  ];

  readonly story = signal<Story | null>(null);
  readonly pageTitle = computed(() => this.story()?.title ?? 'Story');
  readonly analysis = signal<StoryAnalysisResult | null>(null);
  readonly testSuites = signal<GeneratedTestSuiteResult[]>([]);
  readonly activeTab = signal<StoryDetailTab>('story');
  readonly loading = signal(true);
  readonly analysisLoading = signal(false);
  readonly testSuitesLoading = signal(false);
  readonly analysisOperationState = this.analysisService.operationState;
  readonly generationOperationState = this.testGenerationService.operationState;
  readonly analyzing = computed(() => this.analysisOperationState().phase === 'running');
  readonly generatingTests = computed(() => this.generationOperationState().phase === 'running');
  readonly analyzeElapsed = signal(0);
  readonly generateElapsed = signal(0);
  readonly saving = signal(false);
  readonly statusSaving = signal(false);
  readonly statusMenuOpen = signal(false);
  readonly error = signal('');
  readonly analysisError = signal('');
  readonly testGenerationError = signal('');
  readonly saveError = signal('');
  readonly saveMessage = signal('');
  readonly analysisExpanded = signal(false);
  readonly storySummaryExpanded = signal(true);
  readonly editFormExpanded = signal(false);

  readonly canEdit = computed(() => {
    if (!this.authService.isAuthenticated()) return true;
    const role = this.authService.currentRole();
    return role === 'ADMIN' || role === 'QA_ENGINEER';
  });
  readonly totalTestCases = computed(() => this.testSuites().reduce((total, suite) => total + suite.testCases.length, 0));
  readonly pendingReviewCount = computed(() => this.allTestCases().filter((testCase) => testCase.reviewStatus === 'NEEDS_REVIEW').length);
  readonly allTestCases = computed(() => this.testSuites().flatMap((suite) => suite.testCases));
  readonly displayStatus = computed<StoryDisplayStatus>(() => this.story() ? this.displayStoryStatus(this.story()!) : 'DRAFT');
  readonly projectName = computed(() => this.projectContext?.name || 'Project');
  readonly showAnalyzeNudge = computed(() => this.onboardingProgress.shouldShowNudge(
    'analyze-story',
    this.onboardingProgress.isComplete('story-created') && !this.hasAnalysis() && this.canEdit() && !this.analysisLoading()
  ));
  readonly showReviewBoardNudge = computed(() => this.onboardingProgress.shouldShowNudge(
    'review-board',
    this.onboardingProgress.isComplete('generation-completed') && this.pendingReviewCount() > 0
  ));

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    rawText: ['', Validators.required],
    type: ['USER_STORY' as StoryType, Validators.required],
    status: ['DRAFT' as StoryStatus, Validators.required]
  });

  constructor() {
    this.storyId = this.route.snapshot.paramMap.get('storyId') ?? '';
    this.loadStory();
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      this.initStickyHeaderObserver();
      this.animateWorkflowStep();
    });
  }

  ngOnDestroy(): void {
    this.analyzeTimer = this.stopTimer(this.analyzeTimer);
    this.generateTimer = this.stopTimer(this.generateTimer);
    this.stickyObserver?.disconnect();
  }

  setTab(tab: StoryDetailTab): void {
    this.activeTab.set(tab);
  }

  toggleAnalysis(): void {
    this.analysisExpanded.update((value) => !value);
  }
  toggleStorySummary(): void { this.storySummaryExpanded.update((value) => !value); }
  toggleEditForm(): void { this.editFormExpanded.update((value) => !value); }

  saveStory(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saveError.set('');
    this.saveMessage.set('');
    this.storyService.update(this.storyId, this.form.getRawValue()).subscribe({
      next: (story) => {
        this.story.set(story);
        this.form.markAsPristine();
        this.saveMessage.set('The story details were updated.');
        this.toastService.show('The story details were updated.', 'success');
        this.saving.set(false);
      },
      error: () => {
        this.saveError.set('The story could not be saved.');
        this.toastService.show('The story could not be saved.', 'error');
        this.saving.set(false);
      }
    });
  }

  setStoryStatus(status: StoryDisplayStatus): void {
    if (!this.storyId || this.statusSaving()) return;
    const persistedStatus = this.persistedStoryStatus(status);
    this.statusSaving.set(true);
    this.statusMenuOpen.set(false);
    this.storyService.update(this.storyId, { status: persistedStatus }).subscribe({
      next: (story) => {
        this.story.set(story);
        this.form.patchValue({ status: story.status });
        this.toastService.show('Story status was updated.', 'success');
        this.statusSaving.set(false);
      },
      error: () => {
        this.toastService.show('The story status could not be updated.', 'error');
        this.statusSaving.set(false);
      }
    });
  }

  analyzeStory(): void {
    if (!this.storyId || this.analyzing()) return;
    this.analyzeTimer = this.startTimer(this.analyzeElapsed);
    this.analysisError.set('');
    this.analysisService.analyzeStory(this.storyId).subscribe({
      next: (analysis) => {
        this.analyzeTimer = this.stopTimer(this.analyzeTimer);
        this.analysis.set(analysis);
        this.analysisExpanded.set(true);
        this.onboardingProgress.complete('analysis-completed');
        this.updateStoryStatus('ANALYZED');
        this.animateWorkflowStep();
      },
      error: () => {
        this.analyzeTimer = this.stopTimer(this.analyzeTimer);
        this.analysisError.set('The story could not be analyzed. Confirm the backend is running and try again.');
      }
    });
  }

  generateTestCases(): void {
    if (!this.storyId || this.generatingTests()) return;
    this.generateTimer = this.startTimer(this.generateElapsed);
    this.testGenerationError.set('');
    this.testGenerationService.generateTestCases(this.storyId).subscribe({
      next: (suite) => {
        this.generateTimer = this.stopTimer(this.generateTimer);
        this.testSuites.set([suite, ...this.testSuites()]);
        this.onboardingProgress.complete('generation-completed');
        this.updateStoryStatus('TESTS_GENERATED');
        this.activeTab.set('test-cases');
        this.animateWorkflowStep();
      },
      error: () => {
        this.generateTimer = this.stopTimer(this.generateTimer);
        this.testGenerationError.set('The test cases could not be generated. Confirm the backend is running and try again.');
      }
    });
  }

  hasAnalysis(): boolean {
    const analysis = this.analysis();
    return !!analysis && (!!analysis.actor || !!analysis.goal || (analysis.requirements?.requirements?.length ?? 0) > 0 || (analysis.ambiguities?.ambiguities?.length ?? 0) > 0 || (analysis.coveragePlan?.coverageItems?.length ?? 0) > 0);
  }

  hasTestSuites(): boolean {
    return this.totalTestCases() > 0;
  }

  currentWorkflowStep(): number {
    if (!this.hasAnalysis()) return 1;
    if (!this.hasTestSuites()) return 2;
    if (this.pendingReviewCount() > 0) return 3;
    return 4;
  }

  requirementCount(): number { return this.analysis()?.requirements?.requirements?.length ?? 0; }
  qaWarnings(): string[] { return this.analysis()?.qaValidation?.warnings ?? []; }
  acceptanceCriteria(): string[] { return this.analysis()?.requirements?.acceptanceCriteria ?? []; }
  requirementsByType(type: RequirementType): ExtractedRequirement[] { return this.analysis()?.requirements?.requirements?.filter((requirement) => requirement.type === type) ?? []; }
  ambiguitiesBySeverity(severity: AmbiguitySeverity) { return this.analysis()?.ambiguities?.ambiguities?.filter((ambiguity) => ambiguity.severity === severity) ?? []; }
  coverageByCategory(category: CoverageCategory) { return this.analysis()?.coveragePlan?.coverageItems?.filter((coverage) => coverage.category === category) ?? []; }
  severityClass(severity: AmbiguitySeverity): string { return `severity-${severity.toLowerCase()}`; }
  formatScore(score: number | null | undefined): string { return score === null || score === undefined || score <= 0 ? 'N/A' : `${Math.round(score * 100)}%`; }
  formatLabel(value: string): string { return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }

  onTestCaseUpdated(event: { original: GeneratedTestCase; updated: TestCaseResponse }): void {
    this.replaceGeneratedTestCase(event.updated, event.original);
    this.animateWorkflowStep();
  }

  loadStory(): void {
    this.loading.set(true);
    this.error.set('');
    this.storyService.get(this.storyId).subscribe({
      next: (story) => {
        this.story.set(story);
        this.form.patchValue({ title: story.title, rawText: story.rawText, type: story.type, status: story.status });
        this.loading.set(false);
        this.loadAnalysis();
        this.loadTestSuites();
      },
      error: () => {
        this.error.set('Story not found or backend unavailable.');
        this.loading.set(false);
      }
    });
  }

  private loadAnalysis(): void {
    if (!this.storyId) return;
    this.analysisLoading.set(true);
    this.analysisError.set('');
    this.analysisService.getAnalysis(this.storyId).subscribe({
      next: (analysis) => {
        this.analysis.set(analysis);
        this.analysisLoading.set(false);
        this.animateWorkflowStep();
      },
      error: () => {
        this.analysis.set(null);
        this.analysisLoading.set(false);
        this.animateWorkflowStep();
      }
    });
  }

  private loadTestSuites(): void {
    if (!this.storyId) return;
    this.testSuitesLoading.set(true);
    this.testGenerationError.set('');
    this.testGenerationService.getTestSuites(this.storyId).subscribe({
      next: (testSuites) => {
        this.testSuites.set(testSuites);
        this.testSuitesLoading.set(false);
        if (!testSuites.some((suite) => suite.testCases.length > 0)) this.analysisExpanded.set(true);
        this.animateWorkflowStep();
      },
      error: () => {
        this.testSuites.set([]);
        this.testSuitesLoading.set(false);
        this.animateWorkflowStep();
      }
    });
  }

  private updateStoryStatus(status: StoryStatus): void {
    const currentStory = this.story();
    if (!currentStory) return;
    this.story.set({ ...currentStory, status });
    this.form.patchValue({ status });
  }

  private startTimer(elapsed: WritableSignal<number>): ReturnType<typeof setInterval> {
    elapsed.set(0);
    return setInterval(() => elapsed.update((value) => value + 1), 1000);
  }

  private stopTimer(timer: ReturnType<typeof setInterval> | null): null {
    if (timer) {
      clearInterval(timer);
    }
    return null;
  }

  private displayStoryStatus(story: Story): StoryDisplayStatus {
    if (story.status === 'REVIEWED' || story.status === 'EXPORTED') return 'ALL_REVIEWED';
    if (story.status === 'TESTS_GENERATED' && this.pendingReviewCount() > 0) return 'NEEDS_REVIEW';
    return story.status;
  }

  private persistedStoryStatus(status: StoryDisplayStatus): StoryStatus {
    if (status === 'ALL_REVIEWED') return 'REVIEWED';
    if (status === 'NEEDS_REVIEW') return 'TESTS_GENERATED';
    return status;
  }

  private replaceGeneratedTestCase(updatedTestCase: TestCaseResponse, originalTestCase: GeneratedTestCase): void {
    this.testSuites.update((suites) => suites.map((suite) => ({
      ...suite,
      testCases: suite.testCases.map((testCase) => testCase.id === updatedTestCase.id ? this.mergeUpdatedTestCase(testCase, updatedTestCase) : testCase)
    })));
    if (!this.testSuites().some((suite) => suite.testCases.some((testCase) => testCase.id === updatedTestCase.id))) {
      this.testSuites.update((suites) => suites.map((suite) => ({
        ...suite,
        testCases: suite.testCases.map((testCase) => testCase === originalTestCase ? this.mergeUpdatedTestCase(testCase, updatedTestCase) : testCase)
      })));
    }
  }

  private mergeUpdatedTestCase(currentTestCase: GeneratedTestCase, updatedTestCase: TestCaseResponse): GeneratedTestCase {
    return {
      ...currentTestCase,
      id: updatedTestCase.id,
      title: updatedTestCase.title,
      description: updatedTestCase.objective,
      objective: updatedTestCase.objective,
      type: updatedTestCase.type,
      testLayer: updatedTestCase.testLayer,
      priority: updatedTestCase.priority,
      riskLevel: updatedTestCase.riskLevel,
      reviewStatus: updatedTestCase.reviewStatus,
      automationCandidate: updatedTestCase.automationCandidate,
      preconditions: updatedTestCase.preconditions,
      bddScenario: updatedTestCase.bddScenario,
      linkedRequirementReferences: updatedTestCase.linkedRequirementReferences,
      steps: updatedTestCase.steps.map((step) => ({ id: step.id, order: step.order, action: step.action, expectedResult: step.expectedResult }))
    };
  }

  private animateWorkflowStep(): void {
    if (this.prefersReducedMotion()) return;
    queueMicrotask(() => {
      const circle = this.host.nativeElement.querySelector('.workflow-step.is-current .workflow-circle') as HTMLElement | null;
      const step = this.workflowSteps.find((item) => item.index === this.currentWorkflowStep());
      if (!circle || !step) return;
      gsap.to(circle, { backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim(), duration: 0.2, ease: 'power2.out' });
    });
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  private initStickyHeaderObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.stickyObserver?.disconnect();
    const tabContent = this.host.nativeElement.querySelector('.story-tab-content');
    const sentinel = this.host.nativeElement.querySelector('.scroll-sentinel');
    const header = this.host.nativeElement.querySelector('.story-sticky-header');
    if (!tabContent || !sentinel || !header) return;
    this.stickyObserver = new IntersectionObserver(([entry]) => {
      header.classList.toggle('sticky-scrolled', !entry.isIntersecting);
    }, { root: tabContent, threshold: 0 });
    this.stickyObserver.observe(sentinel);
  }

}
