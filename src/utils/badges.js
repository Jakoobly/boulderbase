export const FIRST_GRIP_BADGE_ID = 'first_grip';

export const FIRST_GRIP_RARITIES = [
  {
    key: 'bronze',
    label: 'Bronze',
    rarity: 'Gewöhnlich',
    threshold: 10,
    effectLevel: 1,
    description: 'Deine ersten Griffe sitzen. Der Anfang ist gemacht.',
  },
  {
    key: 'silver',
    label: 'Silber',
    rarity: 'Selten',
    threshold: 50,
    effectLevel: 2,
    description: 'Deine ersten echten Fortschritte an der Wand.',
  },
  {
    key: 'gold',
    label: 'Gold',
    rarity: 'Episch',
    threshold: 100,
    effectLevel: 3,
    description: 'Du hast dir einen festen Platz an der Wand erarbeitet.',
  },
  {
    key: 'blue',
    label: 'Legendär',
    rarity: 'Legendär',
    threshold: 500,
    effectLevel: 4,
    description: 'Selten, stark, verdient. First Grip auf Maximum.',
  },
];

export function getFirstGripProgress(profile = {}) {
  const historyTops = (profile.matchHistory || []).reduce((sum, match) => sum + Number(match?.tops || 0), 0);
  return Math.max(
    Number(profile.tops || 0),
    Number(profile.boulderCount || 0),
    Number(profile.badges?.[FIRST_GRIP_BADGE_ID]?.achievedCount || 0),
    historyTops,
  );
}

export function evaluateFirstGripBadge(boulderCount = 0) {
  const count = Number(boulderCount || 0);
  return [...FIRST_GRIP_RARITIES].reverse().find((variant) => count >= variant.threshold) || null;
}

export function getNextFirstGripRarity(boulderCount = 0) {
  const count = Number(boulderCount || 0);
  return FIRST_GRIP_RARITIES.find((variant) => count < variant.threshold) || null;
}

export function buildFirstGripBadge(profile = {}, now = Date.now()) {
  const achievedCount = getFirstGripProgress(profile);
  const unlocked = evaluateFirstGripBadge(achievedCount);
  if (!unlocked) return null;
  const previous = profile.badges?.[FIRST_GRIP_BADGE_ID] || {};
  return {
    id: FIRST_GRIP_BADGE_ID,
    rarity: unlocked.key,
    achievedCount,
    threshold: unlocked.threshold,
    earnedAtMillis: previous.earnedAtMillis || now,
    upgradedAtMillis: previous.rarity === unlocked.key ? previous.upgradedAtMillis || previous.earnedAtMillis || now : now,
  };
}

export function buildBadgesForProfile(profile = {}, now = Date.now()) {
  const firstGrip = buildFirstGripBadge(profile, now);
  if (!firstGrip) return profile.badges || {};
  return {
    ...(profile.badges || {}),
    [FIRST_GRIP_BADGE_ID]: firstGrip,
  };
}

export function getFirstGripTooltip(profile = {}) {
  const count = getFirstGripProgress(profile);
  const current = evaluateFirstGripBadge(count);
  const next = getNextFirstGripRarity(count);
  const variant = current || FIRST_GRIP_RARITIES[0];
  const progressText = next
    ? `${count} / ${next.threshold} Boulder bis ${next.label}`
    : 'Maximale Seltenheit erreicht';

  return {
    name: 'First Grip',
    rarity: current ? variant.label : 'Gesperrt',
    rarityLabel: current ? variant.rarity : 'Noch nicht freigeschaltet',
    achievedCount: count,
    description: current ? variant.description : 'Schließe deine ersten Boulder ab, um diese Badge freizuschalten.',
    progressText,
    current,
    next,
  };
}

export function getBadgeAwardMessage(previousProfile = {}, nextProfile = {}) {
  const previousRarity = previousProfile.badges?.[FIRST_GRIP_BADGE_ID]?.rarity || evaluateFirstGripBadge(getFirstGripProgress(previousProfile))?.key || null;
  const nextRarity = nextProfile.badges?.[FIRST_GRIP_BADGE_ID]?.rarity || evaluateFirstGripBadge(getFirstGripProgress(nextProfile))?.key || null;
  if (!nextRarity || previousRarity === nextRarity) return '';
  const variant = FIRST_GRIP_RARITIES.find((item) => item.key === nextRarity);
  return `Neue Badge freigeschaltet: First Grip – ${variant?.label || nextRarity}`;
}
