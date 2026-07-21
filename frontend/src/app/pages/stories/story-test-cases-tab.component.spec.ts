import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GeneratedTestCase, GeneratedTestSuiteResult } from '../../core/models/generated-test.model';
import { ReviewService } from '../../core/services/review.service';
import { ToastService } from '../../core/services/toast.service';
import { StoryTestCasesTabComponent, generatedRowDelayMs } from './story-test-cases-tab.component';

describe('StoryTestCasesTabComponent', () => {
  let fixture: ComponentFixture<StoryTestCasesTabComponent>;

  beforeEach(async () => {
    const reviewService = jasmine.createSpyObj<ReviewService>('ReviewService', [
      'updateReviewStatus',
      'updatePriority',
      'updateRisk',
      'updateAutomationCandidate',
      'updateTestCase',
      'getReviewEvents'
    ]);
    const toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);

    await TestBed.configureTestingModule({
      imports: [StoryTestCasesTabComponent],
      providers: [
        provideRouter([]),
        { provide: ReviewService, useValue: reviewService },
        { provide: ToastService, useValue: toastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StoryTestCasesTabComponent);
  });

  it('shows an export nudge when every test case has been reviewed', () => {
    fixture.componentRef.setInput('storyTitle', 'Checkout accepts valid card');
    fixture.componentRef.setInput('testSuites', [
      suiteWithCases([
        testCase('tc-1', 'Checkout happy path', 'APPROVED'),
        testCase('tc-2', 'Card declined', 'REJECTED')
      ])
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.allReviewed()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('All test cases reviewed');
    expect(fixture.nativeElement.textContent).toContain('suite is ready for export');
    expect(fixture.nativeElement.textContent).toContain('Export');
  });

  it('streams newly generated rows at 40ms intervals', () => {
    fixture.componentRef.setInput('testSuites', [
      suiteWithCases([
        testCase('tc-1', 'First', 'APPROVED'),
        testCase('tc-2', 'Second', 'APPROVED'),
        testCase('tc-3', 'Third', 'APPROVED')
      ])
    ]);
    fixture.componentRef.setInput('streamGeneratedRows', true);
    fixture.detectChanges();

    const rows = Array.from(fixture.nativeElement.querySelectorAll('.test-case-card')) as HTMLElement[];
    expect(rows.every((row) => row.classList.contains('is-generated-arrival'))).toBeTrue();
    expect(rows.map((row) => row.style.getPropertyValue('--generated-row-delay'))).toEqual(['0ms', '40ms', '80ms']);
  });

  it('caps a batch stagger at 600ms total', () => {
    expect(generatedRowDelayMs(15, 16)).toBe(600);
    expect(generatedRowDelayMs(30, 31)).toBe(600);
  });

  function suiteWithCases(testCases: GeneratedTestCase[]): GeneratedTestSuiteResult {
    return {
      id: 'suite-1',
      storyId: 'story-1',
      suiteName: 'Checkout suite',
      testCases,
      qaValidation: {
        requirementQualityScore: 90,
        testabilityScore: 88,
        warnings: []
      },
      provider: 'openai',
      generatedAt: '2026-06-14T00:00:00Z',
      explainabilitySummary: null
    };
  }

  function testCase(id: string, title: string, reviewStatus: 'APPROVED' | 'REJECTED'): GeneratedTestCase {
    return {
      id,
      title,
      description: null,
      objective: 'Validate checkout.',
      type: 'FUNCTIONAL',
      testLayer: 'UI',
      priority: 'HIGH',
      riskLevel: 'MEDIUM',
      automationCandidate: true,
      confidenceScore: 0.9,
      reviewStatus,
      linkedRequirementReferences: [],
      sourceEvidence: null,
      preconditions: null,
      bddScenario: null,
      steps: [],
      testData: [],
      qualityScore: 86,
      confidenceLevel: 'HIGH',
      generationRationale: null,
      linkedAcceptanceCriteriaText: null
    };
  }
});
