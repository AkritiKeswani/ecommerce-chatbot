// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // Get embeddings for the question
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: message,
    });

    // Determine which table to query based on message content
    let functionName = 'find_related_customer';
    if (message.toLowerCase().includes('product')) {
      functionName = 'find_related_products';
    } else if (message.toLowerCase().includes('invoice')) {
      functionName = 'find_related_invoices';
    }

    // Get relevant context from Supabase
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
          content: "You are a helpful assistant that answers questions about e-commerce data. Use only the provided context to answer questions. If you can't find the information in the context, say so."
        },
        {
          role: "user",
          content: `Question: ${message}\nContext: ${JSON.stringify(context)}`
        }
      ],
    });

    return NextResponse.json({
      content: completion.choices[0].message.content
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}