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

    // Predefined embeddings for Supabase function descriptions
    const functionsMetadata = [
      {
        name: 'find_related_customer',
        description: 'Find information related to customers.',
      },
      {
        name: 'find_related_products',
        description: 'Find information related to products.',
      },
      {
        name: 'find_related_invoices',
        description: 'Find information related to invoices.',
      },
    ];

    // Generate embeddings for the descriptions of each function
    const metadataEmbeddings = await Promise.all(
      functionsMetadata.map(async (fn) => {
        const embedding = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: fn.description,
        });
        return { ...fn, embedding: embedding.data[0].embedding };
      })
    );

    // Helper function to calculate cosine similarity
    const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
      const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
      const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
      const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
      return dotProduct / (magnitudeA * magnitudeB);
    };

    // Find the most relevant function based on cosine similarity
    const bestMatch = metadataEmbeddings.reduce(
      (best, current) => {
        const similarity = cosineSimilarity(queryEmbedding.data[0].embedding, current.embedding);
        return similarity > best.similarity ? { ...current, similarity } : best;
      },
      { name: '', description: '', similarity: -1 }
    );

    if (!bestMatch.name) {
      throw new Error('No relevant function found for the given query.');
    }

    console.log('Selected function:', bestMatch.name);

    // Call the matched Supabase function with the query embedding
    const { data: documents, error } = await supabase.rpc(bestMatch.name, {
      question_vector: queryEmbedding.data[0].embedding,
    });

    if (error) throw error;

    // Format the context data for OpenAI
    const context = documents
      ?.map((doc: any) => doc.document_content)
      .join('\n');

    if (!context) {
      return NextResponse.json({
        content: 'No relevant information found for your query.',
      });
    }

    // Get the AI's response based on the retrieved context
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are an intelligent assistant. Use the provided context to answer the user’s query clearly and concisely.',
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
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}
