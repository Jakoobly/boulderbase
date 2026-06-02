// src/friends/FriendsList.jsx
import { useMemo, useState } from 'react';
import Avatar from '../components/Avatar.jsx';
import ProfileQrModal from '../components/ProfileQrModal.jsx';
import { removeFriend } from '../services/friendService.js';

export default function FriendsList({ user, friends, onChanged, notify }) {
  const [search, setSearch] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [qrFriend, setQrFriend] = useState(null);
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

  if (selectedFriend) {
    return (
      <section className="card">
        <button type="button" className="back-btn mb12" onClick={() => setSelectedFriend(null)}>&lt; Freunde</button>
        <div className="friend-profile-head">
          <Avatar user={selectedFriend} className="big ice" />
          <div>
            <div className="card-title">Freund</div>
            <h2>{selectedFriend.name || 'Boulderer'}</h2>
            <div className="sub">{selectedFriend.status || selectedFriend.description || 'Keine Beschreibung'}</div>
          </div>
        </div>
        <div className="stat-grid mt12">
          <div className="stat-box"><div className="stat-num">{selectedFriend.points || 0}</div><div className="stat-lbl">Punkte</div></div>
          <div className="stat-box"><div className="stat-num">{selectedFriend.sessions || 0}</div><div className="stat-lbl">Sessions</div></div>
        </div>
        <button type="button" className="btn btn-secondary compact profile-qr-action" onClick={() => setQrFriend(selectedFriend)}>QR-Code</button>
        <div className="friend-danger-area">
          <button type="button" className="friend-remove-link" onClick={() => remove(selectedFriend.uid)}>Freundschaft beenden</button>
        </div>
        {qrFriend && <ProfileQrModal user={{ uid: qrFriend.uid }} profile={qrFriend} onClose={() => setQrFriend(null)} onCopy={(url) => navigator.clipboard?.writeText(url).then(() => { notify?.('Profil-Link kopiert'); setQrFriend(null); })} />}
      </section>
    );
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
    </section>
  );
}
