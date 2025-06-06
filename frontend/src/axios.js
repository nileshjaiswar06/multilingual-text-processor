import axios from "axios";

// Send microphone audio (base64) to backend
export const sendAudioToBackend = async (base64Audio) => {
  try {
    const response = await axios.post("http://localhost:5000/api/microphone", {
      audio: base64Audio,
    });
    return response.data.transcription;
  } catch (error) {
    console.error("❌ Error processing microphone audio:", error);
    return "Transcription failed";
  }
};

// Send uploaded file (base64) to backend
export const sendFileToBackend = async (buffer, language) => {
  try {
    const response = await axios.post("http://localhost:5000/api/file", {
      file: buffer.toString("base64"),
      language
    });
    return response.data.transcription;
  } catch (error) {
    console.error("❌ Error processing file:", error);
    return "Transcription failed";
  }
};