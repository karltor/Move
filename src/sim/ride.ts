import type { StatKey } from '../data/types';
import type { RunMetrics } from '../data/currencies';
import { CONFIG } from '../config';

// ---------------------------------------------------------------------------
// PURE LOCOMOTION SIMULATION
// ---------------------------------------------------------------------------
// A run is bounded by ENERGY, not a timer. Two pools model real physiology:
//   • reserve  — total energy for the run. Only ever depletes (resets each
//                run). Locomotion burns it; when it's empty you can't move and
//                coast to a stop, which ENDS the run.
//   • stamina  — a fast burst pool. Exerting (holding) spends it for extra
//                force; easing off refills it FROM the reserve. This is the
//                "active spend / active refill" loop — pace it well to go far.
//
// `rideStep` is a PURE function of (state, stats, exert, dt): no rendering, no
// globals, no randomness. The real-time canvas, the idle auto-pilot, offline
// catch-up and the unit tests all share it. Every future object (the bicycle,
// and one day relativistic regimes) reuses the same physics.
// ---------------------------------------------------------------------------

export type RideStats = Record<StatKey, number>;

export interface RideState {
  t: number; // elapsed seconds
  x: number; // distance travelled
  v: number; // speed (m/s)
  stamina: number; // fast burst pool
  reserve: number; // total energy left this run
  freshness: number; // 0..1 skill factor: decays while held, recovers when eased off
  maxSpeed: number; // peak speed reached
}

export const DT = CONFIG.sim.dt;
export const STOP_SPEED = CONFIG.sim.stopSpeed;
const MAX_SECONDS = CONFIG.sim.maxRunSeconds;
const RUN_BURN_MULT = CONFIG.sim.runBurnMult;

export function initRideState(stats: RideStats): RideState {
  return {
    t: 0,
    x: 0,
    v: 0,
    stamina: stats.maxStamina,
    reserve: stats.maxReserve,
    freshness: 1,
    maxSpeed: 0,
  };
}

/** True once the object is out of energy — the run ends promptly (it then
 *  collapses on screen) rather than coasting to a slow halt. */
export function isFinished(state: RideState): boolean {
  return (state.reserve <= 0 && state.t > 0.1) || state.t >= MAX_SECONDS;
}

/** Advance one step. Pure: returns a new state, never mutates the input. */
export function rideStep(
  state: RideState,
  stats: RideStats,
  exert: boolean,
  dt: number = DT,
): RideState {
  const mass = Math.max(20, stats.weight);
  const top = Math.max(1, stats.topSpeed);
  const speedFactor = Math.max(0, 1 - state.v / top); // force fades near top

  let reserve = state.reserve;
  let stamina = state.stamina;
  let freshness = state.freshness;
  let force = 0;

  // Base locomotion (walking) — always on while there's energy, no stamina.
  if (reserve > 0) {
    force += stats.walkPower * speedFactor;
    reserve -= stats.energyBurn * dt;
  }

  // SKILL — "freshness": holding continuously makes each stride less effective;
  // easing off recovers it. So rhythmic pulsing beats mashing the button.
  const fresh = state.freshness;
  const freshFactor = CONFIG.sim.freshFloor + (1 - CONFIG.sim.freshFloor) * fresh;

  let exerting = false;
  if (exert && stamina > 0 && reserve > 0) {
    // Run force scaled by freshness — fresh legs push much harder.
    force += stats.runPower * speedFactor * freshFactor;
    stamina -= stats.runDrain * dt;
    reserve -= stats.energyBurn * (RUN_BURN_MULT - 1) * dt;
    freshness -= CONFIG.sim.freshDecayPerSec * dt;
    exerting = true;
  } else if (exert && reserve > 0 && stamina <= 0) {
    // Redlining: holding with an empty burst pool just wastes energy (gasping).
    reserve -= stats.energyBurn * (CONFIG.sim.overexertBurnMult - 1) * dt;
  }

  // Assist (e.g. the Exosuit speciality): externally-powered passive force —
  // it costs no body energy, so it helps even idle runs go further.
  if (stats.assist > 0 && reserve > 0) {
    force += stats.assist * speedFactor;
  }

  // Easing off refills the burst pool from the reserve and restores freshness.
  if (!exerting) {
    freshness += CONFIG.sim.freshRecoverPerSec * dt;
    if (reserve > 0) {
      const amt = Math.min(stats.staminaRefill * dt, reserve, stats.maxStamina - stamina);
      if (amt > 0) {
        stamina += amt;
        reserve -= amt;
      }
    }
  }

  stamina = clamp(stamina, 0, stats.maxStamina);
  reserve = Math.max(0, reserve);
  freshness = clamp(freshness, 0, 1);

  const dragAccel = (stats.drag * state.v * state.v) / mass;
  const rollAccel = state.v > 0.02 ? stats.rollResist : 0;
  const a = force / mass - dragAccel - rollAccel;

  const v = Math.max(0, state.v + a * dt);
  const x = state.x + v * dt;

  return {
    t: state.t + dt,
    x,
    v,
    stamina,
    reserve,
    freshness,
    maxSpeed: Math.max(state.maxSpeed, v),
  };
}

/** Metrics a finished run scored, including physics quantities. */
export function metricsFor(stats: RideStats, final: RideState): RunMetrics {
  const mass = Math.max(20, stats.weight);
  const duration = Math.max(0.001, final.t);
  return {
    distance: final.x,
    duration,
    avgSpeed: final.x / duration,
    maxSpeed: final.maxSpeed,
    peakMomentum: mass * final.maxSpeed,
    peakKE: 0.5 * mass * final.maxSpeed * final.maxSpeed,
    mass,
  };
}

/** A policy: decide whether to exert given the current state. */
export type RidePolicy = (state: RideState, stats: RideStats) => boolean;

/** Conservative idle auto-pilot: exert while there's comfortable stamina and
 *  energy. A present, well-pacing human out-earns it via the active bonus. */
export const autoPilot: RidePolicy = (s, stats) =>
  s.stamina > stats.maxStamina * 0.3 && s.reserve > 0;

/** Run a full headless ride to completion under `policy`. */
export function simulateRide(
  stats: RideStats,
  policy: RidePolicy = autoPilot,
  dt: number = DT,
): { metrics: RunMetrics; trajectory: { x: number; y: number }[]; final: RideState } {
  let s = initRideState(stats);
  const trajectory: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  let i = 0;
  const maxSteps = Math.ceil(MAX_SECONDS / dt);
  while (!isFinished(s) && i < maxSteps) {
    s = rideStep(s, stats, policy(s, stats), dt);
    if (i % 4 === 0) trajectory.push({ x: s.x, y: 0 });
    i++;
  }
  trajectory.push({ x: s.x, y: 0 });
  return { metrics: metricsFor(stats, s), trajectory, final: s };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
