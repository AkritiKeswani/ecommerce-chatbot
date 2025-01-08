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

    // Generate embedding for the user query
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: message,
    });

    // Predefined functions and descriptions
    const functionsMetadata = [
      { name: 'find_related_customer', description: 'Find customer-related information.' },
      { name: 'find_related_products', description: 'Find product-related information.' },
      { name: 'find_related_invoices', description: 'Find invoice-related information.' },
    ];

    // Match query embedding with function descriptions using OpenAI's own similarity API
    const matchResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a helper for matching user queries to the correct Supabase function. Use the descriptions of these functions to determine which one is most relevant:
          1. "Find customer-related information."
          2. "Find product-related information."
          3. "Find invoice-related information."`,
        },
        { role: 'user', content: `Question: ${message}` },
      ],
      temperature: 0,
      max_tokens: 50,
    });

    const matchedFunction = functionsMetadata.find((fn) =>
      matchResponse.choices[0].message.content.toLowerCase().includes(fn.description.toLowerCase())
    );

    if (!matchedFunction) {
      throw new Error('No relevant function found for the given query.');
    }

    console.log('Selected function:', matchedFunction.name);

    // Call the matched Supabase function with the query embedding
    const { data: documents, error } = await supabase.rpc(matchedFunction.name, {
      question_vector: queryEmbedding.data[0].embedding,
    });

    if (error) throw error;

    // Format the context for the final AI response
    const context = documents
      ?.map((doc: any) => doc.document_content)
      .join('\n');

    if (!context) {
      return NextResponse.json({ content: 'No relevant information found for your query.' });
    }

    // Generate the final AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an intelligent assistant. Use the provided context to answer the user’s query clearly and concisely.',
        },
        {
          role: 'user',
          content: `Question: ${message}\n\nContext:\n${context}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return NextResponse.json({
      content: completion.choices[0].message.content,
    });
  } catch (error: any) {
    // Log the error and return a 500 status code
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}
