import { createClient } from '@supabase/supabase-js';

const url = (import.meta as any).env.VITE_SUPABASE_URL;
const key = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = !!(url && key);

let supabaseClient: any = null;

const getClient = () => {
    if (!isConfigured) {
        // Return a safe mock/dummy client to prevent immediate crash, and throw details on active driver fetch
        return new Proxy({} as any, {
            get() {
                return () => {
                    throw new Error('Supabase environment variables are missing. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the deployment environment.');
                };
            }
        });
    }
    if (!supabaseClient) {
        supabaseClient = createClient(url, key);
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
