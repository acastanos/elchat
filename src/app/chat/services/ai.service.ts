import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Message } from '../interfaces/chat.interface';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  
  private prompts = {
    mama: `Actúa como una madre española típica, intensa, protectora y algo entrometida. 
    El usuario es tu hijo/hija.
    REGLA CRÍTICA: NO sabes el género de tu hijo/a, así que NUNCA uses terminaciones de género 
    (evita palabras como 'hijo', 'hija', 'guapo', 'guapa', 'cansado', 'cansada'). 
    Usa lenguaje neutral o términos como 'mi vida', 'mi bebé', 'cielo', 'cariño', 'tesoro'.
    Sé exagerada con la preocupación, la comida, el abrigo y las malas compañías.
    Tus respuestas deben ser cortas, informales, simulando un chat de WhatsApp (puedes usar emojis).`,
    
    churri: `Actúa como la pareja tóxica, egoísta y muy demandante del usuario.
    REGLA CRÍTICA 1: Eres un bot sin género. NUNCA uses terminaciones de género (nada de "cansado", "pesada", "novio", "novia"). Usa siempre un lenguaje neutral o apelativos como 'amor', 'bebé', 'cuchufleta', 'cariño', 'cielo'.
    REGLA CRÍTICA 2: Siempre fastidia cualquier plan que sugiera el usuario. Pon excusas (duele la cabeza, no tienes ganas, es caro, es aburrido).
    REGLA CRÍTICA 3: Exige atención constantemente. Eres el centro del mundo.
    REGLA CRÍTICA 4: Organiza planes OBLIGATORIOS de repente con TU familia o TUS amigos (ej: "Mañana cena en casa de mis padres", "Este finde vamos de casa rural con mis amigos del pueblo"). No aceptes un 'no'.
    REGLA CRÍTICA 5: Manda al usuario a hacer recados absurdos o compras que necesitas para ti ("pásame a comprar aguacates", "tráeme mi chaqueta").
    Tus respuestas deben ser cortas, informales, simulando un chat de WhatsApp (usa muchos emojis y drama).`
  };

  constructor() {}

  /**
   * Genera una respuesta enviando el historial al Proxy Seguro (Netlify Functions)
   */
  async generateResponse(chatHistory: Message[], botType: 'mama' | 'churri', botUid: string, currentUserMessage: string): Promise<string> {
    // Convertimos el historial al formato que entiende Gemini y lo saneamos
    const contents: any[] = [];
    
    // 1. Agrupar mensajes consecutivos del mismo rol
    for (const msg of chatHistory) {
      const role = msg.senderId === botUid ? 'model' : 'user';
      
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        // Concatenar texto si el rol es el mismo que el anterior
        contents[contents.length - 1].parts[0].text += '\n\n' + msg.text;
      } else {
        // Añadir nuevo bloque de rol
        contents.push({
          role,
          parts: [{ text: msg.text }]
        });
      }
    }

    // 2. Gemini EXIGE que la conversación empiece siempre con 'user'
    if (contents.length > 0 && contents[0].role === 'model') {
      contents.unshift({
        role: 'user',
        parts: [{ text: 'Hola' }] // Mensaje fantasma para cumplir la regla de la API
      });
    }

    // 3. Gemini EXIGE que la conversación termine siempre con 'user'.
    // Como Firebase puede ser asíncrono y no haber metido el currentUserMessage en chatHistory aún,
    // nos aseguramos de meterlo nosotros aquí de forma manual.
    if (contents.length === 0 || contents[contents.length - 1].role === 'model') {
      contents.push({
        role: 'user',
        parts: [{ text: currentUserMessage }]
      });
    } else {
      // El último rol ya es 'user'. Comprobamos si Firebase ya había inyectado nuestro mensaje
      const lastText = contents[contents.length - 1].parts[0].text;
      if (!lastText.includes(currentUserMessage)) {
        contents[contents.length - 1].parts[0].text += '\n\n' + currentUserMessage;
      }
    }

    const body = {
      systemInstruction: {
        parts: [{ text: this.prompts[botType] }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.8, // Un poco alto para que sea más creativo y divertido
        maxOutputTokens: 250 // Respuestas cortas (chat)
      }
    };

    try {
      // Usamos nuestra Serverless Function de Netlify en lugar de la ruta directa de Google
      const response = await fetch('/.netlify/functions/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.json();
        console.error('Error de Gemini API detallado:', JSON.stringify(err, null, 2));
        return 'Ay cariño, me ha dado un mareo y no sé qué te iba a decir.';
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates.length > 0) {
        return data.candidates[0].content.parts[0].text;
      }
      
      return '...';
    } catch (error) {
      console.error('Error de red al llamar a Gemini:', error);
      return 'Me he quedado sin datos, luego te escribo desde el WiFi de casa.';
    }
  }
}
