import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import Avatar from '../../components/Avatar.jsx';
import { db } from '../../services/firebase.js';
import { CHALLENGE_UNITS } from '../challenges/challengeHelpers.js';

export default function DirectChat({ user, target, back, sendMessage, markRead, createCompetition }) {
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState(target || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [competitionOpen, setCompetitionOpen] = useState(false);
  const [comp, setComp] = useState({ title: 'Wochen-Challenge', unit: 'points', target: 1000, dueDate: '2026-12-31' });
  useEffect(() => {
    const ref = collection(db, 'users', user.uid, 'friends');
    return onSnapshot(ref, (snap) => setFriends(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))));
  }, [user.uid]);
  useEffect(() => {
    if (!selected?.uid) { setMessages([]); return undefined; }
    markRead?.(selected.uid);
    const chatId = [user.uid, selected.uid].sort().join('_');
    const q = query(collection(db, 'directChats', chatId, 'messages'), orderBy('createdAtMillis', 'asc'));
    return onSnapshot(q, (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })).slice(-100)));
  }, [user.uid, selected?.uid]);
  return <main className="screen active"><div className="topbar"><button className="back-btn" onClick={back}>← Home</button><div className="logo" style={{ fontSize: 20 }}>Nachrichten</div></div>
    {!selected && <div className="card"><div className="card-title">Freunde</div>{friends.length ? friends.map((f) => <button className="feed-row" key={f.uid} onClick={() => setSelected(f)}><Avatar profile={f} className="ice" /><span><strong>{f.name || f.displayName || f.uid}</strong><small>Chat öffnen</small></span><span>›</span></button>) : <div className="empty">Noch keine Freunde gefunden.</div>}</div>}
    {selected && <><div className="card"><div className="feed-head"><div className="row"><Avatar profile={selected} className="ice" /><div><h3>{selected.name || selected.displayName || 'Freund'}</h3><div className="sub">Direktchat</div></div></div><button className="soft-link" onClick={() => setSelected(null)}>wechseln</button></div></div>
      <div className="card chat-card"><div className="chat-box big-chat">{messages.length ? messages.map((m) => <div className={`chat-message ${m.senderId === user.uid ? 'mine' : ''}`} key={m.id}><strong>{m.senderName || (m.senderId === user.uid ? 'Du' : 'Freund')}</strong><span>{m.text}</span></div>) : <div className="empty compact-empty">Schreib die erste Nachricht.</div>}</div><form className="chat-input" onSubmit={async (e) => { e.preventDefault(); await sendMessage(selected.uid, text); setText(''); }}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nachricht schreiben…" /><button className="tiny-wide-btn">Senden</button></form></div>
      <div className="card"><button type="button" className="text-action" onClick={() => setCompetitionOpen(!competitionOpen)}>+ Wettbewerb gegen Freund starten</button>{competitionOpen && <div className="mt12 friend-competition-form"><label>Titel</label><input className="mb8" value={comp.title} onChange={(e) => setComp({ ...comp, title: e.target.value })} /><label>Einheit</label><select className="mb8" value={comp.unit} onChange={(e) => setComp({ ...comp, unit: e.target.value })}>{CHALLENGE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</select><label>Ziel</label><input className="mb8" type="number" value={comp.target} onChange={(e) => setComp({ ...comp, target: e.target.value })} /><label>Läuft bis</label><input className="mb8 friend-date-input" type="date" value={comp.dueDate} onChange={(e) => setComp({ ...comp, dueDate: e.target.value })} /><button type="button" className="btn btn-green" onClick={() => createCompetition(selected.uid, comp)}>Anfrage senden</button></div>}</div></>}
  </main>;
}