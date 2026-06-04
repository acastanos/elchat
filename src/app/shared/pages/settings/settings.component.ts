import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton, IonIcon, AlertController, ToastController } from '@ionic/angular/standalone';
import { AuthService } from '../../../auth/services/auth.service';
import { ChatService } from '../../../chat/services/chat.service';
import { UserService } from '../../../chat/services/user.service';
import { addIcons } from 'ionicons';
import { warningOutline, trashOutline } from 'ionicons/icons';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton, IonIcon]
})
export class SettingsComponent implements OnInit {
  public authService = inject(AuthService);
  private chatService = inject(ChatService);
  private userService = inject(UserService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  public isAdmin = false;

  constructor() {
    addIcons({ warningOutline, trashOutline });
  }

  async ngOnInit() {
    const uid = this.authService.userData?.uid;
    if (uid) {
      const userProfile = await this.userService.getUserById(uid);
      if (userProfile && userProfile.role === 'admin') {
        this.isAdmin = true;
      }
    }
  }

  async confirmWipeAll() {
    const alert = await this.alertController.create({
      header: '¡Peligro! Acción Destructiva',
      message: '¿Estás completamente seguro de que quieres <strong>borrar TODAS las conversaciones</strong> de todos los usuarios? Esta acción no se puede deshacer.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        }, {
          text: 'Sí, borrar TODO',
          cssClass: 'danger',
          handler: () => {
            this.executeWipe();
          }
        }
      ]
    });

    await alert.present();
  }

  private async executeWipe() {
    try {
      await this.chatService.wipeAllChats();
      const toast = await this.toastController.create({
        message: 'Base de datos reiniciada con éxito.',
        duration: 3000,
        color: 'success'
      });
      toast.present();
    } catch (e: any) {
      const toast = await this.toastController.create({
        message: e.message || 'Error al reiniciar la base de datos.',
        duration: 3000,
        color: 'danger'
      });
      toast.present();
    }
  }

  async confirmMarkAllUnread() {
    const alert = await this.alertController.create({
      header: 'Confirmación',
      message: '¿Marcar todas las conversaciones de todos los usuarios como "No Leídas"?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        }, {
          text: 'Sí',
          handler: () => {
            this.executeMarkAllUnread();
          }
        }
      ]
    });
    await alert.present();
  }

  private async executeMarkAllUnread() {
    try {
      await this.chatService.markAllChatsAsUnread();
      const toast = await this.toastController.create({
        message: 'Chats marcados como no leídos con éxito.',
        duration: 3000,
        color: 'success'
      });
      toast.present();
    } catch (e: any) {
      const toast = await this.toastController.create({
        message: e.message || 'Error al marcar como no leídos.',
        duration: 3000,
        color: 'danger'
      });
      toast.present();
    }
  }
}
