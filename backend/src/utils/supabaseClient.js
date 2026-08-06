import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const isValidUrl = (url) => {
    return url && (url.startsWith('http://') || url.startsWith('https://'));
};

export const supabase = (isValidUrl(supabaseUrl) && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

console.log(`[Supabase] Client initialized successfully: ${!!supabase} (URL: ${supabaseUrl || 'NOT SET'})`);
