import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isValidUrl = (url) => {
    return url && (url.startsWith('http://') || url.startsWith('https://'));
};

export const supabase = (isValidUrl(supabaseUrl) && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// Admin client (server-side only). Requires SUPABASE_SERVICE_ROLE_KEY in backend/.env.
// Used for privileged operations like resetting a user's password in Supabase Auth,
// which the anon key is not allowed to do.
export const supabaseAdmin = (isValidUrl(supabaseUrl) && supabaseServiceKey)
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

console.log(`[Supabase] Client initialized successfully: ${!!supabase} (URL: ${supabaseUrl || 'NOT SET'})`);
console.log(`[Supabase] Admin client initialized: ${!!supabaseAdmin}`);
