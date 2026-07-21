import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, defer, tap } from 'rxjs';
import { StoryAnalysisResult } from '../models/analysis.model';
import { StoryAiOperationState } from '../motion/async-operation-state';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly operationStateStore = signal<StoryAiOperationState>({
    phase: 'idle',
    storyId: null,
    sequence: 0
  });

  readonly operationState = this.operationStateStore.asReadonly();

  analyzeStory(storyId: string): Observable<StoryAnalysisResult> {
    return defer(() => {
      const sequence = this.operationStateStore().sequence + 1;
      this.operationStateStore.set({ phase: 'running', storyId, sequence });
      return this.http.post<StoryAnalysisResult>(`/api/stories/${storyId}/analyze`, {}).pipe(
        tap({
          next: () => this.operationStateStore.set({ phase: 'success', storyId, sequence }),
          error: () => this.operationStateStore.set({ phase: 'error', storyId, sequence })
        })
      );
    });
  }

  getAnalysis(storyId: string): Observable<StoryAnalysisResult> {
    return this.http.get<StoryAnalysisResult>(`/api/stories/${storyId}/analysis`);
  }
}
