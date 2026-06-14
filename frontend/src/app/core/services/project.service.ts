import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Project, ProjectCreateRequest, ProjectUpdateRequest } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/projects';

  list(): Observable<Project[]> {
    return this.http.get<Project[]>(this.baseUrl);
  }

  get(projectId: string): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/${projectId}`);
  }

  create(request: ProjectCreateRequest): Observable<Project> {
    return this.http.post<Project>(this.baseUrl, request);
  }

  update(projectId: string, request: ProjectUpdateRequest): Observable<Project> {
    return this.http.patch<Project>(`${this.baseUrl}/${projectId}`, request);
  }

  delete(projectId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${projectId}`);
  }
}
