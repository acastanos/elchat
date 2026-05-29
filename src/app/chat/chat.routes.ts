import { Routes } from '@angular/router';

export const chatRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/chat-list/chat-list.component').then(m => m.ChatListComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/chat-detail/chat-detail.component').then(m => m.ChatDetailComponent)
  }
];
