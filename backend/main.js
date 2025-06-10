const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { transcribeAudio } = require("./openai");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const multer = require("multer");

dotenv.config();

const isDev = process.env.NODE_ENV === "development";
const startURL = isDev
  ? "http://localhost:8080"
  : `file://${path.join(__dirname, "../frontend/dist/index.html")}`;

const upload = multer({ dest: "uploads/" });

const api = express();
api.use(cors());
api.use(bodyParser.json({ limit: "50mb" }));
api.use(express.urlencoded({ extended: true }));

// Microphone audio endpoint (base64)
api.post("/api/microphone", async (req, res) => {
  try {
    const { audio, language } = req.body;
    if (!audio) return res.status(400).json({ error: "Missing audio data" });

    const buffer = Buffer.from(audio, "base64");
    const filePath = path.join(__dirname, "uploads", `${Date.now()}.mp3`);
    fs.writeFileSync(filePath, buffer);

    const transcription = await transcribeAudio(filePath, language);
    res.json({ transcription });

    fs.unlinkSync(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// File upload endpoint
api.post("/api/file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(`Processing file: ${req.file.originalname} at ${req.file.path}`);
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/mp4',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'
    ];
    if (!allowedTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid file type. Please upload an audio or video file (MP3, WAV, WebM, OGG, MP4, AVI, MOV)' });
    }

    const transcription = await transcribeAudio(req.file.path, req.body.language);
    res.json({ transcription });

    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.error("Error cleaning up temporary file:", cleanupError);
    }
  } catch (error) {
    console.error("File processing error:", error);
    res.status(500).json({ error: error.message });
  }
});

api.listen(5000, () => {
  console.log("✅ HTTP API server running on http://localhost:5000");
});

// --- Electron App ---
let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
    },
    autoHideMenuBar: true,
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' ws: wss:",
          "style-src 'self' 'unsafe-inline'",
          "connect-src 'self' http://localhost:5000 ws: wss:",
          "media-src 'self' blob: data:",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "worker-src 'self' blob:"
        ].join('; ')
      : [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "connect-src 'self' http://localhost:5000",
          "media-src 'self' blob: data:",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "worker-src 'self' blob:"
        ].join('; ');

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });

  mainWindow.loadURL(startURL);
  console.log('Electron loading URL:', startURL);
};

// Electron IPC Handlers (unchanged)
ipcMain.handle("process-microphone-audio", async (event, base64Audio, language) => {
  try {
    const buffer = Buffer.from(base64Audio, "base64");
    const filePath = path.join(__dirname, "uploads", `${Date.now()}.mp3`);
    fs.writeFileSync(filePath, buffer);

    const transcription = await transcribeAudio(filePath, language);

    fs.unlinkSync(filePath);
    return transcription;
  } catch (error) {
    return `Error: ${error.message}`;
  }
});

ipcMain.handle('process-audio-file', async (event, fileData) => {
  try {
    if (!fileData || typeof fileData !== 'object' || !fileData.buffer || !fileData.fileName) {
      throw new Error('Invalid file data');
    }
    const buffer = Buffer.from(fileData.buffer, 'base64');
    const uploadsDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, fileData.fileName);
    fs.writeFileSync(filePath, buffer);

    const transcription = await transcribeAudio(filePath, fileData.language);

    fs.unlinkSync(filePath);
    return transcription;
  } catch (error) {
    throw error;
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});