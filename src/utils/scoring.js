import { ROUTES } from '../constants.js';

export function zonePoints(route) {
  return Math.round(route.pts / 3);
}

export function compAttemptMultiplier(attempts) {
  const safeAttempts = Math.min(12, Math.max(1, Number(attempts) || 1));
  return Math.max(0.45, 1 - (safeAttempts - 1) * 0.05);
}

export function routeScore(route, rd, mode) {
  const attempts = Math.max(1, Number(rd.attempts) || 1);
  if (mode === 'comp') {
    const multiplier = compAttemptMultiplier(attempts);
    const topPoints = Math.round(route.pts * multiplier);
    const zoneValue = Math.round(zonePoints(route) * multiplier);
    if (rd.solved) return topPoints;
    if (rd.zone) return Math.max(1, zoneValue);
    return 0;
  }
  if (rd.solved) return route.pts;
  if (rd.zone) return mode === 'bonus' ? zonePoints(route) : Math.round(route.pts * 0.35);
  return 0;
}

export function recalcParticipant(participant, mode) {
  let score = 0;
  let solved = 0;
  let flash = 0;
  let zones = 0;
  ROUTES.forEach((route, index) => {
    const routeData = participant.routes[index];
    if (mode === 'bonus' && routeData.solved && route.bonus) score += Math.round(score * (route.bonus / 100));
    score += routeScore(route, routeData, mode);
    if (routeData.solved) solved += 1;
    if (routeData.zone) zones += 1;
  });
  return { ...participant, totalScore: score, routesSolved: solved, flashCount: flash, zoneCount: zones };
}
