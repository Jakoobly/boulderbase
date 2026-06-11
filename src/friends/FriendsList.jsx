// src/friends/FriendsList.jsx
import { useMemo, useState } from 'react';
import Avatar from '../components/Avatar.jsx';
import PublicProfileModal from '../components/PublicProfileModal.jsx';
import { removeFriend } from '../services/friendService.js';

export default function FriendsList({ user, friends, onChanged, notify }) {
  const [search, setSearch] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const filteredFriends = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return friends;
    return friends.filter((friend) => `${friend.name || ''} ${friend.displayName || ''} ${friend.uid || ''}`.toLowerCase().includes(term));
  }, [friends, search]);

  async function remove(friendUid) {
    if (!window.confirm('Freundschaft wirklich beenden?')) return;
    try {
      await removeFriend({ currentUid: user.uid, friendUid });
      notify?.('Freund entfernt');
      setSelectedFriend(null);
      await onChanged?.();
    } catch (e) {
      notify?.(e.message || 'Entfernen fehlgeschlagen');
    }
  }

  return (
    <section className="card">
      <div className="card-title">Meine Freunde</div>
      <input
        className="mb12"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Freunde suchen"
        type="search"
      />
      <div className="list">
        {friends.length === 0 && <div className="empty">Noch keine Freunde.</div>}
        {friends.length > 0 && filteredFriends.length === 0 && <div className="empty">Keine Freunde gefunden.</div>}
        {filteredFriends.map((friend) => (
          <button type="button" className="list-item friend-list-item friend-name-item" key={friend.uid} onClick={() => setSelectedFriend(friend)}>
            <div className="row friend-list-row">
              <Avatar user={friend} className="ice" />
              <div className="friend-list-info">
                <h3>{friend.name || 'Boulderer'}</h3>
              </div>
              <span className="friend-row-chevron">&gt;</span>
            </div>
          </button>
        ))}
      </div>
      {selectedFriend && <PublicProfileModal
        uid={selectedFriend.uid}
        profile={selectedFriend}
        onClose={() => setSelectedFriend(null)}
        notify={notify}
        footer={<button type="button" className="friend-remove-link public-profile-danger" onClick={() => remove(selectedFriend.uid)}>Freundschaft beenden</button>}
      />}
    </section>
  );
}
