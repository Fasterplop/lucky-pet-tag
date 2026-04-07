import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente normal (Se usa en el Frontend / Componentes de Cliente)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);