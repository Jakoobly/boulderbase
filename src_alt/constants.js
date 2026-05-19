export const COLORS = [
  { key: 'yellow', label: 'Gelb', hex: '#f5c842', difficulty: 'leicht', pts: 100, bonus: 0, count: 5 },
  { key: 'green', label: 'Grün', hex: '#22c55e', difficulty: 'einfach', pts: 200, bonus: 0, count: 5 },
  { key: 'white', label: 'Weiß', hex: '#e0deda', difficulty: 'mäßig', pts: 350, bonus: 0, count: 4 },
  { key: 'blue', label: 'Blau', hex: '#3b82f6', difficulty: 'mittelschwer', pts: 550, bonus: 0, count: 4 },
  { key: 'red', label: 'Rot', hex: '#ef4444', difficulty: 'schwer', pts: 800, bonus: 10, count: 2 },
  { key: 'black', label: 'Schwarz', hex: '#1c1c1a', difficulty: 'sehr schwer', pts: 1200, bonus: 20, count: 1 },
];

export const ROUTES = COLORS.flatMap((c) => Array.from({ length: c.count }, (_, i) => ({ ...c, num: i + 1, id: `${c.key}-${i + 1}` })));

export const MODE_RULES = {
  normal: ['Punkte hängen von der Boulderfarbe ab.', 'Flash-Bonus: Top im ersten Versuch gibt +50 Punkte.', 'Gewinner ist, wer am Ende die meisten Punkte hat.'],
  comp: ['Top zählt 25 Punkte.', 'Zone zählt 10 Punkte, solange kein Top erreicht wurde.', 'Flash-Bonus gibt +5 Punkte.'],
  bonus: ['Grundpunkte wie normal.', 'Rote Tops geben +10% Bonus.', 'Schwarze Tops geben +20% Bonus.'],
  team: ['Punkteberechnung wie normal.', 'Teilnehmer werden Team A/B zugeordnet.', 'Das Teamleaderboard addiert Punkte je Team.'],
};

export const AVATAR_COLORS = ['#2D3142', '#3b82f6', '#22c55e', '#ef4444', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b', '#111827', '#B0D7FF', '#f5c842'];
export const AVATAR_ICONS = ['🧗', '🪨', '🔥', '⚡', '🏔️', '💪', '🎯', '⭐', '🟢', '🔵', '🔴', '⚫'];
