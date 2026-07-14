import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: AI Assistant
  app.post("/api/ai", async (req, res) => {
    try {
      const { message, context } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Pesan tidak boleh kosong" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "API Key Gemini belum dikonfigurasi di server." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Kamu adalah Asisten AI untuk kelas XII TKJ 1 di ClassHub XII TKJ 1.
Gunakan data context berikut untuk menjawab pertanyaan pengguna dengan akurat, ramah, dan ringkas dalam Bahasa Indonesia.
Jika pertanyaan berkaitan dengan data kelas (jadwal, uang kas, tugas, piket), sesuaikan dengan data context di bawah ini.

---
DATA CONTEXT KELAS:
${context || "Tidak ada data tambahan saat ini."}
---

Pertanyaan Pengguna: "${message}"

Berikan jawaban yang sangat informatif, rapi, terstruktur, menggunakan bullet points jika perlu, dan beri sentuhan khas asisten kelas TKJ yang ramah, profesional, dan suportif.`,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Gagal memproses permintaan AI" });
    }
  });

  // Integrate Vite or Serve Static Files
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ClassHub server running on port ${PORT}`);
  });
}

startServer();
