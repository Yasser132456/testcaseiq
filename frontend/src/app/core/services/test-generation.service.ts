import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GeneratedTestSuiteResult } from '../models/generated-test.model';

@Injectable({ providedIn: 'root' })
export class TestGenerationService {
  private readonly http = inject(HttpClient);

  generateTestCases(storyId: string): Observable<GeneratedTestSuiteResult> {
    return this.http.post<GeneratedTestSuiteResult>(`/api/stories/${storyId}/generate-tests`, {});
  }

  getTestSuites(storyId: string): Observable<GeneratedTestSuiteResult[]> {
    return this.http.get<GeneratedTestSuiteResult[]>(`/api/stories/${storyId}/test-suites`);
  }
}
