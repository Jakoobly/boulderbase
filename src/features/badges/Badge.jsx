import { useState } from 'react';
import { getFirstGripTooltip } from '../../utils/badges.js';
import { BADGE_CATALOG } from './badgeCatalog.js';
import './badgeEffects.css';

function BadgeTooltip({ tooltip }) {
  return (
    <div className="badge-tooltip" role="tooltip">
      <strong>{tooltip.name} – {tooltip.rarity}</strong>
      <span>{tooltip.achievedCount} Boulder erreicht</span>
      <p>{tooltip.description}</p>
      <em>Fortschritt: {tooltip.progressText}</em>
    </div>
  );
}

export default function Badge({ badgeId, profile, compact = false }) {
  const [open, setOpen] = useState(false);
  const tooltip = getFirstGripTooltip(profile);
  const catalogBadge = BADGE_CATALOG[badgeId];
  const rarityKey = tooltip.current?.key || 'bronze';
  const variant = catalogBadge.variants[rarityKey];
  const locked = !tooltip.current;

  return (
    <button
      type="button"
      className={`badge-token badge-rarity-${rarityKey} ${locked ? 'locked' : ''} ${compact ? 'compact-badge-token' : ''}`}
      onClick={() => setOpen((value) => !value)}
      onBlur={() => setOpen(false)}
      aria-label={`${catalogBadge.name}: ${tooltip.rarity}`}
    >
      <span className="badge-art-wrap">
        <img className="badge-art" src={variant.icon} alt="" />
      </span>
      {!compact && <span className="badge-name">{catalogBadge.name}</span>}
      {!compact && <span className="badge-rarity-label">{locked ? 'Gesperrt' : variant.rarity}</span>}
      <BadgeTooltip tooltip={tooltip} />
      {open && <div className="badge-touch-tooltip"><BadgeTooltip tooltip={tooltip} /></div>}
    </button>
  );
}
