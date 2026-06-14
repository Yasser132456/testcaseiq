import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Story, StoryCreateRequest, StoryUpdateRequest } from '../models/story.model';

@Injectable({ providedIn: 'root' })
export class StoryService {
  private readonly http = inject(HttpClient);

  listForProject(projectId: string): Observable<Story[]> {
    return this.http.get<Story[]>(`/api/projects/${projectId}/stories`);
  }

  get(storyId: string): Observable<Story> {
    return this.http.get<Story>(`/api/stories/${storyId}`);
  }

  create(projectId: string, request: StoryCreateRequest): Observable<Story> {
    return this.http.post<Story>(`/api/projects/${projectId}/stories`, request);
  }

  update(storyId: string, request: StoryUpdateRequest): Observable<Story> {
    return this.http.patch<Story>(`/api/stories/${storyId}`, request);
  }

  delete(storyId: string): Observable<void> {
    return this.http.delete<void>(`/api/stories/${storyId}`);
  }
}
