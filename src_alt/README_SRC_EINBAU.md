# BoulderBase src-Ordner

Diesen Ordner kannst du 1:1 gegen deinen bisherigen `src/`-Ordner austauschen.

Enthalten:
- Freundessystem: `friends/`, `hooks/useFriends.js`, `services/friendService.js`
- Daily Boulder Quote: `components/DailyQuoteCard.jsx`, `data/dailyQuotes.js`
- Addons: ErrorBoundary, Toast/Notifications, LoadingState, EmptyState, PWA-Hinweis
- Firebase-Anbindung: `services/firebase.js`

Nach dem Ersetzen:

```bash
npm run build
firebase deploy --only hosting
```

Falls beim Freundessystem `Missing or insufficient permissions` kommt, musst du zusätzlich deine Firestore Rules deployen:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```
