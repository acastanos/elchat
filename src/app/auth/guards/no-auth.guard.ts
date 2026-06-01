import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.userState$.pipe(
    take(1),
    map(user => {
      // Si el usuario ya está logueado, lo mandamos directo al chat
      // para que no vuelva a ver la pantalla de login/registro
      if (user) {
        router.navigate(['/chat']);
        return false;
      } else {
        return true;
      }
    })
  );
};
