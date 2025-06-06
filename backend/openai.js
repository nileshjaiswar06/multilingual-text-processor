const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const dotenv = require("dotenv");
const path = require("path");


dotenv.config(); // Load environment variables

async function transcribeAudio(filePath, language = "en") {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist at path ${filePath}`);
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured. Please check your .env file.");
    }

    console.log(`Sending file to Whisper: ${filePath}`);
    console.log(`File size: ${fs.statSync(filePath).size} bytes`);
    console.log(`Language: ${language}`);

    // Create FormData for the request
    const formData = new FormData();
    const fileStream = fs.createReadStream(filePath);
    formData.append("file", fileStream, { filename: path.basename(filePath), contentType: "audio/mpeg" });
    formData.append("model", "whisper-1");
    formData.append("language", language);

    // Make API request
    const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", formData, {
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
    });

    console.log(`Transcription successful: ${response.data.text}`);
    
    fileStream.close(); // Close file stream to prevent memory leaks
    return response.data.text;
  } catch (error) {
    console.error("OpenAI Whisper API error:", error.response?.data || error.message);
    
    if (error.response?.data?.error?.message) {
      throw new Error(`OpenAI API error: ${error.response.data.error.message}`);
    } else if (error.response?.status === 401) {
      throw new Error("Invalid OpenAI API key. Please check your .env file.");
    } else if (error.response?.status === 429) {
      throw new Error("OpenAI API rate limit exceeded. Please try again later.");
    } else {
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }
}

module.exports = { transcribeAudio };