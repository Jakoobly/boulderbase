import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatTime, secondsLeft } from './time.js';

describe('time utils', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats seconds as m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
  });

  it('returns remaining session seconds and never goes below zero', () => {
    vi.setSystemTime(new Date('2026-05-28T10:00:00.000Z'));

    expect(secondsLeft({ startedAt: Date.now() - 30_000, timerMinutes: 1 })).toBe(30);
    expect(secondsLeft({ startedAt: Date.now() - 90_000, timerMinutes: 1 })).toBe(0);
    expect(secondsLeft(null)).toBe(0);
  });
});
