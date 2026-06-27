import { describe, it, expect } from 'vitest';
import {
  rideStep,
  initRideState,
  simulateRide,
  isFinished,
  autoPilot,
  type RideStats,
} from './ride';

const base: RideStats = {
  walkPower: 150,
  runPower: 180,
  maxStamina: 100,
  staminaRefill: 9,
  runDrain: 14,
  maxReserve: 220,
  energyBurn: 5,
  drag: 0.05,
  weight: 75,
  rollResist: 0.7,
  topSpeed: 12,
  assist: 0,
  weatherResist: 0,
};

describe('rideStep', () => {
  it('is pure (does not mutate the input state)', () => {
    const s0 = initRideState(base);
    const snap = { ...s0 };
    rideStep(s0, base, true);
    expect(s0).toEqual(snap);
  });

  it('moves forward from rest even without exerting (walking)', () => {
    const s1 = rideStep(initRideState(base), base, false);
    expect(s1.v).toBeGreaterThan(0);
    expect(s1.reserve).toBeLessThan(base.maxReserve); // walking costs energy
  });

  it('exerting spends stamina', () => {
    const s1 = rideStep(initRideState(base), base, true);
    expect(s1.stamina).toBeLessThan(base.maxStamina);
  });

  it('easing off refills stamina from the reserve', () => {
    const low = { ...initRideState(base), stamina: 40 };
    const after = rideStep(low, base, false);
    expect(after.stamina).toBeGreaterThan(40);
  });

  it('freshness decays while holding and recovers while resting', () => {
    let s = initRideState(base);
    for (let i = 0; i < 60; i++) s = rideStep(s, base, true); // ~1s holding
    expect(s.freshness).toBeLessThan(1);
    const held = s.freshness;
    for (let i = 0; i < 60; i++) s = rideStep(s, base, false); // ~1s resting
    expect(s.freshness).toBeGreaterThan(held);
  });
});

describe('simulateRide', () => {
  it('is deterministic', () => {
    expect(simulateRide(base).metrics.distance).toBe(simulateRide(base).metrics.distance);
  });

  it('ends by energy exhaustion (finished + stopped)', () => {
    const { final } = simulateRide(base);
    expect(isFinished(final)).toBe(true);
    expect(final.reserve).toBeLessThanOrEqual(0.5);
  });

  it('produces sensible physics metrics', () => {
    const { metrics } = simulateRide(base);
    expect(metrics.distance).toBeGreaterThan(0);
    expect(metrics.maxSpeed).toBeGreaterThan(0);
    expect(metrics.peakKE).toBeCloseTo(0.5 * metrics.mass * metrics.maxSpeed ** 2, 3);
    expect(metrics.peakMomentum).toBeCloseTo(metrics.mass * metrics.maxSpeed, 5);
  });

  it('a bigger energy reserve yields a longer run', () => {
    const small = simulateRide({ ...base, maxReserve: 150 });
    const big = simulateRide({ ...base, maxReserve: 400 });
    expect(big.final.t).toBeGreaterThan(small.final.t);
    expect(big.metrics.distance).toBeGreaterThan(small.metrics.distance);
  });

  it('more running power means more distance', () => {
    const weak = simulateRide({ ...base, runPower: 80 });
    const strong = simulateRide({ ...base, runPower: 320 });
    expect(strong.metrics.distance).toBeGreaterThan(weak.metrics.distance);
  });

  it('assist (exosuit) helps an idle policy go further', () => {
    const none = simulateRide(base, autoPilot);
    const suited = simulateRide({ ...base, assist: 70 }, autoPilot);
    expect(suited.metrics.distance).toBeGreaterThan(none.metrics.distance);
  });

  it('terminates within the safety cap', () => {
    const { final } = simulateRide({ ...base, maxReserve: 100000 });
    expect(final.t).toBeLessThanOrEqual(150 + 0.001);
  });
});
