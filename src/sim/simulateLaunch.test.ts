import { describe, it, expect } from 'vitest';
import { simulateLaunch, type LaunchStats } from './simulateLaunch';

const base: LaunchStats = { launchPower: 40, weight: 8, drag: 0.9 };

describe('simulateLaunch', () => {
  it('is pure and deterministic', () => {
    const a = simulateLaunch(base);
    const b = simulateLaunch(base);
    expect(a.distance).toBe(b.distance);
    expect(a.trajectory.length).toBe(b.trajectory.length);
  });

  it('returns a trajectory that starts at the origin on the ground', () => {
    const { trajectory } = simulateLaunch(base);
    expect(trajectory.length).toBeGreaterThan(1);
    expect(trajectory[0]).toEqual({ x: 0, y: 0 });
  });

  it('produces a positive finite distance', () => {
    const { distance } = simulateLaunch(base);
    expect(distance).toBeGreaterThan(0);
    expect(Number.isFinite(distance)).toBe(true);
  });

  it('goes further with more launch power', () => {
    const weak = simulateLaunch({ ...base, launchPower: 30 });
    const strong = simulateLaunch({ ...base, launchPower: 80 });
    expect(strong.distance).toBeGreaterThan(weak.distance);
  });

  it('goes further with less drag', () => {
    const draggy = simulateLaunch({ ...base, drag: 1.5 });
    const slick = simulateLaunch({ ...base, drag: 0.2 });
    expect(slick.distance).toBeGreaterThan(draggy.distance);
  });

  it('comes to rest on the ground (final point at y=0)', () => {
    const { trajectory } = simulateLaunch(base);
    expect(trajectory[trajectory.length - 1].y).toBeCloseTo(0, 5);
  });
});
