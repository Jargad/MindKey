/**
 * extension/content.js
 * Injected script to detect login fields and handle auto-fill.
 */

console.log("GetPass: Content script loaded");

// Detect password fields
function detectFields() {
  const passwordFields = document.querySelectorAll('input[type="password"]');
  passwordFields.forEach(field => {
    if (!field.dataset.getpass) {
      field.dataset.getpass = "true";
      addIconToField(field);
    }
  });
}

function addIconToField(field) {
  // En una versión real, pondríamos un pequeño icono de GetPass dentro del input
  field.style.backgroundImage = "url('chrome-extension://" + chrome.runtime.id + "/icon.svg')";
  field.style.backgroundRepeat = "no-repeat";
  field.style.backgroundPosition = "right 8px center";
  field.style.backgroundSize = "16px";
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fill") {
    const { username, password } = request.data;
    
    // Simple fill logic
    const passField = document.querySelector('input[type="password"]');
    const userField = document.querySelector('input[type="text"], input[type="email"]');
    
    if (userField) userField.value = username;
    if (passField) passField.value = password;
    
    sendResponse({ success: true });
  }
});

// Listen for session sync from the web app
window.addEventListener("message", (event) => {
  if (event.data?.type === "GP_SYNC_SESSION") {
    const sessionData = JSON.parse(event.data.detail);
    console.log("GetPass: Syncing session from web app");
    
    chrome.storage.local.set({ 
      lastEmail: sessionData.email, 
      userSalt: sessionData.salt 
    });
    
    chrome.runtime.sendMessage({ action: "sync_key", keyB64: sessionData.keyB64 });
  }
});

// Listen for messages from the extension background/popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sync_to_web") {
    console.log("GetPass: Syncing session to web app");
    window.postMessage({ type: "GP_EXT_SYNC", detail: request.session }, "*");
  }
});

// Run detection every second (simple approach)
setInterval(detectFields, 1000);
