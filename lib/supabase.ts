import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Esto crea el cliente que usaremos en toda la app para conectarnos
export const supabase = createClient(supabaseUrl, supabaseAnonKey);