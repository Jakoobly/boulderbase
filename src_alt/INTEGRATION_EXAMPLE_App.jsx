// src/INTEGRATION_EXAMPLE_App.jsx
// Kein vollständiger Ersatz für deine App.jsx, sondern zeigt die relevanten Stellen.

import DailyQuoteCard from './components/DailyQuoteCard.jsx';
import FriendsScreen from './friends/FriendsScreen.jsx';
import InstallPwaHint from './components/InstallPwaHint.jsx';
import Toast from './components/Toast.jsx';
import './addons.css';

// In deiner App-Komponente:
export default function AppIntegrationExample({ user, profile, screen, setScreen, notify, toast }) {
  if (screen === 'friends') {
    return <FriendsScreen user={user} profile={profile} setScreen={setScreen} notify={notify} />;
  }

  return (
    <>
      <Toast message={toast} />
      {/* Auf dem Home Screen einfügen, z.B. direkt unter Schnellstart */}
      <DailyQuoteCard />
      <InstallPwaHint />
      <button className="btn btn-secondary" onClick={() => setScreen('friends')}>Freunde öffnen</button>
    </>
  );
}
