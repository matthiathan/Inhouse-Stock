import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://xwdltghqqaobsgefrczy.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZGx0Z2hxcWFvYnNnZWZyY3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzMxNzAsImV4cCI6MjA5Njc0OTE3MH0.eJ3eklRwRvx48L5GoC0nApuH_CKf1uMfhi7ix9h0Hug';

const env = (import.meta as any).env;
const url = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isConfigured = !!(url && key);

let supabaseClient: any = null;

const getClient = () => {
  if (!isConfigured) {
    throw new Error('Supabase configuration is missing. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseClient;
};

export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    if (prop === 'isConfigured') {
      return isConfigured;
    }

    const client = getClient();
    const value = client[prop];

    if (typeof value === 'function') {
      return value.bind(client);
    }

    return value;
  },
});
