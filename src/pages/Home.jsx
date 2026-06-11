import { useState } from 'react';
import { createPortal } from 'react-dom';
import DailyQuoteCard from '../components/DailyQuoteCard.jsx';

const initialTraining = {
  durationMinutes: '',
  tops: '',
  zones: '',
  flashes: '',
  notes: ''
};

export default function Home({ profile, startFree, logTraining }) {
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [training, setTraining] = useState(initialTraining);
  const displayName = profile?.name || 'Gast';

  function updateTraining(field, value) {
    setTraining((current) => ({ ...current, [field]: value }));
  }

  async function submitTraining(e) {
    e.preventDefault();
    await logTraining?.({
      durationMinutes: Number(training.durationMinutes || 0),
      tops: Number(training.tops || 0),
      zones: Number(training.zones || 0),
      flashes: Number(training.flashes || 0),
      notes: training.notes.trim()
    });
    setTraining(initialTraining);
    setTrainingOpen(false);
  }

  const trainingModal = (
    <div className={`modal training-log-modal ${trainingOpen ? 'open' : ''}`} onClick={() => setTrainingOpen(false)}>
      <form className="sheet training-log-sheet" onSubmit={submitTraining} onClick={(e) => e.stopPropagation()}>
        <div className="handle" />
        <div className="card-title">Training loggen</div>
        <h2>Session eintragen</h2>
        <div className="training-log-grid mt16">
          <div>
            <label>Dauer in Minuten</label>
            <input type="number" min="1" inputMode="numeric" value={training.durationMinutes} onChange={(e) => updateTraining('durationMinutes', e.target.value)} placeholder="90" required />
          </div>
          <div>
            <label>Tops</label>
            <input type="number" min="0" inputMode="numeric" value={training.tops} onChange={(e) => updateTraining('tops', e.target.value)} placeholder="8" required />
          </div>
          <div>
            <label>Zones</label>
            <input type="number" min="0" inputMode="numeric" value={training.zones} onChange={(e) => updateTraining('zones', e.target.value)} placeholder="4" />
          </div>
          <div>
            <label>Flashes</label>
            <input type="number" min="0" inputMode="numeric" value={training.flashes} onChange={(e) => updateTraining('flashes', e.target.value)} placeholder="2" />
          </div>
        </div>
        <div className="mt12">
          <label>Notiz</label>
          <textarea value={training.notes} onChange={(e) => updateTraining('notes', e.target.value)} placeholder="Optional" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setTrainingOpen(false)}>Abbrechen</button>
          <button type="submit" className="btn btn-primary">Speichern</button>
        </div>
      </form>
    </div>
  );

  return <>
    <main className="screen active home-feed">
      <div className="topbar">
        <div><div className="home-logo-line"><div className="logo">Boulder<em>Base</em></div><span className="beta-badge">BETA</span></div><div className="tag">Für Boulderer, von Boulderern gemacht.</div></div>
      </div>

      <DailyQuoteCard />

      <section className="feed-card hero-feed-card">
        <div className="tag">Willkommen zurück</div>
        <h2>{displayName}</h2>
        <p>Bereit für deine nächste Bouldersession?</p>
        <div className="soft-actions">
          <button className="btn btn-primary compact" onClick={startFree}>Freie Runde</button>
          <button className="btn btn-secondary compact" onClick={() => setTrainingOpen(true)}>Training loggen</button>
        </div>
      </section>
    </main>
    {createPortal(trainingModal, document.body)}
  </>;
}
