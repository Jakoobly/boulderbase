export const COLORS = [
  { key: 'yellow', label: 'Gelb', hex: '#f5c842', difficulty: 'leicht', pts: 100, bonus: 0, count: 5 },
  { key: 'green', label: 'Grün', hex: '#22c55e', difficulty: 'einfach', pts: 200, bonus: 0, count: 5 },
  { key: 'white', label: 'Weiß', hex: '#e0deda', difficulty: 'mäßig', pts: 350, bonus: 0, count: 4 },
  { key: 'blue', label: 'Blau', hex: '#3b82f6', difficulty: 'mittelschwer', pts: 550, bonus: 0, count: 4 },
  { key: 'red', label: 'Rot', hex: '#ef4444', difficulty: 'schwer', pts: 800, bonus: 10, count: 2 },
  { key: 'black', label: 'Schwarz', hex: '#1c1c1a', difficulty: 'sehr schwer', pts: 1200, bonus: 20, count: 1 },
];

export const ROUTES = COLORS.flatMap((c) => Array.from({ length: c.count }, (_, i) => ({ ...c, num: i + 1, id: `${c.key}-${i + 1}` })));

export const SESSION_MODES = [
  { value: 'normal', label: 'Normal' },
  { value: 'comp', label: 'Comp' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'custom', label: 'Personalisiert' },
];

export const PLAY_TYPES = [
  { value: 'ffa', label: 'Solo' },
  { value: 'team', label: 'Team' },
];

export const DEFAULT_CUSTOM_RULES = {
  countAttempts: true,
  maxAttempts: 12,
  attemptPenaltyPercent: 5,
  zonePercent: 35,
  pointsByColor: Object.fromEntries(COLORS.map((c) => [c.key, c.pts])),
  bonusByColor: Object.fromEntries(COLORS.map((c) => [c.key, c.bonus || 0])),
};

export const MODE_RULES = {
  normal: ['Punkte hängen von der Boulderfarbe ab.', 'Es gibt keinen Flashbonus.', 'Gewinner ist, wer am Ende die meisten Punkte hat.'],
  comp: ['Punkte hängen von der Boulderfarbe ab: schwere Boulder geben mehr Punkte.', 'Es gibt keinen Flashbonus.', 'Maximal 12 Versuche pro Boulder; jeder weitere Versuch reduziert Top- und Zone-Punkte um 5%.', 'Zone zählt ungefähr ein Drittel des Top-Werts und wird vom Top überschrieben.'],
  bonus: ['Keine Versuchszählung.', 'Gelb 100, Grün 200, Weiß 350, Blau 550, Rot 800, Schwarz 1200 Punkte.', 'Zones geben ungefähr ein Drittel der Top-Punkte.', 'Rote Tops geben +10% auf die bisher gesammelten Punkte, schwarze Tops +20%.'],
  custom: ['Du legst Solo oder Team, Punkte pro Farbe, Zone-Wertung, Versuche und Bonuswerte selbst fest.'],
  team: ['Punkteberechnung wie normal, ohne Flashbonus.', 'Teilnehmer werden Team A/B zugeordnet.', 'Das Teamleaderboard addiert Punkte je Team.'],
};

export const AVATAR_COLORS = ['#2D3142', '#3b82f6', '#22c55e', '#ef4444', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b', '#111827', '#B0D7FF', '#f5c842'];
export const AVATAR_ICONS = ['🧗', '🪨', '🔥', '⚡', '🏔️', '💪', '🎯', '⭐', '🟢', '🔵', '🔴', '⚫'];
