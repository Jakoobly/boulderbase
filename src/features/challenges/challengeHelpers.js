export const CHALLENGE_UNITS = [
  { value: 'min', label: 'Minuten', integer: true },
  { value: 'count', label: 'Anzahl', integer: true },
  { value: 'points', label: 'Punkte', integer: true },
  { value: 'tops', label: 'Tops', integer: true },
  { value: 'zones', label: 'Zones', integer: true },
  { value: 'sessions', label: 'Sessions', integer: true },
  { value: 'meters', label: 'Meter', integer: false },
];

export function challengePercent(challenge) {
  const total = Number(challenge.totalProgress || 0);
  const target = Math.max(1, Number(challenge.target || 1));
  return Math.min(100, Math.round((total / target) * 100));
}

export function unitLabel(unit) { return CHALLENGE_UNITS.find((u) => u.value === unit)?.label || unit; }

export function unitStep(unit) { return CHALLENGE_UNITS.find((u) => u.value === unit)?.integer === false ? '0.1' : '1'; }
