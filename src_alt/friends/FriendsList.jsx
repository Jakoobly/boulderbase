// src/friends/FriendsList.jsx
import Avatar from '../components/Avatar.jsx';
import { removeFriend } from '../services/friendService.js';

export default function FriendsList({ user, friends, onChanged, notify }) {
  async function remove(friendUid) {
    if (!window.confirm('Freund wirklich entfernen?')) return;
    try {
      await removeFriend({ currentUid: user.uid, friendUid });
      notify?.('Freund entfernt');
      await onChanged?.();
    } catch (e) {
      notify?.(e.message || 'Entfernen fehlgeschlagen');
    }
  }

  return (
    <section className="card">
      <div className="card-title">Meine Freunde</div>
      <div className="list">
        {friends.length === 0 && <div className="empty">Noch keine Freunde.</div>}
        {friends.map((f) => (
          <div className="list-item" key={f.uid}>
            <div className="row">
              <Avatar user={f} className="ice" />
              <div>
                <h3>{f.name || 'Boulderer'}</h3>
                <div className="sub">{f.points || 0} Punkte · {f.sessions || 0} Sessions</div>
              </div>
              <span className="friend-badge">Freund</span>
            </div>
            <div className="mini-actions">
              <button className="back-btn" onClick={() => remove(f.uid)}>Entfernen</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
