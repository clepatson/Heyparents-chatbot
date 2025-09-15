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





### Airtable-Integration
Damit könnten wir den Chatbot direkt mit unseren Daten arbeiten lassen, z. B. Elternprofile, Kursanmeldungen oder Statusinformationen. Ich habe mir dazu einen möglichen Workflow überlegt:

## 1. Ziel
Eltern sollen nicht nur Fragen stellen können, sondern der Bot kann live aus unserer Airtable-Datenbank antworten (z. B. „Bin ich schon registriert?“ oder „Welchen Status habe ich?“).
Optional kann der Bot auch Daten aktualisieren („Bitte setze mich auf ‚qualified‘“).



Airtable wird als Tool eingebunden: entweder über eine -->Built-in Integration (falls verfügbar) oder als -->Custom-Tool (kleiner API-Wrapper).



### 1.1 Built-in Integration (falls verfügbar)--> ohne eigenen Code , nur Konfiguration ( Mapping )
über die Oberfläche https://chatbot.omniratio.de/ui/   ----------> Oben ins Menü → Kontoeinstellungen (oder manchmal ein eigener Tab „Integrationen hinzufügen“). ------------->   Dort solltest du „Integration hinzufügen“ oder speziell „Airtable“ sehen.

Eingabe

| Required      | Werte                  |
|:-----------|:------------------------|
| API Key    | aus Airtable       |
| Base ID | aus Airtable    |
| Tabelle(n)_Namen | aus Airtable       |
| Optional: erlaubte Felder | (Name, Email, Status …) |


.Speichern → die Plattform registriert automatisch fertige Tools (z. B. airtable.search, airtable.update).

.Danach gehst du zu Charaktere, wählst „Nala“ und aktivierst die Tools für diesen Charakter.


1.Der Character „Nala“ bekommt Zugriff auf diese Tools und kann sie automatisch aufrufen.
Character-Prompt (System)

Beispiel :

„Du bist Nala, der HeyParents-Coach.
Wenn Eltern nach Kursen, Anmeldungen, Status oder Kontakt fragen, nutze zuerst airtable_search_parents mit passender Query (Name/E-Mail). Wenn Status angepasst werden soll, nutze airtable_update_parent_status.
Erkläre jede Änderung freundlich und bestätige die Ergebnisse kurz. Antworte in der Sprache der Nutzeranfrage.“



## Workflow-Beispiel

User: „Kannst du mir sagen, ob wir für marta@beispiel.de
 schon Kontakt hatten?“

Nala: ruft airtable_search_parents({ query: "marta@beispiel.de" }) → antwortet mit Ergebnis + (Audio).

User: „Stell sie bitte auf qualified.“

Nala: ruft airtable_update_parent_status({ recordId:"rec123", status:"qualified" }) → bestätigt mit Ergebnis + (Audio).







### 1.2 Custom-Tool (kleiner API-Wrapper).
