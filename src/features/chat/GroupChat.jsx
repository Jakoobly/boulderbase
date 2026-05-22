import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import { findBadWord } from '../../utils/profanity.js';

export default function GroupChat({ groupId, sendMessage, embedded = false, currentUid }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(embedded);
  const [error, setError] = useState('');
  useEffect(() => { if (embedded) setOpen(true); }, [embedded]);
  useEffect(() => {
    if (!groupId) return undefined;
    const q = query(collection(db, 'groups', groupId, 'messages'), orderBy('createdAtMillis', 'asc'));
    return onSnapshot(q, (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })).slice(-80)));
  }, [groupId]);
  async function submitMessage(e) {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    const badWord = findBadWord(clean);
    if (badWord) {
      setError('Diese Nachricht enthält ein gesperrtes Wort. Bitte freundlich formulieren.');
      return;
    }
    setError('');
    await sendMessage(clean);
    setText('');
  }

  return <div className="card">
    <div className="feed-head"><div><div className="card-title">Gruppenchat</div><h3>Absprachen</h3></div>{!embedded && <button type="button" className="btn btn-secondary compact chat-toggle-btn" onClick={() => setOpen(!open)}>{open ? 'Chat schließen' : `Chat öffnen${messages.length ? ` (${messages.length})` : ''}`}</button>}</div>
    {open && <>
      <div className="chat-box">{messages.length ? messages.map((m) => <div className={`chat-message ${m.senderId === currentUid ? 'mine' : ''}`} key={m.id}><strong>{m.senderName || 'Unbekannt'}</strong><span>{m.text}</span></div>) : <div className="empty compact-empty">Noch keine Nachrichten.</div>}</div>
      {error && <div className="notice small-notice profanity-warning">{error}</div>}
      <form className="chat-input" onSubmit={submitMessage}><input value={text} onChange={(e) => { setText(e.target.value); if (error) setError(''); }} placeholder="Nachricht schreiben…" maxLength={220} /><button className="tiny-wide-btn" type="submit">Senden</button></form>
    </>}
  </div>;
}