import { createClient } from '@supabase/supabase-js';

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabasePublishableKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const SUPABASE_REQUEST_TIMEOUT_MS = 15000;

// Mobile Safari can leave a fetch promise suspended indefinitely when the page
// is backgrounded. An abortable transport guarantees that cloudSave.js always
// regains control and can preserve the queued local state for a later retry.
async function timedFetch(input, init = {}) {
  const controller = new AbortController();
  const upstreamSignal = init.signal;
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
  if (upstreamSignal?.aborted) abortFromUpstream();
  else upstreamSignal?.addEventListener?.('abort', abortFromUpstream, { once: true });
  const timer = globalThis.setTimeout(() => controller.abort(new DOMException(
    'The cloud request timed out.',
    'TimeoutError'
  )), SUPABASE_REQUEST_TIMEOUT_MS);
  try {
    return await globalThis.fetch(input, { ...init, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timer);
    upstreamSignal?.removeEventListener?.('abort', abortFromUpstream);
  }
}

export const supabaseConfigurationError = !supabaseUrl || !supabasePublishableKey
  ? 'Supabase browser configuration is incomplete. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart Vite.'
  : '';

export const supabase = supabaseConfigurationError ? null : createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      fetch: timedFetch
    }
  }
);
