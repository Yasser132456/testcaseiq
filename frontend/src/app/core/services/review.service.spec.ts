import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReviewService } from './review.service';

describe('ReviewService', () => {
  let service: ReviewService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(ReviewService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('updates review status for a persisted test case', () => {
    service.updateReviewStatus('test-case-1', { status: 'APPROVED', comment: 'Ready for regression.' })
      .subscribe((testCase) => {
        expect(testCase.id).toBe('test-case-1');
        expect(testCase.reviewStatus).toBe('APPROVED');
      });

    const request = http.expectOne('/api/test-cases/test-case-1/review-status');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'APPROVED', comment: 'Ready for regression.' });
    request.flush(testCaseResponse({ reviewStatus: 'APPROVED' }));
  });

  it('updates priority, risk, and automation candidate fields', () => {
    service.updatePriority('test-case-1', { priority: 'CRITICAL', comment: 'High customer impact.' })
      .subscribe((testCase) => expect(testCase.priority).toBe('CRITICAL'));
    const priorityRequest = http.expectOne('/api/test-cases/test-case-1/priority');
    expect(priorityRequest.request.method).toBe('PATCH');
    expect(priorityRequest.request.body).toEqual({ priority: 'CRITICAL', comment: 'High customer impact.' });
    priorityRequest.flush(testCaseResponse({ priority: 'CRITICAL' }));

    service.updateRisk('test-case-1', { riskLevel: 'HIGH' })
      .subscribe((testCase) => expect(testCase.riskLevel).toBe('HIGH'));
    const riskRequest = http.expectOne('/api/test-cases/test-case-1/risk');
    expect(riskRequest.request.method).toBe('PATCH');
    expect(riskRequest.request.body).toEqual({ riskLevel: 'HIGH' });
    riskRequest.flush(testCaseResponse({ riskLevel: 'HIGH' }));

    service.updateAutomationCandidate('test-case-1', { automationCandidate: false })
      .subscribe((testCase) => expect(testCase.automationCandidate).toBeFalse());
    const automationRequest = http.expectOne('/api/test-cases/test-case-1/automation-candidate');
    expect(automationRequest.request.method).toBe('PATCH');
    expect(automationRequest.request.body).toEqual({ automationCandidate: false });
    automationRequest.flush(testCaseResponse({ automationCandidate: false }));
  });

  it('updates editable test case content', () => {
    service.updateTestCase('test-case-1', {
      title: 'Updated checkout happy path',
      objective: 'Validate successful card payment.',
      steps: [
        { order: 1, action: 'Open checkout.', expectedResult: 'Checkout is available.' }
      ],
      comment: 'Tightened wording.'
    }).subscribe((testCase) => {
      expect(testCase.title).toBe('Updated checkout happy path');
      expect(testCase.steps[0].action).toBe('Open checkout.');
    });

    const request = http.expectOne('/api/test-cases/test-case-1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body.title).toBe('Updated checkout happy path');
    expect(request.request.body.steps.length).toBe(1);
    request.flush(testCaseResponse({
      title: 'Updated checkout happy path',
      steps: [{ id: 'step-1', order: 1, action: 'Open checkout.', expectedResult: 'Checkout is available.' }]
    }));
  });

  it('loads review history for a test case', () => {
    service.getReviewEvents('test-case-1').subscribe((events) => {
      expect(events.length).toBe(1);
      expect(events[0].actionType).toBe('REVIEW_STATUS_UPDATED');
      expect(events[0].previousValue).toBe('NEEDS_REVIEW');
      expect(events[0].newValue).toBe('APPROVED');
    });

    const request = http.expectOne('/api/test-cases/test-case-1/review-events');
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 'event-1',
        testCaseId: 'test-case-1',
        status: 'APPROVED',
        actionType: 'REVIEW_STATUS_UPDATED',
        previousValue: 'NEEDS_REVIEW',
        newValue: 'APPROVED',
        reviewer: 'local-reviewer',
        comment: 'Ready for regression.',
        createdAt: '2026-06-14T00:00:00Z'
      }
    ]);
  });

  function testCaseResponse(overrides: Record<string, unknown> = {}) {
    return {
      id: 'test-case-1',
      testSuiteId: 'suite-1',
      title: 'Checkout happy path',
      objective: 'Validate successful payment.',
      type: 'FUNCTIONAL',
      testLayer: 'UI',
      priority: 'HIGH',
      riskLevel: 'MEDIUM',
      reviewStatus: 'NEEDS_REVIEW',
      automationCandidate: true,
      preconditions: 'User has an active cart.',
      bddScenario: 'Given an active cart',
      linkedRequirementReferences: ['REQ-1'],
      steps: [
        {
          id: 'step-1',
          order: 1,
          action: 'Open checkout.',
          expectedResult: 'Checkout is available.'
        }
      ],
      createdAt: '2026-06-14T00:00:00Z',
      updatedAt: '2026-06-14T00:00:00Z',
      ...overrides
    };
  }
});
