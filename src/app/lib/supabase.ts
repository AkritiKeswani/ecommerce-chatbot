import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export type TableName = 'customers' | 'products' | 'invoices';

export async function queryVectorSearch(
  table: TableName,
  vector: number[]
) {
  const functionName = `find_related_${table}`;
  
  const { data, error } = await supabase.rpc(
    functionName,
    { question_vector: vector }
  );

  if (error) {
    console.error(`Error in ${functionName}:`, error);
    throw new Error(`Vector search failed for ${table}`);
  }

  return data;
}