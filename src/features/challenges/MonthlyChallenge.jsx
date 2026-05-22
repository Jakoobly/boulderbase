import { useState } from 'react';
import Avatar from '../../components/Avatar.jsx';
import { rank, safeDate } from '../../utils.js';
import { unitLabel, unitStep } from './challengeHelpers.js';

export default function MonthlyChallenge({ challenge, user, back, join, addProgress }) {
  const [input, setInput] = useState('');
  const joined = !!challenge.participants?.[user.uid];
  const rows = Object.values(challenge.participants || {}).sort((a, b) => (b.value || 0) - (a.value || 0));
  const myValue = Number(challenge.participants?.[user.uid]?.value || 0);
  const target = Math.max(1, Number(challenge.target || 1));
  const myPercent = Math.min(100, Math.round((myValue / target) * 100));
  const totalTraining = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);

  return <main className="screen active">
    <div className="topbar"><button className="back-btn" onClick={back}>← Home</button><span className="pill green">Monatschallenge</span></div>

    <div className="card">
      <div className="card-title">Globale Monatsaufgabe</div>
      <h2>{challenge.title}</h2>
      <div className="sub">Persönliches Ziel: {target.toLocaleString('de-DE')} {unitLabel(challenge.unit)} · bis {safeDate(challenge.dueDate || challenge.endsAtMillis)}</div>
      <div className="progress-track mt12"><div className="progress-fill" style={{ width: `${myPercent}%` }} /></div>
      <div className="challenge-numbers"><span>Dein Fortschritt: {myPercent}%</span><span>{myValue.toLocaleString('de-DE')} / {target.toLocaleString('de-DE')} {unitLabel(challenge.unit)}</span></div>
      {!joined
        ? <button className="btn btn-primary mt12" onClick={() => join(challenge)}>Beitreten</button>
        : <form className="challenge-input-row mt12" onSubmit={async (e) => { e.preventDefault(); await addProgress(challenge, input); setInput(''); }}>
            <input type="number" min="1" step={unitStep(challenge.unit)} value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Training in ${unitLabel(challenge.unit)} eintragen`} />
            <button className="tiny-wide-btn">Eintragen</button>
          </form>}
    </div>

    <div className="card">
      <div className="card-title">Leaderboard</div>
      <div className="sub mb12">Hier zählt, wie viel jede Person im aktuellen Monat trainiert hat. Gesamt eingetragen: {totalTraining.toLocaleString('de-DE')} {unitLabel(challenge.unit)}.</div>
      {rows.length ? rows.map((r, i) => {
        const value = Number(r.value || 0);
        const percent = Math.min(100, Math.round((value / target) * 100));
        return <div className="lb-row" key={r.uid}>
          <div className="lb-rank">{rank(i)}</div>
          <Avatar profile={r} className="ice" />
          <div className="lb-name">{r.name}<div className="sub">{percent}% vom Monatsziel</div></div>
          <div className="lb-score">{value.toLocaleString('de-DE')}</div>
        </div>;
      }) : <div className="empty">Noch niemand beigetreten.</div>}
    </div>
  </main>;
}
