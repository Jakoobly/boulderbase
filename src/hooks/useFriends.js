// src/hooks/useFriends.js
import { useCallback, useEffect, useState } from 'react';
import { getFriendState } from '../services/friendService.js';

export function useFriends(user) {
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const reloadFriends = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const state = await getFriendState(user.uid);
      setFriends(state.friends);
      setIncomingRequests(state.incomingRequests);
      setOutgoingRequests(state.outgoingRequests);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    reloadFriends();
  }, [reloadFriends]);

  function friendStatus(uid) {
    if (!uid || uid === user?.uid || String(uid).startsWith('guest-')) return 'self';
    if (friends.some((f) => f.uid === uid)) return 'friends';
    if (incomingRequests.some((r) => r.fromUid === uid)) return 'incoming';
    if (outgoingRequests.some((r) => r.toUid === uid)) return 'outgoing';
    return 'none';
  }

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    friendStatus,
    reloadFriends,
  };
}
