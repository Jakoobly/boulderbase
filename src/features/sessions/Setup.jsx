import Avatar from '../../components/Avatar.jsx';
import { COLORS, DEFAULT_CUSTOM_RULES, MODE_RULES, PLAY_TYPES, SESSION_MODES } from '../../constants.js';

export default function Setup({ setup, setSetup, group, profile, user, back, create }) {
  const customRules = { ...DEFAULT_CUSTOM_RULES, ...(setup.customRules || {}) };
  const members = setup.kind === 'group'
    ? Object.values(group.members || {}).filter((m) => m.active)
    : [{ uid: user.uid, name: profile.name, avatarColor: profile.avatarColor, avatarIcon: profile.avatarIcon }];
  const selectedMembers = members.filter((m) => setup.selected[m.uid]);
  const selectedPlayers = [
    ...selectedMembers.map((m) => ({ id: m.uid, name: m.name, accountUid: m.uid })),
    ...(setup.guests || []).map((g, i) => ({ id: g.accountUid || g.id || `guest-${i}`, name: typeof g === 'string' ? g : g.name, accountUid: g.accountUid || null })),
  ];

  const updateSetup = (patch) => setSetup({ ...setup, ...patch });
  const setCustomRule = (key, value) => updateSetup({ customRules: { ...customRules, [key]: value } });
  const setCustomColorRule = (bucket, colorKey, value) => updateSetup({
    customRules: { ...customRules, [bucket]: { ...(customRules[bucket] || {}), [colorKey]: Number(value) || 0 } },
  });
  const setTeamName = (teamId, name) => updateSetup({ teams: setup.teams.map((t) => (t.id === teamId ? { ...t, name } : t)) });
  const assignTeam = (playerId, teamId) => updateSetup({
    teams: setup.teams.map((t) => ({ ...t, members: t.id === teamId ? Array.from(new Set([...(t.members || []), playerId])) : (t.members || []).filter((id) => id !== playerId) })),
  });
  const addTeam = () => updateSetup({ teams: [...setup.teams, { id: crypto.randomUUID(), name: `Team ${setup.teams.length + 1}`, members: [] }] });

  return <main className="screen active">
    <div className="topbar"><button className="back-btn" onClick={back}>← zurück</button><div className="logo" style={{ fontSize: 18 }}>Session Setup</div></div>

    <div className="card">
      <label>Session Name</label>
      <input value={setup.title} onChange={(e) => updateSetup({ title: e.target.value })} className="mb8" />
      <div className="setup-select-grid">
        <div><label>Spielmodus</label><select value={setup.mode} onChange={(e) => updateSetup({ mode: e.target.value, customRules: setup.customRules || DEFAULT_CUSTOM_RULES })}>{SESSION_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
        <div><label>Wertung</label><select value={setup.playType} onChange={(e) => updateSetup({ playType: e.target.value })}>{PLAY_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
      </div>
      <label className="toggle-row mt12"><input type="checkbox" checked={!!setup.singleDevice} onChange={(e) => updateSetup({ singleDevice: e.target.checked })} /> Nur von einem Handy spielen</label>
      <div className="row mt8"><div><label>Zeitlimit</label><input type="number" value={setup.minutes} onChange={(e) => updateSetup({ minutes: e.target.value })} /></div></div>
      <div className="quick-time-grid">{[30, 45, 60, 90, 120].map((m) => <button key={m} className={`quick-time-btn ${Number(setup.minutes) === m ? 'active' : ''}`} onClick={() => updateSetup({ minutes: m })}>{m} min</button>)}</div>
    </div>

    {setup.mode === 'custom' && <div className="card custom-rules-card">
      <div className="card-title">Alles personalisieren</div>
      <div className="setup-select-grid">
        <label className="toggle-row custom-toggle"><input type="checkbox" checked={!!customRules.countAttempts} onChange={(e) => setCustomRule('countAttempts', e.target.checked)} /> Versuche zählen</label>
        <div><label>Zone in % vom Top</label><input type="number" min="0" max="100" value={customRules.zonePercent} onChange={(e) => setCustomRule('zonePercent', Number(e.target.value) || 0)} /></div>
        <div><label>Max. Versuche</label><input type="number" min="1" disabled={!customRules.countAttempts} value={customRules.maxAttempts} onChange={(e) => setCustomRule('maxAttempts', Number(e.target.value) || 1)} /></div>
        <div><label>Abzug pro Versuch (%)</label><input type="number" min="0" max="100" disabled={!customRules.countAttempts} value={customRules.attemptPenaltyPercent} onChange={(e) => setCustomRule('attemptPenaltyPercent', Number(e.target.value) || 0)} /></div>
      </div>
      <div className="custom-color-grid mt12">{COLORS.map((c) => <div className="custom-color-row" key={c.key} style={{ borderLeftColor: c.hex }}>
        <strong>{c.label}</strong>
        <label>Top-Punkte<input type="number" min="0" value={customRules.pointsByColor?.[c.key] ?? c.pts} onChange={(e) => setCustomColorRule('pointsByColor', c.key, e.target.value)} /></label>
        <label>Bonus %<input type="number" min="0" value={customRules.bonusByColor?.[c.key] ?? 0} onChange={(e) => setCustomColorRule('bonusByColor', c.key, e.target.value)} /></label>
      </div>)}</div>
    </div>}

    <div className="card"><div className="card-title">Regeln</div><div className="notice"><ul style={{ marginLeft: 18 }}>{(MODE_RULES[setup.mode] || MODE_RULES.normal).map((r) => <li key={r}>{r}</li>)}</ul></div></div>

    <div className="card"><div className="card-title">Teilnehmer</div>{members.map((m) => <label className="check-row" key={m.uid}><input type="checkbox" checked={!!setup.selected[m.uid]} onChange={(e) => updateSetup({ selected: { ...setup.selected, [m.uid]: e.target.checked } })} /><Avatar profile={m} className="ice" /><strong>{m.name}</strong></label>)}
      {(setup.guests || []).map((g, i) => <div className="check-row" key={i}><div className="avatar">G</div><strong>{typeof g === 'string' ? g : g.name}</strong><button className="soft-link" onClick={() => updateSetup({ guests: setup.guests.filter((_, x) => x !== i) })}>entfernen</button></div>)}
      <button className="text-action" onClick={() => { const g = prompt('Name des Gastspielers?'); if (g) updateSetup({ guests: [...setup.guests, { id: `guest-${crypto.randomUUID()}`, name: g, accountUid: null }] }); }}>+ Gastspieler hinzufügen</button>
    </div>

    {setup.playType === 'team' && <div className="card"><div className="feed-head"><div><div className="card-title">Teams</div><h3>Teamnamen & Zuordnung</h3></div><button className="soft-link" onClick={addTeam}>+ Team</button></div>
      <div className="team-grid">{setup.teams.map((team) => <div className="team-box" key={team.id}><input value={team.name} onChange={(e) => setTeamName(team.id, e.target.value)} />{selectedPlayers.map((pl) => <label className="mini-check" key={pl.id}><input type="radio" name={`team-${pl.id}`} checked={(team.members || []).includes(pl.id)} onChange={() => assignTeam(pl.id, team.id)} /> {pl.name}</label>)}</div>)}</div>
    </div>}

    <button className="btn btn-primary" onClick={create}>Session erstellen</button>
  </main>;
}
