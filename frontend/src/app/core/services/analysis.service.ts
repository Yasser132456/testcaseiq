import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { StoryAnalysisResult } from '../models/analysis.model';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);

  analyzeStory(storyId: string): Observable<StoryAnalysisResult> {
    return this.http.post<StoryAnalysisResult>(`/api/stories/${storyId}/analyze`, {});
  }

  getAnalysis(storyId: string): Observable<StoryAnalysisResult> {
    return this.http.get<StoryAnalysisResult>(`/api/stories/${storyId}/analysis`);
  }
}
