// src/data/dailyQuotes.js
// Hier kannst du Quotes sehr einfach hinzufügen/löschen.
// Wichtig: id eindeutig lassen. Text kurz halten, damit es auf Mobile gut aussieht.

export const BOULDER_QUOTES = [
  { id: 1, text: 'Jeder Top beginnt mit einem ersten Griff.', author: 'BoulderBase' },
  { id: 2, text: 'Heute zählt nicht die Farbe, sondern der Versuch.', author: 'BoulderBase' },
  { id: 3, text: 'Fallen ist Feedback.', author: 'BoulderBase' },
  { id: 4, text: 'Grip, Fokus, Atmen — und nochmal.', author: 'BoulderBase' },
  { id: 5, text: 'Wer sauber steht, muss weniger ziehen.', author: 'BoulderBase' },
  { id: 6, text: 'Ein Move nach dem anderen.', author: 'BoulderBase' },
  { id: 7, text: 'Heute nicht stärker, sondern schlauer klettern.', author: 'BoulderBase' },
  { id: 8, text: 'Der beste Beta ist der, der für dich funktioniert.', author: 'BoulderBase' },
  { id: 9, text: 'Nicht jeder Versuch toppt — jeder Versuch lehrt.', author: 'BoulderBase' },
  { id: 10, text: 'Chalk an die Hände, Ruhe in den Kopf.', author: 'BoulderBase' },
  { id: 11, text: 'Kleine Fortschritte sind auch Höhenmeter.', author: 'BoulderBase' },
  { id: 12, text: 'Wenn der Fuß hält, hält der Kopf länger durch.', author: 'BoulderBase' },
  { id: 13, text: 'Projektieren heißt: dranbleiben mit Plan.', author: 'BoulderBase' },
  { id: 14, text: 'Ein guter Versuch ist besser als kein Versuch.', author: 'BoulderBase' },
  { id: 15, text: 'Mehr Technik, weniger Gewalt.', author: 'BoulderBase' },
];

function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / 86400000);
}

export function getDailyQuote(date = new Date()) {
  if (!BOULDER_QUOTES.length) return null;
  return BOULDER_QUOTES[dayOfYear(date) % BOULDER_QUOTES.length];
}
