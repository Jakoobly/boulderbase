import Avatar from '../components/Avatar.jsx';
import DailyQuoteCard from '../components/DailyQuoteCard.jsx';

export default function Home({ profile, groups = [], openGroup, createGroup, joinGroup, startFree, setScreen }) {
  const displayName = profile?.name || 'Gast';

  return <main className="screen active home-feed">
    <div className="topbar">
      <div><div className="logo">Boulder<em>Base</em></div><div className="tag">Training · Gruppen · Freunde</div></div>
      <div className="topbar-actions">
        <button className="profile-chip" onClick={() => setScreen('profile')} aria-label="Profil öffnen"><Avatar profile={profile} className="ice" /><span>Profil</span></button>
        <button className="icon-btn" onClick={() => setScreen('friends')} title="Freunde">👥</button>
      </div>
    </div>

    <DailyQuoteCard />

    <section className="feed-card hero-feed-card">
      <div className="tag">Willkommen zurück</div>
      <h2>Hi {displayName} 👋</h2>
      <p>{profile?.status || 'Wähle eine Gruppe oder starte eine freie Session.'}</p>
      <div className="soft-actions"><button className="btn btn-primary compact" onClick={startFree}>Freie Runde</button><button className="soft-link" onClick={() => setScreen('friends')}>Freunde</button></div>
    </section>

    <section className="feed-card">
      <div className="feed-head"><div><div className="card-title">Meine Gruppen</div><h3>Gruppenauswahl</h3></div><button className="soft-link" onClick={createGroup}>+ Neu</button></div>
      {groups.length ? groups.map((g) => <button type="button" className="feed-row clickable-group-row" key={g.id} onClick={() => openGroup(g)} onTouchEnd={(e) => { e.preventDefault(); openGroup(g); }}><Avatar profile={g} className="group" /><span><strong>{g.name}</strong><small>{Object.values(g.members || {}).filter((m) => m.active).length} Mitglieder · Code {g.code}</small></span><span>›</span></button>) : <div className="empty compact-empty">Noch keine Gruppe.</div>}
      <button className="text-action" onClick={joinGroup}>Gruppe per Code beitreten</button>
    </section>
  </main>;
}
