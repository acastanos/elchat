import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButtons, IonBackButton, IonFooter, 
  IonInput, IonButton, IonIcon, IonSpinner, IonAvatar, IonTextarea
} from '@ionic/angular/standalone';
import { ChatService } from '../../services/chat.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Observable } from 'rxjs';
import { Message } from '../../interfaces/chat.interface';
import { addIcons } from 'ionicons';
import { send, locationOutline } from 'ionicons/icons';

@Component({
  selector: 'app-chat-detail',
  templateUrl: './chat-detail.component.html',
  styleUrls: ['./chat-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, 
    IonContent, IonButtons, IonBackButton, IonFooter, 
    IonInput, IonButton, IonIcon, IonSpinner, IonAvatar, IonTextarea
  ]
})
export class ChatDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private chatService = inject(ChatService);
  private userService = inject(UserService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  public chatId: string = '';
  public otherUserName: string = 'Cargando...';
  public otherUserAvatar: string | null = null;
  public messages$!: Observable<(Message & { id: string })[]>;
  public currentUserUid = this.authService.userData?.uid;
  public isSending = false;

  public messageForm: FormGroup = this.fb.group({
    text: ['', [Validators.required, Validators.maxLength(500)]]
  });

  constructor() {
    addIcons({ send, locationOutline });
  }

  async ngOnInit() {
    this.chatId = this.route.snapshot.paramMap.get('id') || '';
    if (this.chatId) {
      this.messages$ = this.chatService.getMessages(this.chatId);
      
      try {
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
    }
  }

  async sendMessage() {
    if (this.messageForm.invalid) return;

    const text = this.messageForm.get('text')?.value;
    this.isSending = true;

    try {
      // Por ahora no enviamos la geolocalización real,
      // la añadiremos en la tarea correspondiente del plugin.
      await this.chatService.sendMessage(this.chatId, text, 'text');
      this.messageForm.reset();
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    } finally {
      this.isSending = false;
    }
  }
}
