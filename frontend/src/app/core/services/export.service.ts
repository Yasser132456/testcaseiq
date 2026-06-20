import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type ExportFormat = 'markdown' | 'csv' | 'json' | 'playwright';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly http = inject(HttpClient);

  exportApprovedTestCases(storyId: string, format: ExportFormat): Observable<HttpResponse<Blob>> {
    return this.http.get(`/api/stories/${storyId}/exports/${format}`, {
      observe: 'response',
      responseType: 'blob'
    });
  }
}
