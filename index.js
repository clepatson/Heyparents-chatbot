
let threadId = null;     // speichert wahrscheinlich die ID eines „Threads“
let pendingFile = null;   // verweist auf eine Datei, die noch aussteht (Upload oder Verarbeitung).
let audioDisponible = false;  //  Boolean, zeigt an, ob eine Audiodatei verfügbar ist (true/false).
let audioUrl = null;    // enthält die URL der Audiodatei, falls sie verfügbar ist.

// ---------- AUTH ----------  Diese Funktion prüft bei jeder Anfrage, ob der Benutzer noch authentifiziert ist.
const AUTH_KEY = "hp_jwt";         // Schlüssel, um das JWT (JSON Web Token) im sessionStorage zu speichern.
const AUTH_EXP_KEY = "hp_jwt_exp"; // Schlüssel, um die Ablaufzeit des Tokens zu speichern.(optionnel)

function setAuth(token, expSeconds) {      // Das JWT, das der Server nach dem Login zurückgibt. + Zeitstempel (in Sekunden), wann das Token abläuft.
  sessionStorage.setItem(AUTH_KEY, token);   // Speichert das Token im sessionStorage
  if (expSeconds) sessionStorage.setItem(AUTH_EXP_KEY, String(expSeconds));  // Wenn eine Ablaufzeit vorhanden ist, wird diese ebenfalls gespeichert.
}

function getAuth() {   // Liest das gespeicherte Token und die Ablaufzeit aus dem sessionStorage. und Wenn kein Token vorhanden → null zurückgeben (nicht eingeloggt).-----> Wenn alles ok → gültiges Token zurückgeben.
  const token = sessionStorage.getItem(AUTH_KEY);
  const expStr = sessionStorage.getItem(AUTH_EXP_KEY);
  if (!token) return null;
  if (expStr) {
    const now = Math.floor(Date.now() / 1000);
    if (now >= Number(expStr)) {
      logout();
      return null;
    }
  }
  return token;
}

// Diese Funktion meldet den Benutzer ab, löscht alle Auth-Daten und zeigt wieder den Login-Screen.
function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_EXP_KEY);
  threadId = null; // setzt den Thread zurück, damit nach erneutem Login ein neuer erstellt wird.
  const ov = document.getElementById("loginOverlay");  // sucht das Element mit der ID "loginOverlay" und zeigt es an (display: flex),
  if (ov) ov.style.display = "flex";
}


// Führt einen HTTP-POST-Request an die Login-API aus.
async function login(email, password) {
  const res = await fetch("https://chatbot.omniratio.de/v1/users/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },   // Sendet die Login-Daten (email, password) als JSON.
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error("Ungültige Anmeldedaten");  // Wenn die Antwort (res.ok) nicht erfolgreich ist → wirft einen Fehler

  // Réponses possibles : { access_token, expires_in } ou { token, exp }
  const data = await res.json();
  const token = data.access_token || data.token;
  const exp = data.exp || (data.expires_in ? Math.floor(Date.now()/1000) + data.expires_in : undefined);
  if (!token) throw new Error("Token manquant dans la réponse");  // Wenn kein Token vorhanden → Fehler werfen.


  // Diese Funktion führt den Login-Prozess aus und speichert die Authentifizierung.
  setAuth(token, exp);
  const ov = document.getElementById("loginOverlay");  // zeigt den normalen Inhalt der App, nachdem der Login erfolgreich war.
  if (ov) ov.style.display = "none";
}

// fetch sécurisé : ajoute Bearer + gère 401   // Ruft das gespeicherte Token ab (getAuth()). Wenn keins vorhanden → wirft einen Fehler "Nicht eingeloggt".
async function authFetch(url, options = {}) {
  const token = getAuth();
  if (!token) throw new Error("Nicht eingeloggt");
  const headers = new Headers(options.headers || {});   // Erstellt ein Headers-Objekt aus den übergebenen Optionen.
  headers.set("Authorization", "Bearer " + token);     // Setzt den Authorization-Header auf "Bearer <token>" → Standard für JWT-Authentifizierung.
  const bodyIsFormData = options.body instanceof FormData;
  if (!headers.has("Content-Type") && options.body && !bodyIsFormData) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...options, headers });   // wenn Sitzung abgelaufen. automatisch ausgeloggt
  if (res.status === 401) {
    logout();
    throw new Error("Sitzung abgelaufen. Bitte erneut einloggen.");
  }
  return res;
}
// ---------- /AUTH ----------

function addMessage(htmlContent, user) {  // fügt eine neue Nachricht in den Chat ein (User oder Bot).
  const messagesDiv = document.getElementById('messages');
  const row = document.createElement('div');
  row.className = 'message-row ' + user;
  row.innerHTML =
    user === "bot"
      ? `<img src="Herunterladen.svg" class="message-avatar" alt="Bot">
         <div class="message-bubble">${htmlContent}</div>`
      : `<div class="message-bubble">${htmlContent}</div>
         <img src="pat.jpg" class="message-avatar" alt="User">`;
  messagesDiv.appendChild(row);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showBotThinking() {   // zeigt eine animierte Lade-Nachricht des Bots.
  const messagesDiv = document.getElementById("messages");
  const row = document.createElement("div");
  row.className = "message-row bot";
  row.id = "bot-loading";
  row.innerHTML = `
    <img src="Herunterladen.svg" class="message-avatar" alt="Bot">
    <div class="message-bubble loader-dots"> </div>
  `;
  messagesDiv.appendChild(row);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function removeBotThinking() {      // entfernt diese Ladeanzeige wieder, sobald die Antwort da ist.
  const loadingRow = document.getElementById("bot-loading");
  if (loadingRow) loadingRow.remove();
}


// Sucht das DOM-Element mit der ID messages (der Nachrichtencontainer).  Löscht den gesamten bisherigen Inhalt → der Chat startet von vorne.
function refreshChat() {
  document.getElementById("messages").innerHTML = '';
  addMessage("Hi there! Nice to see you 😊<br>I'm Nala, your digital coach. How can I help you today?", "bot");  // Fügt mit addMessage() sofort eine erste Bot-Nachricht hinzu.
  document.getElementById("userInput").value = "";  // Leert das Texteingabefeld, in das der Benutzer tippt.
  document.getElementById("filePreview").textContent = "";
  pendingFile = null; // keine Datei mehr in Warteschlange.
  audioDisponible = false; // kein Audio verfügbar.
  if (audioUrl) {    // Wenn eine Audiodatei existiert (audioUrl), wird sie mit URL.revokeObjectURL() wieder freigegeben.
    URL.revokeObjectURL(audioUrl);
    audioUrl = null;  // Danach wird audioUrl auf null gesetzt.
  }
}

async function createThread() {     // schickt einen authentifizierten POST-Request an die API, um eine neue Konversation zu eröffnen.
  const res = await authFetch("https://chatbot.omniratio.de/v1/conversations", {
    method: "POST",
    body: JSON.stringify({ role: "Nala" })  // gibt an, mit welcher „Rolle/Persona“ der Bot antworten soll.
  });
  const data = await res.json();
  threadId = data.thread_id;  // wird aus dem JSON gelesen und in die globale Variable threadId geschrieben.
  console.log("🎯 Thread créé :", threadId); // loggt die erstellte Thread-ID zu Debug-Zwecken.
}

async function sendMessage() {
  const inputField = document.getElementById("userInput"); // Holt den Text aus dem Eingabefeld, trimmt Leerzeichen.  // Bricht ab, wenn nichts eingegeben wurde.
  const userMessage = inputField.value.trim();
  if (!userMessage) return;

  while (!threadId) {    // Warteschleife: wartet, bis threadId gesetzt ist (z. B. nach createThread() beim App-Start/Login).
    await new Promise(resolve => setTimeout(resolve, 50));
  }


  // Fügt anschließend den Text des Users hinzu und zeigt alles im Chat (aus Sicht „user“).
  let messageHTML = "";
  if (pendingFile) {
    const fileURL = URL.createObjectURL(pendingFile);
    const isImage = pendingFile.type.startsWith("image/");
    messageHTML += isImage
      ? `<div><img src="${fileURL}" alt="${pendingFile.name}" style="max-width: 150px; border-radius: 8px; margin-bottom: 8px;"></div>`
      : `<div style="font-size: 13px; margin-bottom: 6px;">📎 <a href="${fileURL}" target="_blank" style="color: #176cff; text-decoration: none;">${pendingFile.name}</a></div>`;
  }
  messageHTML += `<div>${userMessage}</div>`;
  addMessage(messageHTML, "user");

  inputField.value = "";  // UI-Reset: Eingabe leeren, Dateivorschau leeren, „Bot denkt…“-Animation anzeigen.
  document.getElementById("filePreview").textContent = "";
  showBotThinking();

  if (pendingFile) {  //  Upload: Wenn eine Datei angehängt war, wird sie per FormData hochgeladen (authentifiziert).   // Danach wird pendingFile zurückgesetzt.
    const formData = new FormData();
    formData.append("file", pendingFile);
    formData.append("character", "Nala");
    formData.append("description", pendingFile.name);
    formData.append("storage_type", "local");

    await authFetch("https://chatbot.omniratio.de/v1/artifacts/add_file", {
      method: "POST",
      body: formData
    });

    pendingFile = null; // Danach wird pendingFile zurückgesetzt.
  }

  try {
    const payload = { // Payload für die Bot-Antwort:   // Konfiguration einer serverseitigen Suchfunktion (Parameter m/n).
      message: userMessage,
      thread_id: threadId,
      role: "Nala",
      search_tool_config: {
        function_name: "hybrid_search",
        params: { m: 130, n: 10 }
      }
    };


    // Streaming-Endpoint: sendet die Nachricht und erhält einen Text-Stream (Server-Sent Events/Chunks).
    const res = await authFetch("https://chatbot.omniratio.de/v1/conversations/message/audio/stream", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

    const rawText = await res.text();
    removeBotThinking();  // Entfernt die „denkt…“-Anzeige, sobald etwas zurückkommt.

    const matches = Array.from(rawText.matchAll(/data:\s*(\{.*?\})/g));  // Parsing des Streams: Sucht in rawText nach Zeilen im Format data: { ... }. 
    if (!matches.length) {
      addMessage("❌ Le bot n’a pas pu répondre. Réponse brute :<br><pre>" + rawText + "</pre>", "bot");
      return;
    }

    let responseText = null;
    let audioSegments = [];

    for (let match of matches) {
      try {
        const obj = JSON.parse(match[1]);
        if (obj.message && obj.message.trim()) {  // //Wenn message vorhanden → als Textantwort merken (die letzte nicht-leere setzt sich durch). 
          responseText = obj.message;
        }
        if (obj.audio) {
          audioSegments.push(obj.audio);  // // Wenn audio vorhanden → Base64-Audioschnipsel sammeln.
        }
      } catch (err) {
        console.warn("⚠️ Erreur de parsing :", err);
      }
    }

    if (!responseText) {  // Wenn kein Text extrahiert werden konnte → Fehlermeldung im Chat.
      addMessage("🤖 Je n’ai pas pu formuler de réponse. Essaie une autre formulation.", "bot");
      return;
    }

    addMessage(responseText, "bot"); //   //   Sonst → Bot-Textnachricht anzeigen.

    const audioPlayer = document.getElementById("audioPlayer");  // Base64-Schnipsel → in Binär-Arrays (Uint8Array) decodieren.
    const microBtn = document.getElementById("microBtn");

    if (audioSegments.length > 0) {   // Alle Schnipsel aneinanderfügen → zusammengefügter Audio-Buffer.
      try {
        const arrays = audioSegments.map(segment => {
          const binary = atob(segment);
          return Uint8Array.from(binary, char => char.charCodeAt(0));
        });

        const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
        const mergedArray = new Uint8Array(totalLength);
        let offset = 0;
        for (let arr of arrays) {
          mergedArray.set(arr, offset);
          offset += arr.length;
        }

        const blob = new Blob([mergedArray], { type: "audio/mpeg" });

        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          audioPlayer.removeAttribute("src");
          audioPlayer.load();
        }

        audioUrl = URL.createObjectURL(blob); // UI: Mikro-Button anzeigen; Klick spielt das Audio von vorn ab.
        audioPlayer.src = audioUrl;
        audioDisponible = true;
        microBtn.style.display = "inline-flex";

        audioPlayer.onloadeddata = () => {
          microBtn.onclick = () => {
            audioPlayer.currentTime = 0;
            audioPlayer.play().catch(err => {
              console.error("❌ Erreur de lecture :", err);
            });
          };
        };
      } catch (e) {
        console.error("❌ Problème lors de la génération de l’audio :", e);
        audioDisponible = false;
        audioPlayer.src = "";
        microBtn.style.display = "none";
      }
    } else {
      audioDisponible = false;   // Fehlerfall: Audio ausblenden, Player zurücksetzen.
      audioPlayer.src = "";
      microBtn.style.display = "none";
    }

    // Gesamter Fehlerfang: entfernt Loader, loggt Fehler in die Konsole und zeigt eine Chat-Fehlermeldung.
  } catch (err) {
    removeBotThinking();
    console.error("❌ Erreur dans sendMessage:", err);
    addMessage("❌ Erreur réseau : " + err.message, "bot");
  }
}

// Événements DOM

// Drückt der Nutzer Enter im Eingabefeld → sendMessage() wird aufgerufen.
document.getElementById("userInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") sendMessage();
});

document.getElementById("uploadBtn").addEventListener("click", () => {
  document.getElementById("uploadInput").click();
});

document.getElementById("uploadInput").addEventListener("change", (event) => {
  pendingFile = event.target.files[0];
  if (pendingFile) {
    document.getElementById("filePreview").textContent = "📎 " + pendingFile.name; // Speichert die erste ausgewählte Datei und zeigt den Dateinamen in der Vorschau.
  }
});


// Login-Button         // Liest E-Mail/Passwort, versteckt die Fehleranzeige.
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const pw = document.getElementById("loginPassword").value;
  const errEl = document.getElementById("loginError");
  errEl.style.display = "none";
  try {
    await login(email, pw);  // Versucht Login → bei Erfolg:
    await createThread();  // createThread() (neue Konversation)
    refreshChat();   // refreshChat() (UI zurücksetzen, Begrüßung posten)
  } catch (e) {
    errEl.textContent = e.message || "Échec de la connexion";  // Fehler → Fehlermeldung im UI anzeigen.
    errEl.style.display = "block";
  }
});


// Beim Laden der Seite:
window.addEventListener("DOMContentLoaded", async () => {
  const token = getAuth();
  if (!token) {    // Kein Token → Login-Overlay anzeigen und abbrechen.
    const ov = document.getElementById("loginOverlay");
    if (ov) ov.style.display = "flex";
    return;
  }
  await createThread();   // Token vorhanden → Thread anlegen und Chat initialisieren (Begrüßung, leeres Eingabefeld etc.).
  refreshChat();
});

