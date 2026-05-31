import { Bell } from 'lucide-react';
import { useEffect, useRef } from 'react';

function formatWhen(millis) {
  if (!millis) return '';
  const diff = Date.now() - millis;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return new Date(millis).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export default function NotificationBell({ notifications = [], seenAt = 0, currentUid, onMarkSeen, onDismiss, onOpenGroup }) {
  const detailsRef = useRef(null);
  const unreadCount = notifications.filter((item) => item.createdAtMillis > seenAt && item.createdBy !== currentUid).length;
  const recent = notifications.slice(0, 12);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!detailsRef.current?.open) return;
      if (detailsRef.current.contains(event.target)) return;
      detailsRef.current.removeAttribute('open');
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  function toggleOpen() {
    onMarkSeen();
  }

  function openNotification(item) {
    detailsRef.current?.removeAttribute('open');
    onDismiss?.(item.id);
    onOpenGroup(item);
  }

  return (
    <details ref={detailsRef} className="notification-bell" onToggle={(event) => event.currentTarget.open && toggleOpen()}>
      <summary className="notification-trigger" aria-label="Benachrichtigungen">
        <Bell size={21} strokeWidth={2.4} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </summary>
      <div className="notification-panel">
        <div className="notification-head">
          <strong>Neuigkeiten</strong>
          <span>{unreadCount ? `${unreadCount} neu` : 'Aktuell'}</span>
        </div>
        <div className="notification-list">
          {recent.length ? recent.map((item) => (
            <button type="button" className="notification-item" key={item.id} onClick={() => openNotification(item)}>
              <span className="notification-dot" />
              <span>
                <strong>{item.title}</strong>
                <small>{item.subtitle || [item.kind, item.groupName && `in ${item.groupName}`].filter(Boolean).join(' ')}</small>
              </span>
              <em>{formatWhen(item.createdAtMillis)}</em>
            </button>
          )) : <div className="notification-empty">Noch keine Neuigkeiten.</div>}
        </div>
      </div>
    </details>
  );
}
