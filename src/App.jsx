import { useEffect, useState } from 'react';
import { deleteUser, onAuthStateChanged, signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, increment } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthScreen from './components/AuthScreen.jsx';
import BetaGate from './components/BetaGate.jsx';
import BottomNav from './components/BottomNav.jsx';
import InviteModal from './components/InviteModal.jsx';
import JoinGroupScreen from './components/JoinGroupScreen.jsx';
import NotificationBell from './components/NotificationBell.jsx';
import FriendsScreen from './friends/FriendsScreen.jsx';
import Groups from './pages/Groups.jsx';
import Home from './pages/Home.jsx';
import Profile from './pages/Profile.jsx';
import Group from './pages/Group.jsx';
import Setup from './features/sessions/Setup.jsx';
import Game from './features/sessions/Game.jsx';
import Results from './features/sessions/Results.jsx';
import Challenges from './features/challenges/Challenges.jsx';
import { auth, db } from './services/firebase.js';
import { DEFAULT_CUSTOM_RULES, ROUTES } from './constants.js';
import { code, emptyRouteState, groupPath, routeMatchesGroup } from './utils.js';
import { initialProfile } from './utils/profile.js';
import { recalcParticipant } from './utils/scoring.js';
import { findBadWord } from './utils/profanity.js';
import './styles.css';
import './addons.css';

function initialNotificationsSeenAt() {
  const stored = Number(localStorage.getItem('bb-notifications-seen-at') || 0);
  if (stored) return stored;
  const now = Date.now();
  localStorage.setItem('bb-notifications-seen-at', String(now));
  return now;
}

function initialDismissedNotifications() {
  try {
    const stored = JSON.parse(localStorage.getItem('bb-dismissed-notifications') || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [hasBetaAccess, setHasBetaAccess] = useState(() => localStorage.getItem('bb-beta-access') === 'true');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [screen, setScreenState] = useState('loading');
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [personalChallenges, setPersonalChallenges] = useState([]);
  const [polls, setPolls] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [challengeNotifications, setChallengeNotifications] = useState([]);
  const [friendRequestNotifications, setFriendRequestNotifications] = useState([]);
  const [groupChatNotifications, setGroupChatNotifications] = useState([]);
  const [directChatNotifications, setDirectChatNotifications] = useState([]);
  const [notificationsSeenAt, setNotificationsSeenAt] = useState(initialNotificationsSeenAt);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState(initialDismissedNotifications);
  const [notificationTarget, setNotificationTarget] = useState(null);
  const [challengeFocusId, setChallengeFocusId] = useState(null);
  const [inviteGroup, setInviteGroup] = useState(null);
  const [joinGroupTarget, setJoinGroupTarget] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [toast, setToast] = useState('');
  const [profileMetric, setProfileMetric] = useState('points');
  const [setup, setSetup] = useState({ title: '', mode: 'normal', playType: 'ffa', minutes: 45, selected: {}, guests: [], singleDevice: false, teams: [], customRules: DEFAULT_CUSTOM_RULES });

  function notify(msg) { setToast(msg); setTimeout(() => setToast(''), 2300); }
  const safeName = () => profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Boulderer';

  function screenPath(nextScreen) {
    if (nextScreen === 'home') return '/';
    if (nextScreen === 'groups') return '/groups';
    if (nextScreen === 'friends') return '/friends';
    if (nextScreen === 'profile') return '/profile';
    if (nextScreen === 'group' && activeGroup?.id) return groupPath(activeGroup);
    if (nextScreen === 'challenges' && activeGroup?.id) return groupPath(activeGroup, '/challenges');
    if (nextScreen === 'setup') return '/setup';
    if (nextScreen === 'game' && activeSession?.id) return `/sessions/${activeSession.id}`;
    if (nextScreen === 'results' && activeSession?.id) return `/sessions/${activeSession.id}/results`;
    return null;
  }

  function setScreen(nextScreen, options = {}) {
    if (nextScreen !== 'challenges') setChallengeFocusId(null);
    setScreenState(nextScreen);
    const path = screenPath(nextScreen);
    if (path && location.pathname !== path) navigate(path, { replace: !!options.replace });
  }

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
    if (location.pathname !== '/') setScreenState('home');
    else await restoreLastView(u.uid);
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
          setScreenState(data.status === 'finished' ? 'results' : 'game');
          navigate(`/sessions/${sessionId}${data.status === 'finished' ? '/results' : ''}`, { replace: true });
          return;
        }
      }
    }

    if ((view?.screen === 'group' || view?.screen === 'challenges') && view.groupId) {
      const g = await getDoc(doc(db, 'groups', view.groupId));
      if (g.exists() && g.data()?.members?.[uid]?.active) {
        const restoredGroup = { id: g.id, ...g.data() };
        setActiveGroup(restoredGroup);
        setScreenState(view.screen === 'challenges' ? 'challenges' : 'group');
        navigate(groupPath(restoredGroup, view.screen === 'challenges' ? '/challenges' : ''), { replace: true });
        return;
      }
    }

    if (view?.screen === 'profile' || view?.screen === 'friends' || view?.screen === 'groups') {
      setScreen(view.screen);
      return;
    }

    fallback();
  }

  useEffect(() => {
    if (!user?.uid || screen === 'loading' || screen === 'auth') return undefined;

    let cancelled = false;
    async function syncRoute() {
      const parts = location.pathname.split('/').filter(Boolean);

      if (parts.length === 0) {
        setScreenState('home');
        return;
      }

      if (parts[0] === 'friends') {
        setScreenState('friends');
        return;
      }

      if (parts[0] === 'groups' && parts.length === 1) {
        setScreenState('groups');
        return;
      }

      if (parts[0] === 'profile') {
        setScreenState('profile');
        return;
      }

      if (parts[0] === 'setup') {
        setScreenState('setup');
        return;
      }

      if (parts[0] === 'join' && parts[1]) {
        const groupId = parts[1];
        const snap = await getDoc(doc(db, 'groups', groupId));
        if (!cancelled && snap.exists()) {
          setJoinGroupTarget({ id: snap.id, ...snap.data() });
          setScreenState('join');
        } else if (!cancelled) {
          navigate('/', { replace: true });
        }
        return;
      }

      if (parts[0] === 'groups' && parts[1]) {
        const routeGroup = decodeURIComponent(parts[1]);
        const existing = groups.find((group) => routeMatchesGroup(routeGroup, group));
        if (existing) {
          if (!cancelled) setActiveGroup(existing);
        } else if (activeGroup?.id !== routeGroup) {
          if (!groups.length) return;
          const snap = await getDoc(doc(db, 'groups', routeGroup));
          if (!cancelled && snap.exists() && snap.data()?.members?.[user.uid]?.active) {
            const fetchedGroup = { id: snap.id, ...snap.data() };
            setActiveGroup(fetchedGroup);
            navigate(groupPath(fetchedGroup, parts[2] === 'challenges' ? '/challenges' : ''), { replace: true });
          } else if (!cancelled) {
            navigate('/', { replace: true });
            return;
          }
        }
        if (!cancelled) setScreenState(parts[2] === 'challenges' ? 'challenges' : 'group');
        return;
      }

      if (parts[0] === 'sessions' && parts[1]) {
        if (activeSession?.id !== parts[1]) listenSession(parts[1], true);
        setScreenState(parts[2] === 'results' ? 'results' : 'game');
        return;
      }

      navigate('/', { replace: true });
    }

    syncRoute();
    return () => { cancelled = true; };
  }, [location.pathname, user?.uid, groups, activeGroup?.id, activeSession?.id]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const q = query(collection(db, 'groups'), where(`members.${user.uid}.active`, '==', true));
    return onSnapshot(q, (snaps) => setGroups(snaps.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setPersonalChallenges([]);
      return undefined;
    }
    const q = query(collection(db, 'personalChallenges'), where('ownerUid', '==', user.uid));
    return onSnapshot(q, (snaps) => {
      const list = snaps.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.completedAtMillis ? 1 : 0) - (b.completedAtMillis ? 1 : 0) || (b.createdAtMillis || 0) - (a.createdAtMillis || 0));
      setPersonalChallenges(list);
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !groups.length) {
      setNotifications([]);
      setChallengeNotifications([]);
      setGroupChatNotifications([]);
      return undefined;
    }

    const groupIds = groups.map((group) => group.id).filter(Boolean);
    const groupById = Object.fromEntries(groups.map((group) => [group.id, group]));
    const chunks = [];
    for (let i = 0; i < groupIds.length; i += 10) chunks.push(groupIds.slice(i, i + 10));

    const buckets = new Map();
    const challengeBuckets = new Map();
    const chatBuckets = new Map();
    const publish = () => {
      const next = [...buckets.values()]
        .flat()
        .map((poll) => ({
          id: poll.id,
          groupId: poll.groupId,
          groupName: poll.groupName || groupById[poll.groupId]?.name || 'Gruppe',
          title: poll.title || 'Neue Abstimmung',
          kind: poll.type === 'schedule' ? 'Terminabfrage' : 'Abstimmung',
          createdBy: poll.createdBy || '',
          createdAtMillis: Number(poll.createdAtMillis || 0),
          type: 'poll',
          subtitle: `${poll.type === 'schedule' ? 'Terminabfrage' : 'Abstimmung'} in ${poll.groupName || groupById[poll.groupId]?.name || 'Gruppe'}`
        }))
        .sort((a, b) => b.createdAtMillis - a.createdAtMillis);
      setNotifications(next);
    };
    const publishChallenges = () => {
      const next = [...challengeBuckets.values()]
        .flat()
        .map((challenge) => ({
          id: challenge.id,
          groupId: challenge.groupId,
          groupName: challenge.groupName || groupById[challenge.groupId]?.name || 'Gruppe',
          title: challenge.title || 'Neue Challenge',
          kind: 'Challenge',
          createdBy: challenge.createdBy || '',
          createdAtMillis: Number(challenge.createdAtMillis || 0),
          type: 'challenge',
          subtitle: `Challenge in ${challenge.groupName || groupById[challenge.groupId]?.name || 'Gruppe'}`
        }))
        .sort((a, b) => b.createdAtMillis - a.createdAtMillis);
      setChallengeNotifications(next);
    };
    const publishGroupChats = () => {
      const next = [...chatBuckets.values()]
        .flat()
        .filter((message) => message.senderId !== user.uid)
        .map((message) => ({
          id: `group-chat-${message.groupId}-${message.id}`,
          groupId: message.groupId,
          groupName: groupById[message.groupId]?.name || 'Gruppe',
          title: message.senderName ? `${message.senderName} hat geschrieben` : 'Neue Chatnachricht',
          kind: 'Chat',
          createdBy: message.senderId || '',
          createdAtMillis: Number(message.createdAtMillis || 0),
          type: 'group-chat',
          subtitle: `Gruppenchat in ${groupById[message.groupId]?.name || 'Gruppe'}`
        }))
        .sort((a, b) => b.createdAtMillis - a.createdAtMillis);
      setGroupChatNotifications(next);
    };

    const unsubs = chunks.map((chunk, index) => {
      const q = query(collection(db, 'groupPolls'), where('groupId', 'in', chunk));
      return onSnapshot(q, (snaps) => {
        buckets.set(index, snaps.docs.map((d) => ({ id: d.id, ...d.data() })));
        publish();
      });
    });
    const challengeUnsubs = chunks.map((chunk, index) => {
      const q = query(collection(db, 'challenges'), where('groupId', 'in', chunk));
      return onSnapshot(q, (snaps) => {
        challengeBuckets.set(index, snaps.docs.map((d) => ({ id: d.id, ...d.data() })));
        publishChallenges();
      });
    });
    const chatUnsubs = groupIds.map((groupId) => {
      const q = query(collection(db, 'groups', groupId, 'messages'), orderBy('createdAtMillis', 'desc'), limit(5));
      return onSnapshot(q, (snaps) => {
        chatBuckets.set(groupId, snaps.docs.map((d) => ({ id: d.id, groupId, ...d.data() })));
        publishGroupChats();
      });
    });

    return () => [...unsubs, ...challengeUnsubs, ...chatUnsubs].forEach((unsub) => unsub());
  }, [groups, user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setFriendRequestNotifications([]);
      return undefined;
    }
    const q = query(collection(db, 'friendRequests'), where('toUid', '==', user.uid), where('status', '==', 'pending'));
    return onSnapshot(q, (snaps) => {
      const next = snaps.docs.map((d) => {
        const request = { id: d.id, ...d.data() };
        const fromName = request.from?.name || 'Jemand';
        return {
          id: `friend-request-${request.id}`,
          title: `${fromName} möchte dich hinzufügen`,
          kind: 'Freundschaft',
          createdBy: request.fromUid || '',
          createdAtMillis: Number(request.createdAtMillis || 0),
          type: 'friend-request',
          subtitle: 'Neue Freundschaftsanfrage'
        };
      }).sort((a, b) => b.createdAtMillis - a.createdAtMillis);
      setFriendRequestNotifications(next);
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setDirectChatNotifications([]);
      return undefined;
    }

    const messageBuckets = new Map();
    const messageUnsubs = new Map();
    const publishDirectChats = () => {
      const next = [...messageBuckets.values()]
        .flat()
        .filter((message) => message.senderId !== user.uid)
        .map((message) => ({
          id: `direct-chat-${message.chatId}-${message.id}`,
          title: message.senderName ? `${message.senderName} hat dir geschrieben` : 'Neue Direktnachricht',
          kind: 'Chat',
          createdBy: message.senderId || '',
          createdAtMillis: Number(message.createdAtMillis || 0),
          type: 'direct-chat',
          subtitle: 'Direktnachricht'
        }))
        .sort((a, b) => b.createdAtMillis - a.createdAtMillis);
      setDirectChatNotifications(next);
    };

    const chatQuery = query(collection(db, 'directChats'), where('members', 'array-contains', user.uid));
    const unsubChats = onSnapshot(chatQuery, (snaps) => {
      const activeChatIds = new Set(snaps.docs.map((d) => d.id));
      for (const [chatId, unsub] of messageUnsubs.entries()) {
        if (!activeChatIds.has(chatId)) {
          unsub();
          messageUnsubs.delete(chatId);
          messageBuckets.delete(chatId);
        }
      }

      snaps.docs.forEach((chatDoc) => {
        if (messageUnsubs.has(chatDoc.id)) return;
        const messagesQuery = query(collection(db, 'directChats', chatDoc.id, 'messages'), orderBy('createdAtMillis', 'desc'), limit(5));
        const unsubMessages = onSnapshot(messagesQuery, (messageSnaps) => {
          messageBuckets.set(chatDoc.id, messageSnaps.docs.map((d) => ({ id: d.id, chatId: chatDoc.id, ...d.data() })));
          publishDirectChats();
        });
        messageUnsubs.set(chatDoc.id, unsubMessages);
      });

      publishDirectChats();
    });

    return () => {
      unsubChats();
      messageUnsubs.forEach((unsub) => unsub());
    };
  }, [user?.uid]);

  const allNotifications = [
    ...notifications,
    ...challengeNotifications,
    ...friendRequestNotifications,
    ...groupChatNotifications,
    ...directChatNotifications
  ]
    .filter((item) => !dismissedNotificationIds.includes(item.id))
    .sort((a, b) => b.createdAtMillis - a.createdAtMillis);

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
        setScreenState('game');
        navigate(`/sessions/${liveForMe.id}`);
      }
    });
    const cq = query(collection(db, 'challenges'), where('groupId', '==', activeGroup.id));
    const unsubChallenges = onSnapshot(cq, (cs) => {
      const list = cs.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));
      setChallenges(list);
    });
    const pq = query(collection(db, 'groupPolls'), where('groupId', '==', activeGroup.id));
    const unsubPolls = onSnapshot(pq, (ps) => {
      const list = ps.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));
      setPolls(list);
    });
    return () => { unsubGroup(); unsubSessions(); unsubChallenges(); unsubPolls(); };
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
        setScreenState('group');
        setActiveGroup(nextGroup);
        navigate(groupPath(nextGroup));
        return;
      }

      const s = await getDoc(doc(db, 'groups', groupOrId));
      if (!s.exists()) return notify('Gruppe nicht gefunden');
      setScreenState('group');
      setActiveGroup({ id: s.id, ...s.data() });
      navigate(groupPath({ id: s.id, ...s.data() }));
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

  async function removeGroupMember(targetUid) {
    if (!activeGroup?.id || !targetUid) return;
    const currentMember = activeGroup.members?.[user.uid];
    const targetMember = activeGroup.members?.[targetUid];
    const amAdmin = activeGroup.createdBy === user.uid || currentMember?.role === 'owner' || currentMember?.role === 'admin';
    if (!amAdmin) return notify('Nur Admins dürfen Mitglieder entfernen');
    if (!targetMember?.active) return notify('Mitglied nicht gefunden');
    if (targetUid === user.uid) return notify('Du kannst dich nicht selbst entfernen');
    if (targetUid === activeGroup.createdBy || targetMember.role === 'owner') return notify('Der Ersteller kann nicht entfernt werden');
    if (targetMember.role === 'admin') return notify('Admins bitte zuerst zu Mitgliedern machen');
    await updateDoc(doc(db, 'groups', activeGroup.id), {
      [`members.${targetUid}.active`]: false,
      [`members.${targetUid}.removedAt`]: Date.now(),
      [`members.${targetUid}.removedBy`]: user.uid
    });
    notify('Mitglied entfernt');
  }

  async function deleteActiveGroup() {
    if (!activeGroup?.id) return;
    if (activeGroup.createdBy !== user.uid) return notify('Nur der Ersteller kann die Gruppe löschen');
    const sq = query(collection(db, 'sessions'), where('groupId', '==', activeGroup.id));
    const ss = await getDocs(sq);
    const cq = query(collection(db, 'challenges'), where('groupId', '==', activeGroup.id));
    const cs = await getDocs(cq);
    const pq = query(collection(db, 'groupPolls'), where('groupId', '==', activeGroup.id));
    const ps = await getDocs(pq);
    await Promise.all([...ss.docs.map((d) => deleteDoc(doc(db, 'sessions', d.id))), ...cs.docs.map((d) => deleteDoc(doc(db, 'challenges', d.id))), ...ps.docs.map((d) => deleteDoc(doc(db, 'groupPolls', d.id)))]);
    await deleteDoc(doc(db, 'groups', activeGroup.id));
    localStorage.removeItem('bb-current-view');
    localStorage.removeItem('bb-active-session');
    setActiveGroup(null);
    setActiveSession(null);
    setSessions([]);
    setPolls([]);
    setScreen('groups');
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

  async function joinInvitedGroup() {
    if (!joinGroupTarget?.id || !user?.uid || !profile) return;
    const member = joinGroupTarget.members?.[user.uid];
    if (!member?.active) {
      await updateDoc(doc(db, 'groups', joinGroupTarget.id), {
        [`members.${user.uid}`]: {
          uid: user.uid,
          name: safeName(),
          avatarColor: profile.avatarColor,
          avatarIcon: profile.avatarIcon,
          role: 'member',
          active: true,
          joinedAt: Date.now(),
          stats: { sessions: 0, points: 0, tops: 0, flashes: 0, best: 0 }
        }
      });
      notify('Gruppe beigetreten');
    }
    await openGroup(joinGroupTarget.id);
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
      teams: defaultTeams,
      customRules: DEFAULT_CUSTOM_RULES
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
    const guests = setup.singleDevice ? setup.guests || [] : [];
    guests.forEach((guest) => {
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
      customRules: setup.mode === 'custom' ? { ...DEFAULT_CUSTOM_RULES, ...(setup.customRules || {}) } : null,
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
    setScreenState('game');
    navigate(`/sessions/${id}`);
  }

  function listenSession(id, remember = false) {
    if (remember) localStorage.setItem('bb-active-session', id);
    return onSnapshot(doc(db, 'sessions', id), (s) => {
      if (!s.exists()) {
        localStorage.removeItem('bb-active-session');
        localStorage.removeItem('bb-current-view');
        setActiveSession(null);
        setScreen('home', { replace: true });
        return;
      }
      const data = { id: s.id, ...s.data() };
      setActiveSession(data);
      if (data.status === 'finished') {
        localStorage.removeItem('bb-active-session');
        setScreenState('results');
        navigate(`/sessions/${data.id}/results`, { replace: true });
      }
    });
  }

  async function updateRoute(uid, routeIndex, action) {
    if (!activeSession || activeSession.status !== 'active') return notify('Session ist beendet');
    const p = structuredClone(activeSession.participants[uid]);
    const rd = { ...p.routes[routeIndex] };
    const customRules = { ...DEFAULT_CUSTOM_RULES, ...(activeSession.customRules || {}) };
    const countAttempts = activeSession.mode === 'custom' ? customRules.countAttempts !== false : activeSession.mode !== 'bonus';
    if (rd.solved) return notify('Top ist gespeichert und unveränderlich');

    if (action === 'attempt') {
      if (!countAttempts) return notify('In diesem Modus werden keine Versuche gezählt');
      const unlimitedAttempts = activeSession.mode === 'custom' && !!customRules.unlimitedAttempts;
      const max = activeSession.mode === 'comp' ? 12 : activeSession.mode === 'custom' && !unlimitedAttempts ? Number(customRules.maxAttempts) || 99 : 99;
      if (!unlimitedAttempts && rd.attempts >= max) return notify(activeSession.mode === 'comp' ? 'Maximal 12 Versuche im Comp-Modus' : `Maximal ${max} Versuche`);
      rd.attempts += 1;
    }
    if (action === 'zone') {
      if (countAttempts && rd.attempts === 0) rd.attempts = 1;
      rd.zone = true;
      rd.zoneAt = rd.zoneAt || Date.now();
    }
    if (action === 'top') {
      if (countAttempts && rd.attempts === 0) rd.attempts = 1;
      rd.solved = true;
      rd.zone = false;
      rd.topAt = Date.now();
      rd.locked = true;
    }

    p.routes[routeIndex] = rd;
    p.routeLog = [...(p.routeLog || []), { routeIndex, type: action, attempts: rd.attempts, at: Date.now() }].slice(-80);
    const next = recalcParticipant(p, activeSession.mode, activeSession.customRules);
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
        const currentBest = Number(activeGroup?.members?.[memberUid]?.stats?.best || 0);
        const sessionScore = Number(p.totalScore || 0);
        updates[`${base}.sessions`] = increment(1);
        updates[`${base}.points`] = increment(sessionScore);
        updates[`${base}.tops`] = increment(p.routesSolved || 0);
        updates[`${base}.flashes`] = increment(p.flashCount || 0);
        updates[`${base}.best`] = Math.max(currentBest, sessionScore);
      });
      await updateDoc(doc(db, 'groups', activeSession.groupId), updates);
    }
    setScreenState('results');
    navigate(`/sessions/${activeSession.id}/results`);
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
    const normalizedTargetUid = targetUid || null;
    if (!normalizedTargetUid && !canAdmin) return notify('Nur Admins können Beiträge ohne Mitglied eintragen');
    if (normalizedTargetUid && normalizedTargetUid !== user.uid && !canAdmin) return notify('Nur Admins können Beiträge anderen Mitgliedern zuordnen');

    const updates = {
      totalProgress: increment(value),
      updatedBy: user.uid,
      updatedAtMillis: Date.now()
    };

    if (normalizedTargetUid) {
      const targetMember = activeGroup.members?.[normalizedTargetUid];
      if (!targetMember?.active) return notify('Dieses Gruppenmitglied wurde nicht gefunden');
      const current = Number(challenge.progressBy?.[normalizedTargetUid]?.value || 0);
      updates[`progressBy.${normalizedTargetUid}`] = {
        uid: normalizedTargetUid,
        name: targetMember.name || 'Unbekannt',
        avatarColor: targetMember.avatarColor || '#7C83FD',
        avatarIcon: targetMember.avatarIcon || '🧗',
        value: current + value,
        updatedAt: Date.now(),
        updatedBy: user.uid
      };
    }

    await updateDoc(doc(db, 'challenges', challenge.id), updates);
    notify('Fortschritt gespeichert');
  }

  async function deleteChallenge(challengeId) {
    if (!challengeId) return;
    await deleteDoc(doc(db, 'challenges', challengeId));
    notify('Challenge gelöscht');
  }

  async function createPersonalChallenge(form) {
    if (!user?.uid) return;
    const id = crypto.randomUUID();
    const target = Math.max(1, Number(form.target) || 1);
    await setDoc(doc(db, 'personalChallenges', id), {
      ownerUid: user.uid,
      createdBy: user.uid,
      title: form.title.trim(),
      dueDate: form.dueDate,
      unit: form.unit || 'min',
      target,
      totalProgress: 0,
      status: 'active',
      createdAt: serverTimestamp(),
      createdAtMillis: Date.now(),
      updatedAtMillis: Date.now()
    });
    notify('Persönliche Challenge erstellt');
  }

  async function addPersonalChallengeProgress(challenge, amount) {
    const value = Math.max(0, Number(amount) || 0);
    if (!challenge?.id || value <= 0) return notify('Bitte einen Fortschritt größer als 0 eingeben');
    const nextTotal = Number(challenge.totalProgress || 0) + value;
    const target = Math.max(1, Number(challenge.target || 1));
    const updates = {
      totalProgress: increment(value),
      updatedAtMillis: Date.now()
    };
    if (nextTotal >= target && !challenge.completedAtMillis) {
      updates.status = 'completed';
      updates.completedAtMillis = Date.now();
    }
    await updateDoc(doc(db, 'personalChallenges', challenge.id), updates);
    notify('Fortschritt gespeichert');
  }

  async function deletePersonalChallenge(challengeId) {
    if (!challengeId) return;
    await deleteDoc(doc(db, 'personalChallenges', challengeId));
    notify('Persönliche Challenge gelöscht');
  }

  function openChallengeScreen(challengeId = null) {
    setChallengeFocusId(challengeId);
    setScreen('challenges');
  }

  function canManageActiveGroup() {
    const myRole = activeGroup?.members?.[user.uid]?.role;
    return activeGroup?.createdBy === user.uid || myRole === 'owner' || myRole === 'admin';
  }

  function memberSnapshot(uid = user.uid) {
    const member = activeGroup?.members?.[uid] || {};
    return {
      uid,
      name: member.name || safeName(),
      avatarColor: member.avatarColor || profile.avatarColor,
      avatarIcon: member.avatarIcon || profile.avatarIcon
    };
  }

  async function createGroupPoll(form) {
    if (!activeGroup?.id) return false;
    if (!canManageActiveGroup()) {
      notify('Nur Admins können Abstimmungen erstellen');
      return false;
    }
    const isSchedule = form.type === 'schedule';
    const cleanOptions = (form.options || [])
      .map((option) => ({ ...option, label: String(option.label || '').trim() }))
      .filter((option) => isSchedule ? option.startAt : option.label);
    if (!form.title?.trim()) {
      notify('Bitte einen Titel eingeben');
      return false;
    }
    if (cleanOptions.length < (isSchedule ? 1 : 2)) {
      notify(isSchedule ? 'Bitte mindestens einen Termin mit Datum und Uhrzeit anlegen' : 'Bitte mindestens zwei Optionen anlegen');
      return false;
    }

    const id = crypto.randomUUID();
    try {
      await setDoc(doc(db, 'groupPolls', id), {
      groupId: activeGroup.id,
      groupName: activeGroup.name,
      type: isSchedule ? 'schedule' : 'poll',
      title: form.title.trim(),
      description: String(form.description || '').trim(),
      options: cleanOptions.map((option) => ({
        id: option.id || crypto.randomUUID(),
        label: option.label || option.startAt,
        startAt: option.startAt || '',
        endAt: option.endAt || ''
      })),
      allowMultiple: !!form.allowMultiple,
      anonymous: !!form.anonymous,
      closesAtMillis: Number(form.closesAtMillis || 0),
      location: String(form.location || '').trim(),
      minParticipants: Math.max(0, Number(form.minParticipants) || 0),
      votes: {},
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      createdAtMillis: Date.now(),
      updatedAtMillis: Date.now(),
      status: 'active'
      });
      notify(form.type === 'schedule' ? 'Terminabfrage erstellt' : 'Abstimmung erstellt');
      return true;
    } catch (error) {
      console.error('Abstimmung konnte nicht erstellt werden:', error);
      notify(error?.code === 'permission-denied' ? 'Speichern blockiert: Firestore-Regeln deployen' : 'Abstimmung konnte nicht gespeichert werden');
      return false;
    }
  }

  async function openNotificationTarget(item) {
    if (!item) return;
    if (item.type === 'friend-request') {
      setNotificationTarget(null);
      setScreen('friends');
      return;
    }
    if (item.type === 'direct-chat') {
      setNotificationTarget(null);
      setScreen('friends');
      return;
    }
    if (!item.groupId) return;
    setNotificationTarget(['poll', 'challenge', 'group-chat'].includes(item.type) ? { type: item.type, id: item.id, groupId: item.groupId } : null);
    await openGroup(item.groupId);
    if (item.type === 'challenge') {
      const group = groups.find((g) => g.id === item.groupId) || activeGroup || { id: item.groupId, name: item.groupName };
      setScreenState('challenges');
      navigate(groupPath(group, '/challenges'));
    }
  }

  async function voteGroupPoll(poll, optionIds) {
    if (!activeGroup?.id || !poll?.id) return;
    if (poll.status === 'closed' || (poll.closesAtMillis && poll.closesAtMillis <= Date.now())) return notify('Diese Abstimmung ist beendet');
    const selected = [...new Set(optionIds || [])].filter(Boolean);
    if (!selected.length) return notify('Bitte mindestens eine Option auswählen');
    if (!poll.allowMultiple && selected.length > 1) return notify('Nur eine Antwort ist erlaubt');
    await updateDoc(doc(db, 'groupPolls', poll.id), {
      [`votes.${user.uid}`]: {
        ...memberSnapshot(user.uid),
        optionIds: selected,
        updatedAtMillis: Date.now()
      },
      updatedAtMillis: Date.now()
    });
    notify('Stimme gespeichert');
  }

  async function updateGroupPoll(pollId, updates) {
    if (!pollId) return;
    if (!canManageActiveGroup()) return notify('Nur Admins können Abstimmungen bearbeiten');
    await updateDoc(doc(db, 'groupPolls', pollId), { ...updates, updatedAtMillis: Date.now() });
    notify('Abstimmung aktualisiert');
  }

  async function deleteGroupPoll(pollId) {
    if (!pollId) return;
    if (!canManageActiveGroup()) return notify('Nur Admins können Abstimmungen löschen');
    await deleteDoc(doc(db, 'groupPolls', pollId));
    notify('Abstimmung gelöscht');
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

  async function deleteProfile() {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      localStorage.removeItem('bb-current-view');
      localStorage.removeItem('bb-active-session');
      await deleteUser(user);
      notify('Profil gelöscht');
    } catch (error) {
      console.error('Profil konnte nicht gelöscht werden:', error);
      notify(error?.code === 'auth/requires-recent-login' ? 'Bitte neu einloggen und dann Profil löschen' : 'Profil konnte nicht gelöscht werden');
    }
  }

  function markNotificationsSeen() {
    const now = Date.now();
    localStorage.setItem('bb-notifications-seen-at', String(now));
    setNotificationsSeenAt(now);
  }

  function dismissNotification(notificationId) {
    if (!notificationId) return;
    setDismissedNotificationIds((current) => {
      if (current.includes(notificationId)) return current;
      const next = [notificationId, ...current].slice(0, 200);
      localStorage.setItem('bb-dismissed-notifications', JSON.stringify(next));
      return next;
    });
  }

  if (!hasBetaAccess) return <BetaGate onUnlock={() => setHasBetaAccess(true)} />;
  if (screen === 'loading') return <div className="screen active"><div style={{ margin: 'auto' }}><div className="logo">Boulder<em>Base</em></div></div></div>;
  if (screen === 'auth') return <AuthScreen />;
  if (!user || !profile) return null;

  const inviteUrl = inviteGroup?.id ? `${window.location.origin}/join/${inviteGroup.id}` : '';

  return <div className="app-shell">
    {toast && <div className="toast show">{toast}</div>}
    {inviteGroup && <InviteModal group={inviteGroup} inviteUrl={inviteUrl} onClose={() => setInviteGroup(null)} onCopy={() => navigator.clipboard?.writeText(inviteUrl).then(() => notify('Einladungslink kopiert'))} />}
    {screen === 'home' && <NotificationBell notifications={allNotifications} seenAt={notificationsSeenAt} currentUid={user.uid} onMarkSeen={markNotificationsSeen} onDismiss={dismissNotification} onOpenGroup={openNotificationTarget} />}
    {screen === 'join' && <JoinGroupScreen group={joinGroupTarget} isMember={!!joinGroupTarget?.members?.[user.uid]?.active} join={joinInvitedGroup} back={() => setScreen('home')} />}
    {screen === 'friends' && <FriendsScreen user={user} profile={profile} setScreen={setScreen} notify={notify} inviteUid={new URLSearchParams(location.search).get('add') || ''} />}
    {screen === 'groups' && <Groups groups={groups} openGroup={openGroup} createGroup={createGroup} joinGroup={joinGroup} />}
    {screen === 'home' && <Home profile={profile} startFree={() => startSetup('free')} />}
    {screen === 'profile' && <Profile user={user} profile={profile} setProfile={setProfile} saveProfile={saveProfile} metric={profileMetric} setMetric={setProfileMetric} back={() => setScreen('home')} logout={() => signOut(auth)} deleteProfile={deleteProfile} notify={notify} personalChallenges={personalChallenges} createPersonalChallenge={createPersonalChallenge} addPersonalChallengeProgress={addPersonalChallengeProgress} deletePersonalChallenge={deletePersonalChallenge} />}
    {screen === 'group' && activeGroup && <Group group={activeGroup} sessions={sessions} challenges={challenges} polls={polls} focusPollId={notificationTarget?.type === 'poll' && notificationTarget?.groupId === activeGroup.id ? notificationTarget.id : null} focusPanel={notificationTarget?.type === 'group-chat' && notificationTarget?.groupId === activeGroup.id ? 'chat' : null} back={() => setScreen('groups')} invite={() => setInviteGroup(activeGroup)} start={() => startSetup('group')} openChallenges={() => openChallengeScreen()} openChallenge={openChallengeScreen} editGroup={updateGroup} updateMemberRole={updateMemberRole} removeGroupMember={removeGroupMember} deleteGroup={deleteActiveGroup} currentUid={user.uid} openSession={(id) => { listenSession(id, true); setScreenState('game'); navigate(`/sessions/${id}`); }} sendMessage={addGroupMessage} createPoll={createGroupPoll} votePoll={voteGroupPoll} updatePoll={updateGroupPoll} deletePoll={deleteGroupPoll} />}
    {screen === 'challenges' && activeGroup && <Challenges group={activeGroup} challenges={challenges} focusChallengeId={notificationTarget?.type === 'challenge' && notificationTarget?.groupId === activeGroup.id ? notificationTarget.id : challengeFocusId} currentUid={user.uid} back={() => setScreen('group')} createChallenge={createChallenge} addProgress={addChallengeProgress} deleteChallenge={deleteChallenge} />}
    {screen === 'setup' && <Setup setup={setup} setSetup={setSetup} group={activeGroup} profile={profile} user={user} back={() => setScreen(setup.kind === 'group' ? 'group' : 'home')} create={createSession} />}
    {screen === 'game' && activeSession && <Game session={activeSession} user={user} updateRoute={updateRoute} finish={finishSession} />}
    {screen === 'results' && activeSession && <Results session={activeSession} back={() => activeSession.groupId ? openGroup(activeSession.groupId) : setScreen('home')} />}
    <BottomNav profile={profile} screen={screen} setScreen={setScreen} />
  </div>;
}
































