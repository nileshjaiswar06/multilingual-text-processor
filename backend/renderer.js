/**
 * This file contains the renderer process code for the Electron application.
 * It handles the UI interactions and communicates with the main process via IPC.
 * 
 * The renderer process runs in a separate context from the main process for security.
 * Node.js integration is disabled by default to prevent potential security risks.
 * 
 * For more information about Electron's process model and security considerations:
 * https://electronjs.org/docs/tutorial/process-model
 * https://electronjs.org/docs/tutorial/security
 
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import '.src/index.css';

console.log('👋 This message is being logged by "renderer.js", included via webpack');

const { ipcRenderer } = require('electron');

ipcRenderer.on('request-file-data', async (event, blobUrl) => {
  try {
    console.log('Renderer: Received request for file data from blob URL:', blobUrl);

    // Fetch the blob from the URL
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Buffer = buffer.toString('base64');

    // You can set a default file name and language, or get them from your app state/UI
    const fileData = {
      buffer: base64Buffer,
      fileName: 'audio.webm', // or another appropriate name/extension
      language: 'en' // or get from your app state/UI
    };

    console.log('Renderer: Sending file data:', {
      fileName: fileData.fileName,
      language: fileData.language,
      bufferLength: fileData.buffer.length
    });

    // Send the file data back to the main process
    ipcRenderer.send('file-data-response', fileData);
  } catch (error) {
    console.error('Renderer: Error processing blob URL:', error);
    ipcRenderer.send('file-data-response', { error: error.message });
  }
});