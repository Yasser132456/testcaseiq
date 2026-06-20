import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('attaches a bearer token to API requests when a token exists', () => {
    authService.setSessionForTesting('jwt-token', {
      id: 'user-1',
      displayName: 'Case Reviewer',
      email: 'reviewer@testcaseiq.dev',
      role: 'QA_ENGINEER'
    });

    httpClient.get('/api/projects').subscribe();

    const request = http.expectOne('/api/projects');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    request.flush([]);
  });

  it('does not attach bearer tokens to login or register requests', () => {
    authService.setSessionForTesting('old-token', {
      id: 'user-1',
      displayName: 'Case Reviewer',
      email: 'reviewer@testcaseiq.dev',
      role: 'QA_ENGINEER'
    });

    httpClient.post('/api/auth/login', { email: 'x@test.dev', password: 'password' }).subscribe();
    httpClient.post('/api/auth/register', { displayName: 'X', email: 'x@test.dev', password: 'password' }).subscribe();

    const login = http.expectOne('/api/auth/login');
    const register = http.expectOne('/api/auth/register');
    expect(login.request.headers.has('Authorization')).toBeFalse();
    expect(register.request.headers.has('Authorization')).toBeFalse();
    login.flush({});
    register.flush({});
  });

  it('clears session when an authenticated API request returns 401', () => {
    authService.setSessionForTesting('expired-token', {
      id: 'user-1',
      displayName: 'Case Reviewer',
      email: 'reviewer@testcaseiq.dev',
      role: 'QA_ENGINEER'
    });

    httpClient.get('/api/projects').subscribe({
      error: () => undefined
    });

    const request = http.expectOne('/api/projects');
    request.flush({ message: 'Authentication required' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.token()).toBeNull();
    expect(authService.currentUser()).toBeNull();
  });
});
