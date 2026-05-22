# BoulderBase src Struktur

Diese Version trennt die App in klarere Bereiche:

```text
src/
  App.jsx                         # App-State, Auth, Navigation, Firestore-Orchestrierung
  constants.js                    # Boulderfarben, Routen, Modus-Regeln
  utils.js                        # allgemeine kleine Helfer

  pages/
    Home.jsx                      # Startseite / Gruppenübersicht
    Group.jsx                     # Gruppenansicht
    Profile.jsx                   # Profilansicht

  features/
    sessions/
      Setup.jsx                   # Session Setup: Modus, Team, Single-Device
      Game.jsx                    # aktive Session
      Results.jsx                 # Ergebnisansicht
    challenges/
      Challenges.jsx              # Gruppen-Challenges
      ChallengeMini.jsx           # kleine Challenge-Vorschau
      challengeHelpers.js         # Einheiten, Prozentrechnung
    chat/
      GroupChat.jsx               # Gruppenchat
      DirectChat.jsx              # Freundeschat + Wettbewerbe

  components/
    AuthScreen.jsx
    Avatar.jsx
    PersonalizeModal.jsx
    ui/
      Stat.jsx

  services/
    firebase.js                   # Firebase Initialisierung
    friendService.js              # Freundeslogik

  friends/                        # bestehende Freundesfunktionen
  hooks/                          # wiederverwendbare Hooks
```

## Grundidee

`App.jsx` soll nicht mehr das gesamte UI enthalten. Es verwaltet hauptsächlich:

- Login/Auth-State
- aktive Ansicht (`screen`)
- globale Daten wie Gruppen, Sessions, Challenges
- Firestore-Schreibaktionen
- Weitergabe der nötigen Funktionen an Pages/Features

Die eigentlichen UI-Bereiche liegen jetzt in eigenen Dateien.
