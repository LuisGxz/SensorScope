import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  if (auth.hasTokens()) {
    return auth.loadMe().pipe(map(() => true), catchError(() => { auth.clear(); return of(router.parseUrl('/login')); }));
  }
  return router.parseUrl('/login');
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() || auth.hasTokens() ? router.parseUrl('/app') : true;
};
