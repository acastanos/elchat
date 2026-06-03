import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
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
  private injector = inject(Injector);

  /**
   * Crea un chat directo entre el usuario actual y otro usuario si no existe,
   * o devuelve el ID del chat si ya existía previamente.
   */
  async createOrGetDirectChat(otherUserId: string): Promise<string> {
    const currentUser = this.authService.userData;
    if (!currentUser) throw new Error('Usuario no logueado');

    return runInInjectionContext(this.injector, async () => {
      // 1. Obtener los chats del usuario actual desde su índice
      const userChatsRef = ref(this.db, `userChats/${currentUser.uid}`);
      const userChatsSnap = await get(userChatsRef);
      
      let existingChatId: string | null = null;

      if (userChatsSnap.exists()) {
        const chatIds = Object.keys(userChatsSnap.val());
        // 2. Comprobar cada chat a ver si es un chat directo con el otro usuario
        for (const chatId of chatIds) {
          const chatSnap = await get(ref(this.db, `chats/${chatId}`));
          if (chatSnap.exists()) {
            const chat = chatSnap.val() as Chat;
            if (chat.type === 'direct_chat' && chat.participantIds.includes(otherUserId)) {
              existingChatId = chatId;
              break;
            }
          }
        }
      }

      // Si ya existe, devolvemos su ID y no duplicamos
      if (existingChatId) return existingChatId;

      // Si no existe, creamos el nuevo nodo de chat principal
      const chatsRef = ref(this.db, 'chats');
      const newChatRef = push(chatsRef);
      const newChat: Chat = {
        type: 'direct_chat',
        participantIds: [currentUser.uid, otherUserId],
        updatedAt: Date.now()
      };

      await set(newChatRef, newChat);
      
      // Creamos las referencias en los índices de ambos usuarios usando update multipath
      await update(ref(this.db), {
        [`userChats/${currentUser.uid}/${newChatRef.key}`]: true,
        [`userChats/${otherUserId}/${newChatRef.key}`]: true
      });

      return newChatRef.key as string;
    });
  }

  /**
   * Retorna un Observable con la lista de chats del usuario en tiempo real.
   */
  getUserChats(): Observable<(Chat & { id: string, otherUserName?: string })[]> {
    return new Observable((observer) => {
      const currentUser = this.authService.userData;
      if (!currentUser) {
        observer.next([]);
        return;
      }

      return runInInjectionContext(this.injector, () => {
        const userChatsRef = ref(this.db, `userChats/${currentUser.uid}`);
        const chatUnsubscribes = new Map<string, () => void>();
        const currentChats = new Map<string, Chat & { id: string, otherUserName?: string }>();
        
        const emitChats = () => {
          const chatsArray = Array.from(currentChats.values());
          chatsArray.sort((a, b) => b.updatedAt - a.updatedAt);
          observer.next(chatsArray);
        };

        const unsubscribe = onValue(userChatsRef, (snapshot) => {
          if (!snapshot.exists()) {
            currentChats.clear();
            emitChats();
            return;
          }

          const chatIds = Object.keys(snapshot.val());
          
          // Limpiamos los listeners de los chats en los que ya no participamos (si nos borrasen)
          for (const [id, unsub] of chatUnsubscribes.entries()) {
            if (!chatIds.includes(id)) {
              unsub();
              chatUnsubscribes.delete(id);
              currentChats.delete(id);
            }
          }

          // Añadimos listeners a los chats nuevos
          chatIds.forEach(chatId => {
            if (!chatUnsubscribes.has(chatId)) {
              const chatRef = ref(this.db, `chats/${chatId}`);
              const unsubChat = onValue(chatRef, async (chatSnap) => {
                if (chatSnap.exists()) {
                  const chat = chatSnap.val() as Chat;
                  const chatObj = { ...chat, id: chatId, otherUserName: 'Chat Privado' };
                  
                  if (chat.type === 'direct_chat') {
                    const otherUid = chat.participantIds.find(id => id !== currentUser.uid);
                    if (otherUid) {
                      const userSnap = await get(ref(this.db, `users/${otherUid}`));
                      if (userSnap.exists()) {
                        const user = userSnap.val();
                        chatObj.otherUserName = user.name || user.displayName || 'Usuario';
                      }
                    }
                  } else if (chat.type === 'ai_chat') {
                    chatObj.otherUserName = 'Gemini AI';
                  }
                  
                  currentChats.set(chatId, chatObj);
                  emitChats();
                }
              });
              chatUnsubscribes.set(chatId, unsubChat);
            }
          });
          
          // Hacemos una emisión inicial por si hay chats que se están procesando
          emitChats();
        }, (error) => {
          observer.error(error);
        });

        // Limpieza total al desuscribirse de la lista general
        return () => {
          unsubscribe();
          for (const unsub of chatUnsubscribes.values()) {
            unsub();
          }
        };
      });
    });
  }

  /**
   * Retorna un Observable con los mensajes de un chat específico en tiempo real.
   */
  getMessages(chatId: string): Observable<(Message & { id: string })[]> {
    return new Observable((observer) => {
      return runInInjectionContext(this.injector, () => {
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

    return runInInjectionContext(this.injector, async () => {
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

      // 2. Comprobamos los participantes del chat
      const chatSnap = await get(ref(this.db, `chats/${chatId}`));
      if (chatSnap.exists()) {
        const chat = chatSnap.val() as Chat;
        
        // 3. Preparamos una actualización masiva (multipath update)
        const updates: Record<string, any> = {
          [`chats/${chatId}/lastMessage`]: text,
          [`chats/${chatId}/updatedAt`]: Date.now()
        };
        
        // 4. Volvemos a añadir el chat a la lista activa de AMBOS usuarios
        // Esto hace que si el 'borrador' había borrado el chat, le vuelva a aparecer
        // cuando el 'mantenedor' le escribe.
        if (chat.participantIds) {
          chat.participantIds.forEach(uid => {
            updates[`userChats/${uid}/${chatId}`] = true;
          });
        }

        // Ejecutamos todos los cambios a la vez de forma atómica
        await update(ref(this.db), updates);
      }
    });
  }

  /**
   * Obtiene la información de un chat por su ID.
   */
  async getChatById(chatId: string): Promise<Chat | null> {
    return runInInjectionContext(this.injector, async () => {
      const chatRef = ref(this.db, `chats/${chatId}`);
      const snapshot = await get(chatRef);
      if (snapshot.exists()) {
        return snapshot.val() as Chat;
      }
      return null;
    });
  }

  /**
   * Elimina un chat de la lista del usuario actual.
   * En realidad, solo elimina la referencia en userChats, por lo que el chat 
   * desaparece para este usuario pero se mantiene para el otro.
   */
  async deleteChat(chatId: string): Promise<void> {
    const currentUser = this.authService.userData;
    if (!currentUser) throw new Error('Usuario no logueado');

    return runInInjectionContext(this.injector, async () => {
      // 1. Eliminamos el chat de nuestra vista (borramos nuestro índice)
      await update(ref(this.db), {
        [`userChats/${currentUser.uid}/${chatId}`]: null
      });
      
      // 2. Comprobamos si el OTRO usuario todavía tiene este chat activo
      const chatSnap = await get(ref(this.db, `chats/${chatId}`));
      if (chatSnap.exists()) {
        const chat = chatSnap.val() as Chat;
        let isChatActiveForSomeone = false;
        
        if (chat.participantIds) {
          for (const uid of chat.participantIds) {
            if (uid === currentUser.uid) continue; // Saltamos a nosotros mismos
            
            const otherUserChatSnap = await get(ref(this.db, `userChats/${uid}/${chatId}`));
            if (otherUserChatSnap.exists()) {
              isChatActiveForSomeone = true;
              break; // Alguien más lo tiene activo, no lo borramos del todo
            }
          }
        }
        
        // 3. Si nadie más lo tiene activo (ambos lo han borrado), destruimos la info permanentemente
        if (!isChatActiveForSomeone) {
          await update(ref(this.db), {
            [`chats/${chatId}`]: null,
            [`messages/${chatId}`]: null
          });
        }
      }
    });
  }
}
