import { describe, it, expect } from 'vitest';
import {
  rideStep,
  initRideState,
  simulateRide,
  autoPilot,
  type RideStats,
} from './ride';

const base: RideStats = {
  pedalPower: 230,
  maxStamina: 100,
  staminaRegen: 14,
  staminaDrain: 22,
  drag: 0.28,
  weight: 85,
  rollResist: 1.2,
  topSpeed: 13,
  runTime: 45,
  battery: 0,
};

describe('rideStep', () => {
  it('is pure (does not mutate the input state)', () => {
    const s0 = initRideState(base);
    const snapshot = { ...s0 };
    rideStep(s0, base, true);
    expect(s0).toEqual(snapshot);
  });

  it('accelerates when pedalling from rest', () => {
    const s1 = rideStep(initRideState(base), base, true);
    expect(s1.v).toBeGreaterThan(0);
    expect(s1.stamina).toBeLessThan(base.maxStamina);
  });

  it('recovers stamina while coasting', () => {
    let s = initRideState(base);
    s = { ...s, stamina: 50 };
    const after = rideStep(s, base, false);
    expect(after.stamina).toBeGreaterThan(50);
  });

  it('cannot pedal with empty stamina (no battery)', () => {
    const s = { ...initRideState(base), stamina: 0, v: 0 };
    const after = rideStep(s, base, true);
    // No force, only resistance -> speed stays at 0.
    expect(after.v).toBe(0);
  });
});

describe('simulateRide', () => {
  it('is deterministic', () => {
    const a = simulateRide(base);
    const b = simulateRide(base);
    expect(a.metrics.distance).toBe(b.metrics.distance);
  });

  it('produces sensible, finite metrics', () => {
    const { metrics } = simulateRide(base);
    expect(metrics.distance).toBeGreaterThan(0);
    expect(metrics.maxSpeed).toBeGreaterThan(0);
    expect(metrics.avgSpeed).toBeGreaterThan(0);
    expect(Number.isFinite(metrics.peakMomentum)).toBe(true);
  });

  it('runs for the configured runTime', () => {
    const { final } = simulateRide(base);
    expect(final.t).toBeGreaterThanOrEqual(base.runTime - 0.05);
  });

  it('goes further with more pedal power', () => {
    const weak = simulateRide({ ...base, pedalPower: 150 });
    const strong = simulateRide({ ...base, pedalPower: 400 });
    expect(strong.metrics.distance).toBeGreaterThan(weak.metrics.distance);
  });

  it('a battery (assist) increases distance for an idle policy', () => {
    const noBatt = simulateRide(base, autoPilot);
    const withBatt = simulateRide({ ...base, battery: 130 }, autoPilot);
    expect(withBatt.metrics.distance).toBeGreaterThan(noBatt.metrics.distance);
  });

  it('always-pedal manual play beats conservative auto-pilot', () => {
    const auto = simulateRide(base, autoPilot);
    const manual = simulateRide(base, () => true);
    expect(manual.metrics.distance).toBeGreaterThanOrEqual(auto.metrics.distance);
  });
});

describe('metricsFor', () => {
  it('derives momentum from mass and peak speed', () => {
    const { final, metrics } = simulateRide(base);
    expect(metrics.peakMomentum).toBeCloseTo(metrics.mass * final.maxSpeed, 5);
  });
});
