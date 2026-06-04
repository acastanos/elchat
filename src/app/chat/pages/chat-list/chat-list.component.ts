import { Component, inject, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon, IonAvatar, IonItem, IonLabel, IonList, IonSearchbar, IonSpinner, IonItemSliding, IonItemOptions, IonItemOption } from '@ionic/angular/standalone';
import { AuthService } from '../../../auth/services/auth.service';
import { ChatService } from '../../services/chat.service';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { logOutOutline, chatbubblesOutline, personOutline, trash } from 'ionicons/icons';
import { User as FirebaseUser } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-chat-list',
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon, IonAvatar, IonItem, IonLabel, IonList, IonSearchbar, IonSpinner, IonItemSliding, IonItemOptions, IonItemOption]
})
export class ChatListComponent implements OnInit {
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private userService = inject(UserService);
  private router = inject(Router);

  @ViewChild(IonList) chatList!: IonList;

  public user$ = this.authService.userState$;
  public chats$!: ReturnType<ChatService['getUserChats']>;

  async ngOnInit() {
    // En la plataforma web, requestPermissions no está implementado y lanza error.
    // La forma de pedir permisos en web es simplemente intentando obtener la ubicación.
    try {
      await Geolocation.getCurrentPosition({ enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 });
    } catch (e) {
      console.warn('El usuario denegó la ubicación o no se pudo obtener en chat-list', e);
    }
  }

  ionViewWillEnter() {
    // Al entrar en la vista nos aseguramos de cargar los chats del usuario actual.
    // Esto es necesario porque Ionic reutiliza las páginas y si hacemos logout
    // y entramos con otra cuenta, debemos refrescar el observable.
    this.chats$ = this.chatService.getUserChats();
  }

  public searchTerm = '';
  public searchResults: FirebaseUser[] = [];
  public isSearching = false;
  public showSearch = false;

  constructor() {
    // Registramos los iconos específicos que vamos a usar
    addIcons({ logOutOutline, chatbubblesOutline, personOutline, trash });
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/auth/login']);
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  }

  goToSettings() {
    this.router.navigate(['/settings']);
  }

  async onSearchChange(event: any) {
    this.searchTerm = event.detail.value || '';
    if (this.searchTerm.trim() === '') {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    try {
      this.searchResults = await this.userService.searchUsersByName(this.searchTerm);
    } catch (error) {
      console.error('Error en búsqueda:', error);
    } finally {
      this.isSearching = false;
    }
  }

  async startChatWith(otherUser: FirebaseUser) {
    try {
      const chatId = await this.chatService.createOrGetDirectChat(otherUser.uid);
      // Limpiamos la búsqueda al entrar al chat
      this.searchTerm = '';
      this.searchResults = [];
      this.router.navigate(['/chat', chatId]);
    } catch (error) {
      console.error('Error al iniciar chat:', error);
    }
  }

  toggleSearch() {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchTerm = '';
      this.searchResults = [];
    }
  }

  openChat(chatId: string) {
    this.router.navigate(['/chat', chatId]);
  }

  async deleteChat(chatId: string) {
    try {
      await this.chatService.deleteChat(chatId);
    } catch (e) {
      console.error('Error al borrar chat:', e);
    }
  }

  // Ocultar la barra de búsqueda al hacer clic fuera de ella
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showSearch) {
      const targetElement = event.target as HTMLElement;
      const clickedInsideSearch = targetElement.closest('.search-container');
      const clickedToggleButton = targetElement.closest('.search-toggle-btn');
      
      if (!clickedInsideSearch && !clickedToggleButton) {
        this.showSearch = false;
        this.searchTerm = '';
        this.searchResults = [];
      }
    }
    
    // Si han hecho clic fuera de una tarjeta, cerrar las opciones deslizadas
    if (this.chatList) {
      const clickedInsideList = (event.target as HTMLElement).closest('ion-list');
      if (!clickedInsideList) {
        this.chatList.closeSlidingItems();
      }
    }
  }
}
