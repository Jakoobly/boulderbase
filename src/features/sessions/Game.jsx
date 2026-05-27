import { useEffect, useState } from 'react';
import Avatar from '../../components/Avatar.jsx';
import { COLORS, DEFAULT_CUSTOM_RULES, ROUTES } from '../../constants.js';
import { rank } from '../../utils.js';
import { zonePoints } from '../../utils/scoring.js';
import { formatTime, secondsLeft } from '../../utils/time.js';

export default function Game({ session, user, updateRoute, finish }) {
  const [left, setLeft] = useState(secondsLeft(session));
  const customRules = { ...DEFAULT_CUSTOM_RULES, ...(session.customRules || {}) };
  const countAttempts = session.mode === 'custom' ? customRules.countAttempts !== false : session.mode !== 'bonus';
  const me = session.participants[user.uid] || Object.values(session.participants)[0];
  const sorted = Object.values(session.participants).sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  const teamScores = sorted.reduce((acc, p) => {
    if (p.team) acc[p.team] = (acc[p.team] || 0) + (p.totalScore || 0);
    return acc;
  }, {});

  useEffect(() => {
    setLeft(secondsLeft(session));
    const t = setInterval(() => setLeft(secondsLeft(session)), 1000);
    return () => clearInterval(t);
  }, [session.id, session.startedAt, session.timerMinutes]);

  useEffect(() => {
    if (session.status === 'active' && left <= 0) finish();
  }, [left, session.status]);

  const pointsForColor = (key, fallback) => session.mode === 'custom' ? customRules.pointsByColor?.[key] ?? fallback : fallback;
  const zoneForRoute = (route) => session.mode === 'custom'
    ? Math.round((customRules.pointsByColor?.[route.key] ?? route.pts) * ((Number(customRules.zonePercent) || 0) / 100))
    : zonePoints(route);
  const maxAttempts = session.mode === 'comp' ? 12 : session.mode === 'custom' ? Number(customRules.maxAttempts) || 99 : 99;

  return <main className="screen active">
    <div className="topbar"><button className="back-btn" onClick={finish}>Beenden</button><div className={`timer-pill ${left <= 60 ? 'crit' : left <= 300 ? 'warn' : ''}`}>{formatTime(left)}</div><span className="pill green">Live</span></div>
    <div className="card"><div className="row"><div><div className="card-title">Deine Punkte</div><div className="stat-num">{me.totalScore || 0}</div></div><div><div className="card-title">Tops</div><div className="stat-num">{me.routesSolved || 0}</div></div><div><div className="card-title">Zones</div><div className="stat-num">{me.zoneCount || 0}</div></div></div></div>

    {session.playType === 'team' && <div className="card"><div className="card-title">Teamwertung</div>{Object.entries(teamScores).sort((a, b) => b[1] - a[1]).map(([team, score]) => <div className="lb-row" key={team}><div className="lb-name">{team}</div><div className="lb-score">{score}</div></div>)}</div>}

    <div className="card"><div className="card-title">Live-Bestenliste</div>{sorted.map((p, i) => <div className="lb-row" key={p.uid}><div className="lb-rank">{rank(i)}</div><Avatar profile={p} className="ice" /><div className="lb-name">{p.name}</div><div className="lb-score">{p.totalScore || 0}</div></div>)}</div>

    <div id="route-list">{COLORS.map((col) => <div key={col.key}>
      <div className="card-title" style={{ marginTop: 12 }}>{col.label} · {col.difficulty} · {pointsForColor(col.key, col.pts)} Pkt</div>
      {ROUTES.map((r, i) => ({ r, i })).filter(({ r }) => r.key === col.key).map(({ r, i }) => {
        const rd = me.routes[i];
        const locked = rd.solved;
        const maxed = countAttempts && rd.attempts >= maxAttempts;
        const status = rd.solved ? 'Top gespeichert' : rd.zone ? `Zone · ${zoneForRoute(r)} Pkt` : 'offen';
        return <div className="route-row" style={{ borderLeftColor: col.hex }} key={r.id}>
          <div className="route-info"><div className="route-name">Route {r.num}</div><div className="route-sub">{countAttempts ? `${rd.attempts} Versuche · ${status}` : status}</div></div>
          <div className="route-actions">
            {countAttempts && <><button className="tiny-btn" disabled={locked || maxed} onClick={() => updateRoute(me.uid, i, 'attempt')}>+</button><span className="mono">{rd.attempts}{session.mode === 'comp' || session.mode === 'custom' ? `/${maxAttempts}` : ''}</span></>}
            <button className={`action-btn ${rd.zone && !rd.solved ? 'active' : ''}`} disabled={locked} onClick={() => updateRoute(me.uid, i, 'zone')}>Zone</button>
            <button className={`action-btn ${rd.solved ? 'active' : ''}`} disabled={locked} onClick={() => updateRoute(me.uid, i, 'top')}>Top</button>
          </div>
        </div>;
      })}
    </div>)}</div>
  </main>;
}
