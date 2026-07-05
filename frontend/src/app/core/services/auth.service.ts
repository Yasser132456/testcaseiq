import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { AuthResponse, AuthUser, LoginRequest, RegisterRequest, UserRole } from '../models/auth.model';

export type { AuthResponse, AuthUser, LoginRequest, RegisterRequest, UserRole } from '../models/auth.model';

const TOKEN_STORAGE_KEY = 'testcaseiq.auth.token';
const ONBOARDING_STORAGE_PREFIX = 'testcaseiq.onboarding';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentToken = signal<string | null>(this.readStoredToken());
  private readonly user = signal<AuthUser | null>(null);

  readonly token = this.currentToken.asReadonly();
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.currentToken() !== null);
  readonly currentRole = computed(() => this.user()?.role ?? null);

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', request).pipe(
      tap((response) => this.storeSession(response.accessToken, response.user))
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', request).pipe(
      tap((response) => {
        this.storeSession(response.accessToken, response.user);
        this.markFreshAccount(response.user);
      })
    );
  }

  loadCurrentUser(): Observable<AuthUser | null> {
    const storedToken = this.currentToken() ?? this.readStoredToken();
    if (!storedToken) {
      this.clearSession();
      return of(null);
    }
    this.currentToken.set(storedToken);

    return this.http.get<AuthUser>('/api/auth/me').pipe(
      tap((profile) => this.user.set(profile)),
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  logout(): void {
    this.clearSession();
  }

  hasRole(requiredRoles: UserRole | UserRole[]): boolean {
    const role = this.user()?.role;
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return role !== undefined && roles.includes(role);
  }

  clearSession(): void {
    this.currentToken.set(null);
    this.user.set(null);
    this.removeStoredToken();
  }

  setSessionForTesting(token: string, user: AuthUser): void {
    this.storeSession(token, user);
  }

  private storeSession(token: string, user: AuthUser): void {
    this.currentToken.set(token);
    this.user.set(user);
    this.writeStoredToken(token);
  }

  private readStoredToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private writeStoredToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // Storage can fail in constrained browser contexts; in-memory session still works.
    }
  }

  private removeStoredToken(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
  }

  private markFreshAccount(user: AuthUser): void {
    try {
      const key = `${ONBOARDING_STORAGE_PREFIX}.${user.id}`;
      const existing = localStorage.getItem(key);
      const progress = existing ? JSON.parse(existing) as { completed?: Record<string, true>; dismissed?: Record<string, true> } : {};
      localStorage.setItem(key, JSON.stringify({
        completed: { ...(progress.completed ?? {}), 'account-created': true },
        dismissed: progress.dismissed ?? {},
        updatedAt: new Date().toISOString()
      }));
    } catch {
      // Onboarding hints are optional; registration should not fail if storage is unavailable.
    }
  }
}
