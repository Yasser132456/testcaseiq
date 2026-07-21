import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnalysisService } from '../../core/services/analysis.service';
import { GeneratedTestCase, GeneratedTestSuiteResult, ReviewStatus } from '../../core/models/generated-test.model';
import { TestCaseResponse } from '../../core/models/review.model';
import { Story, StoryStatus } from '../../core/models/story.model';
import { ReviewService } from '../../core/services/review.service';
import { StoryService } from '../../core/services/story.service';
import { TestGenerationService } from '../../core/services/test-generation.service';
import { StoryAiOperationState } from '../../core/motion/async-operation-state';
import { BackgroundSceneService } from '../../shared/background/background-scene.service';
import { StoryDetailPageComponent } from './story-detail-page.component';

describe('StoryDetailPageComponent tabs and review workflow', () => {
  let fixture: ComponentFixture<StoryDetailPageComponent>;
  let storyService: jasmine.SpyObj<StoryService>;
  let reviewService: jasmine.SpyObj<ReviewService>;
  let analysisService: jasmine.SpyObj<AnalysisService>;
  let testGenerationService: jasmine.SpyObj<TestGenerationService>;
  let analysisState: ReturnType<typeof signal<StoryAiOperationState>>;
  let generationState: ReturnType<typeof signal<StoryAiOperationState>>;
  let backgroundScene: jasmine.SpyObj<BackgroundSceneService>;

  beforeEach(async () => {
    window.history.replaceState({ projectContext: { projectId: 'project-1', name: 'Commerce' } }, '', '/stories/story-1');
    storyService = jasmine.createSpyObj<StoryService>('StoryService', ['get', 'update', 'delete']);
    reviewService = jasmine.createSpyObj<ReviewService>('ReviewService', [
      'updateReviewStatus',
      'updatePriority',
      'updateRisk',
      'updateAutomationCandidate',
      'updateTestCase',
      'getReviewEvents'
    ]);
    storyService.get.and.returnValue(of(storyFixture('TESTS_GENERATED')));
    storyService.update.and.callFake((_id, request) => of(storyFixture(request.status ?? 'TESTS_GENERATED')));
    reviewService.updateReviewStatus.and.returnValue(of(updatedTestCase('APPROVED')));
    reviewService.getReviewEvents.and.returnValue(of([]));
    analysisState = signal({ phase: 'idle', storyId: null, sequence: 0 });
    generationState = signal({ phase: 'idle', storyId: null, sequence: 0 });
    analysisService = jasmine.createSpyObj<AnalysisService>('AnalysisService', ['getAnalysis', 'analyzeStory']);
    testGenerationService = jasmine.createSpyObj<TestGenerationService>('TestGenerationService', ['getTestSuites', 'generateTestCases']);
    analysisService.getAnalysis.and.returnValue(throwError(() => new Error('No analysis yet.')));
    testGenerationService.getTestSuites.and.returnValue(of([suiteFixture()]));
    Object.defineProperty(analysisService, 'operationState', { value: analysisState.asReadonly() });
    Object.defineProperty(testGenerationService, 'operationState', { value: generationState.asReadonly() });
    backgroundScene = jasmine.createSpyObj<BackgroundSceneService>('BackgroundSceneService', ['setOperationAccent']);

    await TestBed.configureTestingModule({
      imports: [StoryDetailPageComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'story-1' } } } },
        { provide: StoryService, useValue: storyService },
        { provide: AnalysisService, useValue: analysisService },
        { provide: TestGenerationService, useValue: testGenerationService },
        { provide: ReviewService, useValue: reviewService },
        { provide: BackgroundSceneService, useValue: backgroundScene }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StoryDetailPageComponent);
    fixture.detectChanges();
  });

  it('renders the sticky story header with project breadcrumb, status menu, workflow, and counted tabs', () => {
    const header = fixture.nativeElement.querySelector('.story-sticky-header') as HTMLElement;
    const tabs = tabButtons();

    expect(header).not.toBeNull();
    expect(header.textContent).toContain('Commerce');
    expect(header.textContent).toContain('Checkout story');
    expect(header.querySelector('.workflow-progress')).not.toBeNull();
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([
      'Story',
      'Test Cases (2)',
      'History (1 pending)'
    ]);
  });

  it('shows a Review Board banner on the test cases tab when one test case needs review', () => {
    clickTab('Test Cases');

    const banner = reviewBoardBanner();
    const link = banner?.querySelector('a') as HTMLAnchorElement | null;

    expect(banner?.textContent).toContain('1 test case needs review');
    expect(link?.textContent?.trim()).toBe('Review Board');
    expect(link?.getAttribute('href')).toBe('/review-board');
  });

  it('pluralizes the Review Board banner count and hides it when no test cases need review', () => {
    fixture.componentInstance.testSuites.set([
      {
        ...suiteFixture(),
        testCases: [
          testCaseFixture('test-case-1', 'Checkout happy path', 'NEEDS_REVIEW'),
          testCaseFixture('test-case-2', 'Card declined', 'NEEDS_REVIEW')
        ]
      }
    ]);
    clickTab('Test Cases');

    expect(reviewBoardBanner()?.textContent).toContain('2 test cases need review');

    fixture.componentInstance.testSuites.set([
      {
        ...suiteFixture(),
        testCases: [
          testCaseFixture('test-case-1', 'Checkout happy path', 'APPROVED'),
          testCaseFixture('test-case-2', 'Card declined', 'APPROVED')
        ]
      }
    ]);
    fixture.detectChanges();

    expect(reviewBoardBanner()).toBeNull();
  });

  it('persists manual display status changes through the existing story update service', () => {
    const statusButton = fixture.nativeElement.querySelector('.status-menu-button') as HTMLButtonElement;
    statusButton.click();
    fixture.detectChanges();

    const allReviewedOption = Array.from(fixture.nativeElement.querySelectorAll('.status-menu-item'))
      .find((button) => (button as HTMLButtonElement).textContent?.includes('All Reviewed')) as HTMLButtonElement;
    allReviewedOption.click();
    fixture.detectChanges();

    expect(storyService.update).toHaveBeenCalledWith('story-1', jasmine.objectContaining({ status: 'REVIEWED' }));
    expect(statusButton.textContent).toContain('Approved');
  });

  it('shows unsaved edit state only while expanded dirty edits are pending', () => {
    fixture.componentInstance.editFormExpanded.set(true);
    fixture.componentInstance.form.controls.title.setValue('Checkout story revised');
    fixture.componentInstance.form.markAsDirty();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.unsaved-badge')?.textContent).toContain('Unsaved');

    fixture.componentInstance.saveStory();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.dirty).toBeFalse();
    expect(fixture.nativeElement.querySelector('.unsaved-badge')).toBeNull();
  });

  it('approves the selected pending review case only when the review panel receives the shortcut', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    fixture.detectChanges();
    expect(reviewService.updateReviewStatus).not.toHaveBeenCalled();

    clickTab('History');
    const reviewPanel = fixture.nativeElement.querySelector('.story-review-tab') as HTMLElement;
    reviewPanel.focus();
    reviewPanel.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    fixture.detectChanges();

    expect(reviewService.updateReviewStatus).toHaveBeenCalledOnceWith('test-case-1', {
      status: 'APPROVED',
      comment: null
    });
    expect(tabButton('History')?.textContent).toContain('History (0 pending)');
  });

  it('binds the analysis panel motion and status label to the service running state', () => {
    analysisState.set({ phase: 'running', storyId: 'story-1', sequence: 1 });
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('[data-ai-state="analysis"]') as HTMLElement;
    expect(panel.classList).toContain('is-analyzing');
    expect(panel.getAttribute('aria-busy')).toBe('true');
    expect(panel.textContent).toContain('Analyzing...');
  });

  it('ties the scene accent to the active AI operation and restores it on settle', () => {
    backgroundScene.setOperationAccent.calls.reset();

    analysisState.set({ phase: 'running', storyId: 'story-1', sequence: 1 });
    fixture.detectChanges();
    expect(backgroundScene.setOperationAccent).toHaveBeenCalledWith('violet');

    analysisState.set({ phase: 'success', storyId: 'story-1', sequence: 1 });
    generationState.set({ phase: 'running', storyId: 'story-1', sequence: 1 });
    fixture.detectChanges();
    expect(backgroundScene.setOperationAccent).toHaveBeenCalledWith('cyan');

    generationState.set({ phase: 'error', storyId: 'story-1', sequence: 1 });
    fixture.detectChanges();
    expect(backgroundScene.setOperationAccent).toHaveBeenCalledWith(null);
  });

  it('binds generation success and error treatments to settled service states', () => {
    clickTab('Test Cases');
    generationState.set({ phase: 'success', storyId: 'story-1', sequence: 1 });
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('[data-ai-state="generation"]') as HTMLElement;
    expect(panel.classList).toContain('is-ai-success');

    generationState.set({ phase: 'error', storyId: 'story-1', sequence: 2 });
    fixture.detectChanges();
    expect(panel.classList).toContain('is-ai-error');
    expect(panel.getAttribute('aria-busy')).toBe('false');
  });

  function clickTab(label: string): void {
    tabButton(label)?.click();
    fixture.detectChanges();
  }

  function tabButton(label: string): HTMLButtonElement | undefined {
    return tabButtons().find((button) => button.textContent?.includes(label));
  }

  function tabButtons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.detail-tabs .tab-btn')) as HTMLButtonElement[];
  }

  function reviewBoardBanner(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.review-board-banner') as HTMLElement | null;
  }

  function storyFixture(status: StoryStatus): Story {
    return {
      id: 'story-1',
      projectId: 'project-1',
      title: 'Checkout story',
      rawText: 'As a shopper, I can checkout.',
      type: 'USER_STORY',
      status,
      externalReference: null,
      metadataJson: null,
      createdAt: '2026-06-14T00:00:00Z',
      updatedAt: '2026-06-14T00:00:00Z'
    };
  }

  function suiteFixture(): GeneratedTestSuiteResult {
    return {
      id: 'suite-1',
      storyId: 'story-1',
      suiteName: 'Regression suite',
      testCases: [
        testCaseFixture('test-case-1', 'Checkout happy path', 'NEEDS_REVIEW'),
        testCaseFixture('test-case-2', 'Card declined', 'APPROVED')
      ],
      qaValidation: { requirementQualityScore: 0.9, testabilityScore: 0.9, warnings: [] },
      provider: 'mock-ai-provider',
      generatedAt: '2026-06-14T00:00:00Z'
    };
  }

  function testCaseFixture(id: string, title: string, reviewStatus: ReviewStatus): GeneratedTestCase {
    return {
      id,
      title,
      description: 'Validate checkout.',
      objective: 'Validate checkout.',
      type: 'FUNCTIONAL',
      testLayer: 'UI',
      priority: 'HIGH',
      riskLevel: 'MEDIUM',
      automationCandidate: true,
      confidenceScore: 0.9,
      reviewStatus,
      linkedRequirementReferences: [],
      bddScenario: null,
      steps: [],
      testData: []
    };
  }

  function updatedTestCase(reviewStatus: ReviewStatus): TestCaseResponse {
    return {
      id: 'test-case-1',
      testSuiteId: 'suite-1',
      title: 'Checkout happy path',
      objective: 'Validate checkout.',
      type: 'FUNCTIONAL',
      testLayer: 'UI',
      priority: 'HIGH',
      riskLevel: 'MEDIUM',
      reviewStatus,
      automationCandidate: true,
      preconditions: null,
      bddScenario: null,
      linkedRequirementReferences: [],
      steps: [],
      createdAt: '2026-06-14T00:00:00Z',
      updatedAt: '2026-06-14T00:00:00Z'
    };
  }
});
