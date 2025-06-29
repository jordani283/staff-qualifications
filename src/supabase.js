import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uydysrzsvnclyxaqdsag.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5ZHlzcnpzdm5jbHl4YXFkc2FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzA5OTQsImV4cCI6MjA2NjYwNjk5NH0.zrH2Xke1GoukVWwItUsnXpfQxikCaUppwBU1vmmuEQU';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase credentials not provided.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
    }
}); 