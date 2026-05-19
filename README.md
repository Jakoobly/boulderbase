# BoulderBase React

React/Vite-Neuaufbau deiner bisherigen `index.html`-Webapp. Die Optik bleibt nah am Original, aber die App ist jetzt in Komponenten, Services und Konstanten aufgeteilt.

## Start lokal

```bash
npm install
npm run dev
```

## Firebase

Die App liest Firebase-Konfiguration aus `.env`-Variablen. Zum schnellen Testen ist aktuell ein Fallback auf deine bisherige Firebase-Konfiguration aus der alten HTML-Datei eingebaut.

Empfohlen:

```bash
cp .env.example .env
```

Dann deine Firebase-Werte eintragen.

## Deploy auf Firebase Hosting

```bash
npm run build
firebase deploy
```

`firebase.json` ist bereits für Vite gesetzt: `public = dist` und Rewrite auf `/index.html`.

## Was umgesetzt ist

- React/Vite statt monolithischer HTML-Datei
- Firebase Auth: Login, Registrierung, Gastlogin
- Firestore: User, Gruppen, Sessions
- Gruppen erstellen, per Code beitreten, Leaderboard, Historie
- Freie Runde und Gruppen-Session
- Session-Setup mit Modus, Zeitlimit, Teilnehmern und Gästen
- Spielscreen mit Routen, Versuchen, Top/Zone, Punkten
- Ergebnisse speichern und Profilstatistiken aktualisieren
- Profil mit Avatar, Status, Auswertungen und Match-Historie

## Wichtiger Hinweis

Freunde/Challenges sind im Original sehr umfangreich. Die React-Version ist als sauberer, erweiterbarer Kern aufgebaut. Diese Features lassen sich jetzt deutlich einfacher als eigene Komponenten ergänzen.
