import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

dotenv.config();

// Initialize Firebase on the server side
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseApp: any;
let firebaseStorage: any;

if (fs.existsSync(configPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    firebaseApp = initializeApp(firebaseConfig);
    firebaseStorage = getStorage(firebaseApp);
    // Limit Firebase Storage SDK retries to prevent event-loop hangs (default is 10 minutes!)
    firebaseStorage.maxUploadRetryTime = 3000; // 3 seconds
    firebaseStorage.maxOperationRetryTime = 3000; // 3 seconds
    console.log("Firebase Storage initialized successfully on the server side.");
  } catch (err) {
    console.error("Gagal menginisialisasi Firebase di server:", err);
  }
} else {
  console.warn("firebase-applet-config.json tidak ditemukan di root workspace.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Custom CORS Middleware to allow requests from external domains like Vercel
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // Setup local uploads storage directory
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configure Multer storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      // Clean up the original name to be safe
      const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
      cb(null, `${baseName}-${uniqueSuffix}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // Max 50MB
  });

  // Serve uploaded files statically at /uploads
  app.use("/uploads", express.static(uploadsDir));

  // API Route: File Upload
  app.post("/api/upload", upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Tidak ada file yang diunggah" });
      }
      
      const localFilePath = req.file.path;
      const originalName = req.file.originalname;
      const mimeType = req.file.mimetype;
      
      // Build absolute local URL fallback so it works seamlessly on external domains like Vercel
      const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const host = req.headers["x-forwarded-host"] || req.get("host");
      const serverOrigin = `${protocol}://${host}`;
      const fileUrlLocal = `${serverOrigin}/uploads/${req.file.filename}`;

      if (firebaseStorage) {
        // Upload to Firebase Storage in the background (asynchronous) to not block the response
        console.log(`Mengunggah ${originalName} ke Firebase Storage di latar belakang...`);
        const fileBuffer = fs.readFileSync(localFilePath);
        
        // Buat nama berkas unik yang aman
        const safeName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const storageRef = ref(firebaseStorage, `uploads/${safeName}`);
        
        uploadBytes(storageRef, fileBuffer, { contentType: mimeType })
          .then(async () => {
            const downloadUrl = await getDownloadURL(storageRef);
            console.log("Berhasil mengunggah ke Firebase Storage di latar belakang:", downloadUrl);
          })
          .catch((storageErr: any) => {
            console.warn("Gagal mengunggah ke Firebase Storage di latar belakang:", storageErr.message);
          });
      }

      // Selalu kembalikan URL penyimpanan lokal secara instan (kecepatan sub-detik!)
      return res.json({
        success: true,
        fileUrl: fileUrlLocal,
        fileName: originalName,
        storage: "local"
      });
    } catch (error: any) {
      console.error("Upload Error:", error);
      res.status(500).json({ error: error.message || "Gagal mengunggah berkas" });
    }
  });

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
