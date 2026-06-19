import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;
let currentUrl = "";
let currentKey = "";

function mockResponse(data: any, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Bad Request",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)], { type: 'application/json' }),
    arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(data)).buffer,
    clone() { return this; }
  } as unknown as Response;
}

async function customFetch(
  supabaseUrl: string,
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const urlStr = typeof input === "string" ? input : (input as any).url || "";
  
  const isPlaceholder = !supabaseUrl || 
                        supabaseUrl.includes("placeholder-project-id") || 
                        supabaseUrl.includes("placeholder") || 
                        supabaseUrl.trim() === "";

  if (isPlaceholder) {
    console.warn(`[Supabase Proxy] Suppressing request to unconfigured Supabase host: ${urlStr}`);
    
    if (urlStr.includes("/auth/v1/user") || urlStr.includes("/auth/v1/session")) {
      return mockResponse({ user: null, session: null }, 200);
    }
    
    if (urlStr.includes("/auth/v1/")) {
      return mockResponse({ error: "Supabase not configured" }, 400);
    }
    
    return mockResponse([], 200);
  }

  try {
    return await fetch(input, init);
  } catch (err) {
    console.error("[Supabase Proxy] Network fetch failed:", err);
    if (urlStr.includes("/auth/v1/user") || urlStr.includes("/auth/v1/session")) {
      return mockResponse({ user: null, session: null }, 200);
    }
    return mockResponse([], 200);
  }
}

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    let supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://placeholder-project-id.supabase.co";
    let supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_KEY || "placeholder-key-so-client-initialization-does-not-throw-at-runtime";

    if (supabaseUrl && typeof supabaseUrl === "string") {
      supabaseUrl = supabaseUrl.trim().replace(/\/+$/, "");
    }

    currentUrl = supabaseUrl;
    currentKey = supabaseAnonKey;
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (input, init) => customFetch(supabaseUrl, input, init)
      }
    });
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
          supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
              fetch: (input, init) => customFetch(supabaseUrl, input, init)
            }
          });
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


