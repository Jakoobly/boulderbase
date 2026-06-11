import { describe, expect, it } from 'vitest';
import { buildBadgesForProfile, evaluateFirstGripBadge, FIRST_GRIP_BADGE_ID, getBadgeAwardMessage, getFirstGripTooltip } from './badges.js';

describe('First Grip badges', () => {
  it.each([
    [9, null],
    [10, 'bronze'],
    [49, 'bronze'],
    [50, 'silver'],
    [100, 'gold'],
    [500, 'blue'],
  ])('maps %i boulders to %s', (count, expected) => {
    expect(evaluateFirstGripBadge(count)?.key || null).toBe(expected);
  });

  it('shows progress to the next rarity in the tooltip', () => {
    const tooltip = getFirstGripTooltip({ tops: 50 });
    expect(tooltip.name).toBe('First Grip');
    expect(tooltip.rarity).toBe('Silber');
    expect(tooltip.achievedCount).toBe(50);
    expect(tooltip.progressText).toBe('50 / 100 Boulder bis Gold');
  });

  it('shows max rarity text for legendary', () => {
    expect(getFirstGripTooltip({ tops: 500 }).progressText).toBe('Maximale Seltenheit erreicht');
  });

  it('uses match history tops for existing profiles with stale totals', () => {
    const tooltip = getFirstGripTooltip({ tops: 0, matchHistory: [{ tops: 6 }, { tops: 5 }] });
    expect(tooltip.rarity).toBe('Bronze');
    expect(tooltip.achievedCount).toBe(11);
  });

  it('stores the highest unlocked rarity only once', () => {
    const badges = buildBadgesForProfile({ tops: 49 }, 1000);
    const upgraded = buildBadgesForProfile({ tops: 50, badges }, 2000);
    const repeated = buildBadgesForProfile({ tops: 51, badges: upgraded }, 3000);

    expect(badges[FIRST_GRIP_BADGE_ID].rarity).toBe('bronze');
    expect(upgraded[FIRST_GRIP_BADGE_ID].rarity).toBe('silver');
    expect(repeated[FIRST_GRIP_BADGE_ID].rarity).toBe('silver');
    expect(repeated[FIRST_GRIP_BADGE_ID].upgradedAtMillis).toBe(2000);
  });

  it('only announces an unlock when the rarity changes', () => {
    const previous = { tops: 49, badges: buildBadgesForProfile({ tops: 49 }, 1000) };
    const next = { tops: 50, badges: buildBadgesForProfile({ tops: 50, badges: previous.badges }, 2000) };
    const repeated = { tops: 51, badges: buildBadgesForProfile({ tops: 51, badges: next.badges }, 3000) };

    expect(getBadgeAwardMessage(previous, next)).toBe('Neue Badge freigeschaltet: First Grip – Silber');
    expect(getBadgeAwardMessage(next, repeated)).toBe('');
  });
});
