import { UserRole } from './auth.model';

export interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateRoleRequest {
  role: UserRole;
}

export interface UpdateStatusRequest {
  enabled: boolean;
}
