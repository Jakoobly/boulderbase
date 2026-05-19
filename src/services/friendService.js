// src/services/friendService.js
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { profileSnapshot } from '../utils/avatar.js';

// Firestore-Struktur:
// users/{uid}
// users/{uid}/friends/{friendUid}
// friendRequests/{fromUid_toUid}

export async function searchUsers(searchTerm, currentUid) {
  const term = searchTerm.trim().toLowerCase();
  if (term.length < 2) return [];

  // Einfacher Ansatz für kleine Apps: User laden und clientseitig filtern.
  // Für viele Nutzer später ersetzen durch Algolia/Meilisearch oder searchKeywords Array.
  const snap = await getDocs(query(collection(db, 'users'), limit(50)));
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .filter((u) => u.uid !== currentUid)
    .filter((u) => `${u.name || ''} ${u.username || ''}`.toLowerCase().includes(term))
    .slice(0, 10);
}

export async function getFriendState(uid) {
  const [friendsSnap, incomingSnap, outgoingSnap] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'friends')),
    getDocs(query(collection(db, 'friendRequests'), where('toUid', '==', uid), where('status', '==', 'pending'))),
    getDocs(query(collection(db, 'friendRequests'), where('fromUid', '==', uid), where('status', '==', 'pending'))),
  ]);

  return {
    friends: friendsSnap.docs.map((d) => ({ uid: d.id, ...d.data() })),
    incomingRequests: incomingSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0)),
    outgoingRequests: outgoingSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0)),
  };
}

export async function sendFriendRequest({ fromUser, fromProfile, toUid }) {
  if (!fromUser?.uid || !toUid || fromUser.uid === toUid) {
    throw new Error('Ungültige Freundschaftsanfrage.');
  }

  const toSnap = await getDoc(doc(db, 'users', toUid));
  if (!toSnap.exists()) throw new Error('Nutzer nicht gefunden.');
  const toProfile = { uid: toUid, ...toSnap.data() };

  const requestId = `${fromUser.uid}_${toUid}`;
  const reverseRequestId = `${toUid}_${fromUser.uid}`;

  const [existing, reverse, alreadyFriend] = await Promise.all([
    getDoc(doc(db, 'friendRequests', requestId)),
    getDoc(doc(db, 'friendRequests', reverseRequestId)),
    getDoc(doc(db, 'users', fromUser.uid, 'friends', toUid)),
  ]);

  if (alreadyFriend.exists()) throw new Error('Ihr seid bereits befreundet.');
  if (existing.exists()) throw new Error('Anfrage wurde bereits gesendet.');
  if (reverse.exists()) throw new Error('Diese Person hat dir bereits eine Anfrage gesendet.');

  await setDoc(doc(db, 'friendRequests', requestId), {
    fromUid: fromUser.uid,
    toUid,
    from: profileSnapshot(fromUser, fromProfile),
    to: {
      uid: toUid,
      name: toProfile.name || 'Boulderer',
      avatarColor: toProfile.avatarColor || '#2D3142',
      avatarIcon: toProfile.avatarIcon || '🧗',
    },
    status: 'pending',
    createdAt: serverTimestamp(),
    createdAtMillis: Date.now(),
  });
}

export async function acceptFriendRequest({ currentUser, currentProfile, request }) {
  if (!request?.id || request.toUid !== currentUser.uid) {
    throw new Error('Diese Anfrage gehört nicht zu deinem Account.');
  }

  await Promise.all([
    setDoc(doc(db, 'users', currentUser.uid, 'friends', request.fromUid), {
      uid: request.fromUid,
      name: request.from?.name || 'Boulderer',
      avatarColor: request.from?.avatarColor || '#2D3142',
      avatarIcon: request.from?.avatarIcon || '🧗',
      points: request.from?.points || 0,
      sessions: request.from?.sessions || 0,
      createdAt: serverTimestamp(),
      createdAtMillis: Date.now(),
    }, { merge: true }),
    setDoc(doc(db, 'users', request.fromUid, 'friends', currentUser.uid), {
      ...profileSnapshot(currentUser, currentProfile),
      createdAt: serverTimestamp(),
      createdAtMillis: Date.now(),
    }, { merge: true }),
    updateDoc(doc(db, 'friendRequests', request.id), {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      acceptedAtMillis: Date.now(),
    }),
  ]);
}

export async function declineFriendRequest({ currentUid, request }) {
  if (!request?.id || request.toUid !== currentUid) throw new Error('Nicht erlaubt.');
  await updateDoc(doc(db, 'friendRequests', request.id), {
    status: 'declined',
    declinedAt: serverTimestamp(),
    declinedAtMillis: Date.now(),
  });
}

export async function cancelFriendRequest({ currentUid, request }) {
  if (!request?.id || request.fromUid !== currentUid) throw new Error('Nicht erlaubt.');
  await deleteDoc(doc(db, 'friendRequests', request.id));
}

export async function removeFriend({ currentUid, friendUid }) {
  await Promise.all([
    deleteDoc(doc(db, 'users', currentUid, 'friends', friendUid)),
    deleteDoc(doc(db, 'users', friendUid, 'friends', currentUid)),
  ]);
}
