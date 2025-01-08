import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    // Get embeddings
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: message,
    });

    // Determine which function to call
    let functionName = 'find_related_customer';
    if (message.toLowerCase().includes('product')) {
      functionName = 'find_related_products';
    } else if (message.toLowerCase().includes('invoice')) {
      functionName = 'find_related_invoices';
    }

    // Query Supabase
    const { data: results, error: supabaseError } = await supabase.rpc(
      functionName,
      { question_vector: embedding.data[0].embedding }
    );

    if (supabaseError) {
      console.error('Supabase error:', supabaseError);
      throw new Error(`Database query failed: ${supabaseError.message}`);
    }

    // Extract content from results
    const context = results?.map(result => ({
      content: result.document_content,
      metadata: result.metadata
    }));

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful e-commerce assistant. Answer questions using only the provided context about customers, products, and invoices. If you can't find relevant information in the context, say so."
        },
        {
          role: "user",
          content: `Question: ${message}\n\nContext: ${JSON.stringify(context)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
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