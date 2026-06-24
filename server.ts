import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;
  const defaultSupabaseUrl = "https://xwdltghqqaobsgefrczy.supabase.co";
  const defaultSupabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZGx0Z2hxcWFvYnNnZWZyY3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzMxNzAsImV4cCI6MjA5Njc0OTE3MH0.eJ3eklRwRvx48L5GoC0nApuH_CKf1uMfhi7ix9h0Hug";
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || defaultSupabaseUrl;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || defaultSupabaseAnonKey;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const hasServerAdminClient = Boolean(supabaseUrl && supabaseServiceRoleKey);

  const supabaseAdmin = hasServerAdminClient
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

  app.locals.supabaseAdmin = supabaseAdmin;

  // Serve only browser-safe Supabase configuration to the client.
  // SUPABASE_SERVICE_ROLE_KEY is intentionally never returned here.
  app.get("/api/config", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      supabaseUrl,
      supabaseAnonKey,
    });
  });

  // Vite middleware for development or serving static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Supabase admin client: ${hasServerAdminClient ? "enabled" : "disabled"}`);
  });
}

startServer();
