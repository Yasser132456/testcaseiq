import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, defer, tap } from 'rxjs';
import { GeneratedTestSuiteResult } from '../models/generated-test.model';
import { StoryAiOperationState } from '../motion/async-operation-state';

@Injectable({ providedIn: 'root' })
export class TestGenerationService {
  private readonly http = inject(HttpClient);
  private readonly operationStateStore = signal<StoryAiOperationState>({
    phase: 'idle',
    storyId: null,
    sequence: 0
  });

  readonly operationState = this.operationStateStore.asReadonly();

  generateTestCases(storyId: string): Observable<GeneratedTestSuiteResult> {
    return defer(() => {
      const sequence = this.operationStateStore().sequence + 1;
      this.operationStateStore.set({ phase: 'running', storyId, sequence });
      return this.http.post<GeneratedTestSuiteResult>(`/api/stories/${storyId}/generate-tests`, {}).pipe(
        tap({
          next: () => this.operationStateStore.set({ phase: 'success', storyId, sequence }),
          error: () => this.operationStateStore.set({ phase: 'error', storyId, sequence })
        })
      );
    });
  }

  getTestSuites(storyId: string): Observable<GeneratedTestSuiteResult[]> {
    return this.http.get<GeneratedTestSuiteResult[]>(`/api/stories/${storyId}/test-suites`);
  }
}
