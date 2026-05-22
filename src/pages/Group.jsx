import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../services/firebase.js';
import Avatar from '../components/Avatar.jsx';
import PersonalizeModal from '../components/PersonalizeModal.jsx';
import GroupChat from '../features/chat/GroupChat.jsx';
import { rank, safeDate } from '../utils.js';
import { ChallengeMini } from '../features/challenges/ChallengeMini.jsx';

function oneLineName(name = '') {
  const clean = String(name || 'Unbekannt').trim();
  return clean.length > 25 ? `${clean.slice(0, 25)}…` : clean;
}


function Stat({ n, l }) {
  return <div className="stat-box"><div className="stat-num">{n}</div><div className="stat-lbl">{l}</div></div>;
}

function leaderboardValue(member, metric) {
  const s = member.stats || {};
  if (metric === 'sessions') return s.sessions || 0;
  if (metric === 'tops') return s.tops || 0;
  if (metric === 'best') return s.best || 0;
  if (metric === 'avg') return s.sessions ? Math.round((s.points || 0) / s.sessions) : 0;
  if (metric === 'month') return s.monthPoints || 0;
  return s.points || 0;
}

export default function Group({ group, sessions, challenges, back, invite, start, openChallenges, editGroup, updateMemberRole, deleteGroup, currentUid, openSession, sendMessage }) {
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteName, setDeleteName] = useState('');
  const [selectedMemberUid, setSelectedMemberUid] = useState(null);
  const [leaderMetric, setLeaderMetric] = useState('points');
  const [activeGroupPanel, setActiveGroupPanel] = useState('members');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLastRead, setChatLastRead] = useState(() => Number(localStorage.getItem(`boulderbase-group-chat-read-${group.id}`) || 0));
  const members = Object.values(group.members || {}).filter((m) => m.active);
  const totalPoints = members.reduce((a, m) => a + (m.stats?.points || 0), 0);
  const totalTops = members.reduce((a, m) => a + (m.stats?.tops || 0), 0);
  const myRole = group.members?.[currentUid]?.role;
  const canManageRoles = group.createdBy === currentUid || myRole === 'owner' || myRole === 'admin';
  const canEdit = canManageRoles;
  const canDeleteGroup = group.createdBy === currentUid;

  useEffect(() => {
    if (!group.id) return undefined;
    const q = query(collection(db, 'groups', group.id, 'messages'), orderBy('createdAtMillis', 'asc'));
    return onSnapshot(q, (snap) => setChatMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [group.id]);

  useEffect(() => {
    if (activeGroupPanel !== 'chat') return;
    const newest = chatMessages.reduce((max, m) => Math.max(max, Number(m.createdAtMillis || 0)), Date.now());
    localStorage.setItem(`boulderbase-group-chat-read-${group.id}`, String(newest));
    setChatLastRead(newest);
  }, [activeGroupPanel, chatMessages, group.id]);

  const unreadChatCount = chatMessages.filter((m) => Number(m.createdAtMillis || 0) > chatLastRead && m.senderId !== currentUid).length;


  function roleLabel(role, uid) {
    if (uid === group.createdBy || role === 'owner') return 'Ersteller';
    if (role === 'admin') return 'Admin';
    if (role === 'guest') return 'Gast';
    return 'Mitglied';
  }

  function saveGroupPersonalization(next) {
    editGroup({ name: next.name, description: next.description, avatarIcon: next.avatarIcon, avatarColor: next.avatarColor });
  }

  const deleteNameMatches = deleteName.trim() === group.name;
  async function confirmDeleteGroup() {
    if (!deleteNameMatches) return;
    await deleteGroup();
    setDeleteOpen(false);
    setDeleteName('');
  }

  return <main className="screen active">
    <div className="topbar"><button className="back-btn" onClick={back}>← Gruppen</button><button className="back-btn" onClick={invite}>Code kopieren</button></div>

    <div className="card">
      <div className="row"><Avatar profile={group} className="group big" /><div><div className="logo" style={{ fontSize: 24 }}>{group.name}</div><div className="sub">{group.description || `Code: ${group.code}`}</div></div></div>
      <div className="mt12 action-row"><button className="btn btn-primary" onClick={start}>Neue Session</button><button className="btn btn-secondary" onClick={openChallenges}>Challenge</button><button className="btn btn-secondary" onClick={invite}>Einladen</button>{canEdit && <button className="btn btn-secondary full-mobile" onClick={() => setPersonalizeOpen(true)}>Gruppe personalisieren</button>}</div>
    </div>

    <div className="stat-grid"><Stat n={members.length} l="Mitglieder" /><Stat n={sessions.filter((s) => s.status === 'finished').length} l="Sessions" /><Stat n={totalTops} l="Tops" /><Stat n={totalPoints} l="Punkte" /></div>

    <div className="card"><div className="card-title">Challenges</div>{challenges?.length ? challenges.slice(0, 3).map((c) => <ChallengeMini key={c.id} challenge={c} />) : <div className="empty">Noch keine Challenge. Admins können über den Challenge-Button eine erstellen.</div>}<button className="btn btn-secondary mt8" onClick={openChallenges}>Alle Challenges öffnen</button></div>

    <div className="card group-panel-card">
      <div className="group-section-tabs" role="tablist" aria-label="Gruppenbereiche">
        <button type="button" className={`group-section-tab ${activeGroupPanel === 'members' ? 'active' : ''}`} onClick={() => setActiveGroupPanel('members')}>Mitglieder</button>
        <button type="button" className={`group-section-tab ${activeGroupPanel === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveGroupPanel('leaderboard')}>Leaderboard</button>
        <button type="button" className={`group-section-tab chat-tab ${activeGroupPanel === 'chat' ? 'active' : ''}`} onClick={() => setActiveGroupPanel('chat')}>
          Chat
          {unreadChatCount > 0 && <span className="unread-badge">{unreadChatCount > 99 ? '99+' : unreadChatCount}</span>}
        </button>
      </div>
    </div>

    {activeGroupPanel === 'members' && <>
    <div className="card">
      <div className="card-title">Gruppenmitglieder</div>
      {canManageRoles && <div className="sub mb12">Tippe auf ein anderes Mitglied, um Details und Rollenoptionen zu öffnen.</div>}
      {members.map((m) => {
        const isOwner = m.uid === group.createdBy || m.role === 'owner';
        const isAdmin = m.role === 'admin';
        const isGuest = m.role === 'guest';
        const canOpenRoleMenu = canManageRoles && m.uid !== currentUid;
        const isSelected = canOpenRoleMenu && selectedMemberUid === m.uid;
        const canChangeThisRole = canOpenRoleMenu && !isOwner && !isGuest;
        return <div className={`member-role-card ${isSelected ? 'open' : ''} ${!canOpenRoleMenu ? 'locked' : ''}`} key={m.uid}>
          <button type="button" className="member-role-summary" disabled={!canOpenRoleMenu} onClick={() => setSelectedMemberUid(isSelected ? null : m.uid)}>
            <div className="row"><Avatar profile={m} className="ice" /><div className="member-role-text"><h3 title={m.name || 'Unbekannt'}><span className="member-one-line-name">{oneLineName(m.name)}</span>{m.uid === currentUid ? <span className="member-self-label">(Du)</span> : null}</h3><div className="sub">{roleLabel(m.role, m.uid)}</div></div></div>
            {canOpenRoleMenu && <span className="member-role-chevron">{isSelected ? '−' : '+'}</span>}
          </button>
          {isSelected && <div className="member-role-panel">
            <div className="sub">Aktuelle Rolle: <strong>{roleLabel(m.role, m.uid)}</strong></div>
            {isOwner && <div className="notice small-notice">Der Ersteller bleibt immer Admin und kann nicht geändert werden.</div>}
            {isGuest && <div className="notice small-notice">Gastspieler können keine Admin-Rechte bekommen.</div>}
            {canChangeThisRole && <div className="role-actions role-actions-panel">
              {isAdmin
                ? <button className="tiny-btn" onClick={() => updateMemberRole(m.uid, 'member')}>Zu Mitglied machen</button>
                : <button className="tiny-btn" onClick={() => updateMemberRole(m.uid, 'admin')}>Zum Admin machen</button>}
            </div>}
          </div>}
        </div>;
      })}
    </div>

    </>}

    {activeGroupPanel === 'leaderboard' && <>
    <div className="card"><div className="feed-head"><div><div className="card-title">Leaderboard</div><h3>Gruppenwertung</h3></div><select className="small-select" value={leaderMetric} onChange={(e) => setLeaderMetric(e.target.value)}><option value="points">Gesamtpunkte</option><option value="month">Punkte diesen Monat</option><option value="sessions">Sessions</option><option value="tops">Tops</option><option value="best">Beste Session</option><option value="avg">Ø Punkte</option></select></div>{[...members].sort((a, b) => leaderboardValue(b, leaderMetric) - leaderboardValue(a, leaderMetric)).map((m, i) => <div className="lb-row" key={m.uid}><div className="lb-rank">{rank(i)}</div><Avatar profile={m} className="ice" /><div className="lb-name" title={m.name || 'Unbekannt'}>{oneLineName(m.name)}</div><div className="lb-score">{leaderboardValue(m, leaderMetric)}</div></div>)}</div>
    </>}
    {activeGroupPanel === 'chat' && <GroupChat groupId={group.id} sendMessage={sendMessage} embedded currentUid={currentUid} />}
    <div className="card"><div className="card-title">Historie</div>{sessions.length ? sessions.map((s) => <div className="list-item clickable" key={s.id} onClick={() => s.status === 'active' && openSession(s.id)}><h3>{s.title}</h3><div className="sub">{safeDate(s.createdAtMillis)} · {s.mode} · {Object.keys(s.participants || {}).length} Teilnehmer · {s.status}</div></div>) : <div className="empty">Noch keine Sessions gespeichert.</div>}</div>
    {deleteOpen && <div className="delete-popup-backdrop" onClick={() => { setDeleteOpen(false); setDeleteName(''); }}>
      <div className="delete-popup" onClick={(e) => e.stopPropagation()}>
        <div className="delete-confirm-title compact-delete-title">Gruppe löschen</div>
        <p className="sub">Diese Aktion löscht die Gruppe und die zugehörigen Sessions. Zum Bestätigen bitte den Gruppennamen eingeben.</p>
        <div className="delete-confirm-name compact-delete-name">{group.name}</div>
        <input className="input compact-delete-input" value={deleteName} onChange={(e) => setDeleteName(e.target.value)} placeholder="Gruppenname" autoFocus />
        <div className="compact-delete-actions"><button type="button" className="tiny-btn" onClick={() => { setDeleteOpen(false); setDeleteName(''); }}>Abbrechen</button><button type="button" className="tiny-btn danger-tiny-btn" disabled={!deleteNameMatches} onClick={confirmDeleteGroup}>Endgültig löschen</button></div>
      </div>
    </div>}
    {personalizeOpen && <PersonalizeModal title="Gruppe anpassen" value={group} descriptionLabel="Beschreibung" onClose={() => setPersonalizeOpen(false)} onSave={saveGroupPersonalization} dangerAction={canDeleteGroup ? { label: 'Gruppe löschen', onClick: () => { setPersonalizeOpen(false); setDeleteName(''); setDeleteOpen(true); } } : null} />}
  </main>;
}