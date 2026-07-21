import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ReviewService } from '../../core/services/review.service';
import { TestSuiteService } from '../../core/services/test-suite.service';
import { ReviewBoardPageComponent } from './review-board-page.component';

describe('ReviewBoardPageComponent', () => {
  let fixture: ComponentFixture<ReviewBoardPageComponent>;
  let testSuiteService: jasmine.SpyObj<TestSuiteService>;
  let reviewService: jasmine.SpyObj<ReviewService>;

  beforeEach(async () => {
    testSuiteService = jasmine.createSpyObj<TestSuiteService>('TestSuiteService', ['listSuites', 'getSuite']);
    reviewService = jasmine.createSpyObj<ReviewService>('ReviewService', ['updateReviewStatus']);

    testSuiteService.listSuites.and.returnValue(of({
      content: [
        suiteSummary('suite-1', 'Checkout coverage'),
        suiteSummary('suite-2', 'Refund coverage')
      ],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 20,
      first: true,
      last: true
    }));
    testSuiteService.getSuite.and.callFake((id: string) => of({
      ...suiteSummary(id, id === 'suite-1' ? 'Checkout coverage' : 'Refund coverage'),
      explainabilitySummary: id === 'suite-1' ? 'Generated from checkout acceptance criteria.' : null,
      testCases: id === 'suite-1'
        ? [
            {
              id: 'tc-1',
              title: 'Checkout happy path',
              type: 'FUNCTIONAL',
              priority: 'HIGH',
              reviewStatus: 'NEEDS_REVIEW',
              automationCandidate: true,
              qualityScore: 86,
              confidenceLevel: 'HIGH'
            },
            {
              id: 'tc-2',
              title: 'Card declined',
              type: 'NEGATIVE',
              priority: 'CRITICAL',
              reviewStatus: 'DRAFT',
              automationCandidate: false,
              qualityScore: 58,
              confidenceLevel: 'LOW'
            }
          ]
        : [
            {
              id: 'tc-3',
              title: 'Refund approved',
              type: 'API',
              priority: 'MEDIUM',
              reviewStatus: 'APPROVED',
              automationCandidate: true,
              qualityScore: 74,
              confidenceLevel: 'MEDIUM'
            }
          ]
    }));
    reviewService.updateReviewStatus.and.returnValue(of({
      id: 'tc-1',
      testSuiteId: 'suite-1',
      title: 'Checkout happy path',
      objective: 'Validate checkout.',
      type: 'FUNCTIONAL',
      testLayer: 'UI',
      priority: 'HIGH',
      riskLevel: 'MEDIUM',
      reviewStatus: 'APPROVED',
      automationCandidate: true,
      preconditions: null,
      bddScenario: null,
      linkedRequirementReferences: [],
      steps: [],
      createdAt: '2026-06-14T00:00:00Z',
      updatedAt: '2026-06-14T00:00:00Z'
    }));

    await TestBed.configureTestingModule({
      imports: [ReviewBoardPageComponent],
      providers: [
        provideRouter([]),
        { provide: TestSuiteService, useValue: testSuiteService },
        { provide: ReviewService, useValue: reviewService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewBoardPageComponent);
    fixture.detectChanges();
  });

  it('renders a master-detail review grid with an active test case item', () => {
    const grid = fixture.nativeElement.querySelector('.review-master-detail') as HTMLElement;
    const items = testCaseItems();
    const detail = fixture.nativeElement.querySelector('.review-detail-panel') as HTMLElement;

    expect(grid).not.toBeNull();
    expect(items.length).toBe(3);
    expect(items[0].classList).toContain('is-active');
    expect(items[0].textContent).toContain('Checkout happy path');
    expect(items[0].querySelector('.review-case-story')?.textContent?.trim()).toBe('Checkout coverage story');
    expect(detail.textContent).toContain('Checkout happy path');
    expect(detail.querySelector('.quality-gauge')).not.toBeNull();
  });

  it('selects the next test case with the j keyboard shortcut', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
    fixture.detectChanges();

    expect(testCaseItems()[1].classList).toContain('is-active');
    expect((fixture.nativeElement.querySelector('.review-detail-panel') as HTMLElement).textContent).toContain('Card declined');
  });

  it('shows sticky approve and reject actions for reviewable cases', () => {
    const actionPanel = fixture.nativeElement.querySelector('.review-sticky-actions') as HTMLElement;

    expect(actionPanel).not.toBeNull();
    expect(actionPanel.textContent).toContain('Approve');
    expect(actionPanel.textContent).toContain('Reject');
    expect(actionPanel.textContent).toContain('A');
    expect(actionPanel.textContent).toContain('R');
  });

  it('approves the active test case through the approve action', () => {
    const approveButton = Array.from(fixture.nativeElement.querySelectorAll('.review-sticky-actions button'))
      .find((button) => (button as HTMLButtonElement).textContent?.includes('Approve')) as HTMLButtonElement;

    approveButton.click();
    fixture.detectChanges();

    expect(reviewService.updateReviewStatus).toHaveBeenCalledOnceWith('tc-1', {
      status: 'APPROVED',
      comment: null
    });
  });

  it('removes a rejection optimistically and exposes its verdict state without waiting for the API', () => {
    reviewService.updateReviewStatus.and.returnValue(new Subject());
    const rejectButton = Array.from(fixture.nativeElement.querySelectorAll('.review-sticky-actions button'))
      .find((button) => (button as HTMLButtonElement).textContent?.includes('Reject')) as HTMLButtonElement;

    rejectButton.click();
    fixture.detectChanges();

    expect(reviewService.updateReviewStatus).toHaveBeenCalledWith('tc-1', { status: 'REJECTED', comment: null });
    expect(testCaseItems().length).toBe(2);
    expect((fixture.nativeElement.querySelector('.review-detail-panel') as HTMLElement).classList).toContain('is-verdict-reject');
  });

  it('shows a session-complete empty state after the last review action succeeds', () => {
    testSuiteService.listSuites.and.returnValue(of({
      content: [suiteSummary('suite-1', 'Checkout coverage')],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
      first: true,
      last: true
    }));
    testSuiteService.getSuite.and.returnValue(of({
      ...suiteSummary('suite-1', 'Checkout coverage'),
      explainabilitySummary: null,
      testCases: [
        {
          id: 'tc-1',
          title: 'Checkout happy path',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          reviewStatus: 'NEEDS_REVIEW',
          automationCandidate: true,
          qualityScore: 86,
          confidenceLevel: 'HIGH'
        }
      ]
    }));

    const singleCaseFixture = TestBed.createComponent(ReviewBoardPageComponent);
    singleCaseFixture.detectChanges();

    const approveButton = Array.from(singleCaseFixture.nativeElement.querySelectorAll('.review-sticky-actions button'))
      .find((button) => (button as HTMLButtonElement).textContent?.includes('Approve')) as HTMLButtonElement;
    approveButton.click();
    singleCaseFixture.detectChanges();

    expect(singleCaseFixture.componentInstance.sessionReviewCount()).toBe(1);
    expect(singleCaseFixture.nativeElement.textContent).toContain('All done');
    expect(singleCaseFixture.nativeElement.textContent).toContain('1 cases reviewed this session');
    expect(singleCaseFixture.nativeElement.textContent).toContain('Suite is ready for export');
    expect(singleCaseFixture.nativeElement.textContent).toContain('Go to Export Hub');
  });

  function testCaseItems(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.review-case-item')) as HTMLButtonElement[];
  }

  function suiteSummary(id: string, name: string) {
    return {
      id,
      storyId: `${id}-story`,
      storyTitle: `${name} story`,
      projectId: 'project-1',
      projectName: 'Commerce',
      name,
      description: null,
      testLayer: 'UI',
      totalCases: id === 'suite-1' ? 2 : 1,
      approvedCases: id === 'suite-1' ? 0 : 1,
      rejectedCases: 0,
      createdAt: '2026-06-14T00:00:00Z',
      updatedAt: '2026-06-14T00:00:00Z'
    };
  }
});
