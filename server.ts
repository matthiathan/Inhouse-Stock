import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // API Routes
  app.get("/api/assets", async (req, res) => {
    const { data, error } = await supabase.from('fam').select('id, "Asset Name", "Serial#", "QR Code", "Current Location"');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/assets/:id", async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('fam').select('*').eq('id', id).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/customers/:code", async (req, res) => {
    const { code } = req.params;
    const tables = ['kzn_customers', 'jhb_customers', 'cpt_customers'];
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').eq('A/C Code', code).single();
      if (!error && data) {
         return res.json(data);
      }
    }
    return res.status(404).json({ error: "Customer not found" });
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
  });
}

startServer();
