import Avatar from './Avatar.jsx';

export default function JoinGroupScreen({ group, isMember, join, back }) {
  if (!group) {
    return (
      <main className="screen active">
        <div className="topbar"><button className="back-btn" onClick={back}>Zurueck</button></div>
        <div className="card"><div className="empty">Einladung wird geladen...</div></div>
      </main>
    );
  }

  return (
    <main className="screen active">
      <div className="topbar"><button className="back-btn" onClick={back}>Zurueck</button></div>
      <div className="card invite-join-card">
        <Avatar profile={group} className="group big" />
        <div>
          <div className="card-title">Gruppeneinladung</div>
          <h2>{group.name}</h2>
          <div className="sub">{group.description || 'Du wurdest zu dieser BoulderBase-Gruppe eingeladen.'}</div>
        </div>
      </div>
      <button type="button" className="btn btn-primary" onClick={join}>
        {isMember ? 'Gruppe oeffnen' : 'Gruppe beitreten'}
      </button>
    </main>
  );
}
