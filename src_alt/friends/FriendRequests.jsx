// src/friends/FriendRequests.jsx
import Avatar from '../components/Avatar.jsx';
import { acceptFriendRequest, cancelFriendRequest, declineFriendRequest } from '../services/friendService.js';

export default function FriendRequests({ user, profile, incomingRequests, outgoingRequests, onChanged, notify }) {
  async function accept(request) {
    try {
      await acceptFriendRequest({ currentUser: user, currentProfile: profile, request });
      notify?.('Freund hinzugefügt');
      await onChanged?.();
    } catch (e) {
      notify?.(e.message || 'Annehmen fehlgeschlagen');
    }
  }

  async function decline(request) {
    try {
      await declineFriendRequest({ currentUid: user.uid, request });
      notify?.('Anfrage abgelehnt');
      await onChanged?.();
    } catch (e) {
      notify?.(e.message || 'Ablehnen fehlgeschlagen');
    }
  }

  async function cancel(request) {
    try {
      await cancelFriendRequest({ currentUid: user.uid, request });
      notify?.('Anfrage abgebrochen');
      await onChanged?.();
    } catch (e) {
      notify?.(e.message || 'Abbrechen fehlgeschlagen');
    }
  }

  return (
    <>
      <section className="card">
        <div className="card-title">Anfragen erhalten</div>
        <div className="list">
          {incomingRequests.length === 0 && <div className="empty">Keine offenen Anfragen.</div>}
          {incomingRequests.map((r) => (
            <div className="list-item request-card" key={r.id}>
              <div className="row">
                <Avatar user={r.from} className="ice" />
                <div>
                  <h3>{r.from?.name || 'Boulderer'}</h3>
                  <div className="sub">möchte dich als Freund hinzufügen</div>
                </div>
              </div>
              <div className="mini-actions">
                <button className="back-btn" onClick={() => accept(r)}>Annehmen</button>
                <button className="back-btn" onClick={() => decline(r)}>Ablehnen</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-title">Anfragen gesendet</div>
        <div className="list">
          {outgoingRequests.length === 0 && <div className="empty">Keine gesendeten Anfragen.</div>}
          {outgoingRequests.map((r) => (
            <div className="list-item" key={r.id}>
              <div className="row">
                <Avatar user={r.to} className="ice" />
                <div>
                  <h3>{r.to?.name || 'Boulderer'}</h3>
                  <div className="sub">Anfrage wartet auf Antwort</div>
                </div>
              </div>
              <div className="mini-actions">
                <button className="back-btn" onClick={() => cancel(r)}>Anfrage abbrechen</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
