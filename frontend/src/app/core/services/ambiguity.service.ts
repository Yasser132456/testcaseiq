import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AmbiguityResolutionRequest, AmbiguityResponse } from '../models/ambiguity.model';

@Injectable({ providedIn: 'root' })
export class AmbiguityService {
  private readonly http = inject(HttpClient);

  list(storyId: string): Observable<AmbiguityResponse[]> {
    return this.http.get<AmbiguityResponse[]>(`/api/stories/${storyId}/ambiguities`);
  }

  resolve(storyId: string, ambiguityId: string, request: AmbiguityResolutionRequest): Observable<AmbiguityResponse> {
    return this.http.patch<AmbiguityResponse>(`/api/stories/${storyId}/ambiguities/${ambiguityId}`, request);
  }
}
