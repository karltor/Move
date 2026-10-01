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
});
