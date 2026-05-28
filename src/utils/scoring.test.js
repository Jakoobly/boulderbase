import { describe, expect, it } from 'vitest';
import { DEFAULT_CUSTOM_RULES, ROUTES } from '../constants.js';
import { compAttemptMultiplier, recalcParticipant, routeScore, zonePoints } from './scoring.js';
import { emptyRouteState } from '../utils.js';

const yellowRoute = ROUTES.find((route) => route.key === 'yellow');
const redRoute = ROUTES.find((route) => route.key === 'red');

describe('scoring', () => {
  it('calculates zone points as one third of the route value', () => {
    expect(zonePoints(yellowRoute)).toBe(33);
    expect(zonePoints(redRoute)).toBe(267);
  });

  it('caps comp attempt multiplier between first attempt and twelve attempts', () => {
    expect(compAttemptMultiplier(1)).toBe(1);
    expect(compAttemptMultiplier(3)).toBe(0.9);
    expect(compAttemptMultiplier(99)).toBe(0.45);
    expect(compAttemptMultiplier(0)).toBe(1);
  });

  it('scores normal tops and zones from route difficulty', () => {
    expect(routeScore(yellowRoute, { attempts: 1, solved: true, zone: false }, 'normal')).toBe(100);
    expect(routeScore(yellowRoute, { attempts: 1, solved: false, zone: true }, 'normal')).toBe(35);
    expect(routeScore(yellowRoute, { attempts: 0, solved: false, zone: false }, 'normal')).toBe(0);
  });

  it('applies custom point values, zone percentage and attempt penalties', () => {
    const rules = {
      ...DEFAULT_CUSTOM_RULES,
      pointsByColor: { ...DEFAULT_CUSTOM_RULES.pointsByColor, yellow: 1000 },
      zonePercent: 50,
      attemptPenaltyPercent: 10,
    };

    expect(routeScore(yellowRoute, { attempts: 3, solved: true, zone: false }, 'custom', rules)).toBe(800);
    expect(routeScore(yellowRoute, { attempts: 3, solved: false, zone: true }, 'custom', rules)).toBe(400);
  });

  it('recalculates participant totals from route state', () => {
    const routes = emptyRouteState(ROUTES);
    routes[0] = { attempts: 1, solved: true, zone: false };
    routes[5] = { attempts: 2, solved: false, zone: true };

    const participant = recalcParticipant({ uid: 'u1', routes }, 'normal');

    expect(participant.totalScore).toBe(170);
    expect(participant.routesSolved).toBe(1);
    expect(participant.zoneCount).toBe(1);
  });
});
