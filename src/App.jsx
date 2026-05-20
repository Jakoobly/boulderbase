import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, increment } from 'firebase/firestore';
import AuthScreen from './components/AuthScreen.jsx';
import Avatar from './components/Avatar.jsx';
import HomeAddons from './components/HomeAddons.jsx';
import FriendsScreen from './friends/FriendsScreen.jsx';
import { auth, db } from './services/firebase.js';
import { AVATAR_COLORS, AVATAR_ICONS, COLORS, MODE_RULES, ROUTES } from './constants.js';
import { code, emptyRouteState, rank, safeDate } from './utils.js';
import './styles.css';
import './addons.css';

function initialProfile(user) {
  return { name: user.displayName || user.email?.split('@')[0] || 'Gast', status: '', avatarColor: '#2D3142', avatarIcon: '🧗', sessions: 0, tops: 0, flashes: 0, points: 0, matchHistory: [] };
}

function zonePoints(route) {
  return Math.round(route.pts / 3);
}

function compAttemptMultiplier(attempts) {
  // Comp-Modus: kein Flashbonus, aber jeder weitere Versuch reduziert den Wert um 5%.
  // Bei maximal 12 Versuchen bleiben also noch 45% der Boulder-Punkte übrig.
  const safeAttempts = Math.min(12, Math.max(1, Number(attempts) || 1));
  return Math.max(0.45, 1 - (safeAttempts - 1) * 0.05);
}

function routeScore(route, rd, mode) {
  const attempts = Math.max(1, Number(rd.attempts) || 1);
  if (mode === 'comp') {
    const multiplier = compAttemptMultiplier(attempts);
    const topPoints = Math.round(route.pts * multiplier);
    const zoneValue = Math.round(zonePoints(route) * multiplier);
    if (rd.solved) return topPoints;
    if (rd.zone) return Math.max(1, zoneValue);
    return 0;
  }
  if (rd.solved) return route.pts;
  if (rd.zone) return mode === 'bonus' ? zonePoints(route) : Math.round(route.pts * 0.35);
  return 0;
}

function recalcParticipant(p, mode) {
  let score = 0, solved = 0, flash = 0, zones = 0;
  ROUTES.forEach((r, i) => {
    const rd = p.routes[i];
    if (mode === 'bonus' && rd.solved && r.bonus) score += Math.round(score * (r.bonus / 100));
    score += routeScore(r, rd, mode);
    if (rd.solved) {
      solved++;
    } else if (rd.zone) zones++;
  });
  return { ...p, totalScore: score, routesSolved: solved, flashCount: flash, zoneCount: zones };
}

function secondsLeft(session) {
  if (!session?.startedAt || !session?.timerMinutes) return 0;
  return Math.max(0, Math.ceil((session.startedAt + session.timerMinutes * 60000 - Date.now()) / 1000));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState('loading');
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [toast, setToast] = useState('');
  const [profileMetric, setProfileMetric] = useState('points');
  const [setup, setSetup] = useState({ title: '', mode: 'normal', minutes: 45, selected: {}, guests: [] });

  function notify(msg) { setToast(msg); setTimeout(() => setToast(''), 2300); }
  const safeName = () => profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Boulderer';

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u);
    if (!u) {
      localStorage.removeItem('bb-current-view');
      localStorage.removeItem('bb-active-session');
      setScreen('auth');
      return;
    }
    const ref = doc(db, 'users', u.uid);
    const snap = await getDoc(ref);
    const p = snap.exists() ? { ...initialProfile(u), ...snap.data() } : initialProfile(u);
    if (!snap.exists()) await setDoc(ref, p);
    setProfile(p);
    await restoreLastView(u.uid);
  }), []);

  useEffect(() => {
    if (!user?.uid || screen === 'loading' || screen === 'auth') return;
    const view = { screen, groupId: activeGroup?.id || null, sessionId: activeSession?.id || null, savedAt: Date.now() };
    localStorage.setItem('bb-current-view', JSON.stringify(view));
    if (activeSession?.id && screen === 'game') localStorage.setItem('bb-active-session', activeSession.id);
  }, [screen, activeGroup?.id, activeSession?.id, user?.uid]);

  async function restoreLastView(uid) {
    const fallback = () => { localStorage.removeItem('bb-current-view'); localStorage.removeItem('bb-active-session'); setScreen('home'); };
    let view = null;
    try { view = JSON.parse(localStorage.getItem('bb-current-view') || 'null'); } catch { view = null; }
    const legacySessionId = localStorage.getItem('bb-active-session');
    const sessionId = view?.sessionId || legacySessionId;

    if (sessionId && (view?.screen === 'game' || legacySessionId)) {
      const s = await getDoc(doc(db, 'sessions', sessionId));
      if (s.exists()) {
        const data = { id: s.id, ...s.data() };
        const canOpen = data.participants?.[uid] || data.createdBy === uid;
        if (canOpen) {
          if (data.groupId) {
            const g = await getDoc(doc(db, 'groups', data.groupId));
            if (g.exists()) setActiveGroup({ id: g.id, ...g.data() });
          }
          listenSession(sessionId, data.status === 'active');
          setScreen(data.status === 'finished' ? 'results' : 'game');
          return;
        }
      }
    }

    if ((view?.screen === 'group' || view?.screen === 'challenges') && view.groupId) {
      const g = await getDoc(doc(db, 'groups', view.groupId));
      if (g.exists() && g.data()?.members?.[uid]?.active) {
        setActiveGroup({ id: g.id, ...g.data() });
        setScreen(view.screen === 'challenges' ? 'challenges' : 'group');
        return;
      }
    }

    if (view?.screen === 'profile' || view?.screen === 'friends') {
      setScreen(view.screen);
      return;
    }

    fallback();
  }

  useEffect(() => {
    if (!user?.uid) return undefined;
    const q = query(collection(db, 'groups'), where(`members.${user.uid}.active`, '==', true));
    return onSnapshot(q, (snaps) => setGroups(snaps.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [user?.uid]);

  useEffect(() => {
    if (!activeGroup?.id) return undefined;
    const unsubGroup = onSnapshot(doc(db, 'groups', activeGroup.id), (s) => s.exists() && setActiveGroup({ id: s.id, ...s.data() }));
    const sq = query(collection(db, 'sessions'), where('groupId', '==', activeGroup.id));
    const unsubSessions = onSnapshot(sq, (ss) => {
      const list = ss.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));
      setSessions(list);
      const liveForMe = list.find((s) => s.status === 'active' && s.participants?.[user?.uid]);
      if (liveForMe && screen === 'group') {
        listenSession(liveForMe.id, true);
        setScreen('game');
      }
    });
    const cq = query(collection(db, 'challenges'), where('groupId', '==', activeGroup.id));
    const unsubChallenges = onSnapshot(cq, (cs) => {
      const list = cs.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));
      setChallenges(list);
    });
    return () => { unsubGroup(); unsubSessions(); unsubChallenges(); };
  }, [activeGroup?.id, user?.uid, screen]);

  async function openGroup(id) {
    const s = await getDoc(doc(db, 'groups', id));
    if (!s.exists()) return notify('Gruppe nicht gefunden');
    setActiveGroup({ id: s.id, ...s.data() });
    setScreen('group');
  }

  async function createGroup() {
    const name = prompt('Gruppenname?');
    if (!name) return;
    const id = crypto.randomUUID();
    const g = { name, description: '', avatarColor: '#2D3142', avatarIcon: '🪨', code: code(6), createdBy: user.uid, createdAt: serverTimestamp(), members: { [user.uid]: { uid: user.uid, name: safeName(), avatarColor: profile.avatarColor, avatarIcon: profile.avatarIcon, role: 'owner', active: true, joinedAt: Date.now(), stats: { sessions: 0, points: 0, tops: 0, flashes: 0, best: 0 } } } };
    await setDoc(doc(db, 'groups', id), g);
    notify('Gruppe erstellt');
    await openGroup(id);
  }

  async function updateGroup(next) {
    if (!activeGroup?.id) return;
    await updateDoc(doc(db, 'groups', activeGroup.id), next);
    notify('Gruppe gespeichert');
  }

  async function updateMemberRole(targetUid, nextRole) {
    if (!activeGroup?.id || !targetUid) return;
    const currentMember = activeGroup.members?.[user.uid];
    const targetMember = activeGroup.members?.[targetUid];
    const amAdmin = activeGroup.createdBy === user.uid || currentMember?.role === 'owner' || currentMember?.role === 'admin';
    if (!amAdmin) return notify('Nur Admins dürfen Rollen verwalten');
    if (!targetMember?.active) return notify('Mitglied nicht gefunden');
    if (targetMember.role === 'guest') return notify('Gäste können keine Admin-Rechte bekommen');
    if (targetUid === activeGroup.createdBy || targetMember.role === 'owner') return notify('Dem Ersteller können keine Rechte abgenommen werden');
    if (!['admin', 'member'].includes(nextRole)) return;
    await updateDoc(doc(db, 'groups', activeGroup.id), { [`members.${targetUid}.role`]: nextRole });
    notify(nextRole === 'admin' ? 'Admin-Rechte vergeben' : 'Admin-Rechte entfernt');
  }

  async function deleteActiveGroup() {
    if (!activeGroup?.id) return;
    if (activeGroup.createdBy !== user.uid) return notify('Nur der Ersteller kann die Gruppe löschen');
    const sq = query(collection(db, 'sessions'), where('groupId', '==', activeGroup.id));
    const ss = await getDocs(sq);
    const cq = query(collection(db, 'challenges'), where('groupId', '==', activeGroup.id));
    const cs = await getDocs(cq);
    await Promise.all([...ss.docs.map((d) => deleteDoc(doc(db, 'sessions', d.id))), ...cs.docs.map((d) => deleteDoc(doc(db, 'challenges', d.id)))]);
    await deleteDoc(doc(db, 'groups', activeGroup.id));
    localStorage.removeItem('bb-current-view');
    localStorage.removeItem('bb-active-session');
    setActiveGroup(null);
    setActiveSession(null);
    setSessions([]);
    setScreen('home');
    notify('Gruppe gelöscht');
  }

  async function joinGroup() {
    const groupCode = prompt('Gruppencode?')?.trim().toUpperCase();
    if (!groupCode) return;
    const q = query(collection(db, 'groups'), where('code', '==', groupCode));
    const snaps = await getDocs(q);
    if (snaps.empty) return notify('Gruppe nicht gefunden');
    const s = snaps.docs[0];
    await updateDoc(doc(db, 'groups', s.id), { [`members.${user.uid}`]: { uid: user.uid, name: safeName(), avatarColor: profile.avatarColor, avatarIcon: profile.avatarIcon, role: 'member', active: true, joinedAt: Date.now(), stats: { sessions: 0, points: 0, tops: 0, flashes: 0, best: 0 } } });
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
    members.filter((m) => setup.selected[m.uid]).forEach((m, i) => { participants[m.uid] = { uid: m.uid, name: m.name, avatarColor: m.avatarColor, avatarIcon: m.avatarIcon, isGuest: false, team: setup.mode === 'team' ? (i % 2 ? 'Team B' : 'Team A') : null, routes: emptyRouteState(ROUTES), routeLog: [], totalScore: 0, routesSolved: 0, flashCount: 0, zoneCount: 0 }; });
    setup.guests.forEach((name, i) => { const uid = `guest-${crypto.randomUUID()}`; participants[uid] = { uid, name, avatarColor: '#64748b', avatarIcon: '👤', isGuest: true, team: setup.mode === 'team' ? (i % 2 ? 'Team B' : 'Team A') : null, routes: emptyRouteState(ROUTES), routeLog: [], totalScore: 0, routesSolved: 0, flashCount: 0, zoneCount: 0 }; });
    if (!Object.keys(participants).length) return notify('Keine Teilnehmer ausgewählt');
    const id = code(4);
    await setDoc(doc(db, 'sessions', id), { code: id, title: setup.title, groupId: setup.kind === 'group' ? activeGroup.id : null, groupName: setup.kind === 'group' ? activeGroup.name : 'Freie Runde', mode: setup.mode, timerMinutes: Number(setup.minutes) || 45, createdBy: user.uid, createdAt: serverTimestamp(), createdAtMillis: Date.now(), status: 'active', startedAt: Date.now(), participants });
    listenSession(id, true);
    setScreen('game');
  }

  function listenSession(id, remember = false) {
    if (remember) localStorage.setItem('bb-active-session', id);
    return onSnapshot(doc(db, 'sessions', id), (s) => {
      if (!s.exists()) {
        localStorage.removeItem('bb-active-session');
        localStorage.removeItem('bb-current-view');
        setActiveSession(null);
        setScreen('home');
        return;
      }
      const data = { id: s.id, ...s.data() };
      setActiveSession(data);
      if (data.status === 'finished') {
        localStorage.removeItem('bb-active-session');
        setScreen('results');
      }
    });
  }

  async function updateRoute(uid, routeIndex, action) {
    if (!activeSession || activeSession.status !== 'active') return notify('Session ist beendet');
    const p = structuredClone(activeSession.participants[uid]);
    const rd = { ...p.routes[routeIndex] };
    if (rd.solved) return notify('Top ist gespeichert und unveränderlich');

    if (action === 'attempt') {
      if (activeSession.mode === 'bonus') return notify('Im Bonusmodus werden keine Versuche gezählt');
      const max = activeSession.mode === 'comp' ? 12 : 99;
      if (rd.attempts >= max) return notify(activeSession.mode === 'comp' ? 'Maximal 12 Versuche im Comp-Modus' : 'Maximum erreicht');
      rd.attempts += 1;
    }
    if (action === 'zone') {
      if (activeSession.mode !== 'bonus' && rd.attempts === 0) rd.attempts = 1;
      rd.zone = true;
      rd.zoneAt = rd.zoneAt || Date.now();
    }
    if (action === 'top') {
      if (activeSession.mode !== 'bonus' && rd.attempts === 0) rd.attempts = 1;
      rd.solved = true;
      rd.zone = false;
      rd.topAt = Date.now();
      rd.locked = true;
    }

    p.routes[routeIndex] = rd;
    p.routeLog = [...(p.routeLog || []), { routeIndex, type: action, attempts: rd.attempts, at: Date.now() }].slice(-80);
    const next = recalcParticipant(p, activeSession.mode);
    await updateDoc(doc(db, 'sessions', activeSession.id), { [`participants.${uid}`]: next });
  }

  async function finishSession() {
    if (!activeSession || activeSession.status === 'finished') return;
    const results = activeSession.participants;
    await updateDoc(doc(db, 'sessions', activeSession.id), { status: 'finished', endedAt: Date.now(), results });
    localStorage.removeItem('bb-active-session');
    const me = results[user.uid];
    if (me) {
      const hist = { id: activeSession.id, title: activeSession.title, groupName: activeSession.groupName, mode: activeSession.mode, endedAt: Date.now(), points: me.totalScore || 0, tops: me.routesSolved || 0, flashes: me.flashCount || 0, zones: me.zoneCount || 0, successRate: Math.round(((me.routesSolved || 0) / ROUTES.length) * 100), routeLog: me.routeLog || [] };
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

  async function createChallenge(form) {
    if (!activeGroup?.id) return;
    const id = crypto.randomUUID();
    const target = Math.max(1, Number(form.target) || 1);
    await setDoc(doc(db, 'challenges', id), {
      groupId: activeGroup.id,
      groupName: activeGroup.name,
      title: form.title.trim(),
      dueDate: form.dueDate,
      unit: form.unit.trim(),
      target,
      progressBy: {},
      totalProgress: 0,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      createdAtMillis: Date.now(),
      status: 'active'
    });
    notify('Challenge erstellt');
  }

  async function addChallengeProgress(challenge, amount) {
    if (!activeGroup?.id) return;
    const myRole = activeGroup.members?.[user.uid]?.role;
    const canAdmin = activeGroup.createdBy === user.uid || myRole === 'owner' || myRole === 'admin';
    if (!canAdmin) return notify('Nur Admins können Challenge-Fortschritt eintragen');
    const value = Math.max(0, Number(amount) || 0);
    if (!challenge?.id || value <= 0) return notify('Bitte einen Fortschritt größer als 0 eingeben');
    const current = Number(challenge.progressBy?.admin?.value || 0);
    await updateDoc(doc(db, 'challenges', challenge.id), {
      'progressBy.admin': { uid: user.uid, name: safeName(), avatarColor: profile.avatarColor, avatarIcon: profile.avatarIcon, value: current + value, updatedAt: Date.now() },
      totalProgress: increment(value),
      updatedBy: user.uid,
      updatedAtMillis: Date.now()
    });
    notify('Fortschritt gespeichert');
  }

  async function deleteChallenge(challengeId) {
    if (!challengeId) return;
    await deleteDoc(doc(db, 'challenges', challengeId));
    notify('Challenge gelöscht');
  }

  async function saveProfile(next = profile) {
    await setDoc(doc(db, 'users', user.uid), next, { merge: true });
    setProfile(next); notify('Profil gespeichert');
  }

  if (screen === 'loading') return <div className="screen active"><div style={{ margin: 'auto' }}><div className="logo">Boulder<em>Base</em></div></div></div>;
  if (screen === 'auth') return <AuthScreen />;
  if (!user || !profile) return null;

  return <div className="app-shell">
    {toast && <div className="toast show">{toast}</div>}
    {screen === 'friends' && <FriendsScreen user={user} profile={profile} setScreen={setScreen} notify={notify} />}
    {screen === 'home' && <Home profile={profile} groups={groups} openGroup={openGroup} createGroup={createGroup} joinGroup={joinGroup} startFree={() => startSetup('free')} setScreen={setScreen} logout={() => signOut(auth)} />}
    {screen === 'profile' && <Profile profile={profile} setProfile={setProfile} saveProfile={saveProfile} metric={profileMetric} setMetric={setProfileMetric} back={() => setScreen('home')} />}
    {screen === 'group' && activeGroup && <Group group={activeGroup} sessions={sessions} challenges={challenges} back={() => setScreen('home')} invite={() => navigator.clipboard?.writeText(activeGroup.code).then(() => notify('Code kopiert'))} start={() => startSetup('group')} openChallenges={() => setScreen('challenges')} editGroup={updateGroup} updateMemberRole={updateMemberRole} deleteGroup={deleteActiveGroup} currentUid={user.uid} openSession={(id) => { listenSession(id, true); setScreen('game'); }} />}
    {screen === 'challenges' && activeGroup && <Challenges group={activeGroup} challenges={challenges} currentUid={user.uid} back={() => setScreen('group')} createChallenge={createChallenge} addProgress={addChallengeProgress} deleteChallenge={deleteChallenge} />}
    {screen === 'setup' && <Setup setup={setup} setSetup={setSetup} group={activeGroup} profile={profile} user={user} back={() => setScreen(setup.kind === 'group' ? 'group' : 'home')} create={createSession} />}
    {screen === 'game' && activeSession && <Game session={activeSession} user={user} updateRoute={updateRoute} finish={finishSession} />}
    {screen === 'results' && activeSession && <Results session={activeSession} back={() => activeSession.groupId ? openGroup(activeSession.groupId) : setScreen('home')} />}
  </div>;
}

function Home({ profile, groups, openGroup, createGroup, joinGroup, startFree, setScreen, logout }) {
  const displayName = profile?.name || 'Gast';
  return <main className="screen active">
    <div className="topbar">
      <div className="logo">Boulder<em>Base</em></div>
      <div className="topbar-actions">
        <button className="profile-chip" onClick={() => setScreen('profile')} aria-label="Profil öffnen">
          <Avatar profile={profile} className="ice" />
          <span>Profil</span>
        </button>
        <button className="back-btn" onClick={logout}>Logout</button>
      </div>
    </div>
    <HomeAddons setScreen={setScreen} />
    <div className="card welcome-card">
      <div className="tag">Willkommen zurück</div>
      <h2>Hi {displayName} 👋</h2>
      <div className="sub">{profile?.status || 'Bereit für die nächste Boulder-Session?'}</div>
    </div>
    <div className="card quickstart-card">
      <div className="card-title">Schnellstart</div>
      <button className="btn btn-primary" onClick={startFree}>Freie Runde starten</button>
    </div>
    <div className="card"><div className="card-title">Gruppen</div><button className="btn btn-primary mb8" onClick={createGroup}>+ Gruppe erstellen</button><button className="btn btn-secondary mb12" onClick={joinGroup}>Gruppe beitreten</button>{groups.length ? groups.map((g) => <div className="list-item clickable" key={g.id} onClick={() => openGroup(g.id)}><div className="row"><Avatar profile={g} className="group" /><div><h3>{g.name}</h3><div className="sub">{Object.values(g.members || {}).filter((m) => m.active).length} Mitglieder · Code {g.code}</div></div></div></div>) : <div className="empty">Noch keine Gruppe.</div>}</div>
    <div className="card"><div className="card-title">Freunde</div><div className="sub mb12">Freunde suchen, Anfragen verwalten und Profile öffnen.</div><button className="btn btn-secondary" onClick={() => setScreen('friends')}>👥 Freunde öffnen</button></div>
  </main>;
}


function PersonalizeModal({ title, value, descriptionLabel = 'Beschreibung', onClose, onSave }) {
  const [draft, setDraft] = useState({
    name: value?.name || '',
    description: value?.description ?? value?.status ?? '',
    avatarColor: value?.avatarColor || '#2D3142',
    avatarIcon: value?.avatarIcon || '🪨'
  });
  function save() {
    onSave({
      name: draft.name.trim() || value?.name || 'Unbenannt',
      description: draft.description.trim(),
      avatarColor: draft.avatarColor,
      avatarIcon: draft.avatarIcon
    });
    onClose();
  }
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="personalize-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-head"><div><div className="tag">Personalisieren</div><h2>{title}</h2></div><button className="modal-close" onClick={onClose}>×</button></div>
      <div className="modal-preview"><Avatar profile={draft} className="big" /><div><strong>{draft.name || 'Name'}</strong><div className="sub">{draft.description || descriptionLabel}</div></div></div>
      <div className="modal-section"><label>Name</label><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name eingeben" /></div>
      <div className="modal-section"><label>{descriptionLabel}</label><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder={`${descriptionLabel} eingeben`} rows="3" /></div>
      <div className="modal-section"><label>Icon</label><div className="avatar-picker modal-picker">{AVATAR_ICONS.map((i) => <button type="button" key={i} className={`avatar-choice ${draft.avatarIcon === i ? 'active' : ''}`} onClick={() => setDraft({ ...draft, avatarIcon: i })}>{i}</button>)}</div></div>
      <div className="modal-section"><label>Farbe</label><div className="avatar-picker modal-picker">{AVATAR_COLORS.map((c) => <button type="button" key={c} className={`avatar-choice color-choice ${draft.avatarColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setDraft({ ...draft, avatarColor: c })}>{draft.avatarColor === c ? '✓' : ''}</button>)}</div></div>
      <div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></div>
    </div>
  </div>;
}

function Profile({ profile, setProfile, saveProfile, metric, setMetric, back }) {
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
    <div className="card profile-edit-card"><div className="profile-edit-head"><Avatar profile={profile} className="big" /><div><h2>{profile.name}</h2><div className="sub">{profile.status || 'Keine Beschreibung'}</div></div></div><button className="btn btn-secondary mt12 full-mobile" onClick={() => setPersonalizeOpen(true)}>Profil personalisieren</button></div>
    <div className="tabs"><button className={`tab ${metric === 'points' ? 'active' : ''}`} onClick={() => setMetric('points')}>Punkte</button><button className={`tab ${metric === 'tops' ? 'active' : ''}`} onClick={() => setMetric('tops')}>Tops</button><button className={`tab ${metric === 'zones' ? 'active' : ''}`} onClick={() => setMetric('zones')}>Zones</button></div><div className="card chart-box"><div className="profile-summary-card"><div className="profile-summary-value">{(values[metric] || values.points)[0]}</div><div className="profile-summary-label">{(values[metric] || values.points)[1]}</div><div className="profile-summary-sub">{(values[metric] || values.points)[2]}</div></div></div><div className="card"><div className="card-title">Letzte Matches</div>{history.length ? history.map((m) => <div className="list-item" key={m.id}><h3>{m.title}</h3><div className="sub">{safeDate(m.endedAt)} · {m.groupName} · {m.points} Punkte · {m.tops} Tops</div></div>) : <div className="empty">Noch keine vergangenen Matches.</div>}</div>
    {personalizeOpen && <PersonalizeModal title="Profil anpassen" value={{ ...profile, description: profile.status || '' }} descriptionLabel="Beschreibung" onClose={() => setPersonalizeOpen(false)} onSave={savePersonalization} />}
  </main>;
}

function Group({ group, sessions, challenges, back, invite, start, openChallenges, editGroup, updateMemberRole, deleteGroup, currentUid, openSession }) {
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteName, setDeleteName] = useState('');
  const [selectedMemberUid, setSelectedMemberUid] = useState(null);
  const members = Object.values(group.members || {}).filter((m) => m.active);
  const totalPoints = members.reduce((a, m) => a + (m.stats?.points || 0), 0);
  const totalTops = members.reduce((a, m) => a + (m.stats?.tops || 0), 0);
  const myRole = group.members?.[currentUid]?.role;
  const canManageRoles = group.createdBy === currentUid || myRole === 'owner' || myRole === 'admin';
  const canEdit = canManageRoles;
  const canDeleteGroup = group.createdBy === currentUid;

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
            <div className="row"><Avatar profile={m} className="ice" /><div><h3>{m.name}{m.uid === currentUid ? <span style={{fontSize:'0.8em',opacity:0.7,marginLeft:6}}>(Du)</span> : null}</h3><div className="sub">{roleLabel(m.role, m.uid)}</div></div></div>
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

      {canDeleteGroup && <div className="delete-group-area compact-delete-area">
        <button type="button" className="link-danger-btn subtle-delete-btn" onClick={() => { setDeleteName(''); setDeleteOpen(true); }}>Gruppe löschen</button>
      </div>}
    </div>

    <div className="card"><div className="card-title">Leaderboard</div>{members.sort((a, b) => (b.stats?.points || 0) - (a.stats?.points || 0)).map((m, i) => <div className="lb-row" key={m.uid}><div className="lb-rank">{rank(i)}</div><Avatar profile={m} className="ice" /><div className="lb-name">{m.name}</div><div className="lb-score">{m.stats?.points || 0}</div></div>)}</div>
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
    {personalizeOpen && <PersonalizeModal title="Gruppe anpassen" value={group} descriptionLabel="Beschreibung" onClose={() => setPersonalizeOpen(false)} onSave={saveGroupPersonalization} />}
  </main>;
}


function challengePercent(challenge) {
  const total = Number(challenge.totalProgress || 0);
  const target = Math.max(1, Number(challenge.target || 1));
  return Math.min(100, Math.round((total / target) * 100));
}

function ChallengeMini({ challenge }) {
  const percent = challengePercent(challenge);
  return <div className="challenge-mini"><div className="challenge-mini-head"><strong>{challenge.title}</strong><span className="mono">{percent}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div><div className="sub">{Number(challenge.totalProgress || 0).toLocaleString('de-DE')} / {Number(challenge.target || 0).toLocaleString('de-DE')} {challenge.unit} · bis {safeDate(challenge.dueDate)}</div></div>;
}

function Challenges({ group, challenges, currentUid, back, createChallenge, addProgress, deleteChallenge }) {
  const myRole = group.members?.[currentUid]?.role;
  const canAdmin = group.createdBy === currentUid || myRole === 'owner' || myRole === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', dueDate: '2026-12-31', unit: 'min', target: 100 });
  const [inputs, setInputs] = useState({});

  async function submitChallenge(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (!form.dueDate) return;
    if (!form.unit.trim()) return;
    await createChallenge(form);
    setForm({ title: '', dueDate: '2026-12-31', unit: 'min', target: 100 });
    setShowForm(false);
  }

  return <main className="screen active">
    <div className="topbar"><button className="back-btn" onClick={back}>← Gruppe</button><div className="logo" style={{ fontSize: 22 }}>Challenges</div></div>
    <div className="card"><div className="row"><Avatar profile={group} className="group" /><div><div className="card-title">Gruppe</div><h2>{group.name}</h2><div className="sub">Gemeinsame Ziele über mehrere Tage oder Wochen tracken.</div></div></div></div>

    {canAdmin && <div className="card">
      <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Formular schließen' : '+ Challenge erstellen'}</button>
      {showForm && <form className="challenge-form" onSubmit={submitChallenge}>
        <label>Titel</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="z.B. Dead Hang Dezember" />
        <div className="challenge-meta-grid mt8"><div><label>Läuft bis</label><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div><div><label>Einheit</label><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="min / Anzahl" /></div></div>
        <label className="mt8">Ziel</label><input type="number" min="1" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="100" />
        <button className="btn btn-green mt12" type="submit">Speichern</button>
      </form>}
    </div>}

    <div className="card"><div className="card-title">Aktive Challenges</div>{challenges.length ? challenges.map((c) => {
      const percent = challengePercent(c);
      const adminProgress = c.progressBy?.admin?.value || c.totalProgress || 0;
      return <div className="challenge-card" key={c.id}>
        <div className="challenge-head"><div><h3>{c.title}</h3><div className="sub">bis {safeDate(c.dueDate)} · Ziel: {Number(c.target || 0).toLocaleString('de-DE')} {c.unit}</div></div><span className="pill green">{percent}%</span></div>
        <div className="progress-track challenge-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
        <div className="challenge-numbers"><span>{Number(c.totalProgress || 0).toLocaleString('de-DE')} / {Number(c.target || 0).toLocaleString('de-DE')} {c.unit}</span><span>Eingetragen: {Number(adminProgress).toLocaleString('de-DE')} {c.unit}</span></div>
        {canAdmin ? <div className="challenge-input-row"><input type="number" min="0" step="1" value={inputs[c.id] || ''} onChange={(e) => setInputs({ ...inputs, [c.id]: e.target.value })} placeholder={`+ ${c.unit}`} /><button className="tiny-wide-btn" onClick={async () => { await addProgress(c, inputs[c.id]); setInputs({ ...inputs, [c.id]: '' }); }}>Eintragen</button></div> : <div className="notice mt8">Nur Admins können den Challenge-Fortschritt eintragen oder verändern.</div>}
        {canAdmin && <button className="link-danger-btn mt8" onClick={() => { if (confirm('Challenge wirklich löschen?')) deleteChallenge(c.id); }}>Challenge löschen</button>}
      </div>;
    }) : <div className="empty">Noch keine Challenges vorhanden.</div>}</div>
  </main>;
}


function Setup({ setup, setSetup, group, profile, user, back, create }) {
  const members = setup.kind === 'group' ? Object.values(group.members || {}).filter((m) => m.active) : [{ uid: user.uid, name: profile.name, avatarColor: profile.avatarColor, avatarIcon: profile.avatarIcon }];
  return <main className="screen active"><div className="topbar"><button className="back-btn" onClick={back}>← zurück</button><div className="logo" style={{ fontSize: 18 }}>Session Setup</div></div><div className="card"><label>Session Name</label><input value={setup.title} onChange={(e) => setSetup({ ...setup, title: e.target.value })} className="mb8" /><div className="row"><div><label>Modus</label><select value={setup.mode} onChange={(e) => setSetup({ ...setup, mode: e.target.value })}>{Object.keys(MODE_RULES).map((m) => <option key={m} value={m}>{m}</option>)}</select></div><div><label>Zeitlimit</label><input type="number" value={setup.minutes} onChange={(e) => setSetup({ ...setup, minutes: e.target.value })} /></div></div><div className="quick-time-grid">{[30,45,60,90,120].map((m) => <button key={m} className={`quick-time-btn ${Number(setup.minutes) === m ? 'active' : ''}`} onClick={() => setSetup({ ...setup, minutes: m })}>{m} min</button>)}</div></div><div className="card"><div className="card-title">Spielmodus-Regeln</div><div className="notice"><ul style={{ marginLeft: 18 }}>{MODE_RULES[setup.mode].map((r) => <li key={r}>{r}</li>)}</ul></div></div><div className="card"><div className="card-title">Teilnehmer</div>{members.map((m) => <label className="check-row" key={m.uid}><input type="checkbox" checked={!!setup.selected[m.uid]} onChange={(e) => setSetup({ ...setup, selected: { ...setup.selected, [m.uid]: e.target.checked } })} /><Avatar profile={m} className="ice" /><strong>{m.name}</strong></label>)}{setup.guests.map((g, i) => <div className="check-row" key={i}><div className="avatar">G</div><strong>{g}</strong></div>)}<button className="btn btn-secondary mt8" onClick={() => { const g = prompt('Name des Gastspielers?'); if (g) setSetup({ ...setup, guests: [...setup.guests, g] }); }}>+ Gastspieler hinzufügen</button></div><button className="btn btn-primary" onClick={create}>Session erstellen</button></main>;
}

function Game({ session, user, updateRoute, finish }) {
  const [left, setLeft] = useState(secondsLeft(session));
  const me = session.participants[user.uid] || Object.values(session.participants)[0];
  const sorted = Object.values(session.participants).sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  const teamScores = sorted.reduce((acc, p) => {
    if (p.team) acc[p.team] = (acc[p.team] || 0) + (p.totalScore || 0);
    return acc;
  }, {});

  useEffect(() => {
    setLeft(secondsLeft(session));
    const t = setInterval(() => setLeft(secondsLeft(session)), 1000);
    return () => clearInterval(t);
  }, [session.id, session.startedAt, session.timerMinutes]);

  useEffect(() => {
    if (session.status === 'active' && left <= 0) finish();
  }, [left, session.status]);

  return <main className="screen active"><div className="topbar"><button className="back-btn" onClick={finish}>Beenden</button><div className={`timer-pill ${left <= 60 ? 'crit' : left <= 300 ? 'warn' : ''}`}>{formatTime(left)}</div><span className="pill green">Live</span></div><div className="card"><div className="row"><div><div className="card-title">Deine Punkte</div><div className="stat-num">{me.totalScore || 0}</div></div><div><div className="card-title">Tops</div><div className="stat-num">{me.routesSolved || 0}</div></div><div><div className="card-title">Zones</div><div className="stat-num">{me.zoneCount || 0}</div></div></div></div>{session.mode === 'team' && <div className="card"><div className="card-title">Teamwertung</div>{Object.entries(teamScores).sort((a, b) => b[1] - a[1]).map(([team, score]) => <div className="lb-row" key={team}><div className="lb-name">{team}</div><div className="lb-score">{score}</div></div>)}</div>}<div className="card"><div className="card-title">Live Leaderboard</div>{sorted.map((p, i) => <div className="lb-row" key={p.uid}><div className="lb-rank">{rank(i)}</div><Avatar profile={p} className="ice" /><div className="lb-name">{p.name}</div><div className="lb-score">{p.totalScore || 0}</div></div>)}</div><div id="route-list">{COLORS.map((col) => <div key={col.key}><div className="card-title" style={{ marginTop: 12 }}>{col.label} · {col.difficulty} · {col.pts} Pkt</div>{ROUTES.map((r, i) => ({ r, i })).filter(({ r }) => r.key === col.key).map(({ r, i }) => {
    const rd = me.routes[i];
    const locked = rd.solved;
    const isBonus = session.mode === 'bonus';
    const maxed = session.mode === 'comp' && rd.attempts >= 12;
    const status = rd.solved ? 'Top gespeichert' : rd.zone ? `Zone · ${zonePoints(r)} Pkt` : 'offen';
    return <div className="route-row" style={{ borderLeftColor: col.hex }} key={r.id}><div className="route-info"><div className="route-name">Route {r.num}</div><div className="route-sub">{isBonus ? status : `${rd.attempts} Versuche · ${status}`}</div></div><div className="route-actions">{!isBonus && <><button className="tiny-btn" disabled={locked || maxed} onClick={() => updateRoute(me.uid, i, 'attempt')}>+</button><span className="mono">{rd.attempts}{session.mode === 'comp' ? '/12' : ''}</span></>}<button className={`action-btn ${rd.zone && !rd.solved ? 'active' : ''}`} disabled={locked} onClick={() => updateRoute(me.uid, i, 'zone')}>Zone</button><button className={`action-btn ${rd.solved ? 'active' : ''}`} disabled={locked} onClick={() => updateRoute(me.uid, i, 'top')}>Top</button></div></div>;
  })}</div>)}</div></main>;
}

function Results({ session, back }) {
  const rows = Object.values(session.results || session.participants || {}).sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  return <main className="screen active"><div className="tc" style={{ padding: '26px 0 18px' }}><div style={{ fontSize: 52 }}>🏆</div><div className="logo">Ergebnis</div><div className="tag">Session abgeschlossen</div></div><div className="card" style={{ padding: 0 }}>{rows.map((p, i) => <div className="lb-row" key={p.uid}><div className="lb-rank">{rank(i)}</div><Avatar profile={p} className="ice" /><div className="lb-name">{p.name}</div><div style={{ textAlign: 'right' }}><div className="lb-score">{p.totalScore || 0}</div><div className="sub">{p.routesSolved || 0} Tops · {p.zoneCount || 0} Zones</div></div></div>)}</div><button className="btn btn-primary mt12" onClick={back}>Zurück</button></main>;
}
function Stat({ n, l }) { return <div className="stat-box"><div className="stat-num">{n}</div><div className="stat-lbl">{l}</div></div>; }
