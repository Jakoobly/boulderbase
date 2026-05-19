// src/friends/FriendSearch.jsx
import { useState } from 'react';
import Avatar from '../components/Avatar.jsx';
import { searchUsers, sendFriendRequest } from '../services/friendService.js';

export default function FriendSearch({ user, profile, friendStatus, onChanged, notify }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  async function runSearch() {
    setLoading(true);
    try {
      setResults(await searchUsers(term, user.uid));
    } catch (e) {
      notify?.(e.message || 'Suche fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  async function send(uid) {
    try {
      await sendFriendRequest({ fromUser: user, fromProfile: profile, toUid: uid });
      notify?.('Anfrage gesendet');
      await onChanged?.();
    } catch (e) {
      notify?.(e.message || 'Anfrage fehlgeschlagen');
    }
  }

  return (
    <section className="card">
      <div className="card-title">Nutzer suchen</div>
      <div className="row">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="Name oder Username"
        />
        <button className="back-btn" onClick={runSearch} disabled={loading}>Suchen</button>
      </div>

      <div className="list mt12">
        {results.map((u) => {
          const status = friendStatus(u.uid);
          return (
            <div className="list-item" key={u.uid}>
              <div className="row">
                <Avatar user={u} className="ice" />
                <div>
                  <h3>{u.name || 'Boulderer'}</h3>
                  <div className="sub">{u.points || 0} Punkte · {status === 'friends' ? 'Schon Freund' : 'Profil gefunden'}</div>
                </div>
              </div>
              <div className="mini-actions">
                {status === 'none' && <button className="back-btn" onClick={() => send(u.uid)}>Hinzufügen</button>}
                {status === 'outgoing' && <button className="back-btn" disabled>Anfrage gesendet</button>}
                {status === 'friends' && <span className="pill green">Freund</span>}
              </div>
            </div>
          );
        })}
        {!loading && term.length >= 2 && results.length === 0 && <div className="empty">Keine Nutzer gefunden.</div>}
      </div>
    </section>
  );
}
