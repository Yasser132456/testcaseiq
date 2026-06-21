import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  TestSuiteDetail,
  TestSuiteFilters,
  TestSuitePage,
  TestSuiteSummary,
  TestSuiteUpdateRequest
} from '../models/test-suite.model';

@Injectable({ providedIn: 'root' })
export class TestSuiteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/test-suites';

  listSuites(filters?: TestSuiteFilters, page = 0, size = 20): Observable<TestSuitePage> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (filters?.storyId) params = params.set('storyId', filters.storyId);
    if (filters?.projectId) params = params.set('projectId', filters.projectId);
    if (filters?.approvedOnly) params = params.set('approvedOnly', 'true');
    return this.http.get<TestSuitePage>(this.baseUrl, { params });
  }

  getSuite(id: string): Observable<TestSuiteDetail> {
    return this.http.get<TestSuiteDetail>(`${this.baseUrl}/${id}`);
  }

  updateSuite(id: string, request: TestSuiteUpdateRequest): Observable<TestSuiteSummary> {
    return this.http.patch<TestSuiteSummary>(`${this.baseUrl}/${id}`, request);
  }

  deleteSuite(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
