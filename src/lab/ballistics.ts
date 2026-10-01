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
/** Fixed substeps keep the trajectory independent of UI tick rate. */
export function advanceFlight(
  input: BallisticState,
  seconds: number,
  settings: FlightConfig,
) {
  let b = { ...input };
  const config = input.config ?? settings;
  let remaining = seconds;
  while (remaining > 1e-8 && b.phase === "flight") {
    const dt = Math.min(0.01, remaining);
    const previousX = b.x,
      previousY = b.y;
    const velocity = Math.hypot(b.vx, b.vy);
    // Paper wings reduce effective weight; lift is bounded to prevent an
    // unpowered airplane climbing forever.
    const lift = Math.min(8, config.lift * b.vx * b.vx);
    b.vx = Math.max(0, b.vx - config.drag * velocity * b.vx * dt);
    b.vy += (-9.81 + lift - config.drag * velocity * b.vy) * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.phaseTime += dt;
    remaining -= dt;
    if (b.y <= 0) {
      const fraction = previousY / Math.max(1e-9, previousY - b.y);
      b.x = previousX + (b.x - previousX) * fraction;
      b.y = 0;
      if (config.skip && b.skips === 0 && b.vx > 3) {
        b.skips = 1;
        b.vx *= 0.4;
        b.vy = Math.min(4, Math.abs(b.vy) * 0.25);
        b.y = 0.002;
      } else b.phase = "landed";
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
  let b = launchFlight(initialBallistic(), { ...config, charged: false });
  const points = [{ x: b.x, y: b.y }];
  let highest = b.y;
  for (let i = 0; i < 30000 && b.phase === "flight"; i++) {
    b = advanceFlight(b, 0.02, config);
    highest = Math.max(highest, b.y);
    if (i % 5 === 0 || b.phase === "landed") points.push({ x: b.x, y: b.y });
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
