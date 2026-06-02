import Avatar from '../components/Avatar.jsx';

export default function Groups({ groups = [], openGroup, createGroup, joinGroup }) {
  return <main className="screen active home-feed">
    <div className="topbar">
      <div>
        <div className="logo" style={{ fontSize: 22 }}>Gruppen</div>
        <div className="tag">Deine Boulder-Crews</div>
      </div>
    </div>

    <section className="feed-card">
      <div className="feed-head">
        <div>
          <div className="card-title">Meine Gruppen</div>
          <h3>Gruppenauswahl</h3>
        </div>
        <button className="soft-link" onClick={createGroup}>+ Neu</button>
      </div>
      {groups.length ? groups.map((g) => (
        <button
          type="button"
          className="feed-row clickable-group-row"
          key={g.id}
          onClick={() => openGroup(g)}
          onTouchEnd={(e) => { e.preventDefault(); openGroup(g); }}
        >
          <Avatar profile={g} className="group" />
          <span>
            <strong>{g.name}</strong>
            <small>{Object.values(g.members || {}).filter((m) => m.active).length} Mitglieder · Code {g.code}</small>
          </span>
          <span>›</span>
        </button>
      )) : <div className="empty compact-empty">Noch keine Gruppe.</div>}
      <button className="text-action" onClick={joinGroup}>Gruppe per Code beitreten</button>
    </section>
  </main>;
}
