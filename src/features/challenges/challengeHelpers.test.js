import { describe, expect, it } from 'vitest';
import { challengePercent, unitLabel, unitStep } from './challengeHelpers.js';

describe('challenge helpers', () => {
  it('calculates progress percentage with a 100 percent cap', () => {
    expect(challengePercent({ totalProgress: 25, target: 100 })).toBe(25);
    expect(challengePercent({ totalProgress: 150, target: 100 })).toBe(100);
    expect(challengePercent({ totalProgress: 5, target: 0 })).toBe(100);
  });

  it('returns labels and input steps for known units', () => {
    expect(unitLabel('tops')).toBe('Tops');
    expect(unitLabel('meters')).toBe('Meter');
    expect(unitLabel('unknown')).toBe('unknown');
    expect(unitStep('meters')).toBe('0.1');
    expect(unitStep('sessions')).toBe('1');
  });
});
