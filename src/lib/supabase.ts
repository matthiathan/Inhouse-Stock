import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://placeholder-project-id.supabase.co";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_KEY || "placeholder-key-so-client-initialization-does-not-throw-at-runtime";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

