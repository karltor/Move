import { describe, it, expect, vi } from 'vitest';
import { RunEngine, type RunEndInfo } from './engine';
import type { RideStats } from '../sim/ride';

const base: RideStats = {
  walkPower: 150,
  runPower: 180,
  maxStamina: 100,
  staminaRefill: 9,
  runDrain: 14,
  maxReserve: 200,
  energyBurn: 7,
  drag: 0.05,
  weight: 75,
  rollResist: 0.7,
  topSpeed: 12,
  assist: 0,
  weatherResist: 0,
};

function makeEngine() {
  const ends: RunEndInfo[] = [];
  const engine = new RunEngine({
    getBaseStats: () => ({ ...base }),
    onRunEnd: (info) => ends.push(info),
    rng: () => 0, // always rolls the first weather (clear skies — no mods)
    autoTick: false,
  });
  const t0 = performance.now();
  return { engine, ends, t0 };
}

describe('RunEngine', () => {
  it('runs a manual run to exhaustion through collapse and back to idle', () => {
    const { engine, ends, t0 } = makeEngine();
    expect(engine.peek().phase).toBe('idle');

    engine.startRun();
    expect(engine.peek().phase).toBe('running');

    engine.tick(t0 + 500);
    expect(engine.peek().ride!.t).toBeGreaterThan(0.4);

    engine.tick(t0 + 300_000); // one huge tick: the backlog is caught up in a burst
    expect(engine.peek().phase).toBe('idle');
    expect(ends).toHaveLength(1);
    expect(ends[0].reason).toBe('exhausted');
    expect(ends[0].auto).toBe(false);
    expect(ends[0].metrics.distance).toBeGreaterThan(0);
    expect(ends[0].weather.id).toBe('clear');
  });

  it('does not bank idle wall-time into the next run', () => {
    const { engine, t0 } = makeEngine();
    engine.tick(t0 + 60_000); // a minute passes while idle
    engine.startRun();
    engine.tick(t0 + 60_100);
    expect(engine.peek().ride!.t).toBeLessThan(1); // only the 100ms counted
  });

  it('give-up ends the run immediately with reason "stopped" and no collapse', () => {
    const { engine, ends, t0 } = makeEngine();
    engine.startRun();
    engine.tick(t0 + 3000);
    engine.giveUp();
    expect(engine.peek().phase).toBe('idle');
    expect(ends).toHaveLength(1);
    expect(ends[0].reason).toBe('stopped');
    expect(ends[0].metrics.duration).toBeGreaterThan(2);
  });

  it('tracks the active (held) fraction of a run', () => {
    const { engine, ends, t0 } = makeEngine();
    engine.startRun();
    engine.setHeld(true);
    engine.tick(t0 + 300_000);
    expect(ends[0].activeFrac).toBeCloseTo(1, 5);
  });

  it('auto-run loops runs back-to-back, including across a hidden-tab catch-up', () => {
    const { engine, ends, t0 } = makeEngine();
    engine.setAutoRun(true);
    expect(engine.peek().phase).toBe('running');
    engine.tick(t0 + 600_000); // 10 "hidden" minutes
    expect(ends.length).toBeGreaterThanOrEqual(3);
    expect(ends.every((e) => e.auto)).toBe(true);
    // the cycle keeps going: another completed run shortly after
    const runsSoFar = ends.length;
    engine.tick(t0 + 700_000);
    expect(ends.length).toBeGreaterThan(runsSoFar);
  });

  it('turning auto-run off during the between-runs gap cancels the restart', () => {
    const { engine, ends, t0 } = makeEngine();
    engine.setAutoRun(true);
    let now = t0;
    while (ends.length === 0) {
      now += 100;
      engine.tick(now);
      expect(now - t0).toBeLessThan(600_000);
    }
    expect(engine.peek().phase).toBe('idle'); // in the restart gap
    engine.setAutoRun(false);
    engine.tick(now + 30_000);
    expect(engine.peek().phase).toBe('idle');
    expect(ends).toHaveLength(1);
  });

  it('notifies subscribers on phase changes', () => {
    const { engine, t0 } = makeEngine();
    const listener = vi.fn();
    engine.subscribe(listener);
    engine.startRun();
    expect(listener).toHaveBeenCalled();
    const snap = engine.getSnapshot();
    expect(snap.phase).toBe('running');
    engine.tick(t0 + 300_000);
    expect(engine.getSnapshot().phase).toBe('idle');
    expect(engine.getSnapshot().lastEnd).toBe('exhausted');
  });
});
