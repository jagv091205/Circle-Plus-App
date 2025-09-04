// src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://brzerxzuydonfxcdgjqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyemVyeHp1eWRvbmZ4Y2RnanFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MDUwODYsImV4cCI6MjA2NzQ4MTA4Nn0.yvxtQxm7ySwLovvLiXhbI1tyiHFKptnrWFtAP4dWnwY';
export const supabase = createClient(supabaseUrl, supabaseKey);
