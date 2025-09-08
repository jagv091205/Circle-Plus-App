// src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR SUPABASE URL';
const supabaseKey = 'YOUR SUPABASEKEY';
export const supabase = createClient(supabaseUrl, supabaseKey);
