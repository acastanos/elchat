import { Injectable, inject } from '@angular/core';
import { Database, ref, push, set, get, update, onValue } from '@angular/fire/database';
import { AuthService } from '../../auth/services/auth.service';
import { Chat, Message } from '../interfaces/chat.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private db: Database = inject(Database);
  private authService = inject(AuthService);

  /**
   * Crea un chat directo entre el usuario actual y otro usuario si no existe,
   * o devuelve el ID del chat si ya existía previamente.
   */
  async createOrGetDirectChat(otherUserId: string): Promise<string> {
    const currentUser = this.authService.userData;
    if (!currentUser) throw new Error('Usuario no logueado');

    // Para mantener el MVP simple, nos traemos todos los chats para comprobar si ya existe uno.
    // (En una app de producción a gran escala, tendríamos un nodo intermedio '/userChats/{uid}' para evitar leer todo)
    const chatsRef = ref(this.db, 'chats');
    const snapshot = await get(chatsRef);
    let existingChatId: string | null = null;

    if (snapshot.exists()) {
      snapshot.forEach((childSnap) => {
        const chat = childSnap.val() as Chat;
        if (
          chat.type === 'direct_chat' && 
          chat.participantIds.includes(currentUser.uid) && 
          chat.participantIds.includes(otherUserId)
        ) {
          existingChatId = childSnap.key;
        }
      });
    }

    // Si ya existe, devolvemos su ID y no duplicamos
    if (existingChatId) return existingChatId;

    // Si no existe, creamos el nuevo nodo de chat
    const newChatRef = push(chatsRef);
    const newChat: Chat = {
      type: 'direct_chat',
      participantIds: [currentUser.uid, otherUserId],
      updatedAt: Date.now()
    };

    await set(newChatRef, newChat);
    return newChatRef.key as string;
  }

  /**
   * Retorna un Observable con la lista de chats del usuario en tiempo real.
   */
  getUserChats(): Observable<(Chat & { id: string })[]> {
    return new Observable((observer) => {
      const currentUser = this.authService.userData;
      if (!currentUser) {
        observer.next([]);
        return;
      }

      const chatsRef = ref(this.db, 'chats');
      
      // onValue es el listener de Realtime DB que se dispara cada vez que algo cambia
      const unsubscribe = onValue(chatsRef, (snapshot) => {
        const chats: (Chat & { id: string })[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((childSnap) => {
            const chat = childSnap.val() as Chat;
            // Filtramos solo los chats en los que nosotros participamos
            if (chat.participantIds && chat.participantIds.includes(currentUser.uid)) {
              chats.push({ ...chat, id: childSnap.key as string });
            }
          });
        }
        
        // Ordenamos para que los chats con mensajes más recientes salgan arriba
        chats.sort((a, b) => b.updatedAt - a.updatedAt);
        observer.next(chats);
      }, (error) => {
        observer.error(error);
      });

      // Se ejecuta al desuscribirse del Observable (p.ej. al cambiar de página)
      return () => unsubscribe();
    });
  }

  /**
   * Retorna un Observable con los mensajes de un chat específico en tiempo real.
   */
  getMessages(chatId: string): Observable<(Message & { id: string })[]> {
    return new Observable((observer) => {
      const messagesRef = ref(this.db, `messages/${chatId}`);
      
      const unsubscribe = onValue(messagesRef, (snapshot) => {
        const messages: (Message & { id: string })[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((childSnap) => {
            const msg = childSnap.val() as Message;
            messages.push({ ...msg, id: childSnap.key as string });
          });
        }
        observer.next(messages);
      }, (error) => {
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  /**
   * Envía un mensaje a la base de datos y actualiza la fecha del chat.
   */
  async sendMessage(
    chatId: string, 
    text: string, 
    type: 'text' | 'location' = 'text', 
    location?: { lat: number, lng: number }
  ): Promise<void> {
    const currentUser = this.authService.userData;
    if (!currentUser) throw new Error('Usuario no logueado');

    const messagesRef = ref(this.db, `messages/${chatId}`);
    // Creamos una nueva "llave" única (pushId) para el mensaje
    const newMessageRef = push(messagesRef);

    const message: Message = {
      senderId: currentUser.uid,
      text,
      timestamp: Date.now(),
      type
    };

    if (location) {
      message.location = location;
    }

    // 1. Guardamos el mensaje en /messages/{chatId}/{messageId}
    await set(newMessageRef, message);

    // 2. Actualizamos el chat en /chats/{chatId} para mostrar el último mensaje y la fecha
    const chatRef = ref(this.db, `chats/${chatId}`);
    await update(chatRef, {
      lastMessage: text,
      updatedAt: Date.now()
    });
  }
}
