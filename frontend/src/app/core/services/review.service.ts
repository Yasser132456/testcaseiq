import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AutomationCandidateUpdateRequest,
  PriorityUpdateRequest,
  ReviewEvent,
  ReviewStatusUpdateRequest,
  RiskUpdateRequest,
  TestCaseResponse,
  TestCaseUpdateRequest
} from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/test-cases';

  updateReviewStatus(testCaseId: string, request: ReviewStatusUpdateRequest): Observable<TestCaseResponse> {
    return this.http.patch<TestCaseResponse>(`${this.baseUrl}/${testCaseId}/review-status`, request);
  }

  updatePriority(testCaseId: string, request: PriorityUpdateRequest): Observable<TestCaseResponse> {
    return this.http.patch<TestCaseResponse>(`${this.baseUrl}/${testCaseId}/priority`, request);
  }

  updateRisk(testCaseId: string, request: RiskUpdateRequest): Observable<TestCaseResponse> {
    return this.http.patch<TestCaseResponse>(`${this.baseUrl}/${testCaseId}/risk`, request);
  }

  updateAutomationCandidate(
    testCaseId: string,
    request: AutomationCandidateUpdateRequest
  ): Observable<TestCaseResponse> {
    return this.http.patch<TestCaseResponse>(`${this.baseUrl}/${testCaseId}/automation-candidate`, request);
  }

  updateTestCase(testCaseId: string, request: TestCaseUpdateRequest): Observable<TestCaseResponse> {
    return this.http.patch<TestCaseResponse>(`${this.baseUrl}/${testCaseId}`, request);
  }

  getReviewEvents(testCaseId: string): Observable<ReviewEvent[]> {
    return this.http.get<ReviewEvent[]>(`${this.baseUrl}/${testCaseId}/review-events`);
  }
}
