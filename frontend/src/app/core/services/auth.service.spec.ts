import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthResponse, AuthService, AuthUser } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  const user = {
    id: 'user-1',
    displayName: 'Case Reviewer',
    email: 'reviewer@testcaseiq.dev',
    role: 'QA_ENGINEER' as const
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('logs in and stores the returned token and user', () => {
    let response: AuthResponse | undefined;
    service.login({ email: user.email, password: 'correct-password' }).subscribe((authResponse) => {
      response = authResponse;
    });

    const request = http.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    request.flush({
      accessToken: 'jwt-token',
      tokenType: 'Bearer',
      expiresInSeconds: 3600,
      user
    });

    expect(response?.accessToken).toBe('jwt-token');
    expect(service.currentUser()).toEqual(user);
    expect(service.token()).toBe('jwt-token');
    expect(localStorage.getItem('testcaseiq.auth.token')).toBe('jwt-token');
  });

  it('registers a user and stores the returned session', () => {
    service.register({
      displayName: user.displayName,
      email: user.email,
      password: 'correct-password'
    }).subscribe();

    const request = http.expectOne('/api/auth/register');
    expect(request.request.method).toBe('POST');
    request.flush({
      accessToken: 'new-jwt-token',
      tokenType: 'Bearer',
      expiresInSeconds: 3600,
      user
    });

    expect(service.currentUser()).toEqual(user);
    expect(service.token()).toBe('new-jwt-token');
  });

  it('loads the current user from /me when a token exists', () => {
    localStorage.setItem('testcaseiq.auth.token', 'saved-token');
    service = TestBed.inject(AuthService);

    service.loadCurrentUser().subscribe();

    const request = http.expectOne('/api/auth/me');
    expect(request.request.method).toBe('GET');
    request.flush(user);

    expect(service.currentUser()).toEqual(user);
    expect(service.token()).toBe('saved-token');
  });

  it('does not call /me when no token is stored', () => {
    let restoredUser: AuthUser | null | undefined;

    service.loadCurrentUser().subscribe((result) => {
      restoredUser = result;
    });

    http.expectNone('/api/auth/me');
    expect(restoredUser).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  it('clears the session when /me rejects the stored token', () => {
    localStorage.setItem('testcaseiq.auth.token', 'expired-token');
    service = TestBed.inject(AuthService);

    service.loadCurrentUser().subscribe((result) => {
      expect(result).toBeNull();
    });

    const request = http.expectOne('/api/auth/me');
    request.flush({ message: 'Authentication required' }, { status: 401, statusText: 'Unauthorized' });

    expect(service.currentUser()).toBeNull();
    expect(service.token()).toBeNull();
    expect(localStorage.getItem('testcaseiq.auth.token')).toBeNull();
  });

  it('logs out by clearing token and user state', () => {
    localStorage.setItem('testcaseiq.auth.token', 'saved-token');

    service.logout();

    expect(service.currentUser()).toBeNull();
    expect(service.token()).toBeNull();
    expect(localStorage.getItem('testcaseiq.auth.token')).toBeNull();
  });

  it('checks role membership from the current user', () => {
    service.setSessionForTesting('jwt-token', user);

    expect(service.hasRole('QA_ENGINEER')).toBeTrue();
    expect(service.hasRole(['ADMIN', 'QA_ENGINEER'])).toBeTrue();
    expect(service.hasRole('VIEWER')).toBeFalse();
  });
});
