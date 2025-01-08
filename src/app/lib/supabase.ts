import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Helper function to call our Supabase vector search functions
export async function searchVectorData(table: 'customers' | 'products' | 'invoices', questionVector: number[]) {
  const { data, error } = await supabase.rpc(
    `find_related_${table}`, 
    { question_vector: questionVector }
  )
  
  if (error) throw error
  return data
}