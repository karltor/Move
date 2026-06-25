import type { StatKey } from '../data/types';

/** Aggregated, ready-to-simulate stats for any object. */
export type LaunchStats = Record<StatKey, number>;

export interface TrajectoryPoint {
  x: number;
  y: number;
}

export interface LaunchResult {
  /** Final horizontal distance travelled, in simulation units. */
  distance: number;
  /** Sampled points of the path, in simulation units (y up, ground at y=0). */
  trajectory: TrajectoryPoint[];
}

// Simulation constants. Tuned for a satisfying spread of distances across the
// upgrade tiers rather than physical realism.
const GRAVITY = 30; // units / s^2
const LAUNCH_ANGLE = (38 * Math.PI) / 180; // fixed ramp angle
const DT = 1 / 60; // fixed timestep
const MAX_STEPS = 6000; // hard safety cap (~100s)
const ROLL_FRICTION = 6; // ground deceleration baseline (units/s^2)
const STOP_SPEED = 2; // speed below which a rolling object is "stopped"

/**
 * PURE launch simulation shared by every object — no rendering, no global
 * state, no randomness. Given aggregated stats it integrates motion step by
 * step (a ballistic flight phase followed by a ground-roll phase) and returns
 * the final distance plus the sampled trajectory for animation.
 *
 * Physical flavour of the stats:
 *   - launchPower scales initial speed off the ramp.
 *   - weight (mass) damps the effect of air drag: heavier rolls/flies further
 *     per unit drag, but tiers that add launchPower tend to add weight too.
 *   - drag is quadratic air resistance; lower travels further.
 */
export function simulateLaunch(stats: LaunchStats): LaunchResult {
  const mass = Math.max(0.5, stats.weight);
  const dragK = Math.max(0, stats.drag);
  // Initial speed: launchPower lightly penalised by mass so weight is a real
  // trade-off, but never to zero.
  const v0 = Math.max(1, stats.launchPower) * (1 - 0.15 * (mass / (mass + 12)));

  let x = 0;
  let y = 0;
  let vx = v0 * Math.cos(LAUNCH_ANGLE);
  let vy = v0 * Math.sin(LAUNCH_ANGLE);

  const trajectory: TrajectoryPoint[] = [{ x, y }];

  let airborne = true;
  for (let step = 0; step < MAX_STEPS; step++) {
    const speed = Math.hypot(vx, vy);

    // Quadratic air drag, divided by mass (a = F/m).
    const dragAccel = (dragK * speed) / mass;
    const ax = -dragAccel * (speed === 0 ? 0 : vx / speed);
    let ay = -GRAVITY - dragAccel * (speed === 0 ? 0 : vy / speed);

    if (!airborne) {
      // Rolling on the ground: no gravity component, apply rolling friction
      // opposing horizontal motion (also scaled down by mass = momentum).
      ay = 0;
      vy = 0;
      const rollDecel = (ROLL_FRICTION * 8) / mass;
      vx -= Math.sign(vx) * rollDecel * DT;
    } else {
      vy += ay * DT;
    }

    vx += ax * DT;
    x += vx * DT;
    y += airborne ? vy * DT : 0;

    if (airborne && y <= 0) {
      // Landed: clamp to ground and switch to rolling phase.
      y = 0;
      airborne = false;
      // Lose some horizontal speed on impact (heavier keeps more momentum).
      vx *= 0.6 + 0.2 * (mass / (mass + 10));
    }

    trajectory.push({ x, y });

    if (!airborne && Math.abs(vx) <= STOP_SPEED) break;
  }

  return { distance: Math.max(0, x), trajectory };
}
