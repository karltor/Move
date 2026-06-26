import type { StatKey } from '../data/types';
import type { RunMetrics } from '../data/currencies';

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
  maxSpeed: number; // peak speed reached
}

export const DT = 1 / 60;
export const STOP_SPEED = 0.3; // below this (with no reserve) the run ends
const MAX_SECONDS = 150; // hard safety cap
const RUN_BURN_MULT = 1.7; // exerting burns reserve faster than walking

export function initRideState(stats: RideStats): RideState {
  return {
    t: 0,
    x: 0,
    v: 0,
    stamina: stats.maxStamina,
    reserve: stats.maxReserve,
    maxSpeed: 0,
  };
}

/** True once the object is spent and stopped — the run is over. */
export function isFinished(state: RideState): boolean {
  return (state.reserve <= 0 && state.v < STOP_SPEED) || state.t >= MAX_SECONDS;
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
  let force = 0;

  // Base locomotion (walking) — always on while there's energy, no stamina.
  if (reserve > 0) {
    force += stats.walkPower * speedFactor;
    reserve -= stats.energyBurn * dt;
  }

  // Exertion (running / sprinting) — extra force, spends stamina + reserve.
  let exerting = false;
  if (exert && stamina > 0 && reserve > 0) {
    force += stats.runPower * speedFactor;
    stamina -= stats.runDrain * dt;
    reserve -= stats.energyBurn * (RUN_BURN_MULT - 1) * dt;
    exerting = true;
  }

  // Assist (e.g. the Exosuit speciality): externally-powered passive force —
  // it costs no body energy, so it helps even idle runs go further. It still
  // only applies while the run is alive (reserve > 0 keeps you moving).
  if (stats.assist > 0 && reserve > 0) {
    force += stats.assist * speedFactor;
  }

  // Easing off refills the burst pool from the reserve.
  if (!exerting && reserve > 0) {
    const amt = Math.min(stats.staminaRefill * dt, reserve, stats.maxStamina - stamina);
    if (amt > 0) {
      stamina += amt;
      reserve -= amt;
    }
  }

  stamina = clamp(stamina, 0, stats.maxStamina);
  reserve = Math.max(0, reserve);

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
