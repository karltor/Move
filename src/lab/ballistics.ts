/** Metres, seconds and SI gravity; the scene uses a uniform display scale. */
export interface BallisticState {
  phase: "prepare" | "flight" | "landed";
  phaseTime: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  shots: number;
  completed: number;
  lastRange: number;
  totalRange: number;
  science: number;
  funds: number;
  skips: number;
  config?: FlightConfig;
}
export interface FlightConfig {
  speed: number;
  angle: number;
  height: number;
  drag: number;
  lift: number;
  reload: number;
  charged: boolean;
  skip: boolean;
}
export const SHOTS_PER_TRIAL = 6;
export const initialBallistic = (): BallisticState => ({
  phase: "prepare",
  phaseTime: 0,
  x: 0,
  y: 1.45,
  vx: 0,
  vy: 0,
  shots: 0,
  completed: 0,
  lastRange: 0,
  totalRange: 0,
  science: 0,
  funds: 0,
  skips: 0,
});
export function launchFlight(
  b: BallisticState,
  config: FlightConfig,
  error = 0,
): BallisticState {
  const angle = ((config.angle + error) * Math.PI) / 180;
  const speed =
    config.speed * (config.charged && (b.shots + 1) % 3 === 0 ? 1.18 : 1);
  return {
    ...b,
    phase: "flight",
    phaseTime: 0,
    x: 0,
    y: config.height,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    shots: b.shots + 1,
    skips: 0,
    config: { ...config },
  };
}
const GRAVITY = 9.81;
type Motion = Pick<BallisticState, "x" | "y" | "vx" | "vy">;
function acceleration(m: Motion, c: FlightConfig) {
  const resistance = c.drag * Math.hypot(m.vx, m.vy);
  return {
    x: m.vx,
    y: m.vy,
    vx: -resistance * m.vx,
    vy: -GRAVITY + Math.min(8, c.lift * m.vx * m.vx) - resistance * m.vy,
  };
}
function offset(m: Motion, d: Motion, h: number): Motion {
  return { x: m.x + d.x * h, y: m.y + d.y * h,
    vx: m.vx + d.vx * h, vy: m.vy + d.vy * h };
}
function rk4(m: Motion, h: number, c: FlightConfig): Motion {
  const a = acceleration(m, c),
    b = acceleration(offset(m, a, h / 2), c),
    d = acceleration(offset(m, b, h / 2), c),
    e = acceleration(offset(m, d, h), c);
  return {
    x: m.x + h * (a.x + 2 * b.x + 2 * d.x + e.x) / 6,
    y: m.y + h * (a.y + 2 * b.y + 2 * d.y + e.y) / 6,
    vx: m.vx + h * (a.vx + 2 * b.vx + 2 * d.vx + e.vx) / 6,
    vy: m.vy + h * (a.vy + 2 * b.vy + 2 * d.vy + e.vy) / 6,
  };
}
function twoHalfSteps(m: Motion, h: number, c: FlightConfig) {
  return rk4(rk4(m, h / 2, c), h / 2, c);
}
function groundContact(b: BallisticState, c: FlightConfig) {
  b.y = 0;
  if (c.skip && b.skips === 0 && b.vx > 3) {
    b.skips = 1;
    b.vx *= 0.4;
    b.vy = Math.min(4, Math.abs(b.vy) * 0.25);
    b.y = 0.002;
  } else b.phase = "landed";
}
/** With no drag, constant gravity/lift has an exact solution at any clock rate. */
function advanceVacuum(input: BallisticState, seconds: number, c: FlightConfig) {
  const b = { ...input };
  let remaining = seconds;
  while (remaining > 0 && b.phase === "flight") {
    const gravity = GRAVITY - Math.min(8, c.lift * b.vx * b.vx);
    const impact = (b.vy + Math.sqrt(b.vy * b.vy + 2 * gravity * b.y)) / gravity;
    const h = Math.min(remaining, impact);
    b.x += b.vx * h;
    b.y += b.vy * h - gravity * h * h / 2;
    b.vy -= gravity * h;
    b.phaseTime += h;
    remaining -= h;
    if (h >= impact) groundContact(b, c);
  }
  return b;
}
/** Step doubling spends work where drag changes velocity rapidly. Unlike a
 * fixed .01 s loop, a late-game flight clock can advance thousands of seconds
 * without blocking the page. The relative local error is below one millionth. */
function advanceAdaptive(input: BallisticState, seconds: number, c: FlightConfig) {
  let b = { ...input };
  let remaining = seconds;
  const velocity = Math.hypot(b.vx, b.vy);
  let h = Math.min(remaining, .1 / Math.max(1e-9,
    c.drag * velocity + GRAVITY / Math.max(1, velocity)));
  for (let work = 0; work < 1024 && remaining > 1e-8 && b.phase === "flight"; work++) {
    h = Math.min(h, remaining);
    const coarse = rk4(b, h, c), fine = twoHalfSteps(b, h, c);
    let error = 0;
    for (const key of ["x", "y", "vx", "vy"] as const) {
      const scale = 1e-5 + 1e-6 * Math.max(Math.abs(b[key]), Math.abs(fine[key]));
      error = Math.max(error, Math.abs(coarse[key] - fine[key]) / scale);
    }
    if (!Number.isFinite(error) || fine.vx < 0) error = Infinity;
    if (error > 1) {
      h *= Math.max(.1, .85 * Math.pow(error, -.2));
      continue;
    }
    if (fine.y <= 0) {
      // Find the real intersection with the ground within the accepted step;
      // linear interpolation is inaccurate when accelerated clocks use long steps.
      let lo = 0, hi = h;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (twoHalfSteps(b, mid, c).y > 0) lo = mid;
        else hi = mid;
      }
      b = { ...b, ...twoHalfSteps(b, hi, c), phaseTime: b.phaseTime + hi };
      remaining -= hi;
      groundContact(b, c);
    } else {
      b = { ...b, ...fine, phaseTime: b.phaseTime + h };
      remaining -= h;
    }
    h *= Math.min(4, Math.max(.5, .9 * Math.pow(Math.max(1e-12, error), -.2)));
  }
  return b;
}
/** Ordinary throws retain fixed steps; high-energy flights use adaptive work. */
export function advanceFlight(
  input: BallisticState,
  seconds: number,
  settings: FlightConfig,
) {
  let b = { ...input };
  const config = input.config ?? settings;
  if (!Number.isFinite(seconds) || seconds <= 0 || b.phase !== "flight") return b;
  if (config.drag === 0) return advanceVacuum(b, seconds, config);
  if (config.speed >= 1000) return advanceAdaptive(b, seconds, config);
  let remaining = seconds;
  while (remaining > 1e-8 && b.phase === "flight") {
    const dt = Math.min(0.01, remaining);
    const previousX = b.x,
      previousY = b.y;
    const velocity = Math.hypot(b.vx, b.vy);
    // Paper wings reduce effective weight; lift is bounded to prevent an
    // unpowered airplane climbing forever.
    const lift = Math.min(8, config.lift * b.vx * b.vx);
    // An implicit drag step stays dissipative even after high-energy upgrades.
    // Explicit subtraction would reverse a fast shot when drag*speed*dt > 1.
    const damping = 1 / (1 + config.drag * velocity * dt);
    b.vx = Math.max(0, b.vx * damping);
    b.vy = b.vy * damping + (-GRAVITY + lift) * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.phaseTime += dt;
    remaining -= dt;
    if (b.y <= 0) {
      const fraction = previousY / Math.max(1e-9, previousY - b.y);
      b.x = previousX + (b.x - previousX) * fraction;
      b.y = 0;
      groundContact(b, config);
    }
  }
  return b;
}
type Prediction = {
  range: number;
  height: number;
  duration: number;
  points: { x: number; y: number }[];
};
const predictions = new Map<string, Prediction>();
export function predictFlight(config: FlightConfig): Prediction {
  const key = JSON.stringify([
    config.speed,
    config.angle,
    config.height,
    config.drag,
    config.lift,
    config.skip,
  ]);
  const cached = predictions.get(key);
  if (cached) return cached;
  const initial = launchFlight(initialBallistic(), { ...config, charged: false });
  // Find the actual landing first; a drag-free horizon can be far longer than
  // the real flight. Then distribute samples over its measured duration.
  const vertical = Math.max(0, initial.vy),
    gravity = GRAVITY - Math.min(8, config.lift * initial.vx * initial.vx);
  let horizon = Math.max(4, (vertical + Math.sqrt(vertical * vertical + 2 * gravity * initial.y)) / gravity);
  let end = advanceFlight(initial, horizon, config);
  for (let i = 0; i < 16 && end.phase === "flight"; i++) {
    horizon *= 2;
    end = advanceFlight(end, horizon, config);
  }
  let b = initial;
  const points = [{ x: b.x, y: b.y }];
  let highest = b.y;
  const sampleTime = Math.max(.01, end.phaseTime / 256);
  for (let i = 0; i < 258 && b.phase === "flight"; i++) {
    b = advanceFlight(b, sampleTime, config);
    highest = Math.max(highest, b.y);
    points.push({ x: b.x, y: b.y });
  }
  const prediction = {
    range: b.x,
    height: highest,
    duration: b.phaseTime,
    points,
  };
  predictions.set(key, prediction);
  if (predictions.size > 24)
    predictions.delete(predictions.keys().next().value!);
  return prediction;
}
