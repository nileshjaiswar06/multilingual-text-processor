const { contextBridge, ipcRenderer } = require("electron");

/**
 * Expose protected methods to the renderer process via contextBridge.
 * This allows secure, controlled access to IPC from the frontend.
 */
contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * Process an audio file (upload or recording).
   * @param {Object|string} fileData - The file data object or a blob URL string.
   * @returns {Promise<string>} - The transcription result.
   */
  processAudioFile: (fileData) => {
    console.log("Preload: Raw file data received:", fileData);
    console.log("Preload: File data type:", typeof fileData);

    // If a blob URL is received, request the actual file data from the renderer
    if (typeof fileData === "string" && fileData.startsWith("blob:")) {
      console.log("Preload: Received blob URL, requesting file data from frontend");
      return new Promise((resolve, reject) => {
        const responseHandler = (event, response) => {
          ipcRenderer.removeListener("file-data-response", responseHandler);
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.data);
          }
        };
        ipcRenderer.once("file-data-response", responseHandler);
        ipcRenderer.send("request-file-data", fileData);
      });
    }

    // If fileData is already an object with a buffer, send it directly
    if (fileData && typeof fileData === "object" && fileData.buffer) {
      console.log("Preload: Sending file data to main process");
      return ipcRenderer.invoke("process-audio-file", fileData);
    }

    throw new Error("Invalid file data provided to processAudioFile");
  },

  /**
   * Listen for file data requests from the main process.
   * @param {Function} callback - Function to handle blob URL and return file data.
   * @returns {Function} - The handler function (for removal if needed).
   */
  onFileDataRequest: (callback) => {
    const handler = async (event, blobUrl) => {
      try {
        const fileData = await callback(blobUrl);
        ipcRenderer.send("file-data-response", { data: fileData });
      } catch (error) {
        ipcRenderer.send("file-data-response", { error: error.message });
      }
    };
    ipcRenderer.on("request-file-data", handler);
    // Return the handler so it can be removed later if needed
    return handler;
  },

  /**
   * Remove a previously registered file data request listener.
   * @param {Function} handler - The handler function returned by onFileDataRequest.
   */
  removeFileDataRequestListener: (handler) => {
    ipcRenderer.removeListener("request-file-data", handler);
  },

  /**
   * Process microphone audio (for direct mic recordings).
   * @param {string} buffer - Base64-encoded audio buffer.
   * @param {string} language - Language code.
   * @returns {Promise<string>} - The transcription result.
   */
  processMicrophoneAudio: (buffer, language) =>
    ipcRenderer.invoke("process-microphone-audio", buffer, language),
});