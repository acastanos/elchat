import { Component, inject, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButtons, IonBackButton, IonFooter, 
  IonButton, IonIcon, IonSpinner, IonAvatar, IonTextarea,
  IonInfiniteScroll, IonInfiniteScrollContent
} from '@ionic/angular/standalone';
import { ChatService } from '../../services/chat.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Message } from '../../interfaces/chat.interface';
import { addIcons } from 'ionicons';
import { send, locationOutline } from 'ionicons/icons';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-chat-detail',
  templateUrl: './chat-detail.component.html',
  styleUrls: ['./chat-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, 
    IonContent, IonButtons, IonBackButton, IonFooter, 
    IonButton, IonIcon, IonSpinner, IonAvatar, IonTextarea,
    IonInfiniteScroll, IonInfiniteScrollContent
  ]
})
export class ChatDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  public chatService = inject(ChatService);
  private userService = inject(UserService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  public chatId: string = '';
  public otherUserName: string = 'Cargando...';
  public otherUserAvatar: string | null = null;
  public messages$!: Observable<(Message & { id: string, isFirstUnread?: boolean })[]>;
  public currentUserUid = this.authService.userData?.uid;
  public isSending = false;
  private isFirstLoad = true;
  public isInitialLoadComplete = false;
  
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  
  private watchId: string | null = null;
  public currentLocation: { lat: number, lng: number } | null = null;

  public messageForm: FormGroup = this.fb.group({
    text: ['', [Validators.required, Validators.maxLength(500)]]
  });

  constructor() {
    addIcons({ send, locationOutline });
  }

  async ngOnInit() {
    this.chatId = this.route.snapshot.paramMap.get('id') || '';
    if (this.chatId) {
      this.messages$ = this.chatService.getMessages(this.chatId).pipe(
        tap((messages) => {
          if (this.isFirstLoad && messages.length > 0) {
            this.isFirstLoad = false;
            setTimeout(() => {
              const unreadMsg = messages.find(m => m.isFirstUnread);
              if (unreadMsg && this.content) {
                const el = document.getElementById('msg-' + unreadMsg.id);
                if (el) {
                  this.content.getScrollElement().then(scrollEl => {
                    const elRect = el.getBoundingClientRect();
                    const scrollRect = scrollEl.getBoundingClientRect();
                    const currentScroll = scrollEl.scrollTop;
                    
                    // Posición Y absoluta del elemento dentro del scroll
                    const absoluteY = elRect.top - scrollRect.top + currentScroll;
                    
                    // Calculamos target Y para que el elemento quede en el tercio superior/centro
                    const targetY = absoluteY - (scrollEl.clientHeight / 3);
                    
                    this.content.scrollToPoint(0, targetY > 0 ? targetY : 0, 300);
                  });
                }
              } else if (this.content) {
                this.content.scrollToBottom(300);
              }
              // Habilitamos los Infinite Scrolls una vez terminada la carga y el ajuste de scroll
              setTimeout(() => {
                this.isInitialLoadComplete = true;
              }, 400); // Dar un poco de margen para que acabe el scroll (300ms)
            }, 150); // Ligeramente más tiempo para asegurar renderizado completo
          }
        })
      );
      
      try {
        // Inicializamos el estado del chat en el servicio
        await this.chatService.initChatState(this.chatId);

        const chat = await this.chatService.getChatById(this.chatId);
        if (chat && chat.type === 'direct_chat') {
          const otherUid = chat.participantIds.find(id => id !== this.currentUserUid);
          if (otherUid) {
            const user = await this.userService.getUserById(otherUid);
            if (user) {
              this.otherUserName = user.name || 'Usuario';
              this.otherUserAvatar = user.photoURL || null;
            } else {
              this.otherUserName = 'Usuario Desconocido';
              this.otherUserAvatar = null;
            }
          }
        } else if (chat && chat.type === 'ai_chat') {
          this.otherUserName = 'Gemini AI';
        } else {
          this.otherUserName = 'Chat';
        }
      } catch (e) {
        console.error('Error cargando la info del chat', e);
        this.otherUserName = 'Chat';
      }

      // Empezamos a rastrear la posición del usuario de forma pasiva
      try {
        // Solicitamos una ubicación inicial de inmediato para tener algo en caché
        Geolocation.getCurrentPosition({ enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }).then(pos => {
          if (!this.currentLocation) {
            this.currentLocation = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            };
          }
        }).catch(err => console.log('Error obteniendo ubicación inicial', err));

        // Y dejamos el watchPosition para actualizaciones en segundo plano
        this.watchId = await Geolocation.watchPosition({ enableHighAccuracy: false }, (position, err) => {
          if (position) {
            this.currentLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
          }
        });
      } catch (e) {
        console.error('Error al iniciar watchPosition', e);
      }
    }
  }

  // Usamos los hooks nativos de Ionic porque ngOnDestroy puede no dispararse al hacer "back"
  async ionViewWillLeave() {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }
    // Guardar el cursor de lectura al salir del chat
    if (this.chatId) {
      await this.chatService.markChatAsRead(this.chatId);
    }
  }

  async loadOlder(event: any) {
    await this.chatService.loadOlderMessages();
    event.target.complete();
    event.target.disabled = !this.chatService.hasMoreOlder;
  }

  async loadNewer(event: any) {
    await this.chatService.loadNewerMessages();
    event.target.complete();
    event.target.disabled = !this.chatService.hasMoreNewer;
  }

  async sendMessage() {
    if (this.messageForm.invalid) return;

    const text = this.messageForm.get('text')?.value;
    // Si el texto está vacío o solo contiene espacios, no enviamos
    if (!text || text.trim() === '') return;

    this.isSending = true;

    try {
      // Enviamos el mensaje de texto, adjuntando la ubicación actual si la tenemos
      if (this.currentLocation) {
        await this.chatService.sendMessage(this.chatId, text.trim(), 'text', this.currentLocation);
      } else {
        await this.chatService.sendMessage(this.chatId, text.trim(), 'text');
      }
      // Reseteamos el formulario
      this.messageForm.reset();
      
      // Reseteamos la vista al último mensaje si estábamos navegando por el pasado
      await this.chatService.resetToBottom();
      
      // Forzar scroll al enviar
      setTimeout(() => {
        if (this.content) {
          this.content.scrollToBottom(300);
        }
      }, 50);
      
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    } finally {
      this.isSending = false;
    }
  }

  onEnterPressed(event: any) {
    // Si el usuario pulsa Shift + Enter, permitimos el salto de línea normal
    if (!event.shiftKey) {
      event.preventDefault(); // Evitamos que se añada un salto de línea en el textarea
      this.sendMessage();
    }
  }
}
