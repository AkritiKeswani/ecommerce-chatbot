import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { ChatResponse } from '@/app/types/chat';

// Initialize Supabase and OpenAI
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // Get embeddings
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: message,
    });

    // Determine which function to call
    let functionName = 'find_related_customer';
    let table = 'customers';
    if (message.toLowerCase().includes('product')) {
      functionName = 'find_related_products';
      table = 'products';
    } else if (message.toLowerCase().includes('invoice')) {
      functionName = 'find_related_invoices';
      table = 'invoices';
    }

    // Get context from Supabase
    const { data: context, error } = await supabase.rpc(
      functionName,
      { question_vector: embedding.data[0].embedding }
    );

    if (error) throw error;

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that answers questions about e-commerce data. Use only the provided context to answer questions."
        },
        {
          role: "user",
          content: `Question: ${message}\nContext: ${JSON.stringify(context)}`
        }
      ],
      max_tokens: 150
    });

    const response: ChatResponse = {
      content: completion.choices[0].message.content,
      table,
      contextLength: context?.length ?? 0
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' } as ChatResponse,
      { status: 500 }
    );
  }
}