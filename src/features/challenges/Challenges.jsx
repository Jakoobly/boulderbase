import { useState } from 'react';
import Avatar from '../../components/Avatar.jsx';
import { rank, safeDate } from '../../utils.js';
import { CHALLENGE_UNITS, challengePercent, unitLabel, unitStep } from './challengeHelpers.js';

export default function Challenges({ group, challenges, currentUid, back, createChallenge, addProgress, deleteChallenge }) {
  const [form, setForm] = useState({ title: '', dueDate: '2026-12-31', unit: 'min', target: 100 });
  const [inputs, setInputs] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState(null);
  const myRole = group.members?.[currentUid]?.role;
  const canAdmin = group.createdBy === currentUid || myRole === 'owner' || myRole === 'admin';
  const members = Object.values(group.members || {}).filter((m) => m.active);
  const currentMember = group.members?.[currentUid];
  const selectableMembers = canAdmin ? members : (currentMember ? [currentMember] : []);
  function inputKey(challengeId, field) { return `${challengeId}-${field}`; }
  async function submitChallenge(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await createChallenge(form);
    setForm({ title: '', dueDate: '2026-12-31', unit: 'min', target: 100 });
    setShowForm(false);
  }
  return <main className="screen active">
    <div className="topbar"><button className="back-btn" onClick={back}>← Gruppe</button><div className="logo" style={{ fontSize: 22 }}>Challenges</div></div>
    <div className="card"><div className="row"><Avatar profile={group} className="group" /><div><div className="card-title">Gruppe</div><h2>{group.name}</h2><div className="sub">Challenge antippen, um Beiträge pro Person und Leaderboard zu sehen.</div></div></div></div>

    {canAdmin && <div className="card">
      <button className="text-action" onClick={() => setShowForm(!showForm)}>{showForm ? 'Formular schließen' : '+ Challenge erstellen'}</button>
      {showForm && <form className="challenge-form" onSubmit={submitChallenge}>
        <label>Titel</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="z.B. 1000 Minuten im Mai" />
        <div className="challenge-meta-grid mt8"><div><label>Läuft bis</label><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div><div><label>Einheit</label><select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{CHALLENGE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</select></div></div>
        <label className="mt8">Ziel in {unitLabel(form.unit)}</label><input type="number" min="1" step={unitStep(form.unit)} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="100" />
        <button className="btn btn-green mt12" type="submit">Speichern</button>
      </form>}
    </div>}

    <div className="card"><div className="card-title">Aktive Challenges</div>{challenges.length ? challenges.map((c) => {
      const percent = challengePercent(c);
      const rows = Object.values(c.progressBy || {}).sort((a, b) => (b.value || 0) - (a.value || 0));
      const open = openId === c.id;
      return <div className="challenge-card clickable" key={c.id} onClick={() => setOpenId(open ? null : c.id)}>
        <div className="challenge-head"><div><h3>{c.title}</h3><div className="sub">bis {safeDate(c.dueDate)} · Ziel: {Number(c.target || 0).toLocaleString('de-DE')} {unitLabel(c.unit)}</div></div><span className="pill green">{percent}%</span></div>
        <div className="progress-track challenge-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
        <div className="challenge-numbers"><span>{Number(c.totalProgress || 0).toLocaleString('de-DE')} / {Number(c.target || 0).toLocaleString('de-DE')} {unitLabel(c.unit)}</span><span>{rows.length} Beiträge</span></div>
        {open && <div className="challenge-detail" onClick={(e) => e.stopPropagation()}>
          <div className="card-title mt12">Beiträge</div>
          {rows.length ? rows.map((r, i) => <div className="lb-row compact-row" key={r.uid || i}><div className="lb-rank">{rank(i)}</div><Avatar profile={r} className="ice" /><div className="lb-name">{r.name || 'Unbekannt'}</div><div className="lb-score">{Number(r.value || 0).toLocaleString('de-DE')} {unitLabel(c.unit)}</div></div>) : <div className="empty compact-empty">Noch keine Beiträge.</div>}
          <div className="challenge-input-row challenge-assign-row">
            <select className="small-select challenge-member-select" value={inputs[inputKey(c.id, 'member')] || currentUid} onChange={(e) => setInputs({ ...inputs, [inputKey(c.id, 'member')]: e.target.value })} disabled={!canAdmin}>
              {selectableMembers.map((m) => <option key={m.uid} value={m.uid}>{m.uid === currentUid ? `${m.name || 'Du'} (Du)` : (m.name || 'Unbekannt')}</option>)}
            </select>
            <input type="number" min="0" step={unitStep(c.unit)} value={inputs[inputKey(c.id, 'amount')] || ''} onChange={(e) => setInputs({ ...inputs, [inputKey(c.id, 'amount')]: e.target.value })} placeholder={`+ ${unitLabel(c.unit)}`} />
            <button className="tiny-wide-btn" onClick={async () => { const memberUid = inputs[inputKey(c.id, 'member')] || currentUid; await addProgress(c, inputs[inputKey(c.id, 'amount')], memberUid); setInputs({ ...inputs, [inputKey(c.id, 'amount')]: '' }); }}>Beitrag eintragen</button>
          </div>
          {canAdmin && <button className="link-danger-btn mt8" onClick={() => { if (confirm('Challenge wirklich löschen?')) deleteChallenge(c.id); }}>Challenge löschen</button>}
        </div>}
      </div>;
    }) : <div className="empty">Noch keine Challenges vorhanden.</div>}</div>
  </main>;
}