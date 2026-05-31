import { useState } from 'react';

const BETA_CODE = '0000';

export default function BetaGate({ onUnlock }) {
  const [betaCode, setBetaCode] = useState('');
  const [error, setError] = useState('');

  function submitCode(event) {
    event.preventDefault();
    if (betaCode.trim() !== BETA_CODE) {
      setError('Beta-Code ist nicht korrekt.');
      return;
    }
    localStorage.setItem('bb-beta-access', 'true');
    onUnlock();
  }

  return (
    <main className="screen active beta-gate" id="screen-beta">
      <div className="beta-gate-header">
        <div className="logo">Boulder<em>Base</em></div>
        <div className="tag">Beta Zugang</div>
      </div>

      <form className="card beta-gate-card" onSubmit={submitCode}>
        <label htmlFor="beta-code">Beta-Code</label>
        <input
          id="beta-code"
          value={betaCode}
          onChange={(event) => {
            setBetaCode(event.target.value);
            setError('');
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="Code eingeben"
        />
        {error && <div className="error-box">{error}</div>}
        <button className="btn btn-primary" type="submit">Weiter</button>
      </form>
    </main>
  );
}
