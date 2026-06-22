import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SearchResultsResponse } from '../models/search.model';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);

  search(q: string): Observable<SearchResultsResponse> {
    const query = q.trim().slice(0, 100);
    const params = new HttpParams().set('q', query);
    return this.http.get<SearchResultsResponse>('/api/search', { params });
  }
}
