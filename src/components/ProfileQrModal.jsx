import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Avatar from './Avatar.jsx';

export default function ProfileQrModal({ user, profile, onClose, onCopy }) {
  const [qrSrc, setQrSrc] = useState('');
  const inviteUrl = `${window.location.origin}/friends?add=${encodeURIComponent(user.uid)}`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(inviteUrl, { width: 260, margin: 2, color: { dark: '#2D3142', light: '#FFFFFF' } })
      .then((src) => { if (!cancelled) setQrSrc(src); });
    return () => { cancelled = true; };
  }, [inviteUrl]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="invite-modal profile-qr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="card-title">Profil QR-Code</div>
            <h2>{profile.name || 'Boulderer'}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="profile-qr-person">
          <Avatar profile={profile} className="ice" />
          <div>
            <strong>{profile.name || 'Boulderer'}</strong>
            <span>{profile.status || 'Zum Hinzufuegen scannen'}</span>
          </div>
        </div>
        <div className="invite-qr-box">
          {qrSrc ? <img src={qrSrc} alt={`QR-Code fuer ${profile.name || 'Profil'}`} /> : <div className="spinner" />}
        </div>
        <div className="invite-link">{inviteUrl}</div>
        <button type="button" className="btn btn-primary" onClick={() => onCopy(inviteUrl)}>Link kopieren</button>
      </div>
    </div>
  );
}
