import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Database, ref, push, set, get, update, onValue, query, orderByChild, endBefore, startAfter, limitToLast, limitToFirst, endAt, onChildAdded } from '@angular/fire/database';
import { AuthService } from '../../auth/services/auth.service';
import { Chat, Message } from '../interfaces/chat.interface';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private db: Database = inject(Database);
  private authService = inject(AuthService);
  private injector = inject(Injector);

  // --- Estado del Chat Activo (Infinite Scroll) ---
  public activeChatMessages$ = new BehaviorSubject<(Message & { id: string, isFirstUnread?: boolean })[]>([]);
  public hasMoreOlder = true;
  public hasMoreNewer = true;
  private currentChatId: string | null = null;
  private realtimeUnsub?: () => void;
  private oldestTimestamp: number = 0;
  private newestTimestamp: number = 0;
  private currentMessagesMap = new Map<string, Message & { id: string, isFirstUnread?: boolean }>();
  // ------------------------------------------------

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
        [`userChats/${currentUser.uid}/${newChatRef.key}/active`]: true,
        [`userChats/${otherUserId}/${newChatRef.key}/active`]: true
      });

      return newChatRef.key as string;
    });
  }

  /**
   * Retorna un Observable con la lista de chats del usuario en tiempo real.
   */
  getUserChats(): Observable<(Chat & { id: string, otherUserName?: string, otherUserAvatar?: string | null, displayLastMessage?: string })[]> {
    return new Observable((observer) => {
      const currentUser = this.authService.userData;
      if (!currentUser) {
        observer.next([]);
        return;
      }

      return runInInjectionContext(this.injector, () => {
        const userChatsRef = ref(this.db, `userChats/${currentUser.uid}`);
        const chatUnsubscribes = new Map<string, () => void>();
        const currentChats = new Map<string, Chat & { id: string, otherUserName?: string, otherUserAvatar?: string | null, displayLastMessage?: string }>();
        
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
                  const chatObj: Chat & { id: string, otherUserName?: string, otherUserAvatar?: string | null, displayLastMessage?: string } = { 
                    ...chat, 
                    id: chatId, 
                    otherUserName: 'Chat Privado', 
                    otherUserAvatar: null 
                  };
                  
                  if (chat.type === 'direct_chat') {
                    const otherUid = chat.participantIds.find(id => id !== currentUser.uid);
                    if (otherUid) {
                      const userSnap = await get(ref(this.db, `users/${otherUid}`));
                      if (userSnap.exists()) {
                        const user = userSnap.val();
                        chatObj.otherUserName = user.name || user.displayName || 'Usuario';
                        chatObj.otherUserAvatar = user.photoURL || null;
                      }
                    }
                  } else if (chat.type === 'ai_chat') {
                    chatObj.otherUserName = 'Gemini AI';
                    // La IA usará el appIcon.png por defecto en el HTML
                  }
                  
                  if (chat.lastMessage) {
                    if (chat.lastMessageSenderId === currentUser.uid) {
                      chatObj.displayLastMessage = `Tú: ${chat.lastMessage}`;
                    } else {
                      chatObj.displayLastMessage = `${chatObj.otherUserName}: ${chat.lastMessage}`;
                    }
                  } else {
                    chatObj.displayLastMessage = 'Envía el primer mensaje...';
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
   * Retorna el Observable del chat activo.
   */
  getMessages(chatId: string): Observable<(Message & { id: string, isFirstUnread?: boolean })[]> {
    return this.activeChatMessages$.asObservable();
  }

  async getUserLastRead(chatId: string): Promise<number | null> {
    const currentUser = this.authService.userData;
    if (!currentUser) return null;
    const snap = await get(ref(this.db, `userChats/${currentUser.uid}/${chatId}/lastRead`));
    return snap.exists() ? snap.val() : null;
  }

  async markChatAsRead(chatId: string): Promise<void> {
    const currentUser = this.authService.userData;
    if (!currentUser) return;
    
    // Guardamos el timestamp del mensaje más reciente que se ha renderizado.
    // Si no hay mensajes cargados, usamos el tiempo actual.
    const timestampToSave = this.newestTimestamp > 0 ? this.newestTimestamp : Date.now();
    
    await update(ref(this.db), {
      [`userChats/${currentUser.uid}/${chatId}/lastRead`]: timestampToSave
    });
  }

  async initChatState(chatId: string) {
    this.currentChatId = chatId;
    this.currentMessagesMap.clear();
    this.activeChatMessages$.next([]);
    this.hasMoreOlder = true;
    this.hasMoreNewer = true;
    if (this.realtimeUnsub) {
      this.realtimeUnsub();
      this.realtimeUnsub = undefined;
    }

    const lastRead = await this.getUserLastRead(chatId);
    
    return runInInjectionContext(this.injector, async () => {
      const messagesRef = ref(this.db, `messages/${chatId}`);
      
      // Si el chat se ha marcado como no leído, lastRead es 0.
      if (lastRead === 0) {
        console.log('[Pagination] Chat marcado como NO LEÍDO (lastRead = 0). Cargando desde el principio.');
        const qNewer = query(messagesRef, orderByChild('timestamp'), startAfter(0), limitToFirst(10));
        const snapNewer = await get(qNewer);
        
        if (snapNewer.exists()) {
          let firstUnread = true;
          snapNewer.forEach((childSnapshot) => {
            const msg = { ...childSnapshot.val(), id: childSnapshot.key as string, isFirstUnread: firstUnread };
            firstUnread = false;
            this.currentMessagesMap.set(msg.id, msg);
          });
          this.hasMoreOlder = false; // Estamos al principio
          this.hasMoreNewer = snapNewer.size === 10;
        } else {
          this.hasMoreOlder = false;
          this.hasMoreNewer = false;
        }
        this.emitMessages();
        if (!this.hasMoreNewer) this.startRealtimeListener();
        return;
      }
      
      // Si lastRead es null/undefined, significa que no hay registro, cargamos los últimos 10
      if (!lastRead) {
        console.log('[Pagination] No hay registro previo. Cargando los 10 más recientes.');
        const q = query(messagesRef, orderByChild('timestamp'), limitToLast(10));
        const snap = await get(q);
        this.processSnapshot(snap);
        this.hasMoreOlder = snap.size === 10;
        this.hasMoreNewer = false;
        this.emitMessages();
        this.startRealtimeListener();
        return;
      }

      console.log(`[Pagination] Evaluando mensajes desde lastRead: ${lastRead}`);
      
      // Cargamos 10 anteriores (incluyendo el lastRead o cercano)
      const qOlder = query(messagesRef, orderByChild('timestamp'), endAt(lastRead), limitToLast(10));
      const snapOlder = await get(qOlder);
      
      // Comprobamos si hay mensajes nuevos después de lastRead
      const qNewer = query(messagesRef, orderByChild('timestamp'), startAfter(lastRead), limitToFirst(10));
      const snapNewer = await get(qNewer);

      if (snapNewer.exists()) {
        console.log(`[Pagination] Hay mensajes sin leer. Cargando entorno del lastRead.`);
        this.processSnapshot(snapOlder);
        this.hasMoreOlder = snapOlder.size === 10;

        let firstUnread = true;
        snapNewer.forEach((childSnapshot) => {
          const msg = { ...childSnapshot.val(), id: childSnapshot.key as string, isFirstUnread: firstUnread };
          firstUnread = false;
          this.currentMessagesMap.set(msg.id, msg);
        });
        
        this.hasMoreNewer = snapNewer.size === 10;
        this.emitMessages();
        
        if (!this.hasMoreNewer) {
          this.startRealtimeListener();
        }
      } else {
        console.log('[Pagination] No hay mensajes sin leer. Mostrar los últimos 10.');
        this.processSnapshot(snapOlder);
        this.hasMoreOlder = snapOlder.size === 10;
        this.hasMoreNewer = false;
        this.emitMessages();
        this.startRealtimeListener();
      }
    });
  }

  private processSnapshot(snapshot: any) {
    if (snapshot.exists()) {
      snapshot.forEach((childSnap: any) => {
        const msg = { ...childSnap.val(), id: childSnap.key as string };
        this.currentMessagesMap.set(msg.id, msg);
      });
    }
  }

  private emitMessages() {
    const arr = Array.from(this.currentMessagesMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    if (arr.length > 0) {
      this.oldestTimestamp = arr[0].timestamp;
      this.newestTimestamp = arr[arr.length - 1].timestamp;
    }
    this.activeChatMessages$.next(arr);
  }

  async loadOlderMessages() {
    if (!this.hasMoreOlder || !this.currentChatId) return;
    const messagesRef = ref(this.db, `messages/${this.currentChatId}`);
    const q = query(messagesRef, orderByChild('timestamp'), endBefore(this.oldestTimestamp), limitToLast(10));
    const snap = await get(q);
    if (snap.exists()) {
      this.processSnapshot(snap);
      this.emitMessages();
      if (snap.size < 10) this.hasMoreOlder = false;
    } else {
      this.hasMoreOlder = false;
    }
  }

  async loadNewerMessages() {
    if (!this.hasMoreNewer || !this.currentChatId) return;
    const messagesRef = ref(this.db, `messages/${this.currentChatId}`);
    const q = query(messagesRef, orderByChild('timestamp'), startAfter(this.newestTimestamp), limitToFirst(10));
    const snap = await get(q);
    if (snap.exists()) {
      this.processSnapshot(snap);
      this.emitMessages();
      if (snap.size < 10) {
        this.hasMoreNewer = false;
        this.startRealtimeListener();
      }
    } else {
      this.hasMoreNewer = false;
      this.startRealtimeListener();
    }
  }

  private startRealtimeListener() {
    if (this.realtimeUnsub || !this.currentChatId) return;
    const messagesRef = ref(this.db, `messages/${this.currentChatId}`);
    // Escuchamos a partir del último mensaje cargado (si hay)
    const q = this.newestTimestamp > 0 
      ? query(messagesRef, orderByChild('timestamp'), startAfter(this.newestTimestamp))
      : query(messagesRef, orderByChild('timestamp'));
      
    this.realtimeUnsub = onChildAdded(q, (snapshot) => {
      if (snapshot.exists()) {
        const msg = { ...snapshot.val(), id: snapshot.key as string };
        this.currentMessagesMap.set(msg.id, msg);
        this.emitMessages();
      }
    });
  }

  // Se llamará cuando enviemos un mensaje para reiniciar la vista al final si estábamos explorando el pasado
  async resetToBottom() {
    if (!this.currentChatId) return;
    this.realtimeUnsub?.();
    this.realtimeUnsub = undefined;
    this.currentMessagesMap.clear();
    
    const messagesRef = ref(this.db, `messages/${this.currentChatId}`);
    const q = query(messagesRef, orderByChild('timestamp'), limitToLast(20));
    const snap = await get(q);
    this.processSnapshot(snap);
    this.hasMoreNewer = false;
    this.hasMoreOlder = true;
    this.emitMessages();
    this.startRealtimeListener();
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
          [`chats/${chatId}/lastMessageSenderId`]: currentUser.uid,
          [`chats/${chatId}/updatedAt`]: Date.now()
        };
        
        // 4. Volvemos a añadir el chat a la lista activa de AMBOS usuarios
        // Esto hace que si el 'borrador' había borrado el chat, le vuelva a aparecer
        // cuando el 'mantenedor' le escribe.
        if (chat.participantIds) {
          chat.participantIds.forEach(uid => {
            updates[`userChats/${uid}/${chatId}/active`] = true;
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

  /**
   * PELIGRO: Método de administrador para reiniciar toda la base de datos de chats.
   * Solo autorizado para kenantxu@gmail.com
   */
  async wipeAllChats(): Promise<void> {
    const currentUser = this.authService.userData;
    if (!currentUser) {
      throw new Error('No autorizado.');
    }

    return runInInjectionContext(this.injector, async () => {
      // Verificamos el rol en la base de datos
      const userSnap = await get(ref(this.db, `users/${currentUser.uid}`));
      const userProfile = userSnap.val();
      
      if (userProfile?.role !== 'admin') {
        throw new Error('No autorizado. Solo administradores pueden realizar esta acción.');
      }

      await update(ref(this.db), {
        'chats': null,
        'messages': null,
        'userChats': null
      });
    });
  }

  /**
   * PELIGRO: Método de administrador para marcar TODOS los chats de TODOS los usuarios como NO LEÍDOS.
   */
  async markAllChatsAsUnread(): Promise<void> {
    const currentUser = this.authService.userData;
    if (!currentUser) {
      throw new Error('No autorizado.');
    }

    return runInInjectionContext(this.injector, async () => {
      const userSnap = await get(ref(this.db, `users/${currentUser.uid}`));
      const userProfile = userSnap.val();
      
      if (userProfile?.role !== 'admin') {
        throw new Error('No autorizado. Solo administradores pueden realizar esta acción.');
      }

      const userChatsSnap = await get(ref(this.db, 'userChats'));
      if (userChatsSnap.exists()) {
        const updates: any = {};
        userChatsSnap.forEach(userNode => {
          const userId = userNode.key;
          userNode.forEach(chatNode => {
            const chatId = chatNode.key;
            updates[`userChats/${userId}/${chatId}/lastRead`] = 0;
          });
        });
        
        if (Object.keys(updates).length > 0) {
          console.log('[Admin] Marcando todos los chats como NO leídos...');
          await update(ref(this.db), updates);
        }
      }
    });
  }
}
