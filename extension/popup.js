// GetPass Extension Logic (Concept)
// Note: In a real extension, crypto-port.js would be imported or bundled.

const API_URL = "http://localhost:3000/api"; // Cambia por tu URL real

// Al abrir el popup, intentar cargar el último email y salt
document.addEventListener("DOMContentLoaded", async () => {
  const data = await chrome.storage.local.get(["lastEmail", "userSalt"]);
  if (data.lastEmail) {
    document.getElementById("email").value = data.lastEmail;
    document.getElementById("email").style.display = "none";
    document.getElementById("change-user-btn").style.display = "block";
    document.querySelector("#auth-view p").innerText = `Hola, ${data.lastEmail}. Ingresa tu contraseña maestra.`;
  }

  // NUEVO: Intentar desbloqueo automático si hay sesión activa
  const session = await chrome.storage.session.get(["sessionKey"]);
  if (session.sessionKey) {
    autoUnlock(session.sessionKey);
  } else {
    // Si no hay sesión, mostrar el login
    document.getElementById("loading-view").style.display = "none";
    document.getElementById("auth-view").style.display = "flex";
  }
});

async function autoUnlock(b64Key) {
  try {
    const key = await importKey(b64Key);
    await loadVault(key);
    document.getElementById("loading-view").style.display = "none";
  } catch (e) {
    console.warn("Session key invalid or expired", e);
    chrome.storage.session.remove("sessionKey");
    document.getElementById("loading-view").style.display = "none";
    document.getElementById("auth-view").style.display = "flex";
  }
}

async function loadVault(key) {
  const res = await fetch(`${API_URL}/vault`, { credentials: "include" });
  if (!res.ok) throw new Error("Sesión expirada en la web.");
  const { items } = await res.json();

  const decryptedItems = [];
  for (const item of items) {
    try {
      const name = await decrypt(item.encryptedName, key);
      decryptedItems.push({ ...item, name });
    } catch (e) {}
  }

  document.getElementById("auth-view").style.display = "none";
  document.getElementById("vault-view").style.display = "flex";
  renderItems(decryptedItems);
}

document.getElementById("change-user-btn").addEventListener("click", async () => {
  await chrome.storage.local.remove(["lastEmail", "userSalt"]);
  await chrome.storage.session.remove("sessionKey");
  document.getElementById("email").value = "";
  document.getElementById("email").style.display = "block";
  document.getElementById("change-user-btn").style.display = "none";
  document.querySelector("#auth-view p").innerText = "Ingresa tus credenciales para desbloquear el vault.";
});

document.getElementById("unlock-btn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("master-password").value;
  if (!email || !password) return;

  const btn = document.getElementById("unlock-btn");
  btn.innerText = "Cargando...";
  btn.disabled = true;

  try {
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include"
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(loginData.error || "Error al iniciar sesión");
    
    const salt = loginData.user.salt;
    const userId = loginData.user.id;
    const userEmail = loginData.user.email;

    // Guardar para la próxima vez
    await chrome.storage.local.set({ lastEmail: userEmail, userSalt: salt, userId });
    
    // Derivar la clave con el Salt
    const key = await deriveKey(password, salt);
    
    // Guardar la clave en la sesión del navegador para no pedirla de nuevo
    const b64Key = await exportKey(key);
    await chrome.storage.session.set({ sessionKey: b64Key });

    await loadVault(key);

    // NUEVO: Sincronizar de vuelta a la web app
    const tabs = await chrome.tabs.query({ url: "*://localhost/*" });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { 
        action: "sync_to_web", 
        session: { keyB64: b64Key, salt, id: userId, email: userEmail } 
      }).catch(() => {});
    }
    
  } catch (e) {
    alert("Error: " + e.message);
    // Si hay error de auth, volver a mostrar el email
    document.getElementById("email").style.display = "block";
  } finally {
    btn.innerText = "Desbloquear";
    btn.disabled = false;
  }
});

function renderItems(items) {
  const container = document.getElementById("items");
  container.innerHTML = items.map(item => `
    <div class="item" onclick="copyPassword('${item.id}')">
      <div class="item-icon">
        ${item.type === 'login' ? '🔑' : '💳'}
      </div>
      <div class="item-info">
        <span class="item-name">${item.name}</span>
        <span class="item-user">${item.type}</span>
      </div>
    </div>
  `).join("");
}

window.copyPassword = async (id) => {
  // En una extensión real, buscaríamos la contraseña del ítem y la copiaríamos
  // Para este demo, simularemos el envío al content script
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "fill",
      data: { username: "usuario_demo", password: "password_segura_123" }
    }, (response) => {
      if (response?.success) {
        window.close(); // Cerrar popup tras auto-completar
      } else {
        alert("Contraseña copiada al portapapeles");
      }
    });
  });
};

// Lógica de búsqueda
document.getElementById("search").addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  // Filtrar ítems...
});

// Lógica del Generador
document.getElementById("show-gen-btn").addEventListener("click", () => {
  document.getElementById("vault-view").style.display = "none";
  document.getElementById("gen-view").style.display = "flex";
  generateNew();
});

document.getElementById("back-vault-btn").addEventListener("click", () => {
  document.getElementById("gen-view").style.display = "none";
  document.getElementById("vault-view").style.display = "flex";
});

document.getElementById("regen-btn").addEventListener("click", generateNew);

document.getElementById("copy-gen-btn").addEventListener("click", () => {
  const pass = document.getElementById("gen-result").value;
  navigator.clipboard.writeText(pass);
  document.getElementById("back-vault-btn").click();
});

function generateNew() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let pass = "";
  for (let i = 0; i < 16; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  document.getElementById("gen-result").value = pass;
}
