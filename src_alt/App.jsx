import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, increment } from 'firebase/firestore';
import AuthScreen from './components/AuthScreen.jsx';
import Avatar from './components/Avatar.jsx';
import { auth, db } from './services/firebase.js';
import { AVATAR_COLORS, AVATAR_ICONS, COLORS, MODE_RULES, ROUTES } from './constants.js';
import { code, emptyRouteState, rank, safeDate } from './utils.js';
import './styles.css';

function initialProfile(user) {
  return { name: user.displayName || user.email?.split('@')[0] || 'Gast', status: '', avatarColor: '#2D3142', avatarIcon: '🧗', sessions: 0, tops: 0, flashes: 0, points: 0, matchHistory: [] };
}

function recalcParticipant(p, mode) {
  let score = 0, solved = 0, flash = 0;
  if (mode === 'comp') {
    ROUTES.forEach((r, i) => { const rd = p.routes[i]; if (rd.solved) { score += 25 + (rd.attempts === 1 ? 5 : 0); solved++; if (rd.attempts === 1) flash++; } else if (rd.zone) score += 10; });
  } else if (mode === 'bonus') {
    let base = 0, mult = 1;
    ROUTES.forEach((r, i) => { const rd = p.routes[i]; if (rd.solved) { base += r.pts + (rd.attempts === 1 ? 50 : 0); solved++; if (rd.attempts === 1) flash++; if (r.bonus) mult += r.bonus / 100; } });
    score = Math.round(base * mult);
  } else {
    ROUTES.forEach((r, i) => { const rd = p.routes[i]; if (rd.solved) { score += r.pts + (rd.attempts === 1 ? 50 : 0); solved++; if (rd.attempts === 1) flash++; } });
  }
  return { ...p, totalScore: score, routesSolved: solved, flashCount: flash };
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState('loading');
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [toast, setToast] = useState('');
  const [profileMetric, setProfileMetric] = useState('points');
  const [setup, setSetup] = useState({ title: '', mode: 'normal', minutes: 45, selected: {}, guests: [] });

  function notify(msg) { setToast(msg); setTimeout(() => setToast(''), 2300); }
  const safeName = () => profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Boulderer';

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u);
    if (!u) { setScreen('auth'); return; }
    const ref = doc(db, 'users', u.uid);
    const snap = await getDoc(ref);
    const p = snap.exists() ? { ...initialProfile(u), ...snap.data() } : initialProfile(u);
    if (!snap.exists()) await setDoc(ref, p);
    setProfile(p);
    await reloadGroups(u.uid);
    setScreen('home');
  }), []);

  async function reloadGroups(uid = user?.uid) {
    if (!uid) return;
    const q = query(collection(db, 'groups'), where(`members.${uid}.active`, '==', true));
    const snaps = await getDocs(q);
    setGroups(snaps.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  async function openGroup(id) {
    const s = await getDoc(doc(db, 'groups', id));
    const g = { id: s.id, ...s.data() };
    setActiveGroup(g);
    const sq = query(collection(db, 'sessions'), where('groupId', '==', id));
    const ss = await getDocs(sq);
    setSessions(ss.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0)));
    setScreen('group');
  }

  async function createGroup() {
    const name = prompt('Gruppenname?');
    if (!name) return;
    const id = crypto.randomUUID();
    const g = { name, description: '', avatarColor: '#2D3142', avatarIcon: '🪨', code: code(6), createdBy: user.uid, createdAt: serverTimestamp(), members: { [user.uid]: { uid: user.uid, name: safeName(), avatarColor: profile.avatarColor, avatarIcon: profile.avatarIcon, role: 'owner', active: true, joinedAt: Date.now(), stats: { sessions: 0, points: 0, tops: 0, flashes: 0, best: 0 } } } };
    await setDoc(doc(db, 'groups', id), g);
    await reloadGroups();
    notify('Gruppe erstellt');
    await openGroup(id);
  }

  async function joinGroup() {
    const groupCode = prompt('Gruppencode?')?.trim().toUpperCase();
    if (!groupCode) return;
    const q = query(collection(db, 'groups'), where('code', '==', groupCode));
    const snaps = await getDocs(q);
    if (snaps.empty) return notify('Gruppe nicht gefunden');
    const s = snaps.docs[0];
    await updateDoc(doc(db, 'groups', s.id), { [`members.${user.uid}`]: { uid: user.uid, name: safeName(), avatarColor: profile.avatarColor, avatarIcon: profile.avatarIcon, role: 'member', active: true, joinedAt: Date.now(), stats: { sessions: 0, points: 0, tops: 0, flashes: 0, best: 0 } } });
    await reloadGroups();
    await openGroup(s.id);
  }

  function startSetup(kind) {
    const members = kind === 'group' ? Object.values(activeGroup.members || {}).filter((m) => m.active) : [{ uid: user.uid, name: safeName(), avatarColor: profile.avatarColor, avatarIcon: profile.avatarIcon }];
    const selected = Object.fromEntries(members.map((m) => [m.uid, true]));
    setSetup({ title: kind === 'group' ? `Training ${new Date().toLocaleDateString('de-DE')}` : `Freie Runde ${new Date().toLocaleDateString('de-DE')}`, mode: 'normal', minutes: 45, selected, guests: [], kind });
    setScreen('setup');
  }

  async function createSession() {
    const participants = {};
    const members = setup.kind === 'group' ? Object.values(activeGroup.members || {}).filter((m) => m.active) : [{ uid: user.uid, name: safeName(), avatarColor: profile.avatarColor, avatarIcon: profile.avatarIcon }];
    members.filter((m) => setup.selected[m.uid]).forEach((m, i) => { participants[m.uid] = { uid: m.uid, name: m.name, avatarColor: m.avatarColor, avatarIcon: m.avatarIcon, isGuest: false, team: setup.mode === 'team' ? (i % 2 ? 'Team B' : 'Team A') : null, routes: emptyRouteState(ROUTES), routeLog: [], totalScore: 0, routesSolved: 0, flashCount: 0 }; });
    setup.guests.forEach((name, i) => { const uid = `guest-${crypto.randomUUID()}`; participants[uid] = { uid, name, avatarColor: '#64748b', avatarIcon: '👤', isGuest: true, team: setup.mode === 'team' ? (i % 2 ? 'Team B' : 'Team A') : null, routes: emptyRouteState(ROUTES), routeLog: [], totalScore: 0, routesSolved: 0, flashCount: 0 }; });
    if (!Object.keys(participants).length) return notify('Keine Teilnehmer ausgewählt');
    const id = code(4);
    await setDoc(doc(db, 'sessions', id), { code: id, title: setup.title, groupId: setup.kind === 'group' ? activeGroup.id : null, groupName: setup.kind === 'group' ? activeGroup.name : 'Freie Runde', mode: setup.mode, timerMinutes: Number(setup.minutes) || 45, createdBy: user.uid, createdAt: serverTimestamp(), createdAtMillis: Date.now(), status: 'active', startedAt: Date.now(), participants });
    listenSession(id);
    setScreen('game');
  }

  function listenSession(id) {
    return onSnapshot(doc(db, 'sessions', id), (s) => s.exists() && setActiveSession({ id: s.id, ...s.data() }));
  }

  async function updateRoute(uid, routeIndex, patch) {
    const p = structuredClone(activeSession.participants[uid]);
    p.routes[routeIndex] = { ...p.routes[routeIndex], ...patch };
    if (patch.solved && p.routes[routeIndex].attempts === 0) p.routes[routeIndex].attempts = 1;
    if (patch.zone && p.routes[routeIndex].attempts === 0) p.routes[routeIndex].attempts = 1;
    if (patch.solved) p.routes[routeIndex].zone = true;
    p.routeLog = [...(p.routeLog || []), { routeIndex, type: patch.solved ? 'top' : patch.zone ? 'zone' : 'attempt', attempts: p.routes[routeIndex].attempts, at: Date.now() }].slice(-80);
    const next = recalcParticipant(p, activeSession.mode);
    await updateDoc(doc(db, 'sessions', activeSession.id), { [`participants.${uid}`]: next });
  }

  async function finishSession() {
    const results = activeSession.participants;
    await updateDoc(doc(db, 'sessions', activeSession.id), { status: 'finished', endedAt: Date.now(), results });
    const me = results[user.uid];
    if (me) {
      const hist = { id: activeSession.id, title: activeSession.title, groupName: activeSession.groupName, mode: activeSession.mode, endedAt: Date.now(), points: me.totalScore || 0, tops: me.routesSolved || 0, flashes: me.flashCount || 0, successRate: Math.round(((me.routesSolved || 0) / ROUTES.length) * 100), routeLog: me.routeLog || [] };
      const nextProfile = { ...profile, sessions: (profile.sessions || 0) + 1, points: (profile.points || 0) + (me.totalScore || 0), tops: (profile.tops || 0) + (me.routesSolved || 0), flashes: (profile.flashes || 0) + (me.flashCount || 0), matchHistory: [hist, ...(profile.matchHistory || [])].slice(0, 30) };
      setProfile(nextProfile);
      await setDoc(doc(db, 'users', user.uid), nextProfile, { merge: true });
    }
    if (activeSession.groupId) {
      const updates = { sessionCount: increment(1) };
      Object.values(results).filter((p) => !p.isGuest).forEach((p) => {
        const base = `members.${p.uid}.stats`;
        updates[`${base}.sessions`] = increment(1);
        updates[`${base}.points`] = increment(p.totalScore || 0);
        updates[`${base}.tops`] = increment(p.routesSolved || 0);
        updates[`${base}.flashes`] = increment(p.flashCount || 0);
      });
      await updateDoc(doc(db, 'groups', activeSession.groupId), updates);
    }
    setScreen('results');
  }

  async function saveProfile(next = profile) {
    await setDoc(doc(db, 'users', user.uid), next, { merge: true });
    setProfile(next); notify('Profil gespeichert');
  }

  if (screen === 'loading') return <div className="screen active"><div style={{ margin: 'auto' }}><div className="logo">Boulder<em>Base</em></div><div className="spinner mt16" /></div></div>;
  if (!user || screen === 'auth') return <AuthScreen />;

  return <div className="app-shell">
    {toast && <div className="toast show">{toast}</div>}
    {screen === 'home' && <Home profile={profile} groups={groups} onProfile={() => setScreen('profile')} onCreateGroup={createGroup} onJoinGroup={joinGroup} onOpenGroup={openGroup} onFree={() => startSetup('standalone')} onLogout={() => signOut(auth)} />}
    {screen === 'profile' && <Profile profile={profile} setProfile={setProfile} saveProfile={saveProfile} metric={profileMetric} setMetric={setProfileMetric} back={() => setScreen('home')} />}
    {screen === 'group' && <Group group={activeGroup} sessions={sessions} back={() => setScreen('home')} invite={() => navigator.clipboard.writeText(activeGroup.code).then(() => notify('Code kopiert'))} start={() => startSetup('group')} />}
    {screen === 'setup' && <Setup setup={setup} setSetup={setSetup} group={activeGroup} profile={profile} back={() => setScreen(setup.kind === 'group' ? 'group' : 'home')} create={createSession} />}
    {screen === 'game' && activeSession && <Game session={activeSession} user={user} updateRoute={updateRoute} finish={finishSession} />}
    {screen === 'results' && activeSession && <Results session={activeSession} back={() => setScreen(activeSession.groupId ? 'group' : 'home')} />}
  </div>;
}

function Home({ profile, groups, onProfile, onCreateGroup, onJoinGroup, onOpenGroup, onFree, onLogout }) {
  return <main className="screen active" id="screen-home"><div className="topbar"><div><div className="logo">Boulder<em>Base</em></div><div className="tag">Hallo, {profile.name}!</div></div><button className="back-btn" onClick={onProfile}>👤 Profil</button></div><div className="card" style={{ background: 'var(--accent)', borderColor: 'transparent' }}><div className="card-title" style={{ color: 'rgba(255,255,255,.55)' }}>Schnellstart</div><button className="btn btn-ice" onClick={onFree}>Freie Runde starten</button><button className="btn" style={{ background: 'rgba(255,255,255,.10)', color: '#fff', border: '1px solid rgba(255,255,255,.2)' }} onClick={onCreateGroup}>Gruppe erstellen</button><button className="btn" style={{ background: 'rgba(255,255,255,.10)', color: '#fff', border: '1px solid rgba(255,255,255,.2)' }} onClick={onJoinGroup}>Gruppe beitreten</button></div><div className="card"><div className="card-title">Meine Gruppen</div><div className="list">{groups.length ? groups.map((g) => <div key={g.id} className="list-item" onClick={() => onOpenGroup(g.id)}><div className="row"><Avatar profile={g} className="group" /><div><h3>{g.name}</h3><div className="sub">{g.description || 'Keine Beschreibung'} · {Object.keys(g.members || {}).length} Mitglieder</div></div></div></div>) : <div className="empty">Noch keine Gruppe.</div>}</div></div><div className="spacer" /><button className="btn btn-secondary" onClick={onLogout}>Abmelden</button></main>;
}

function Profile({ profile, setProfile, saveProfile, metric, setMetric, back }) {
  const h = profile.matchHistory || [];
  const cfg = { points: ['points', 'Pkt', 'Durchschnittliche Punkte pro Runde'], tops: ['tops', 'Tops', 'Durchschnittliche Tops pro Runde'], flashes: ['flashes', 'Flash', 'Durchschnittliche Flashes pro Runde'], success: ['successRate', '%', 'Durchschnittliche Erfolgsquote pro Runde'] }[metric];
  const avg = h.length ? h.reduce((a, m) => a + Number(m[cfg[0]] || 0), 0) / h.length : 0;
  return <main className="screen active"><div className="topbar"><button className="back-btn" onClick={back}>← zurück</button><div className="logo" style={{ fontSize: 18 }}>Profil</div></div><div className="card tc"><Avatar profile={profile} className="big" /><h2>{profile.name}</h2><div className="sub">{profile.status || 'Noch kein Status'}</div></div><div className="stat-grid"><Stat n={profile.sessions || 0} l="Sessions" /><Stat n={profile.tops || 0} l="Tops" /><Stat n={profile.flashes || 0} l="Flashes" /><Stat n={profile.points || 0} l="Punkte" /></div><div className="card"><div className="card-title">Auswertungen</div><label>Statistik auswählen</label><select value={metric} onChange={(e) => setMetric(e.target.value)}><option value="points">Ø Punkte pro Runde</option><option value="tops">Ø Tops pro Runde</option><option value="flashes">Ø Flashes pro Runde</option><option value="success">Ø Erfolgsquote pro Runde</option></select><div className="chart-box mt12"><div className="profile-summary-card"><div className="profile-summary-value">{cfg[1] === '%' ? Math.round(avg) + '%' : Math.round(avg)}</div><div className="profile-summary-label">{cfg[2]}</div><div className="profile-summary-sub">Basis: {h.length} Runde{h.length === 1 ? '' : 'n'}</div></div></div></div><div className="card"><div className="card-title">Vergangene Matches</div>{h.length ? h.map((m) => <div className="list-item" key={m.id}><h3>{m.title}</h3><div className="sub">{safeDate(m.endedAt)} · {m.groupName} · {m.points} Punkte · {m.tops} Tops</div></div>) : <div className="empty">Noch keine vergangenen Matches.</div>}</div><div className="card"><div className="card-title">Profil bearbeiten</div><label>Name</label><input value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="mb8" /><label>Status</label><input value={profile.status || ''} onChange={(e) => setProfile({ ...profile, status: e.target.value })} className="mb8" /><label>Icon</label><div className="avatar-picker">{AVATAR_ICONS.map((i) => <button key={i} className="avatar-choice" onClick={() => setProfile({ ...profile, avatarIcon: i })}>{i}</button>)}</div><label>Farbe</label><div className="avatar-picker">{AVATAR_COLORS.map((c) => <button key={c} className={`avatar-choice ${profile.avatarColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setProfile({ ...profile, avatarColor: c })}>✓</button>)}</div><button className="btn btn-primary mt12" onClick={() => saveProfile()}>Speichern</button></div></main>;
}

function Group({ group, sessions, back, invite, start }) {
  const members = Object.values(group.members || {}).filter((m) => m.active);
  const totalPoints = members.reduce((a, m) => a + (m.stats?.points || 0), 0);
  const totalTops = members.reduce((a, m) => a + (m.stats?.tops || 0), 0);
  return <main className="screen active"><div className="topbar"><button className="back-btn" onClick={back}>← Gruppen</button><button className="back-btn" onClick={invite}>Code kopieren</button></div><div className="card"><div className="row"><Avatar profile={group} className="group big" /><div><div className="logo" style={{ fontSize: 24 }}>{group.name}</div><div className="sub">{group.description || `Code: ${group.code}`}</div></div></div><div className="mt12 row"><button className="btn btn-primary" onClick={start}>Neue Session</button><button className="btn btn-secondary" onClick={invite}>Einladen</button></div></div><div className="stat-grid"><Stat n={members.length} l="Mitglieder" /><Stat n={sessions.filter((s) => s.status === 'finished').length} l="Sessions" /><Stat n={totalTops} l="Tops" /><Stat n={totalPoints} l="Punkte" /></div><div className="card"><div className="card-title">Leaderboard</div>{members.sort((a, b) => (b.stats?.points || 0) - (a.stats?.points || 0)).map((m, i) => <div className="lb-row" key={m.uid}><div className="lb-rank">{rank(i)}</div><Avatar profile={m} className="ice" /><div className="lb-name">{m.name}</div><div className="lb-score">{m.stats?.points || 0}</div></div>)}</div><div className="card"><div className="card-title">Historie</div>{sessions.length ? sessions.map((s) => <div className="list-item" key={s.id}><h3>{s.title}</h3><div className="sub">{safeDate(s.createdAtMillis)} · {s.mode} · {Object.keys(s.participants || {}).length} Teilnehmer · {s.status}</div></div>) : <div className="empty">Noch keine Sessions gespeichert.</div>}</div></main>;
}

function Setup({ setup, setSetup, group, profile, back, create }) {
  const members = setup.kind === 'group' ? Object.values(group.members || {}).filter((m) => m.active) : [{ uid: 'me', name: profile.name, avatarColor: profile.avatarColor, avatarIcon: profile.avatarIcon }];
  return <main className="screen active"><div className="topbar"><button className="back-btn" onClick={back}>← zurück</button><div className="logo" style={{ fontSize: 18 }}>Session Setup</div></div><div className="card"><label>Session Name</label><input value={setup.title} onChange={(e) => setSetup({ ...setup, title: e.target.value })} className="mb8" /><div className="row"><div><label>Modus</label><select value={setup.mode} onChange={(e) => setSetup({ ...setup, mode: e.target.value })}>{Object.keys(MODE_RULES).map((m) => <option key={m} value={m}>{m}</option>)}</select></div><div><label>Zeitlimit</label><input type="number" value={setup.minutes} onChange={(e) => setSetup({ ...setup, minutes: e.target.value })} /></div></div><div className="quick-time-grid">{[30,45,60,90,120].map((m) => <button key={m} className={`quick-time-btn ${Number(setup.minutes) === m ? 'active' : ''}`} onClick={() => setSetup({ ...setup, minutes: m })}>{m} min</button>)}</div></div><div className="card"><div className="card-title">Spielmodus-Regeln</div><div className="notice"><ul style={{ marginLeft: 18 }}>{MODE_RULES[setup.mode].map((r) => <li key={r}>{r}</li>)}</ul></div></div><div className="card"><div className="card-title">Teilnehmer</div>{members.map((m) => <label className="check-row" key={m.uid}><input type="checkbox" checked={!!setup.selected[m.uid]} onChange={(e) => setSetup({ ...setup, selected: { ...setup.selected, [m.uid]: e.target.checked } })} /><Avatar profile={m} className="ice" /><strong>{m.name}</strong></label>)}{setup.guests.map((g, i) => <div className="check-row" key={i}><div className="avatar">G</div><strong>{g}</strong></div>)}<button className="btn btn-secondary mt8" onClick={() => { const g = prompt('Name des Gastspielers?'); if (g) setSetup({ ...setup, guests: [...setup.guests, g] }); }}>+ Gastspieler hinzufügen</button></div><button className="btn btn-primary" onClick={create}>Session erstellen</button></main>;
}

function Game({ session, user, updateRoute, finish }) {
  const me = session.participants[user.uid] || Object.values(session.participants)[0];
  const sorted = Object.values(session.participants).sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  return <main className="screen active"><div className="topbar"><button className="back-btn" onClick={finish}>Beenden</button><div className="timer-pill">{session.timerMinutes}:00</div><span className="pill green">Live</span></div><div className="card"><div className="row"><div><div className="card-title">Deine Punkte</div><div className="stat-num">{me.totalScore || 0}</div></div><div><div className="card-title">Tops</div><div className="stat-num">{me.routesSolved || 0}</div></div></div></div><div className="card"><div className="card-title">Live Leaderboard</div>{sorted.map((p, i) => <div className="lb-row" key={p.uid}><div className="lb-rank">{rank(i)}</div><Avatar profile={p} className="ice" /><div className="lb-name">{p.name}</div><div className="lb-score">{p.totalScore || 0}</div></div>)}</div><div id="route-list">{COLORS.map((col) => <div key={col.key}><div className="card-title" style={{ marginTop: 12 }}>{col.label} · {col.difficulty} · {col.pts} Pkt</div>{ROUTES.map((r, i) => ({ r, i })).filter(({ r }) => r.key === col.key).map(({ r, i }) => <div className="route-row" style={{ borderLeftColor: col.hex }} key={r.id}><div className="route-info"><div className="route-name">Route {r.num}</div><div className="route-sub">{me.routes[i].attempts} Versuche · {me.routes[i].solved ? 'Top' : me.routes[i].zone ? 'Zone' : 'offen'}</div></div><div className="route-actions"><button className="tiny-btn" onClick={() => updateRoute(me.uid, i, { attempts: Math.max(0, me.routes[i].attempts - 1), solved: me.routes[i].attempts <= 1 ? false : me.routes[i].solved })}>−</button><span className="mono">{me.routes[i].attempts}</span><button className="tiny-btn" onClick={() => updateRoute(me.uid, i, { attempts: me.routes[i].attempts + 1 })}>+</button>{session.mode === 'comp' && <button className={`action-btn ${me.routes[i].zone && !me.routes[i].solved ? 'active' : ''}`} onClick={() => updateRoute(me.uid, i, { zone: !me.routes[i].zone })}>Zone</button>}<button className={`action-btn ${me.routes[i].solved ? 'active' : ''}`} onClick={() => updateRoute(me.uid, i, { solved: !me.routes[i].solved })}>Top</button></div></div>)}</div>)}</div></main>;
}

function Results({ session, back }) {
  const rows = Object.values(session.results || session.participants || {}).sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  return <main className="screen active"><div className="tc" style={{ padding: '26px 0 18px' }}><div style={{ fontSize: 52 }}>🏆</div><div className="logo">Ergebnis</div><div className="tag">Session abgeschlossen</div></div><div className="card" style={{ padding: 0 }}>{rows.map((p, i) => <div className="lb-row" key={p.uid}><div className="lb-rank">{rank(i)}</div><Avatar profile={p} className="ice" /><div className="lb-name">{p.name}</div><div style={{ textAlign: 'right' }}><div className="lb-score">{p.totalScore || 0}</div><div className="sub">{p.routesSolved || 0} Tops · {p.flashCount || 0} Flash</div></div></div>)}</div><button className="btn btn-primary mt12" onClick={back}>Zurück</button></main>;
}
function Stat({ n, l }) { return <div className="stat-box"><div className="stat-num">{n}</div><div className="stat-lbl">{l}</div></div>; }
