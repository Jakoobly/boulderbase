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

function getSessionMillis(session) {
  return Number(session.endedAt || session.endedAtMillis || session.createdAtMillis || session.createdAt || 0);
}

function isCurrentMonth(timestamp) {
  const value = Number(timestamp || 0);
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function buildMonthPointsByMember(sessions = []) {
  return sessions.reduce((acc, session) => {
    if (session.status !== 'finished' || !isCurrentMonth(getSessionMillis(session))) return acc;
    Object.values(session.results || session.participants || {}).forEach((participant) => {
      if (participant?.isGuest) return;
      const uid = participant.accountUid || participant.uid;
      if (!uid) return;
      acc[uid] = (acc[uid] || 0) + Number(participant.totalScore || participant.points || 0);
    });
    return acc;
  }, {});
}

function monthLabel(date) {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

function buildMonthlyGroupStats(sessions = []) {
  const statsByMonth = {};

  sessions.forEach((session) => {
    if (session.status !== 'finished') return;
    const time = getSessionMillis(session);
    if (!time) return;

    const date = new Date(time);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!statsByMonth[key]) {
      statsByMonth[key] = {
        key,
        label: monthLabel(date),
        sessions: 0,
        tops: 0,
        points: 0,
      };
    }

    statsByMonth[key].sessions += 1;
    Object.values(session.results || session.participants || {}).forEach((participant) => {
      if (participant?.isGuest) return;
      statsByMonth[key].tops += Number(participant.routesSolved || participant.tops || participant.topCount || 0);
      statsByMonth[key].points += Number(participant.totalScore || participant.points || 0);
    });
  });

  return Object.values(statsByMonth).sort((a, b) => b.key.localeCompare(a.key));
}

function leaderboardValue(member, metric, monthPointsByMember = {}) {
  const s = member.stats || {};
  if (metric === 'sessions') return s.sessions || 0;
  if (metric === 'tops') return s.tops || 0;
  if (metric === 'best') return s.best || 0;
  if (metric === 'avg') return s.sessions ? Math.round((s.points || 0) / s.sessions) : 0;
  if (metric === 'month') return monthPointsByMember[member.uid] || s.monthPoints || 0;
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
  const monthPointsByMember = buildMonthPointsByMember(sessions);
  const monthlyGroupStats = buildMonthlyGroupStats(sessions);
  const finishedSessionCount = sessions.filter((s) => s.status === 'finished').length;
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
    <div className="topbar"><button className="back-btn" onClick={back}>← Gruppen</button><button className="back-btn" onClick={invite}>Einladen</button></div>

    <div className="card">
      <div className="row group-header-row"><Avatar profile={group} className="group big" /><div><div className="group-title-line"><div className="logo" style={{ fontSize: 24 }}>{group.name}</div><span className="group-member-count-inline">{members.length} Mitglieder</span></div><div className="sub">{group.description || `Code: ${group.code}`}</div></div></div>
      <div className="mt12 action-row group-main-actions"><button className="btn btn-primary group-half-action" onClick={start}>Neue Session</button>{canEdit && <button className="btn btn-secondary group-half-action" onClick={openChallenges}>Neue Challenge</button>}{canEdit && <button className="btn btn-ghost group-personalize-action" onClick={() => setPersonalizeOpen(true)}>Gruppe personalisieren</button>}</div>
    </div>


    <div className="card"><div className="card-title">Challenges</div>{challenges?.length ? challenges.slice(0, 3).map((c) => <ChallengeMini key={c.id} challenge={c} />) : <div className="empty">Noch keine Challenge. Admins können über den Challenge-Button eine erstellen.</div>}<button className="btn btn-secondary mt8" onClick={openChallenges}>Alle Challenges öffnen</button></div>

    <div className="card group-panel-card">
      <div className="group-section-tabs" role="tablist" aria-label="Gruppenbereiche">
        <button type="button" className={`group-section-tab ${activeGroupPanel === 'members' ? 'active' : ''}`} onClick={() => setActiveGroupPanel('members')}>Mitglieder</button>
        <button type="button" className={`group-section-tab ${activeGroupPanel === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveGroupPanel('leaderboard')}>Bestenliste</button>
        <button type="button" className={`group-section-tab ${activeGroupPanel === 'stats' ? 'active' : ''}`} onClick={() => setActiveGroupPanel('stats')}>Statistiken</button>
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
    <div className="card"><div className="feed-head"><div><div className="card-title">Bestenliste</div><h3>Gruppenwertung</h3></div><select className="small-select" value={leaderMetric} onChange={(e) => setLeaderMetric(e.target.value)}><option value="points">Gesamtpunkte</option><option value="month">Punkte diesen Monat</option><option value="sessions">Sessions</option><option value="tops">Tops</option><option value="best">Beste Session</option><option value="avg">Ø Punkte</option></select></div>{[...members].sort((a, b) => leaderboardValue(b, leaderMetric, monthPointsByMember) - leaderboardValue(a, leaderMetric, monthPointsByMember)).map((m, i) => <div className="lb-row" key={m.uid}><div className="lb-rank">{rank(i)}</div><Avatar profile={m} className="ice" /><div className="lb-name" title={m.name || 'Unbekannt'}>{oneLineName(m.name)}</div><div className="lb-score">{leaderboardValue(m, leaderMetric, monthPointsByMember)}</div></div>)}</div>
    </>}

    {activeGroupPanel === 'stats' && <>
    <div className="card">
      <div className="feed-head"><div><div className="card-title">Statistiken</div><h3>Monatsübersicht</h3></div></div>
      <div className="stat-grid compact-stat-grid"><Stat n={finishedSessionCount} l="Sessions gesamt" /></div>
      {monthlyGroupStats.length ? monthlyGroupStats.map((month) => <div className="monthly-stats-card" key={month.key}>
        <div className="monthly-stats-title">{month.label}</div>
        <div className="monthly-stats-grid">
          <Stat n={month.sessions} l="Sessions" />
          <Stat n={month.tops} l="Tops" />
          <Stat n={month.points} l="Punkte" />
        </div>
      </div>) : <div className="empty">Noch keine abgeschlossenen Sessions für die Monatsstatistik.</div>}
    </div>
    </>}
    {activeGroupPanel === 'chat' && <GroupChat groupId={group.id} sendMessage={sendMessage} embedded currentUid={currentUid} />}
    {activeGroupPanel === 'stats' && <div className="card"><div className="card-title">Historie</div>{sessions.length ? sessions.map((s) => <div className="list-item clickable" key={s.id} onClick={() => s.status === 'active' && openSession(s.id)}><h3>{s.title}</h3><div className="sub">{safeDate(s.createdAtMillis)} · {s.mode} · {Object.keys(s.participants || {}).length} Teilnehmer · {s.status}</div></div>) : <div className="empty">Noch keine Sessions gespeichert.</div>}</div>}
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