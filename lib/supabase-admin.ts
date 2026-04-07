import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente administrador (Se salta los candados. SOLO se usa en el Backend)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);