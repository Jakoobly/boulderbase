import { describe, expect, it } from 'vitest';
import { avatarText, code, emptyRouteState, initials } from './utils.js';

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
});
