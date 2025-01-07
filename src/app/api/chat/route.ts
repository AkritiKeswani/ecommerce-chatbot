import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase and OpenAI in the API route, not the client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  // No need for dangerouslyAllowBrowser here as this is server-side
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // Get embeddings
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: message,
    });

    // Get context from Supabase
    let functionName = 'find_related_customer';
    if (message.toLowerCase().includes('product')) {
      functionName = 'find_related_products';
    } else if (message.toLowerCase().includes('invoice')) {
      functionName = 'find_related_invoices';
    }

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

    return NextResponse.json({
      content: completion.choices[0].message.content
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}