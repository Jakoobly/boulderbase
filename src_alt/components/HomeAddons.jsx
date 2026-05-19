// src/components/HomeAddons.jsx
// Diese Komponente kannst du auf deinem Home Screen einfügen.
import DailyQuoteCard from './DailyQuoteCard.jsx';
import InstallPwaHint from './InstallPwaHint.jsx';

export default function HomeAddons({ setScreen }) {
  return (
    <>
      <DailyQuoteCard />
      <InstallPwaHint />
      <button className="btn btn-secondary mb12" onClick={() => setScreen('friends')}>👥 Freunde</button>
    </>
  );
}
