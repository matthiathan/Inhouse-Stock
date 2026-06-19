import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;
let currentUrl = "";
let currentKey = "";

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    let supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://placeholder-project-id.supabase.co";
    let supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_KEY || "placeholder-key-so-client-initialization-does-not-throw-at-runtime";

    if (supabaseUrl && typeof supabaseUrl === "string") {
      supabaseUrl = supabaseUrl.trim().replace(/\/+$/, "");
    }

    currentUrl = supabaseUrl;
    currentKey = supabaseAnonKey;
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

export async function initSupabase(): Promise<SupabaseClient> {
  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      const data = await res.json();
      if (data.supabaseUrl && data.supabaseAnonKey) {
        let supabaseUrl = data.supabaseUrl;
        let supabaseAnonKey = data.supabaseAnonKey;

        if (supabaseUrl && typeof supabaseUrl === "string") {
          supabaseUrl = supabaseUrl.trim().replace(/\/+$/, "");
        }

        if (supabaseUrl !== currentUrl || supabaseAnonKey !== currentKey) {
          currentUrl = supabaseUrl;
          currentKey = supabaseAnonKey;
          supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
          console.log("Supabase client initialized dynamically with server credentials.");
        }
      }
    }
  } catch (err) {
    console.warn("Failed to retrieve dynamic Supabase config from server, using env fallback:", err);
  }
  return getSupabase();
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    const client = getSupabase();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
  set(target, prop, value, receiver) {
    const client = getSupabase();
    return Reflect.set(client, prop, value, receiver);
  }
});


