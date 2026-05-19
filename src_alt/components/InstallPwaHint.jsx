// src/components/InstallPwaHint.jsx
import { useEffect, useState } from 'react';

export default function InstallPwaHint() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [dismissed, setDismissed] = useState(localStorage.getItem('bb-pwa-dismissed') === '1');

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!promptEvent || dismissed) return null;

  async function install() {
    promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  function dismiss() {
    localStorage.setItem('bb-pwa-dismissed', '1');
    setDismissed(true);
  }

  return (
    <section className="notice pwa-hint">
      <strong>BoulderBase installieren?</strong><br />
      Du kannst die Webapp wie eine App auf den Homescreen legen.
      <div className="mini-actions">
        <button className="back-btn" onClick={install}>Installieren</button>
        <button className="back-btn" onClick={dismiss}>Später</button>
      </div>
    </section>
  );
}
