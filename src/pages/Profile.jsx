import { useState } from 'react';
import Avatar from '../components/Avatar.jsx';
import { safeDate } from '../utils.js';
import PersonalizeModal from '../components/PersonalizeModal.jsx';

export default function Profile({ profile, setProfile, saveProfile, metric, setMetric, back, logout }) {
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const history = profile.matchHistory || [];
  const avg = history.length ? Math.round(history.reduce((a, m) => a + (m.points || 0), 0) / history.length) : 0;
  const avgTops = history.length ? (history.reduce((a, m) => a + (m.tops || 0), 0) / history.length).toFixed(1) : '0.0';
  const avgZones = history.length ? (history.reduce((a, m) => a + (m.zones || 0), 0) / history.length).toFixed(1) : '0.0';
  const values = { points: [avg, 'Ø Punkte pro Runde', `${history.length} gespielte Runden`], tops: [avgTops, 'Ø Tops pro Runde', `${profile.tops || 0} Tops gesamt`], zones: [avgZones, 'Ø Zones pro Runde', 'Zones zählen nur, solange kein Top erreicht wurde'] };
  function savePersonalization(next) {
    const updated = { ...profile, name: next.name, status: next.description, avatarColor: next.avatarColor, avatarIcon: next.avatarIcon };
    setProfile(updated);
    saveProfile(updated);
  }
  return <main className="screen active"><div className="topbar"><button className="back-btn" onClick={back}>← zurück</button><div className="logo" style={{ fontSize: 18 }}>Profil</div></div>
    <div className="card profile-edit-card"><div className="profile-edit-head"><Avatar profile={profile} className="big" /><div><h2>{profile.name}</h2><div className="sub">{profile.status || 'Keine Beschreibung'}</div></div></div><div className="profile-action-grid"><button className="btn btn-secondary mt12 full-mobile" onClick={() => setPersonalizeOpen(true)}>Profil personalisieren</button><button className="btn btn-secondary mt12 full-mobile" onClick={logout}>Logout</button></div></div>
    <div className="tabs"><button className={`tab ${metric === 'points' ? 'active' : ''}`} onClick={() => setMetric('points')}>Punkte</button><button className={`tab ${metric === 'tops' ? 'active' : ''}`} onClick={() => setMetric('tops')}>Tops</button><button className={`tab ${metric === 'zones' ? 'active' : ''}`} onClick={() => setMetric('zones')}>Zones</button></div><div className="card chart-box"><div className="profile-summary-card"><div className="profile-summary-value">{(values[metric] || values.points)[0]}</div><div className="profile-summary-label">{(values[metric] || values.points)[1]}</div><div className="profile-summary-sub">{(values[metric] || values.points)[2]}</div></div></div><div className="card"><div className="card-title">Letzte Matches</div>{history.length ? history.map((m) => <div className="list-item" key={m.id}><h3>{m.title}</h3><div className="sub">{safeDate(m.endedAt)} · {m.groupName} · {m.points} Punkte · {m.tops} Tops</div></div>) : <div className="empty">Noch keine vergangenen Matches.</div>}</div>
    {personalizeOpen && <PersonalizeModal title="Profil anpassen" value={{ ...profile, description: profile.status || '' }} descriptionLabel="Beschreibung" onClose={() => setPersonalizeOpen(false)} onSave={savePersonalization} />}
  </main>;
}