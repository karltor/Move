import { describe, expect, it } from "vitest";
import {
  advanceFlight,
  initialBallistic,
  launchFlight,
  predictFlight,
  type FlightConfig,
} from "./ballistics";
const config: FlightConfig = {
  speed: 12,
  angle: 45,
  height: 1.45,
  drag: 0,
  lift: 0,
  reload: 3,
  charged: false,
  skip: false,
};
function landed(settings: FlightConfig, step = 0.1) {
  let b = launchFlight(initialBallistic(), settings);
  for (let i = 0; i < 10000 && b.phase === "flight"; i++)
    b = advanceFlight(b, step, settings);
  return b;
}
describe("ballistic trajectories", () => {
  it("matches the gravity-only landing range and returns to actual ground", () => {
    const horizontal = config.speed * Math.cos(Math.PI / 4),
      vertical = config.speed * Math.sin(Math.PI / 4);
    const time =
      (vertical + Math.sqrt(vertical * vertical + 2 * 9.81 * config.height)) /
      9.81;
    const b = landed(config);
    expect(b.phase).toBe("landed");
    expect(b.y).toBe(0);
    expect(b.x).toBeCloseTo(horizontal * time, 0);
    expect(b.vy).toBeLessThan(0);
  });
  it("lands at the same range at different UI tick rates", () => {
    const settings = { ...config, drag: 0.006, lift: 0.02 };
    expect(landed(settings, 0.1).x).toBeCloseTo(landed(settings, 0.5).x, 5);
  });
  it("air resistance reduces range, wings increase airtime, and a skip adds real distance", () => {
    expect(predictFlight({ ...config, drag: 0.02 }).range).toBeLessThan(
      predictFlight(config).range,
    );
    expect(predictFlight({ ...config, lift: 0.03 }).duration).toBeGreaterThan(
      predictFlight(config).duration,
    );
    const normal = landed(config),
      skip = landed({ ...config, skip: true });
    expect(skip.skips).toBe(1);
    expect(skip.x).toBeGreaterThan(normal.x + 1);
  });
  it("keeps a released shot's physics when the next loadout settings change", () => {
    const a = launchFlight(initialBallistic(), config);
    const b = advanceFlight(a, 0.5, config);
    const changed = advanceFlight(a, 0.5, {
      ...config,
      drag: 2,
      lift: 8,
      angle: 20,
    });
    expect(changed.x).toBe(b.x);
    expect(changed.y).toBe(b.y);
  });
  it("does not invent a landing at forty-five seconds for a high-power flight", () => {
    const high = { ...config, speed: 600, angle: 65, drag: 0.0002 };
    const b = advanceFlight(launchFlight(initialBallistic(), high), 46, high);
    expect(b.phase).toBe("flight");
    expect(b.y).toBeGreaterThan(100);
    expect(landed(high, 0.5).y).toBe(0);
  });
  it("solves million-second gravity arcs exactly without a tiny-step loop", () => {
    const high = { ...config, speed: 7_560_000, angle: 65, height: 1 };
    const vertical = high.speed * Math.sin(high.angle * Math.PI / 180),
      horizontal = high.speed * Math.cos(high.angle * Math.PI / 180),
      time = (vertical + Math.sqrt(vertical * vertical + 2 * 9.81 * high.height)) / 9.81;
    const b = advanceFlight(launchFlight(initialBallistic(), high), 1e8, high);
    expect(b.phase).toBe("landed");
    expect(b.y).toBe(0);
    expect(b.phaseTime / time).toBeCloseTo(1, 12);
    expect(b.x / (horizontal * time)).toBeCloseTo(1, 12);
  });
  it("keeps accelerated high-energy drag trajectories consistent across tick sizes", () => {
    const high = { ...config, speed: 7_560_000, angle: 65, height: 1, drag: 6.54e-10 };
    const atRate = (h: number) => {
      let b = launchFlight(initialBallistic(), high);
      for (let i = 0; i < 2000 && b.phase === "flight"; i++) b = advanceFlight(b, h, high);
      expect(b.phase).toBe("landed");
      return b;
    };
    const fine = atRate(100), coarse = atRate(10_000), prediction = predictFlight(high);
    expect(coarse.x / fine.x).toBeCloseTo(1, 4);
    expect(coarse.phaseTime / fine.phaseTime).toBeCloseTo(1, 4);
    expect(prediction.range / fine.x).toBeCloseTo(1, 4);
    expect(prediction.duration / fine.phaseTime).toBeCloseTo(1, 4);
    expect(prediction.points.length).toBeGreaterThanOrEqual(256);
    expect(prediction.points[prediction.points.length - 1]!.y).toBe(0);
  });
  it("lands finite forward-moving shots across extreme drag without reversing their horizontal velocity", () => {
    for (const drag of [1e-12, 1e-9, 1e-7, 1e-5, .0035, 2]) {
      const high = { ...config, speed: 7_560_000, angle: 65, height: 1, drag };
      const b = advanceFlight(launchFlight(initialBallistic(), high), 1e8, high);
      expect(b.phase).toBe("landed");
      expect(b.y).toBe(0);
      expect(b.x).toBeGreaterThan(0);
      expect(b.vx).toBeGreaterThanOrEqual(0);
      expect(b.vy).toBeLessThan(0);
      expect([b.x, b.y, b.vx, b.vy, b.phaseTime].every(Number.isFinite)).toBe(true);
    }
  });
});
