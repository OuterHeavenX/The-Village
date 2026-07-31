import { createClient } from '@supabase/supabase-js';
import { logStartupFailure, logStartupStage } from './startupWatchdog.js';

logStartupStage('Environment variable validation');
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

let configurationError = !supabaseUrl || !supabasePublishableKey
  ? 'Supabase browser configuration is incomplete. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart Vite.'
  : '';

let client = null;
if (!configurationError) {
  try {
    logStartupStage('Supabase client creation');
    client = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        fetch: timedFetch
      }
    });
  } catch (error) {
    configurationError = 'The account service could not be initialized. Offline mode remains available.';
    logStartupFailure('Supabase client creation', error);
  }
} else {
  logStartupFailure('Environment variable validation', configurationError);
}

export const supabaseConfigurationError = configurationError;
export const supabase = client;
