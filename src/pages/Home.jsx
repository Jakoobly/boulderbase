import DailyQuoteCard from '../components/DailyQuoteCard.jsx';

export default function Home({ profile, startFree }) {
  const displayName = profile?.name || 'Gast';

  return <main className="screen active home-feed">
    <div className="topbar">
      <div><div className="home-logo-line"><div className="logo">Boulder<em>Base</em></div><span className="beta-badge">BETA</span></div><div className="tag">Für Boulderer, von Boulderern gemacht.</div></div>
    </div>

    <DailyQuoteCard />

    <section className="feed-card hero-feed-card">
      <div className="tag">Willkommen zurück</div>
      <h2>{displayName}</h2>
      <p>Bereit für deine nächste Bouldersession?</p>
      <div className="soft-actions"><button className="btn btn-primary compact" onClick={startFree}>Freie Runde</button></div>
    </section>

  </main>;
}
