import { Injectable, inject } from '@angular/core';
import { Database, ref, get, set } from '@angular/fire/database';
import { AuthService } from '../../auth/services/auth.service';
import { ChatService } from './chat.service';

@Injectable({
  providedIn: 'root'
})
export class AiOrchestratorService {
  private db: Database = inject(Database);
  private authService = inject(AuthService);
  private chatService = inject(ChatService);

  private mamaPhrases = [
    "Tenías mala cara ayer, ¿estás durmiendo bien?",
    "¡Seguro que saliste de fiesta ayer! A ver si llamas que no sé nada de ti, sinvergüenza.",
    "Te estás quedando en los huesos, te voy a preparar un tupper con croquetas para que te lleves.",
    "Abrígate bien que refresca por la tarde, luego vienen los resfriados.",
    "¿Has comido ya? Que luego te pones a hacer cosas y se te olvida alimentarte.",
    "Llámame cuando llegues, que me quedo intranquila.",
    "He visto unas ofertas en el supermercado y te he comprado unas cosas, pásate luego.",
    "Tanto móvil y tanta pantalla... ¡te vas a quedar sin ojos!",
    "A ver cuándo vienes a verme, que parece que cobro entrada.",
    "Recoge tu cuarto de una vez, que parece una leonera.",
    "¿Qué tal en el trabajo? No te estreses demasiado, lo primero es la salud.",
    "Hazme caso a mí, que soy tu madre y sé de lo que hablo."
  ];

  private churriPhrases = [
    "¿Holaaa? Me ha parecido ver un destello de luz al otro lado de la pantalla...",
    "Sé que estás a mil cosas, pero echo de menos un ratito",
    "Llevo un rato contándote mi drama del día y me acabo de dar cuenta de que le estoy hablando a la pared. Cuando salgas de la cueva, avísame.",
    "Oye, si vas a ignorarme con esa elegancia, avísame y me busco un hobby nuevo para las tardes.",
    "¿Te queda mucho para terminar? Que me aburro sin ti...",
    "Acabo de ver a alguien por la calle clavadito a ti y casi voy a saludar, luego me he acordado de que tú no existes últimamente.",
    "¿Estás con otra gente o qué? Dime que al menos que no te lo estás pasando bien sin mí...",
    "He comprado entradas para el cine este viernes. Recogeme a las 20:00.",
    "¿Me estás leyendo o estás haciendo scroll en el móvil y pasando de mí?",
    "Si tardas 5 minutos más en contestar asumo que te has fugado a otro país.",
    "Te escribo para recordarte que existo. De nada.",
    "¿Qué haces que es más importante que hacerme caso a mí?",
    "Mañana viene mi familia a comer. Tienes que estar aquí a las 14:00, no hagas planes.",
    "Por favor dime que no me vas a dejar sin salir esta noche.",
    "Oye, ¿puedes pasar por el supermercado luego? Me tienes que comprar unas cosas.",
    "A veces dudo si somos pareja o simplemente conocidos que se escriben de vez en cuando.",
    "¡Ey! Que llevo esperando todo el día a que digas algo.",
    "No sé si me enfada más que pases de mí o que yo siga escribiendo.",
    "He reservado para cenar el sábado con mis amigos. Ya les he dicho que vas.",
    "Si no me vas a contestar dime algo y me pongo Netflix.",
    "A ver si sacas 5 minutitos para tu pareja entre tanta vida social que tienes.",
    "Dime que sí a lo que te he preguntado antes, venga por fiii.",
    "¿Sigues entre los vivos? Manifiéstate"
  ];

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
