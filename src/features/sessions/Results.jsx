import Avatar from '../../components/Avatar.jsx';
import { rank } from '../../utils.js';

export default function Results({ session, back }) {
  const rows = Object.values(session.results || session.participants || {}).sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  return <main className="screen active"><div className="tc" style={{ padding: '26px 0 18px' }}><div style={{ fontSize: 52 }}>🏆</div><div className="logo">Ergebnis</div><div className="tag">Session abgeschlossen</div></div><div className="card" style={{ padding: 0 }}>{rows.map((p, i) => <div className="lb-row" key={p.uid}><div className="lb-rank">{rank(i)}</div><Avatar profile={p} className="ice" /><div className="lb-name">{p.name}</div><div style={{ textAlign: 'right' }}><div className="lb-score">{p.totalScore || 0}</div><div className="sub">{p.routesSolved || 0} Tops · {p.zoneCount || 0} Zones</div></div></div>)}</div><button className="btn btn-primary mt12" onClick={back}>Zurück</button></main>;
}