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
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4">
        <div className="py-12">
          <h1 className="text-2xl font-semibold mb-2 text-center bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            AI Commerce Assistant
          </h1>
          <p className="text-gray-500 text-center mb-8 text-sm">
            Your intelligent guide for products, customers, and orders
          </p>
          
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
            <div className="h-[600px] overflow-y-auto mb-6 space-y-4 px-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className="p-4 rounded-full bg-gray-50">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 font-medium mb-1">
                      Welcome! How can I help you today?
                    </p>
                    <p className="text-gray-400 text-sm">
                      Ask me about products, customers, or orders
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message, idx) => (
                  <ChatMessage key={idx} message={message} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t pt-4">
              <ChatInput
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}