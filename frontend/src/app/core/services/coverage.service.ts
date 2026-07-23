import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CoverageReportResponse } from '../models/coverage.model';

@Injectable({ providedIn: 'root' })
export class CoverageService {
  private readonly http = inject(HttpClient);

  getReport(storyId: string): Observable<CoverageReportResponse> {
    return this.http.get<CoverageReportResponse>(`/api/stories/${storyId}/coverage`);
  }
}
