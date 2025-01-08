import React from 'react';
import { Message } from '@/app/types/chat';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      className={`flex ${
        message.role === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[80%] rounded-sm px-4 py-3 font-light ${
          message.role === 'user'
            ? 'bg-black text-white'
            : 'bg-gray-50 border border-gray-200'
        }`}
      >
        <pre className="whitespace-pre-wrap font-mono text-sm">
          {message.content}
        </pre>
      </div>
    </div>
  );
}