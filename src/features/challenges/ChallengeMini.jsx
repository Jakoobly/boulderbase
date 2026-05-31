import { safeDate } from '../../utils.js';
import { challengePercent } from './challengeHelpers.js';

export function ChallengeMini({ challenge, onClick }) {
  const percent = challengePercent(challenge);
  return <button type="button" className="challenge-mini challenge-mini-button" onClick={onClick}><div className="challenge-mini-head"><strong>{challenge.title}</strong><span className="mono">{percent}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div><div className="sub">{Number(challenge.totalProgress || 0).toLocaleString('de-DE')} / {Number(challenge.target || 0).toLocaleString('de-DE')} {challenge.unit} · bis {safeDate(challenge.dueDate)}</div></button>;
}
