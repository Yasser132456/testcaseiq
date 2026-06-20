import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: Router,
          useValue: {
            createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue(new UrlTree())
          }
        }
      ]
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('allows routes that do not explicitly require auth', () => {
    const result = executeGuard({ data: {} } as never, { url: '/projects' } as never);

    expect(result).toBeTrue();
  });

  it('redirects auth-required routes when no token exists', () => {
    const router = TestBed.inject(Router);

    const result = executeGuard({ data: { requiresAuth: true } } as never, { url: '/admin' } as never);

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin' }
    });
  });

  it('allows auth-required routes when a session exists and role matches', () => {
    const authService = TestBed.inject(AuthService);
    authService.setSessionForTesting('jwt-token', {
      id: 'admin-1',
      displayName: 'Admin User',
      email: 'admin@testcaseiq.dev',
      role: 'ADMIN'
    });

    const result = executeGuard(
      { data: { requiresAuth: true, roles: ['ADMIN'] } } as never,
      { url: '/admin' } as never
    );

    expect(result).toBeTrue();
  });
});
