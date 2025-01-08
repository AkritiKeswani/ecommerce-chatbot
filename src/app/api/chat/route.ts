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
      { 
        name: 'find_related_customer',
        category: 'customer',
        topics: ['account', 'profile', 'login', 'preferences', 'personal details', 'contact information']
      },
      { 
        name: 'find_related_products',
        category: 'product',
        topics: ['items', 'inventory', 'specifications', 'pricing', 'availability', 'features']
      },
      { 
        name: 'find_related_invoices',
        category: 'order',
        topics: ['payment', 'transaction', 'invoice', 'order status', 'shipping', 'receipt']
      },
    ];

    const matchResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an e-commerce assistant. Analyze the user's question and categorize it into one of these areas:
          - CUSTOMER: Questions about accounts, profiles, personal details, or preferences
          - PRODUCT: Questions about items, inventory, specifications, or pricing
          - ORDER: Questions about payments, invoices, order status, or shipping
          - NONE: If the question doesn't fit any category

          Respond with just the category name (CUSTOMER, PRODUCT, ORDER, or NONE). If you're unsure or the question is unrelated, respond with NONE.`,
        },
        { role: 'user', content: `Question: ${message}` },
      ],
      temperature: 0,
      max_tokens: 10,
    });

    const category = matchResponse.choices[0].message.content?.trim().toUpperCase();
    
    if (category === 'NONE') {
      return NextResponse.json({ 
        content: "I apologize, but I can only help with questions related to customers, products, or orders. Could you please rephrase your question or ask something related to these topics?" 
      });
    }

    const matchedFunction = functionsMetadata.find(fn => 
      fn.category.toUpperCase() === category
    );

    if (!matchedFunction) {
      throw new Error('No relevant function found for the given query.');
    }

    console.log('Selected category:', category);
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
