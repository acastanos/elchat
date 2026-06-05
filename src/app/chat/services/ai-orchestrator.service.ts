import { Injectable, inject } from '@angular/core';
import { Database, ref, get, set } from '@angular/fire/database';
import { AuthService } from '../../auth/services/auth.service';
import { ChatService } from './chat.service';
import aiRoles from './ia-roles/ai-roles.json';

@Injectable({
  providedIn: 'root'
})
export class AiOrchestratorService {
  private db: Database = inject(Database);
  private authService = inject(AuthService);
  private chatService = inject(ChatService);

  private mamaPhrases: string[] = aiRoles.phrases.mama;
  private churriPhrases: string[] = aiRoles.phrases.churri;

  private messageSubscription: any;

  constructor() {
    // Al arrancar, nos suscribimos al estado del usuario.
    // Solo cuando hay un usuario activo (login exitoso), inicializamos la orquestación.
    this.authService.userState$.subscribe(user => {
      if (user) {
        this.initBots();
        this.listenToUserMessages();
      } else {
        if (this.messageSubscription) {
          this.messageSubscription.unsubscribe();
          this.messageSubscription = null;
        }
      }
    });
  }

  private async initBots() {
    try {
      // 1. Aseguramos que los bots existen en la base de datos de usuarios (y actualizamos su foto si cambia)
      await this.ensureBotExists('ai_mama', 'Mamá', 'https://ionicframework.com/docs/img/demos/avatar.svg');
      await this.ensureBotExists('ai_churri', 'Mi amor churri', 'https://ionicframework.com/docs/img/demos/avatar.svg');

      // 2. Comprobamos/creamos los chats predefinidos para este usuario
      const mamaChatId = await this.chatService.createOrGetDirectChat('ai_mama', 'ai_chat');
      const churriChatId = await this.chatService.createOrGetDirectChat('ai_churri', 'ai_chat');

      // 3. Evaluamos si Mamá tiene que enviar un mensaje automático
      await this.evaluateMamaCooldown(mamaChatId);

    } catch (error) {
      console.error('[AiOrchestrator] Error inicializando bots:', error);
    }
  }

  /**
   * Crea el perfil del bot en /users si no existe previamente
   */
  private async ensureBotExists(uid: string, name: string, photoURL: string) {
    const botRef = ref(this.db, `users/${uid}`);
    const botSnap = await get(botRef);
    
    if (!botSnap.exists()) {
      await set(botRef, {
        uid,
        name,
        nameLowercase: name.toLowerCase(),
        photoURL,
        role: 'bot'
      });
      console.log(`[AiOrchestrator] Bot ${name} creado en la BBDD.`);
    } else {
      // Si ya existe, comprobamos si la foto o el nombre han cambiado en el código para actualizarlo
      const currentData = botSnap.val();
      if (currentData.photoURL !== photoURL || currentData.name !== name) {
        await set(botRef, { ...currentData, photoURL, name, nameLowercase: name.toLowerCase() });
        console.log(`[AiOrchestrator] Bot ${name} actualizado con nuevo avatar/nombre.`);
      }
    }
  }

  /**
   * Evalúa si ha pasado el tiempo suficiente (cooldown) para que Mamá inicie una conversación.
   */
  private async evaluateMamaCooldown(chatId: string) {
    const chat = await this.chatService.getChatById(chatId);
    
    if (chat) {
      const now = Date.now();
      const fourHoursInMs = 4 * 60 * 60 * 1000;
      
      // Si nunca han hablado (no hay updatedAt) o si ha pasado el cooldown (4 horas sin actividad en el chat)
      if (!chat.updatedAt || (now - chat.updatedAt) > fourHoursInMs) {
        
        // Evitamos que Mamá hable si el último mensaje ya es de ella y el usuario no le ha respondido.
        if (chat.lastMessageSenderId !== 'ai_mama') {
          console.log('[AiOrchestrator] Mamá va a enviar un mensaje automático (pasó el cooldown).');
          const randomPhrase = this.mamaPhrases[Math.floor(Math.random() * this.mamaPhrases.length)];
          
          // Enviamos el mensaje simulando que somos ai_mama. 
          // Atención: Usamos la lógica del ChatService para enviar en nombre del bot.
          await this.chatService.sendBotMessage(chatId, randomPhrase, 'ai_mama');
        }
      } else {
        console.log('[AiOrchestrator] Cooldown de Mamá activo. No se envía mensaje.');
      }
    }
  }

  /**
   * Se suscribe a los mensajes del usuario para lanzar quejas aleatorias de "Mi amor churri"
   * cuando habla con otros.
   */
  private listenToUserMessages() {
    if (!this.messageSubscription) {
      this.messageSubscription = this.chatService.messageSent$.subscribe(async ({ chatId }) => {
        try {
          const churriChatId = await this.chatService.createOrGetDirectChat('ai_churri', 'ai_chat');
          
          // Solo si el usuario manda un mensaje a alguien que NO es el Churri
          if (chatId !== churriChatId) {
            // Probabilidad del 40%
            if (Math.random() < 0.4) {
              const randomPhrase = this.churriPhrases[Math.floor(Math.random() * this.churriPhrases.length)];
              
              // Enviamos el mensaje quejica
              console.log('[AiOrchestrator] El Churri interrumpe con probabilidad del 40%.');
              await this.chatService.sendBotMessage(churriChatId, randomPhrase, 'ai_churri');
            }
          }
        } catch (error) {
          console.error('[AiOrchestrator] Error en la interrupción del churri:', error);
        }
      });
    }
  }
}
