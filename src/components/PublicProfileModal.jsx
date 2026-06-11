import { useEffect, useMemo, useState } from 'react';
import Avatar from './Avatar.jsx';
import ProfileQrModal from './ProfileQrModal.jsx';
import { getUserProfile } from '../services/friendService.js';
import { safeDate } from '../utils.js';

function statValue(profile, key) {
  return Number(profile?.[key] || profile?.stats?.[key] || 0);
}

function historyMeta(match) {
  if (match.mode === 'manual') {
    return [
      match.durationMinutes ? `${match.durationMinutes} Min` : '',
      `${match.tops || 0} Tops`,
      match.zones ? `${match.zones} Zones` : '',
      match.flashes ? `${match.flashes} Flashes` : ''
    ].filter(Boolean).join(' · ');
  }
  return `${match.points || 0} Punkte · ${match.tops || 0} Tops`;
}

export default function PublicProfileModal({ uid, profile, onClose, notify, footer = null }) {
  const [loadedProfile, setLoadedProfile] = useState(profile || null);
  const [loading, setLoading] = useState(Boolean(uid || profile?.uid));
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const targetUid = uid || profile?.uid;
      if (!targetUid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const freshProfile = await getUserProfile(targetUid);
        if (!cancelled) setLoadedProfile({ ...profile, ...freshProfile });
      } catch (e) {
        if (!cancelled) {
          setLoadedProfile(profile || null);
          notify?.(e.message || 'Profil konnte nicht geladen werden');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [uid, profile?.uid]);

  const publicProfile = loadedProfile || profile || {};
  const publicUid = uid || publicProfile.uid;
  const history = useMemo(() => (publicProfile.matchHistory || []).slice(0, 5), [publicProfile.matchHistory]);

  return (
    <div className="modal-backdrop public-profile-backdrop" onClick={onClose}>
      <div className="public-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="card-title">Kletterprofil</div>
            <h2>{publicProfile.name || 'Boulderer'}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>x</button>
        </div>

        <div className="public-profile-head">
          <Avatar profile={publicProfile} className="big ice" />
          <div>
            <strong>{publicProfile.name || 'Boulderer'}</strong>
            <span>{publicProfile.status || publicProfile.description || 'Keine Beschreibung'}</span>
          </div>
        </div>

        {loading ? <div className="empty compact-empty">Profil wird geladen...</div> : <>
          <div className="public-profile-stats">
            <div className="stat-box"><div className="stat-num">{statValue(publicProfile, 'points')}</div><div className="stat-lbl">Punkte</div></div>
            <div className="stat-box"><div className="stat-num">{statValue(publicProfile, 'sessions')}</div><div className="stat-lbl">Sessions</div></div>
            <div className="stat-box"><div className="stat-num">{statValue(publicProfile, 'tops')}</div><div className="stat-lbl">Tops</div></div>
            <div className="stat-box"><div className="stat-num">{statValue(publicProfile, 'flashes')}</div><div className="stat-lbl">Flashes</div></div>
          </div>

          <div className="public-profile-section">
            <div className="card-title">Letzte Matches</div>
            {history.length ? history.map((match) => (
              <div className="public-match-row" key={match.id || `${match.title}-${match.endedAt}`}>
                <strong>{match.title || 'Match'}</strong>
                <span>{safeDate(match.endedAt)} · {match.groupName || 'Ohne Gruppe'} · {historyMeta(match)}</span>
              </div>
            )) : <div className="empty compact-empty">Keine öffentlichen Matches.</div>}
          </div>
        </>}

        <div className="public-profile-actions">
          {publicUid && <button type="button" className="btn btn-secondary compact" onClick={() => setQrOpen(true)}>QR-Code</button>}
          {footer}
        </div>
      </div>
      {qrOpen && <div onClick={(e) => e.stopPropagation()}>
        <ProfileQrModal user={{ uid: publicUid }} profile={publicProfile} onClose={() => setQrOpen(false)} onCopy={(url) => navigator.clipboard?.writeText(url).then(() => { notify?.('Profil-Link kopiert'); setQrOpen(false); })} />
      </div>}
    </div>
  );
}
