export function code(n = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
export function initials(name = '?') {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || '?';
}
export function rank(i) { return i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`; }
export function avatarText(profile) { return profile?.avatarIcon || initials(profile?.name); }
export function emptyRouteState(routes) { return routes.map(() => ({ attempts: 0, solved: false, zone: false })); }
export function safeDate(ts) { return ts ? new Date(ts).toLocaleDateString('de-DE') : 'ohne Datum'; }

export function groupSlug(group) {
  const source = group?.name || group?.id || 'gruppe';
  return String(source)
    .trim()
    .toLowerCase()
    .replace(/\u00e4/g, 'ae')
    .replace(/\u00f6/g, 'oe')
    .replace(/\u00fc/g, 'ue')
    .replace(/\u00df/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'gruppe';
}

export function routeMatchesGroup(routeValue, group) {
  return routeValue === group?.id || routeValue === groupSlug(group);
}

export function groupPath(group, suffix = '') {
  return `/groups/${groupSlug(group)}${suffix}`;
}
