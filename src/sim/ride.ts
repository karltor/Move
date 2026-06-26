import type { StatKey } from '../data/types';
import type { RunMetrics } from '../data/currencies';

// ---------------------------------------------------------------------------
// PURE RIDE SIMULATION
// ---------------------------------------------------------------------------
// The ride is a stamina-governed journey: pedalling applies force and drains
// stamina; coasting recovers it; drag and rolling resistance always slow you.
// A run lasts `runTime` seconds and you maximise distance.
//
// `rideStep` is a PURE function of (state, stats, pedal, dt) — no rendering,
// no globals, no randomness. It is used in two ways:
//   • real-time, frame by frame, with the player's hold input (active play),
//   • headlessly via `simulateRide` with a policy (idle auto-run, offline
//     catch-up, and unit tests).
// Every future object reuses the exact same physics.
// ---------------------------------------------------------------------------

export type RideStats = Record<StatKey, number>;

export interface RideState {
  t: number; // elapsed seconds
  x: number; // distance travelled
  v: number; // current speed (m/s)
  stamina: number; // remaining leg stamina
  battery: number; // remaining battery charge (0 if no battery)
  maxSpeed: number; // peak speed reached so far
}

export const DT = 1 / 60;

const BATTERY_DRAIN = 14; // charge/sec while assisting
const BATTERY_REGEN = 9; // charge/sec recovered while coasting

export function initRideState(stats: RideStats): RideState {
  return {
    t: 0,
    x: 0,
    v: 0,
    stamina: stats.maxStamina,
    battery: stats.battery, // start full
    maxSpeed: 0,
  };
}

/** Advance the ride one step. Pure: returns a new state, never mutates input. */
export function rideStep(
  state: RideState,
  stats: RideStats,
  pedal: boolean,
  dt: number = DT,
): RideState {
  const mass = Math.max(20, stats.weight);
  const topSpeed = Math.max(1, stats.topSpeed);

  // Pedal force fades to zero as you approach the soft speed cap.
  const speedFactor = Math.max(0, 1 - state.v / topSpeed);

  let force = 0;
  let stamina = state.stamina;
  let battery = state.battery;
  let legsPedalling = false;

  if (pedal && stamina > 0) {
    force += stats.pedalPower * speedFactor;
    stamina -= stats.staminaDrain * dt;
    legsPedalling = true;
  }

  // Battery Management System (Electrified speciality): a battery passively
  // assists every stroke and recharges while coasting — keeps idle runs going.
  const hasBattery = stats.battery > 0;
  let batteryAssisting = false;
  if (hasBattery && battery > 0) {
    force += stats.pedalPower * 0.45 * speedFactor;
    battery -= BATTERY_DRAIN * dt;
    batteryAssisting = true;
  }

  // Recovery when the relevant source isn't being used this step.
  if (!legsPedalling) stamina += stats.staminaRegen * dt;
  if (hasBattery && !batteryAssisting) battery += BATTERY_REGEN * dt;

  stamina = clamp(stamina, 0, stats.maxStamina);
  battery = clamp(battery, 0, stats.battery);

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
    battery,
    maxSpeed: Math.max(state.maxSpeed, v),
  };
}

/** Compute the metrics a finished run scored. */
export function metricsFor(stats: RideStats, final: RideState): RunMetrics {
  const duration = Math.max(0.001, final.t);
  return {
    distance: final.x,
    duration,
    avgSpeed: final.x / duration,
    maxSpeed: final.maxSpeed,
    peakMomentum: Math.max(20, stats.weight) * final.maxSpeed,
    mass: Math.max(20, stats.weight),
  };
}

/** A pedalling policy: decide whether to pedal given the current state. */
export type RidePolicy = (state: RideState, stats: RideStats) => boolean;

/** Conservative auto-pilot used for idle/offline runs: pedal while there's
 *  comfortable stamina, ease off to let it recover. A skilled human pacing
 *  manually can do meaningfully better — that's the active-play reward. */
export const autoPilot: RidePolicy = (s, stats) =>
  s.stamina > stats.maxStamina * 0.25;

/** Run a full headless ride to completion under `policy`. Returns the metrics,
 *  a sampled trajectory for any animation, and the final state. */
export function simulateRide(
  stats: RideStats,
  policy: RidePolicy = autoPilot,
  dt: number = DT,
): { metrics: RunMetrics; trajectory: { x: number; y: number }[]; final: RideState } {
  let s = initRideState(stats);
  const trajectory: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  const steps = Math.ceil(stats.runTime / dt);
  for (let i = 0; i < steps; i++) {
    const pedal = policy(s, stats);
    s = rideStep(s, stats, pedal, dt);
    if (i % 4 === 0) trajectory.push({ x: s.x, y: 0 });
  }
  trajectory.push({ x: s.x, y: 0 });
  return { metrics: metricsFor(stats, s), trajectory, final: s };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
