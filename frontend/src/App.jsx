import React, { useState, useRef } from "react";
import axios from "axios";
import cors from "cors";
import "./index.css";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
];

const App = () => {
  const [transcription, setTranscription] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [loading, setLoading] = useState(false);

  // Handle file upload
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  setLoading(true);
  setTranscription("");
  try {
    if (!file.type.startsWith("audio/")) {
      throw new Error("Selected file is not an audio file.");
    }

    // Use FormData for file upload (like Postman)
    const formData = new FormData();
    formData.append("file", file); // <-- This is key!
    formData.append("language", selectedLanguage);

    const response = await axios.post("http://localhost:5000/api/file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    setTranscription(response.data.transcription || "No transcription received.");
  } catch (error) {
    setTranscription(`Error: ${error.response?.data?.error || error.message}`);
  }
  setLoading(false);
  event.target.value = null;
};

  // Microphone recording logic (unchanged)
  const startRecording = async () => {
    setIsRecording(true);
    audioChunksRef.current = [];
    setTranscription("");
    setLoading(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new window.MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
    } catch (error) {
      setIsRecording(false);
      setTranscription(`Error starting recording: ${error.message}`);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;

    setIsRecording(false);
    mediaRecorderRef.current.stop();

    mediaRecorderRef.current.onstop = async () => {
      setLoading(true);
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        formData.append("language", selectedLanguage);

        const response = await axios.post("http://localhost:5000/api/file", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setTranscription(response.data.transcription || "No transcription received.");
      } catch (error) {
        setTranscription(`Error: ${error.response?.data?.error || error.message}`);
      }
      setLoading(false);
    };
  };

  return (
    <div className="container">
      <h1 className="title">🌐 Multilingual Audio Processor</h1>
      <p className="subtitle">
        Upload an audio file or record your voice. Select a language and get instant transcription!
      </p>

      <div className="controls">
        <div className="language-select">
          <label htmlFor="language">Language:</label>
          <select
            id="language"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={loading}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="file-upload">
          <label
            htmlFor="file-upload"
            className="custom-file-upload"
            style={{
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            <input
              id="file-upload"
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              disabled={loading}
            />
            📁 Upload Audio
          </label>
        </div>

        <div className="record-controls">
          <button
            className={`record-btn ${isRecording ? "recording" : ""}`}
            onClick={startRecording}
            disabled={isRecording || loading}
          >
            🎙️ {isRecording ? "Recording..." : "Start Recording"}
          </button>
          <button
            className="stop-btn"
            onClick={stopRecording}
            disabled={!isRecording || loading}
          >
            🛑 Stop
          </button>
        </div>
      </div>

      {loading && (
        <div className="loader">
          <div className="spinner"></div>
          <span>Processing...</span>
        </div>
      )}

      {transcription && (
        <div className="transcription-box">
          <h2>📝 Transcription</h2>
          <p>{transcription}</p>
        </div>
      )}

      <footer>
        <a
          href="https://github.com/nileshjaiswar06/multu-lingual-text-processing"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on GitHub
        </a>
      </footer>
    </div>
  );
};

export default App;