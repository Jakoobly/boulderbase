import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function InviteModal({ group, inviteUrl, onClose, onCopy }) {
  const [qrSrc, setQrSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(inviteUrl, { width: 260, margin: 2, color: { dark: '#2D3142', light: '#FFFFFF' } })
      .then((src) => { if (!cancelled) setQrSrc(src); });
    return () => { cancelled = true; };
  }, [inviteUrl]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="invite-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="card-title">Einladen</div>
            <h2>{group.name}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="invite-qr-box">
          {qrSrc ? <img src={qrSrc} alt={`QR-Code fuer ${group.name}`} /> : <div className="spinner" />}
        </div>
        <div className="invite-link">{inviteUrl}</div>
        <button type="button" className="btn btn-primary" onClick={onCopy}>Link kopieren</button>
      </div>
    </div>
  );
}
