import Avatar from '../../components/Avatar.jsx';
import { MODE_RULES } from '../../constants.js';

export default function Setup({ setup, setSetup, group, profile, user, back, create }) {
  const members = setup.kind === 'group' ? Object.values(group.members || {}).filter((m) => m.active) : [{ uid: user.uid, name: profile.name, avatarColor: profile.avatarColor, avatarIcon: profile.avatarIcon }];
  const selectedMembers = members.filter((m) => setup.selected[m.uid]);
  const selectedPlayers = [...selectedMembers.map((m) => ({ id: m.uid, name: m.name, accountUid: m.uid })), ...(setup.guests || []).map((g, i) => ({ id: g.accountUid || g.id || `guest-${i}`, name: typeof g === 'string' ? g : g.name, accountUid: g.accountUid || null }))];
  const setTeamName = (teamId, name) => setSetup({ ...setup, teams: setup.teams.map((t) => t.id === teamId ? { ...t, name } : t) });
  const assignTeam = (playerId, teamId) => setSetup({ ...setup, teams: setup.teams.map((t) => ({ ...t, members: t.id === teamId ? Array.from(new Set([...(t.members || []), playerId])) : (t.members || []).filter((id) => id !== playerId) })) });
  const addTeam = () => setSetup({ ...setup, teams: [...setup.teams, { id: crypto.randomUUID(), name: `Team ${setup.teams.length + 1}`, members: [] }] });
  return <main className="screen active"><div className="topbar"><button className="back-btn" onClick={back}>← zurück</button><div className="logo" style={{ fontSize: 18 }}>Session Setup</div></div>
    <div className="card"><label>Session Name</label><input value={setup.title} onChange={(e) => setSetup({ ...setup, title: e.target.value })} className="mb8" />
      <div className="segmented"><button className={setup.mode === 'normal' ? 'active' : ''} onClick={() => setSetup({ ...setup, mode: 'normal' })}>Normal</button><button className={setup.mode === 'comp' ? 'active' : ''} onClick={() => setSetup({ ...setup, mode: 'comp' })}>Comp</button><button className={setup.mode === 'bonus' ? 'active' : ''} onClick={() => setSetup({ ...setup, mode: 'bonus' })}>Bonus</button></div>
      <div className="segmented mt8"><button className={setup.playType === 'ffa' ? 'active' : ''} onClick={() => setSetup({ ...setup, playType: 'ffa' })}>Alle gegen alle</button><button className={setup.playType === 'team' ? 'active' : ''} onClick={() => setSetup({ ...setup, playType: 'team' })}>Teammodus</button></div>
      <label className="toggle-row mt12"><input type="checkbox" checked={!!setup.singleDevice} onChange={(e) => setSetup({ ...setup, singleDevice: e.target.checked })} /> Nur von einem Handy spielen</label>
      <div className="row mt8"><div><label>Zeitlimit</label><input type="number" value={setup.minutes} onChange={(e) => setSetup({ ...setup, minutes: e.target.value })} /></div></div>
      <div className="quick-time-grid">{[30,45,60,90,120].map((m) => <button key={m} className={`quick-time-btn ${Number(setup.minutes) === m ? 'active' : ''}`} onClick={() => setSetup({ ...setup, minutes: m })}>{m} min</button>)}</div>
    </div>

    <div className="card"><div className="card-title">Regeln</div><div className="notice"><ul style={{ marginLeft: 18 }}>{MODE_RULES[setup.mode].map((r) => <li key={r}>{r}</li>)}</ul></div></div>

    <div className="card"><div className="card-title">Teilnehmer</div>{members.map((m) => <label className="check-row" key={m.uid}><input type="checkbox" checked={!!setup.selected[m.uid]} onChange={(e) => setSetup({ ...setup, selected: { ...setup.selected, [m.uid]: e.target.checked } })} /><Avatar profile={m} className="ice" /><strong>{m.name}</strong></label>)}
      {(setup.guests || []).map((g, i) => <div className="check-row" key={i}><div className="avatar">G</div><strong>{typeof g === 'string' ? g : g.name}</strong><button className="soft-link" onClick={() => setSetup({ ...setup, guests: setup.guests.filter((_, x) => x !== i) })}>entfernen</button></div>)}
      <button className="text-action" onClick={() => { const g = prompt('Name des Gastspielers?'); if (g) setSetup({ ...setup, guests: [...setup.guests, { id: `guest-${crypto.randomUUID()}`, name: g, accountUid: null }] }); }}>+ Gastspieler hinzufügen</button>
    </div>

    {setup.playType === 'team' && <div className="card"><div className="feed-head"><div><div className="card-title">Teams</div><h3>Teamnamen & Zuordnung</h3></div><button className="soft-link" onClick={addTeam}>+ Team</button></div>
      <div className="team-grid">{setup.teams.map((team) => <div className="team-box" key={team.id}><input value={team.name} onChange={(e) => setTeamName(team.id, e.target.value)} />{selectedPlayers.map((pl) => <label className="mini-check" key={pl.id}><input type="radio" name={`team-${pl.id}`} checked={(team.members || []).includes(pl.id)} onChange={() => assignTeam(pl.id, team.id)} /> {pl.name}</label>)}</div>)}</div>
    </div>}

    <button className="btn btn-primary" onClick={create}>Session erstellen</button>
  </main>;
}