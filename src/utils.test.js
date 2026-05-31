import { describe, expect, it } from 'vitest';
import { avatarText, code, emptyRouteState, groupPath, groupSlug, initials, routeMatchesGroup } from './utils.js';

describe('general utils', () => {
  it('builds initials from up to two name parts', () => {
    expect(initials('Alex Megos')).toBe('AM');
    expect(initials('  jan  ')).toBe('J');
    expect(initials('')).toBe('?');
  });

  it('uses avatar icon before generated initials', () => {
    expect(avatarText({ avatarIcon: 'X', name: 'Alex Megos' })).toBe('X');
    expect(avatarText({ name: 'Alex Megos' })).toBe('AM');
  });

  it('creates empty route state entries for each route', () => {
    expect(emptyRouteState([{ id: 'a' }, { id: 'b' }])).toEqual([
      { attempts: 0, solved: false, zone: false },
      { attempts: 0, solved: false, zone: false },
    ]);
  });

  it('generates readable codes with the requested length', () => {
    expect(code(4)).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
    expect(code()).toHaveLength(6);
  });

  it('builds stable group slugs from names', () => {
    expect(groupSlug({ name: 'Boulder Crew' })).toBe('boulder-crew');
    expect(groupSlug({ name: 'Käse Öl Überhang Spaß' })).toBe('kaese-oel-ueberhang-spass');
    expect(groupSlug({ name: '  Team #1 / Dienstag!  ' })).toBe('team-1-dienstag');
  });

  it('falls back to group ids or default slugs', () => {
    expect(groupSlug({ id: 'abc123' })).toBe('abc123');
    expect(groupSlug({ name: '---' })).toBe('gruppe');
    expect(groupSlug(null)).toBe('gruppe');
  });

  it('matches group routes by slug or id', () => {
    const group = { id: 'group-id-42', name: 'Boulder Crew' };

    expect(routeMatchesGroup('boulder-crew', group)).toBe(true);
    expect(routeMatchesGroup('group-id-42', group)).toBe(true);
    expect(routeMatchesGroup('andere-gruppe', group)).toBe(false);
  });

  it('builds group paths with optional suffixes', () => {
    const group = { id: 'group-id-42', name: 'Boulder Crew' };

    expect(groupPath(group)).toBe('/groups/boulder-crew');
    expect(groupPath(group, '/challenges')).toBe('/groups/boulder-crew/challenges');
  });
});
