import { useState } from 'react';
import { safeDate } from '../../utils.js';
import { CHALLENGE_UNITS, challengePercent, unitLabel, unitStep } from './challengeHelpers.js';

function defaultDueDate() {
  const next = new Date();
  next.setDate(next.getDate() + 30);
  return next.toISOString().slice(0, 10);
}

export default function PersonalChallenges({ challenges = [], createChallenge, addProgress, deleteChallenge }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', dueDate: defaultDueDate(), unit: 'min', target: 100 });
  const [inputs, setInputs] = useState({});

  async function submitChallenge(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await createChallenge(form);
    setForm({ title: '', dueDate: defaultDueDate(), unit: 'min', target: 100 });
    setShowForm(false);
  }

  return (
    <section className="card personal-challenges-card">
      <div className="feed-head">
        <div>
          <div className="card-title">Persönliche Challenges</div>
          <h3>Deine Ziele</h3>
        </div>
        <button type="button" className="soft-link" onClick={() => setShowForm(!showForm)}>{showForm ? 'Schließen' : '+ Neu'}</button>
      </div>

      {showForm && <form className="challenge-form personal-challenge-form" onSubmit={submitChallenge}>
        <label>Titel</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="z.B. 20 Sessions im Monat" />
        <div className="challenge-meta-grid mt8">
          <div><label>Läuft bis</label><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
          <div><label>Einheit</label><select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{CHALLENGE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</select></div>
        </div>
        <label className="mt8">Ziel in {unitLabel(form.unit)}</label>
        <input type="number" min="1" step={unitStep(form.unit)} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
        <button className="btn btn-green mt12" type="submit">Challenge speichern</button>
      </form>}

      <div className="personal-challenge-list">
        {challenges.length ? challenges.map((challenge) => {
          const percent = challengePercent(challenge);
          const inputValue = inputs[challenge.id] || '';
          return (
            <div className="challenge-card personal-challenge-card" key={challenge.id}>
              <div className="challenge-head">
                <div>
                  <h3>{challenge.title}</h3>
                  <div className="sub">bis {safeDate(challenge.dueDate)} · Ziel: {Number(challenge.target || 0).toLocaleString('de-DE')} {unitLabel(challenge.unit)}</div>
                </div>
                <span className={`pill ${percent >= 100 ? 'green' : 'dark'}`}>{percent}%</span>
              </div>
              <div className="progress-track challenge-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
              <div className="challenge-numbers">
                <span>{Number(challenge.totalProgress || 0).toLocaleString('de-DE')} / {Number(challenge.target || 0).toLocaleString('de-DE')} {unitLabel(challenge.unit)}</span>
                <span>{percent >= 100 ? 'Erreicht' : 'Aktiv'}</span>
              </div>
              <form className="challenge-input-row mt12" onSubmit={async (e) => { e.preventDefault(); await addProgress(challenge, inputValue); setInputs({ ...inputs, [challenge.id]: '' }); }}>
                <input type="number" min="0" step={unitStep(challenge.unit)} value={inputValue} onChange={(e) => setInputs({ ...inputs, [challenge.id]: e.target.value })} placeholder={`+ ${unitLabel(challenge.unit)}`} />
                <button className="tiny-wide-btn" type="submit">Eintragen</button>
              </form>
              <button type="button" className="link-danger-btn mt8" onClick={() => { if (confirm('Persönliche Challenge wirklich löschen?')) deleteChallenge(challenge.id); }}>Challenge löschen</button>
            </div>
          );
        }) : <div className="empty compact-empty">Noch keine persönlichen Challenges.</div>}
      </div>
    </section>
  );
}
