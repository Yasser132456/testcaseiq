export type UserRole = 'ADMIN' | 'QA_ENGINEER' | 'VIEWER';

export interface AuthUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  user: AuthUser;
}
