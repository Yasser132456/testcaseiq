import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuditEventFilters, AuditEventPage } from '../models/audit-event.model';

@Injectable({ providedIn: 'root' })
export class AuditEventService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/audit/events';

  listEvents(filters?: AuditEventFilters, page = 0, size = 50): Observable<AuditEventPage> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (filters?.action) params = params.set('action', filters.action);
    if (filters?.outcome) params = params.set('outcome', filters.outcome);
    if (filters?.resourceType) params = params.set('resourceType', filters.resourceType);
    if (filters?.resourceId) params = params.set('resourceId', filters.resourceId);
    if (filters?.actor) params = params.set('actor', filters.actor);
    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to) params = params.set('to', filters.to);
    return this.http.get<AuditEventPage>(this.baseUrl, { params });
  }
}
