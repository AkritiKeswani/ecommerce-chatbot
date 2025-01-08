'use client';

import { useState, useRef, useEffect } from 'react';
import ChatInput from './components/ui/ChatInput';
import ChatMessage from './components/ui/ChatMessage';
import { Message, ChatResponse } from '../types/chat';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage: Message = { role: 'user', content: input };

    try {
      setMessages(prev => [...prev, userMessage]);
      setInput('');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <div className="py-8">
          <h1 className="text-xl font-light mb-8 text-center">ecommerce assistant</h1>
          
          <div className="h-[600px] overflow-y-auto mb-6 space-y-4 px-2">
            {messages.length === 0 ? (
              <p className="text-gray-400 text-center text-sm font-light">
                Ask me about products, customers, or invoices
              </p>
            ) : (
              messages.map((message, idx) => (
                <ChatMessage key={idx} message={message} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>
    </main>
  );
}