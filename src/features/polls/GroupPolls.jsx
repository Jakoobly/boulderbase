import { useEffect, useMemo, useState } from 'react';
import Avatar from '../../components/Avatar.jsx';

const newOption = () => ({ id: crypto.randomUUID(), label: '', startAt: '', endAt: '', startDate: '', startTime: '', endDate: '', endTime: '' });
const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hours = String(Math.floor(index / 4)).padStart(2, '0');
  const minutes = String((index % 4) * 15).padStart(2, '0');
  return `${hours}:${minutes}`;
});
const RESULT_VISIBLE_MS = 7 * 24 * 60 * 60 * 1000;

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function toMillis(value) {
  if (!value) return 0;
  const millis = new Date(value).getTime();
  return Number.isNaN(millis) ? 0 : millis;
}

function datePart(value) {
  return String(value || '').slice(0, 10);
}

function timePart(value) {
  return String(value || '').slice(11, 16);
}

function combineDateTime(date, time) {
  if (!date || !time) return '';
  return `${date}T${time}`;
}

function fieldDate(option, field) {
  return option[`${field}Date`] || datePart(option[field]);
}

function fieldTime(option, field) {
  return option[`${field}Time`] || timePart(option[field]);
}

function pollClosed(poll) {
  return poll.status === 'closed' || (Number(poll.closesAtMillis || 0) > 0 && Number(poll.closesAtMillis) <= Date.now());
}

function pollClosedAtMillis(poll) {
  if (!pollClosed(poll)) return 0;
  if (Number(poll.closedAtMillis || 0)) return Number(poll.closedAtMillis);
  if (poll.status === 'closed' && Number(poll.updatedAtMillis || 0)) return Number(poll.updatedAtMillis);
  if (Number(poll.closesAtMillis || 0)) return Number(poll.closesAtMillis);
  return Number(poll.createdAtMillis || Date.now());
}

function resultStillVisible(poll) {
  if (!pollClosed(poll)) return true;
  return Date.now() - pollClosedAtMillis(poll) <= RESULT_VISIBLE_MS;
}

function optionLabel(poll, option) {
  if (poll.type !== 'schedule') return option.label;
  const start = formatDateTime(option.startAt);
  const end = option.endAt ? formatDateTime(option.endAt) : '';
  return [option.label || start, end && `bis ${end}`].filter(Boolean).join(' ');
}

function resultRows(poll) {
  const votes = Object.values(poll.votes || {});
  return (poll.options || []).map((option) => {
    const voters = votes.filter((vote) => (vote.optionIds || []).includes(option.id));
    return { option, voters, count: voters.length };
  });
}

function bestRow(rows) {
  return rows.reduce((best, row) => (row.count > (best?.count || 0) ? row : best), null);
}

function resultText(poll, rows) {
  const best = bestRow(rows);
  if (!best || best.count === 0) return 'Keine Stimmen abgegeben';
  const label = optionLabel(poll, best.option);
  const suffix = best.count === 1 ? '1 Stimme' : `${best.count} Stimmen`;
  return poll.type === 'schedule' ? `Bester Termin: ${label} (${suffix})` : `Ergebnis: ${label} (${suffix})`;
}

function defaultForm(type = 'poll') {
  return {
    type,
    title: '',
    description: '',
    options: type === 'schedule' ? [newOption()] : [newOption(), newOption()],
    allowMultiple: false,
    anonymous: false,
    closesAt: '',
    closesAtDate: '',
    closesAtTime: '',
    location: '',
    minParticipants: ''
  };
}

export default function GroupPolls({ group, polls = [], currentUid, createPoll, votePoll, updatePoll, deletePoll, activeOnly = false, hideHeaderAction = false, hideWhenEmpty = false, composerOpen = false, onComposerClose = () => {} }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [draftVotes, setDraftVotes] = useState({});
  const members = Object.values(group.members || {}).filter((m) => m.active);
  const myRole = group.members?.[currentUid]?.role;
  const canAdmin = group.createdBy === currentUid || myRole === 'owner' || myRole === 'admin';

  useEffect(() => {
    if (composerOpen) setShowForm(true);
  }, [composerOpen]);

  const visiblePolls = useMemo(() => {
    const visible = polls.filter(resultStillVisible);
    return activeOnly ? visible.filter((poll) => !pollClosed(poll) || resultStillVisible(poll)) : visible;
  }, [activeOnly, polls]);

  function updateOption(optionId, patch) {
    setForm({ ...form, options: form.options.map((option) => option.id === optionId ? { ...option, ...patch } : option) });
  }

  function updateOptionDateTime(option, field, part, value) {
    const currentDate = fieldDate(option, field);
    const currentTime = fieldTime(option, field);
    const nextDate = part === 'date' ? value : currentDate;
    const nextTime = part === 'time' ? value : currentTime;
    const nextValue = combineDateTime(nextDate, nextTime);
    updateOption(option.id, {
      [`${field}Date`]: nextDate,
      [`${field}Time`]: nextTime,
      [field]: nextValue,
      ...(field === 'startAt' ? { label: formatDateTime(nextValue) } : {})
    });
  }

function removeOption(optionId) {
    const minOptions = form.type === 'schedule' ? 1 : 2;
    if (form.options.length <= minOptions) return;
    setForm({ ...form, options: form.options.filter((option) => option.id !== optionId) });
  }

  async function submitPoll(e) {
    e.preventDefault();
    const closesAt = combineDateTime(form.closesAtDate || datePart(form.closesAt), form.closesAtTime || timePart(form.closesAt));
    const options = form.type === 'schedule'
      ? form.options.map((option) => {
        const startAt = combineDateTime(fieldDate(option, 'startAt'), fieldTime(option, 'startAt'));
        const endAt = combineDateTime(fieldDate(option, 'endAt'), fieldTime(option, 'endAt'));
        return { ...option, startAt, endAt, label: formatDateTime(startAt) };
      })
      : form.options;
    const saved = await createPoll({ ...form, options, closesAt, closesAtMillis: toMillis(closesAt) });
    if (!saved) return;
    setForm(defaultForm(form.type));
    setShowForm(false);
    onComposerClose();
  }

  function toggleForm() {
    const next = !showForm;
    setShowForm(next);
    if (!next) onComposerClose();
  }

  function toggleDraft(poll, optionId) {
    const current = draftVotes[poll.id] || poll.votes?.[currentUid]?.optionIds || [];
    const next = poll.allowMultiple
      ? (current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId])
      : [optionId];
    setDraftVotes({ ...draftVotes, [poll.id]: next });
  }

  async function saveVote(poll) {
    const selected = draftVotes[poll.id] || poll.votes?.[currentUid]?.optionIds || [];
    await votePoll(poll, selected);
  }

  const openPolls = useMemo(() => polls.filter((poll) => !pollClosed(poll)).length, [polls]);

  if (hideWhenEmpty && !showForm && visiblePolls.length === 0) return null;

  return <div className="card">
    <div className="feed-head">
      <div>
        <div className="card-title">Abstimmungen</div>
        <h3>Planung in der Gruppe</h3>
        <div className="sub">{openPolls ? `${openPolls} aktiv` : 'Keine aktive Abstimmung'}</div>
      </div>
      {canAdmin && !hideHeaderAction && <button type="button" className="btn btn-secondary compact" onClick={toggleForm}>{showForm ? 'Schließen' : 'Neue Abstimmung'}</button>}
    </div>

    {canAdmin && showForm && <form className="poll-form" onSubmit={submitPoll}>
      {hideHeaderAction && <button type="button" className="text-action poll-close-action" onClick={toggleForm}>Formular schließen</button>}
      <div className="segmented poll-type-tabs">
        <button type="button" className={form.type === 'poll' ? 'active' : ''} onClick={() => setForm({ ...defaultForm('poll'), title: form.title, description: form.description })}>Abstimmung</button>
        <button type="button" className={form.type === 'schedule' ? 'active' : ''} onClick={() => setForm({ ...defaultForm('schedule'), title: form.title, description: form.description, allowMultiple: true })}>Terminabfrage</button>
      </div>
      <label className="mt12">Titel</label>
      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={form.type === 'schedule' ? 'Bouldersession nächste Woche' : 'Wohin gehen wir nächste Woche?'} required />
      <label className="mt8">Beschreibung</label>
      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Bitte bis Mittwoch abstimmen." />

      {form.type === 'schedule' && <div className="poll-meta-grid mt8">
        <div><label>Ort</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Rockerei Stuttgart" /></div>
        <div><label>Mindestteilnehmer</label><input type="number" min="0" value={form.minParticipants} onChange={(e) => setForm({ ...form, minParticipants: e.target.value })} placeholder="4" /></div>
      </div>}

      <div className="poll-option-list mt12">
        <div className="card-title">Optionen</div>
        {form.options.map((option, index) => <div className="poll-option-editor" key={option.id}>
          {form.type === 'schedule'
            ? <>
              <label className="poll-inline-field"><span>Start</span><div className="poll-date-time-grid"><input type="date" value={fieldDate(option, 'startAt')} onChange={(e) => updateOptionDateTime(option, 'startAt', 'date', e.target.value)} /><select value={fieldTime(option, 'startAt')} onChange={(e) => updateOptionDateTime(option, 'startAt', 'time', e.target.value)}><option value="">Uhrzeit</option>{TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}</select></div></label>
              <label className="poll-inline-field"><span>Ende (optional)</span><div className="poll-date-time-grid"><input type="date" value={fieldDate(option, 'endAt')} onChange={(e) => updateOptionDateTime(option, 'endAt', 'date', e.target.value)} /><select value={fieldTime(option, 'endAt')} onChange={(e) => updateOptionDateTime(option, 'endAt', 'time', e.target.value)}><option value="">Uhrzeit</option>{TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}</select></div></label>
            </>
            : <input value={option.label} onChange={(e) => updateOption(option.id, { label: e.target.value })} placeholder={`Option ${index + 1}`} required />}
          {form.options.length > (form.type === 'schedule' ? 1 : 2) && <button type="button" className="tiny-btn" onClick={() => removeOption(option.id)}>x</button>}
        </div>)}
        <button type="button" className="text-action" onClick={() => setForm({ ...form, options: [...form.options, newOption()] })}>{form.type === 'schedule' ? '+ Termin hinzufügen' : '+ Option hinzufügen'}</button>
      </div>

      <div className="poll-meta-grid mt8">
        <label className="toggle-row"><input type="checkbox" checked={form.allowMultiple} onChange={(e) => setForm({ ...form, allowMultiple: e.target.checked })} /> Mehrfachauswahl</label>
        <label className="toggle-row"><input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} /> Anonym</label>
      </div>
      <label className="mt8">Ende der Abstimmung</label>
      <div className="poll-date-time-grid">
        <input type="date" value={form.closesAtDate || datePart(form.closesAt)} onChange={(e) => setForm({ ...form, closesAtDate: e.target.value, closesAt: combineDateTime(e.target.value, form.closesAtTime || timePart(form.closesAt)) })} />
        <select value={form.closesAtTime || timePart(form.closesAt)} onChange={(e) => setForm({ ...form, closesAtTime: e.target.value, closesAt: combineDateTime(form.closesAtDate || datePart(form.closesAt), e.target.value) })}>
          <option value="">Uhrzeit</option>
          {TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}
        </select>
      </div>
      <button className="btn btn-primary mt12" type="submit">{form.type === 'schedule' ? 'Terminabfrage erstellen' : 'Abstimmung erstellen'}</button>
    </form>}

    <div className="poll-list">
      {visiblePolls.length ? visiblePolls.map((poll) => {
        const rows = resultRows(poll);
        const totalVotes = Object.keys(poll.votes || {}).length;
        const maxVotes = Math.max(1, ...rows.map((row) => row.count));
        const best = bestRow(rows);
        const closed = pollClosed(poll);
        const selected = draftVotes[poll.id] || poll.votes?.[currentUid]?.optionIds || [];
        const missingCount = Math.max(0, members.length - totalVotes);
        if (closed) {
          return <div className="poll-result-banner" key={poll.id}>
            <div>
              <div className="poll-kicker">{poll.type === 'schedule' ? 'Terminabfrage beendet' : 'Abstimmung beendet'}</div>
              <strong>{poll.title}</strong>
              <span>{resultText(poll, rows)}</span>
            </div>
            {canAdmin && <button type="button" className="tiny-btn danger-tiny-btn" title="Löschen" onClick={() => { if (confirm('Ergebnis wirklich löschen?')) deletePoll(poll.id); }}>x</button>}
          </div>;
        }
        return <div className={`poll-card ${closed ? 'closed' : ''}`} key={poll.id}>
          <div className="poll-head">
            <div>
              <div className="poll-kicker">{poll.type === 'schedule' ? 'Terminabfrage' : 'Abstimmung'}{closed ? ' · beendet' : ''}</div>
              <h3>{poll.title}</h3>
              {poll.description && <div className="sub">{poll.description}</div>}
              {poll.location && <div className="sub">Ort: {poll.location}</div>}
            </div>
            {canAdmin && <div className="poll-admin-actions">
              {!closed && <button type="button" className="tiny-btn" title="Schließen" onClick={() => updatePoll(poll.id, { status: 'closed', closedAtMillis: Date.now() })}>✓</button>}
              <button type="button" className="tiny-btn danger-tiny-btn" title="Löschen" onClick={() => { if (confirm('Abstimmung wirklich löschen?')) deletePoll(poll.id); }}>x</button>
            </div>}
          </div>
          {poll.type === 'schedule' && best?.count > 0 && <div className="poll-best">Bester Termin bisher: {optionLabel(poll, best.option)}</div>}
          <div className="poll-results">
            {rows.map((row) => <label className="poll-result-row" key={row.option.id}>
              {!closed && <input type={poll.allowMultiple ? 'checkbox' : 'radio'} name={`poll-${poll.id}`} checked={selected.includes(row.option.id)} onChange={() => toggleDraft(poll, row.option.id)} />}
              <div className="poll-result-body">
                <div className="poll-result-top"><strong>{optionLabel(poll, row.option)}</strong><span>{row.count} {row.count === 1 ? 'Stimme' : 'Stimmen'}</span></div>
                <div className="progress-track poll-track"><div className="progress-fill" style={{ width: `${Math.round((row.count / maxVotes) * 100)}%` }} /></div>
                {!poll.anonymous && row.voters.length > 0 && <div className="poll-voters">{row.voters.slice(0, 8).map((voter) => <Avatar key={voter.uid} profile={voter} className="ice" />)}</div>}
              </div>
            </label>)}
          </div>
          <div className="poll-foot">
            <span>{totalVotes ? `Abgestimmt: ${totalVotes}` : 'Noch keine Stimmen'} · Noch nicht: {missingCount}</span>
            {poll.closesAtMillis ? <span>Endet {formatDateTime(poll.closesAtMillis)}</span> : null}
          </div>
          {!closed && <button type="button" className="tiny-wide-btn poll-save-btn" onClick={() => saveVote(poll)}>{poll.votes?.[currentUid] ? 'Stimme bearbeiten' : 'Abstimmen'}</button>}
        </div>;
      }) : <div className="empty">Noch keine aktive Abstimmung.</div>}
    </div>
  </div>;
}
