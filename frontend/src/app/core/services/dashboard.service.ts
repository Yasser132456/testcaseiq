import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardMetrics } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>('/api/dashboard/metrics');
  }
}
