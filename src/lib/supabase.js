const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(url && key);
export const supabase = createClientSafely(url, key);
function createClientSafely(projectUrl, publishableKey) {
  // Avoid constructing an invalid client during local setup; the UI explains missing configuration.
  if (!projectUrl || !publishableKey) return { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signInWithPassword: async () => ({ error: { message: 'Configure Supabase environment variables first.' } }), resetPasswordForEmail: async () => ({ error: { message: 'Configure Supabase environment variables first.' } }), signOut: async () => ({}) }, from: () => { throw new Error('Supabase is not configured.'); } };
  return createClient(projectUrl, publishableKey, { global: { fetch: createParentFetch(projectUrl) } });
}
import { createClient } from '@supabase/supabase-js';
import { createParentFetch } from './parentAccess.js';
