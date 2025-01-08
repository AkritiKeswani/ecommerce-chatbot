import React from 'react';

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
}

export default function ChatInput({ input, setInput, handleSubmit, isLoading }: ChatInputProps) {
  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask about products, customers, or invoices related to your Stripe data."
        className="flex-1 px-4 py-3 border border-gray-200 rounded-sm 
                 focus:outline-none focus:ring-1 focus:ring-black
                 font-light text-sm"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading}
        className="px-6 py-3 bg-black text-white rounded-sm 
                 hover:bg-gray-800 disabled:opacity-50 
                 transition-colors duration-200 text-sm font-light"
      >
        {isLoading ? '...' : 'Send'}
      </button>
    </form>
  );
}