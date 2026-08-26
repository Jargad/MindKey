/**
 * extension/background.js
 * Handle background tasks and session storage.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sync_key") {
    // Guardar la clave en la memoria de sesión de la extensión
    chrome.storage.session.set({ sessionKey: request.keyB64 }).then(() => {
      console.log("GetPass: Session key synced and stored in background memory.");
    });
  }
});
