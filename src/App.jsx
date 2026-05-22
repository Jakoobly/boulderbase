import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, increment } from 'firebase/firestore';
import AuthScreen from './components/AuthScreen.jsx';
import FriendsScreen from './friends/FriendsScreen.jsx';
import Home from './pages/Home.jsx';
import Profile from './pages/Profile.jsx';
import Group from './pages/Group.jsx';
import Setup from './features/sessions/Setup.jsx';
import Game from './features/sessions/Game.jsx';
import Results from './features/sessions/Results.jsx';
import Challenges from './features/challenges/Challenges.jsx';
import { auth, db } from './services/firebase.js';
import { ROUTES } from './constants.js';
import { code, emptyRouteState } from './utils.js';
import { initialProfile } from './utils/profile.js';
import { recalcParticipant } from './utils/scoring.js';
import { findBadWord } from './utils/profanity.js';
import './styles.css';
import './addons.css';















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
  const [setup, setSetup] = useState({ title: '', mode: 'normal', playType: 'ffa', minutes: 45, selected: {}, guests: [], singleDevice: false, teams: [] });

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

  async function openGroup(groupOrId) {
    try {
      if (!groupOrId) return notify('Gruppe nicht gefunden');

      const nextGroup = typeof groupOrId === 'object'
        ? groupOrId
        : groups.find((g) => g.id === groupOrId);

      if (nextGroup?.id) {
        // Erst in die Gruppenansicht wechseln, dann die aktive Gruppe setzen.
        // Dadurch öffnet sich der Screen sofort auch dann, wenn Firestore beim Klick kurz verzögert reagiert.
        setScreen('group');
        setActiveGroup(nextGroup);
        return;
      }

      const s = await getDoc(doc(db, 'groups', groupOrId));
      if (!s.exists()) return notify('Gruppe nicht gefunden');
      setScreen('group');
      setActiveGroup({ id: s.id, ...s.data() });
    } catch (error) {
      console.error('Gruppe konnte nicht geöffnet werden:', error);
      notify('Gruppe konnte nicht geöffnet werden');
    }
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
    const members = kind === 'group'
      ? Object.values(activeGroup.members || {}).filter((m) => m.active)
      : [{ uid: user.uid, name: safeName(), avatarColor: profile.avatarColor, avatarIcon: profile.avatarIcon }];
    const selected = Object.fromEntries(members.map((m) => [m.uid, true]));
    const defaultTeams = [
      { id: 'team-a', name: 'Team A', members: [] },
      { id: 'team-b', name: 'Team B', members: [] }
    ];
    setSetup({
      title: kind === 'group' ? `Training ${new Date().toLocaleDateString('de-DE')}` : `Freie Runde ${new Date().toLocaleDateString('de-DE')}`,
      mode: 'normal',
      playType: 'ffa',
      minutes: 45,
      selected,
      guests: [],
      singleDevice: false,
      kind,
      teams: defaultTeams
    });
    setScreen('setup');
  }

  function buildTeamMap(setupData, participants) {
    if (setupData.playType !== 'team') return {};
    const teamMap = {};
    (setupData.teams || []).forEach((team) => {
      (team.members || []).forEach((pid) => { if (participants[pid]) teamMap[pid] = team.name || 'Team'; });
    });
    const teamNames = (setupData.teams || []).map((t) => t.name || 'Team').filter(Boolean);
    let idx = 0;
    Object.keys(participants).forEach((pid) => {
      if (!teamMap[pid]) {
        const fallback = teamNames[idx % Math.max(1, teamNames.length)] || `Team ${idx + 1}`;
        teamMap[pid] = fallback;
        idx += 1;
      }
    });
    return teamMap;
  }

  async function createSession() {
    const participants = {};
    const members = setup.kind === 'group'
      ? Object.values(activeGroup.members || {}).filter((m) => m.active)
      : [{ uid: user.uid, name: safeName(), avatarColor: profile.avatarColor, avatarIcon: profile.avatarIcon }];

    members.filter((m) => setup.selected[m.uid]).forEach((m) => {
      participants[m.uid] = { uid: m.uid, accountUid: m.uid, name: m.name, avatarColor: m.avatarColor, avatarIcon: m.avatarIcon, isGuest: false, routes: emptyRouteState(ROUTES), routeLog: [], totalScore: 0, routesSolved: 0, flashCount: 0, zoneCount: 0 };
    });
    setup.guests.forEach((guest) => {
      const name = typeof guest === 'string' ? guest : guest.name;
      const linkedUid = typeof guest === 'object' ? guest.accountUid : null;
      const uid = linkedUid || guest.id || `guest-${crypto.randomUUID()}`;
      if (!participants[uid]) participants[uid] = { uid, accountUid: linkedUid, name, avatarColor: '#64748b', avatarIcon: linkedUid ? '🧗' : '👤', isGuest: !linkedUid, routes: emptyRouteState(ROUTES), routeLog: [], totalScore: 0, routesSolved: 0, flashCount: 0, zoneCount: 0 };
    });
    if (!Object.keys(participants).length) return notify('Keine Teilnehmer ausgewählt');
    const teamMap = buildTeamMap(setup, participants);
    Object.keys(participants).forEach((pid) => { participants[pid].team = teamMap[pid] || null; });
    if (setup.playType === 'team' && new Set(Object.values(teamMap)).size < 2) return notify('Bitte mindestens zwei Teams nutzen');

    const id = code(4);
    const teams = setup.playType === 'team'
      ? (setup.teams || []).map((t) => ({ ...t, members: (t.members || []).filter((pid) => participants[pid]) }))
      : [];
    await setDoc(doc(db, 'sessions', id), {
      code: id,
      title: setup.title,
      groupId: setup.kind === 'group' ? activeGroup.id : null,
      groupName: setup.kind === 'group' ? activeGroup.name : 'Freie Runde',
      mode: setup.mode,
      playType: setup.playType,
      singleDevice: !!setup.singleDevice,
      teams,
      timerMinutes: Number(setup.minutes) || 45,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      createdAtMillis: Date.now(),
      status: 'active',
      startedAt: Date.now(),
      participants
    });
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
        const memberUid = p.accountUid || p.uid;
        const base = `members.${memberUid}.stats`;
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

  async function addChallengeProgress(challenge, amount, targetUid = user.uid) {
    if (!activeGroup?.id) return;
    const value = Math.max(0, Number(amount) || 0);
    if (!challenge?.id || value <= 0) return notify('Bitte einen Fortschritt größer als 0 eingeben');

    const myRole = activeGroup.members?.[user.uid]?.role;
    const canAdmin = activeGroup.createdBy === user.uid || myRole === 'owner' || myRole === 'admin';
    const normalizedTargetUid = targetUid || user.uid;
    if (normalizedTargetUid !== user.uid && !canAdmin) return notify('Nur Admins können Beiträge anderen Mitgliedern zuordnen');

    const targetMember = activeGroup.members?.[normalizedTargetUid];
    if (!targetMember?.active) return notify('Dieses Gruppenmitglied wurde nicht gefunden');

    const current = Number(challenge.progressBy?.[normalizedTargetUid]?.value || 0);
    await updateDoc(doc(db, 'challenges', challenge.id), {
      [`progressBy.${normalizedTargetUid}`]: {
        uid: normalizedTargetUid,
        name: targetMember.name || 'Unbekannt',
        avatarColor: targetMember.avatarColor || '#7C83FD',
        avatarIcon: targetMember.avatarIcon || '🧗',
        value: current + value,
        updatedAt: Date.now(),
        updatedBy: user.uid
      },
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

  async function addGroupMessage(text) {
    const clean = text.trim();
    if (!activeGroup?.id || !clean) return;
    if (findBadWord(clean)) {
      notify('Nachricht blockiert: Bitte freundlich formulieren');
      return;
    }
    await addDoc(collection(db, 'groups', activeGroup.id, 'messages'), { text: clean, senderId: user.uid, senderName: safeName(), createdAt: serverTimestamp(), createdAtMillis: Date.now() });
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
    {screen === 'home' && <Home profile={profile} groups={groups} openGroup={openGroup} createGroup={createGroup} joinGroup={joinGroup} startFree={() => startSetup('free')} setScreen={setScreen} />}
    {screen === 'profile' && <Profile profile={profile} setProfile={setProfile} saveProfile={saveProfile} metric={profileMetric} setMetric={setProfileMetric} back={() => setScreen('home')} logout={() => signOut(auth)} />}
    {screen === 'group' && activeGroup && <Group group={activeGroup} sessions={sessions} challenges={challenges} back={() => setScreen('home')} invite={() => navigator.clipboard?.writeText(activeGroup.code).then(() => notify('Code kopiert'))} start={() => startSetup('group')} openChallenges={() => setScreen('challenges')} editGroup={updateGroup} updateMemberRole={updateMemberRole} deleteGroup={deleteActiveGroup} currentUid={user.uid} openSession={(id) => { listenSession(id, true); setScreen('game'); }} sendMessage={addGroupMessage} />}
    {screen === 'challenges' && activeGroup && <Challenges group={activeGroup} challenges={challenges} currentUid={user.uid} back={() => setScreen('group')} createChallenge={createChallenge} addProgress={addChallengeProgress} deleteChallenge={deleteChallenge} />}
    {screen === 'setup' && <Setup setup={setup} setSetup={setSetup} group={activeGroup} profile={profile} user={user} back={() => setScreen(setup.kind === 'group' ? 'group' : 'home')} create={createSession} />}
    {screen === 'game' && activeSession && <Game session={activeSession} user={user} updateRoute={updateRoute} finish={finishSession} />}
    {screen === 'results' && activeSession && <Results session={activeSession} back={() => activeSession.groupId ? openGroup(activeSession.groupId) : setScreen('home')} />}
  </div>;
}







































