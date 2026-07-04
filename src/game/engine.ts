import {
  rideStep,
  initRideState,
  isFinished,
  metricsFor,
  autoPilot,
  DT,
  type RideState,
  type RideStats,
} from '../sim/ride';
import type { RunMetrics } from '../data/currencies';
import { pickWeather, applyWeather, type Weather } from '../data/weather';
import { CONFIG } from '../config';

// ---------------------------------------------------------------------------
// RUN ENGINE — owns the run lifecycle, outside React and outside the renderer.
// ---------------------------------------------------------------------------
// The engine advances the pure simulation on a wall-clock accumulator from a
// plain interval timer. That has two consequences the old renderer-driven
// loop got wrong:
//   • The sim no longer depends on requestAnimationFrame, so a hidden tab
//     keeps progressing (browsers throttle timers, but the accumulator
//     catches up losslessly — auto-run genuinely idles in the background).
//   • Rendering is a read-only consumer: the Pixi stage `peek()`s the live
//     state every frame, and React subscribes to throttled snapshots.
//
// Lifecycle: idle → running → (collapsing) → idle, with an auto-run gap
// countdown between runs when auto-run is on.
// ---------------------------------------------------------------------------

export type RunPhase = 'idle' | 'running' | 'collapsing';
export type EndReason = 'exhausted' | 'timecap' | 'stopped';

export interface RunEndInfo {
  metrics: RunMetrics;
  reason: EndReason;
  weather: Weather;
  /** Fraction of sim steps the player was actively exerting (0..1). */
  activeFrac: number;
  /** Whether auto-run was on when the run ended. */
  auto: boolean;
}

export interface EngineSnapshot {
  phase: RunPhase;
  ride: RideState | null;
  /** Weather-modified stats for the current/last run. */
  stats: RideStats | null;
  weather: Weather | null;
  autoRun: boolean;
  /** 0..1 progress through the collapse animation. */
  collapseT: number;
  lastEnd: EndReason | null;
}

export interface EngineOptions {
  /** Aggregate (rank-modified, weather-free) stats — read at each run start. */
  getBaseStats: () => RideStats;
  onRunEnd: (info: RunEndInfo) => void;
  rng?: () => number;
  /** Test hook: when false, no interval timer — call `tick(now)` manually. */
  autoTick?: boolean;
}

const COLLAPSE_SEC = CONFIG.engine.collapseSec;
const GAP_SEC = CONFIG.engine.autoGapSec;
const MAX_CATCHUP = CONFIG.engine.maxCatchupSec;
const NOTIFY_MS = CONFIG.engine.notifyMs;

export class RunEngine {
  private phase: RunPhase = 'idle';
  private ride: RideState | null = null;
  private runStats: RideStats | null = null;
  private weather: Weather | null = null;
  private held = false;
  private auto = false;
  private endReason: EndReason | null = null;
  private lastEnd: EndReason | null = null;
  private collapseSec = 0;
  private gapSec = 0;
  private activeSteps = 0;
  private totalSteps = 0;

  private acc = 0;
  private lastNow: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();
  private snapshot: EngineSnapshot;
  private lastNotify = -Infinity;

  private readonly opts: EngineOptions;
  private readonly rng: () => number;

  constructor(opts: EngineOptions) {
    this.opts = opts;
    this.rng = opts.rng ?? Math.random;
    this.lastNow = performance.now();
    this.snapshot = this.buildSnapshot();
    if (opts.autoTick !== false) {
      this.timer = setInterval(() => this.tick(performance.now()), CONFIG.engine.tickMs);
    }
  }

  destroy() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.listeners.clear();
  }

  // --- input ---------------------------------------------------------------

  /** Player exertion input (Space / pointer held). */
  setHeld(held: boolean) {
    this.held = held;
  }

  /** Start a run manually (no-op unless idle). */
  startRun() {
    if (this.phase !== 'idle') return;
    this.gapSec = 0;
    this.begin();
  }

  /** End the current run early. Rewards still pay out; no collapse. */
  giveUp() {
    if (this.phase !== 'running') return;
    this.finish('stopped');
    this.notifyNow();
  }

  setAutoRun(on: boolean) {
    if (this.auto === on) return;
    this.auto = on;
    if (!on) this.gapSec = 0; // cancel any pending restart
    if (on && this.phase === 'idle') this.begin();
    else this.notifyNow();
  }

  // --- time ----------------------------------------------------------------

  /** Drain wall-clock time into fixed sim steps. Public for tests. */
  tick(now: number) {
    const dt = Math.max(0, (now - this.lastNow) / 1000);
    this.lastNow = now;
    this.acc = Math.min(this.acc + dt, MAX_CATCHUP);

    let progressed = false;
    while (this.acc >= DT) {
      if (this.phase === 'idle') {
        if (this.gapSec > 0) {
          this.gapSec -= DT;
          this.acc -= DT;
          progressed = true;
          if (this.gapSec <= 0) {
            if (this.auto) this.begin();
            else this.gapSec = 0;
          }
        } else {
          this.acc = 0; // nothing to simulate; don't bank idle time
          break;
        }
      } else if (this.phase === 'running') {
        this.stepRun();
        this.acc -= DT;
        progressed = true;
      } else {
        // collapsing
        this.collapseSec += DT;
        this.acc -= DT;
        progressed = true;
        if (this.collapseSec >= COLLAPSE_SEC) this.finish(this.endReason ?? 'exhausted');
      }
    }
    if (progressed) this.maybeNotify(now);
  }

  // --- lifecycle -----------------------------------------------------------

  private begin() {
    const base = this.opts.getBaseStats();
    const weather = pickWeather(this.rng);
    this.weather = weather;
    this.runStats = applyWeather(base, weather, base.weatherResist);
    this.ride = initRideState(this.runStats);
    this.phase = 'running';
    this.endReason = null;
    this.collapseSec = 0;
    this.activeSteps = 0;
    this.totalSteps = 0;
    this.notifyNow();
  }

  private stepRun() {
    const ride = this.ride!;
    const stats = this.runStats!;
    const exert = this.held || (this.auto && autoPilot(ride, stats));
    this.totalSteps++;
    if (this.held) this.activeSteps++;
    this.ride = rideStep(ride, stats, exert, DT);
    if (isFinished(this.ride)) {
      this.endReason = this.ride.reserve <= 0 ? 'exhausted' : 'timecap';
      this.phase = 'collapsing';
      this.collapseSec = 0;
    }
  }

  private finish(reason: EndReason) {
    const ride = this.ride!;
    const stats = this.runStats!;
    const weather = this.weather!;
    this.phase = 'idle';
    this.lastEnd = reason;
    this.endReason = null;
    if (this.auto) this.gapSec = GAP_SEC;
    this.opts.onRunEnd({
      metrics: metricsFor(stats, ride),
      reason,
      weather,
      activeFrac: this.totalSteps > 0 ? this.activeSteps / this.totalSteps : 0,
      auto: this.auto,
    });
  }

  // --- reads ---------------------------------------------------------------

  /** Cheap live read for the renderer (no allocation guarantees). */
  peek() {
    return {
      phase: this.phase,
      ride: this.ride,
      stats: this.runStats,
      weather: this.weather,
      collapseT: this.phase === 'collapsing' ? Math.min(1, this.collapseSec / COLLAPSE_SEC) : 0,
      lastEnd: this.lastEnd,
    };
  }

  /** Immutable snapshot for React (`useSyncExternalStore`). */
  getSnapshot = (): EngineSnapshot => this.snapshot;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private buildSnapshot(): EngineSnapshot {
    return {
      phase: this.phase,
      ride: this.ride,
      stats: this.runStats,
      weather: this.weather,
      autoRun: this.auto,
      collapseT: this.phase === 'collapsing' ? Math.min(1, this.collapseSec / COLLAPSE_SEC) : 0,
      lastEnd: this.lastEnd,
    };
  }

  private maybeNotify(now: number) {
    const phaseChanged = this.snapshot.phase !== this.phase || this.snapshot.autoRun !== this.auto;
    if (!phaseChanged && now - this.lastNotify < NOTIFY_MS) return;
    this.lastNotify = now;
    this.emit();
  }

  private notifyNow() {
    this.lastNotify = this.lastNow;
    this.emit();
  }

  private emit() {
    this.snapshot = this.buildSnapshot();
    for (const fn of this.listeners) fn();
  }
}
