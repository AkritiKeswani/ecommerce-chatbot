export interface Message {
    role: 'user' | 'assistant';
    content: string;
  }
  
  export interface ChatResponse {
    content: string;
    table?: string;
    contextLength?: number;
    error?: string;
  }