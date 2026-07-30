import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL
} from './supabaseBrowserConfig.js';

const browserSupabase = globalThis.supabase;
const supabaseUrl = String(SUPABASE_URL || '').trim();
const supabasePublishableKey = String(SUPABASE_PUBLISHABLE_KEY || '').trim();

export const supabaseConfigurationError = !browserSupabase?.createClient
  ? 'The Supabase browser client could not be loaded. Check your connection and reload the game.'
  : (!supabaseUrl || !supabasePublishableKey
      ? 'Supabase browser configuration is incomplete.'
      : '');

export const supabase = supabaseConfigurationError ? null : browserSupabase.createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
