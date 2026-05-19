// src/utils/avatar.js
export function initials(name = '?') {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';
}

export function profileSnapshot(user, profile = {}) {
  return {
    uid: user.uid,
    name: profile.name || user.displayName || user.email?.split('@')[0] || 'Boulderer',
    avatarColor: profile.avatarColor || '#2D3142',
    avatarIcon: profile.avatarIcon || '🧗',
    points: profile.points || 0,
    sessions: profile.sessions || 0,
    tops: profile.tops || 0,
    flashes: profile.flashes || 0,
    updatedAtMillis: Date.now(),
  };
}
