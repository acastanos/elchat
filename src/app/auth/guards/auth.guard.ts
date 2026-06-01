import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.userState$.pipe(
    take(1),
    map(user => {
      // Si hay usuario, permitimos el acceso
      if (user) {
        return true;
      } else {
        // Si no hay usuario, lo redirigimos al login
        router.navigate(['/auth/login']);
        return false;
      }
    })
  );
};
