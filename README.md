# HeyParents Chatbot – „Nala“

## 🚀 Überblick
Dieser Prototyp implementiert den Charakter **„Nala“** als digitalen Coach für Eltern.  
Er basiert auf der **WattOS KI Multi-Agenten-Plattform** und verbindet Text- & Sprachinteraktion.  

👉 Ziel: Eltern durch das **HeyParents-Angebot** navigieren lassen (aktuell nur allgemeine Fragen möglich). -----> noch nicht nmit Airtable verbunden

---

## 🧩 Systemarchitektur

### Backend – 5-Schichten-Architektur (WattOS KI)
1. **Toolsebene** – Registry für Integrationen (Mail, Kalender, Datenbanken …)  ----------> brauche ich um Airtable in Chatbot zu integrieren
2. **Agentendefinitionsschicht** – Agent = Graph von Funktionen + LLM-Aufrufe  
3. **Charakterschicht** – Identität, Stimme, Systemprompt („Ich bin Nala …“)  
4. **Parallele Streams** – Text (Tokenbuffer) & Audio (TTS)  
5. **Externe Integrationen** – Zugriff via REST + WebSockets  

## 🔄 Architekturfluss

Eingabe → Agent → Charakter → Text + Audio

👉 Siehe [Architekturfluss (PDF)](Skizzirung.drawio.pdf)



---

## ✅ Features (fertig)
- **Login & Auth**: via `/v1/users/login` (JWT in sessionStorage).  
- **Konversationen**: `/v1/conversations` liefert `thread_id`.  
- **Chat**: User-Input + Bot-Output (Text).  
- **Audio-Output**: `/v1/conversations/message/audio/stream` liefert Text + Base64-Audio → abgespielt im Browser.    ------> aktuell instabil → häufig `500` ( Server ) oder leere Antwort. 
- **Datei-Upload**: Upload (PDF, PNG, JPG, DOC) via `/v1/artifacts/add_file`.    --------------> Optional
- **UI**: Responsive Chatbox, Avatare, Buttons (Reset, Logout, Audio).  

---

## ⚠️ Limitierungen 
- Noch **keine Integration mit HeyParents-Inhalten** (nur allgemeine Fragen).  

---

## 🔜 Nächste Schritte
1. WebSocket-Integration stabilisieren.  
2. Airtable-Integration als Content-Quelle (FAQs, Angebote, Filter).  
3. Erweiterung zur Navigation durch HeyParents-Angebote.   

---

## 🛠️ Installation & Nutzung
Einfach index.html im Browser öffnen.

1.E-Mail & Passwort (über API POST /v1/users/login).

2.JWT wird im Browser gespeichert.

### 📡 API-Endpunkte (Auszug)
POST /v1/users/login → Login (JWT) ---------> nach dem login ,wird automatisch Token erstellt sowie thread_id über POST/v1/coversations

POST /v1/conversations → erstellt thread_id

POST /v1/conversations/message/audio/stream → Antwort (Text + Audio-Stream)

POST /v1/artifacts/add_file → Datei-Upload   --------> Optional




















