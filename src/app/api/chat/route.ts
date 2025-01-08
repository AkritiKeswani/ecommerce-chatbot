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

    // Generate embedding for the question
    const embedding = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: message,
    });

    // Determine which function to call
    let functionName = 'find_related_customer';
    console.log('Original message:', message);
    if (message.toLowerCase().includes('product')) {
      functionName = 'find_related_products';
    } else if (message.toLowerCase().includes('invoice')) {
      functionName = 'find_related_invoices';
    }
    console.log('Selected function:', functionName);

    // Call Supabase function with the embedding
    const { data: documents, error } = await supabase.rpc(
      functionName,
      { question_vector: embedding.data[0].embedding }
    );

    if (error) throw error;

    // Format the context data more cleanly before sending to GPT
    const context = documents?.map(document => {
      return document.document_content;
    }).join('\n');

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a product catalog assistant. When listing products:
          - Format in two columns like this:
            1. Product Name          4. Product Name
            2. Product Name          5. Product Name
            3. Product Name          6. Product Name
          - Use proper spacing (at least 4 spaces between columns)
          - List ONLY the product names
          - Don't include any other information
          - Don't add any extra text or explanations
          - Maximum 2 columns`
        },
        {
          role: "user",
          content: `Question: ${message}\n\nAvailable Information:\n${context}`
        }
      ],
      temperature: 0.3,
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