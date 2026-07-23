import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, defer, tap } from 'rxjs';
import {
  AutomationCandidateUpdateRequest,
  PriorityUpdateRequest,
  ReviewEvent,
  ReviewStatusUpdateRequest,
  RegenerateRequest,
  RiskUpdateRequest,
  TestCaseResponse,
  TestCaseUpdateRequest
} from '../models/review.model';
import { ReviewOperationState } from '../motion/async-operation-state';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/test-cases';
  private readonly operationStateStore = signal<ReviewOperationState>({
    phase: 'idle',
    testCaseId: null,
    verdict: null,
    sequence: 0
  });

  readonly operationState = this.operationStateStore.asReadonly();

  updateReviewStatus(testCaseId: string, request: ReviewStatusUpdateRequest): Observable<TestCaseResponse> {
    return defer(() => {
      const sequence = this.operationStateStore().sequence + 1;
      const verdict = request.status;
      this.operationStateStore.set({ phase: 'running', testCaseId, verdict, sequence });
      return this.http.patch<TestCaseResponse>(`${this.baseUrl}/${testCaseId}/review-status`, request).pipe(
        tap({
          next: () => this.operationStateStore.set({ phase: 'success', testCaseId, verdict, sequence }),
          error: () => this.operationStateStore.set({ phase: 'error', testCaseId, verdict, sequence })
        })
      );
    });
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

  regenerate(testCaseId: string, reason: string): Observable<TestCaseResponse> {
    const request: RegenerateRequest = { reason };
    return this.http.post<TestCaseResponse>(`${this.baseUrl}/${testCaseId}/regenerate`, request);
  }

  getReviewEvents(testCaseId: string): Observable<ReviewEvent[]> {
    return this.http.get<ReviewEvent[]>(`${this.baseUrl}/${testCaseId}/review-events`);
  }
}
