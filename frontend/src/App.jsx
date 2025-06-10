import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./index.css";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", flag: "🇮🇳" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
];

const App = () => {
  const [transcription, setTranscription] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoPreview, setVideoPreview] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setTranscription("");
    setError("");
    setVideoPreview(null);

    try {
      // Check if file is audio or video
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      
      if (!isVideo && !isAudio) {
        throw new Error("Selected file is not an audio or video file.");
      }

      // If it's a video, create a preview
      if (isVideo) {
        const videoUrl = URL.createObjectURL(file);
        setVideoPreview(videoUrl);
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", selectedLanguage);

      const response = await axios.post("http://localhost:5000/api/file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setTranscription(response.data.transcription || "No transcription received.");
    } catch (error) {
      setError(error.response?.data?.error || error.message);
    }
    setLoading(false);
    event.target.value = null;
  };

  // Clean up video preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  const startRecording = async () => {
    setIsRecording(true);
    audioChunksRef.current = [];
    setTranscription("");
    setError("");
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
      setError(`Error starting recording: ${error.message}`);
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
        setError(error.response?.data?.error || error.message);
      }
      setLoading(false);
    };
  };

  return (
    <div className="app-container">
      <div className="app-content">
        <header className="app-header">
          <h1>🎙️ Voice Transcriber</h1>
          <p className="app-description">
            Transform your voice or video audio into text in multiple languages
          </p>
        </header>

        <div className="main-content">
          <div className="language-selector">
            <label htmlFor="language">Select Language</label>
            <div className="language-dropdown">
              <select
                id="language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={loading}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="input-methods">
            <div className="file-upload-container">
              <label
                htmlFor="file-upload"
                className={`file-upload-button ${loading ? "disabled" : ""}`}
              >
                <span className="upload-icon">📁</span>
                <span className="upload-text">Upload Audio/Video File</span>
                <input
                  id="file-upload"
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileUpload}
                  disabled={loading}
                />
              </label>
            </div>

            {videoPreview && (
              <div className="video-preview-container">
                <video
                  src={videoPreview}
                  controls
                  className="video-preview"
                />
              </div>
            )}

            <div className="recording-container">
              <button
                className={`record-button ${isRecording ? "recording" : ""}`}
                onClick={startRecording}
                disabled={isRecording || loading}
              >
                <span className="record-icon">🎙️</span>
                <span className="record-text">
                  {isRecording ? "Recording..." : "Start Recording"}
                </span>
              </button>
              <button
                className="stop-button"
                onClick={stopRecording}
                disabled={!isRecording || loading}
              >
                <span className="stop-icon">⏹️</span>
                <span className="stop-text">Stop</span>
              </button>
            </div>
          </div>

          {loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <span className="loading-text">Processing your audio...</span>
            </div>
          )}

          {error && (
            <div className="error-container">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}

          {transcription && (
            <div className="transcription-container">
              <div className="transcription-header">
                <h2>Transcription</h2>
                <button
                  className="copy-button"
                  onClick={() => navigator.clipboard.writeText(transcription)}
                >
                  📋 Copy
                </button>
              </div>
              <div className="transcription-content">
                <p>{transcription}</p>
              </div>
            </div>
          )}
        </div>

        <footer className="app-footer">
          <p>Created by Trainee 10</p>
        </footer>
      </div>
    </div>
  );
};

export default App;