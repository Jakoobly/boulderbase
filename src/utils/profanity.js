// Einfache lokale Blacklist gegen Schimpfwörter im Chat.
// Du kannst die Liste jederzeit erweitern. Groß-/Kleinschreibung wird ignoriert.
export const BAD_WORDS = [
  'arsch', 'arschloch', 'idiot', 'trottel', 'depp', 'dummkopf',
  'scheiße', 'scheisse', 'shit', 'fuck', 'fick', 'hurensohn',
  'bastard', 'wichser', 'fotze', 'spast', 'mongo'
];

function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[4@]/g, 'a')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[0]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't');
}

export function findBadWord(text = '') {
  const normalized = normalizeText(text);
  return BAD_WORDS.find((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-zäöüß])${escaped}([^a-zäöüß]|$)`, 'i').test(normalized);
  }) || null;
}

export function containsBadWord(text = '') {
  return Boolean(findBadWord(text));
}
