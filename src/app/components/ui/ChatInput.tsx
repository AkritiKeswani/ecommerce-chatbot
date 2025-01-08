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
        className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:border-gray-500 focus:ring-2 focus:ring-gray-100 outline-none transition-all"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-gray-800 hover:bg-gray-900 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '...' : 'Send'}
      </button>
    </form>
  );
}