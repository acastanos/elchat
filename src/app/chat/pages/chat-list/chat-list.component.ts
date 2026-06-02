import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon, IonAvatar, IonItem, IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/angular/standalone';
import { AuthService } from '../../../auth/services/auth.service';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';

@Component({
  selector: 'app-chat-list',
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon, IonAvatar, IonItem, IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent]
})
export class ChatListComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  public user$ = this.authService.userState$;

  constructor() {
    // Registramos el icono específico que vamos a usar
    addIcons({ logOutOutline });
  }

  async logout() {
    try {
      await this.authService.logout();
      // El guard no-auth debería encargarse y el authGuard nos echará,
      // pero forzamos la redirección por si acaso para mejor UX.
      this.router.navigate(['/auth/login']);
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  }
}
