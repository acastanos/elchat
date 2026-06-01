import { Routes } from '@angular/router';
import { noAuthGuard } from './auth/guards/no-auth.guard';
import { authGuard } from './auth/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes),
    canActivate: [noAuthGuard]
  },
  {
    path: 'chat',
    loadChildren: () => import('./chat/chat.routes').then(m => m.chatRoutes),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'auth'

  }
];
