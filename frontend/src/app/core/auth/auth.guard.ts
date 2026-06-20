import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService, UserRole } from '../services/auth.service';

export const authGuard: CanActivateFn & CanActivateChildFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const requiresAuth = route.data?.['requiresAuth'] === true;
  const requiredRoles = route.data?.['roles'] as UserRole[] | undefined;

  if (!requiresAuth) {
    return true;
  }

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  if (requiredRoles?.length && !authService.hasRole(requiredRoles)) {
    return router.createUrlTree(['/'], {
      queryParams: { access: 'restricted' }
    });
  }

  return true;
};
