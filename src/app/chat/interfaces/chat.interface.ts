export interface Chat {
  id?: string;
  type: 'direct_chat' | 'ai_chat';
  participantIds: string[]; // Array de UIDs de los participantes (por ejemplo, el usuario actual y el otro usuario, o Gemini)
  lastMessage?: string;
  updatedAt: number;
}

export interface Message {
  id?: string;
  senderId: string;
  text: string;
  timestamp: number;
  type: 'text' | 'location';
  location?: {
    lat: number;
    lng: number;
  };
}
