import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminUser, UpdateRoleRequest, UpdateStatusRequest } from '../models/admin-user.model';

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/users';

  listUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(this.baseUrl);
  }

  updateRole(userId: string, request: UpdateRoleRequest): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.baseUrl}/${userId}/role`, request);
  }

  updateStatus(userId: string, request: UpdateStatusRequest): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.baseUrl}/${userId}/status`, request);
  }
}
