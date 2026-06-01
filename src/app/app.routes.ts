import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: 'chat',
    loadChildren: () => import('./chat/chat.routes').then(m => m.chatRoutes)
  },
  {
    path: '**',
    redirectTo: 'auth'

  }
];
