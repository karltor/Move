import { expect, it } from "vitest";
import { solveLeg } from "./animation";
it("bends the knee forward while planting the foot flat at its target", () => {
  for (const x of [-0.34, 0, 0.34]) {
    const pose = solveLeg(x, 0.785);
    const kneeX = 0.43 * Math.sin(pose.upper);
    const footX = kneeX + 0.43 * Math.sin(pose.upper + pose.knee);
    const down =
      0.43 * Math.cos(pose.upper) + 0.43 * Math.cos(pose.upper + pose.knee);
    expect(pose.knee).toBeLessThan(0);
    expect(kneeX).toBeGreaterThan(x / 2);
    expect(footX).toBeCloseTo(x);
    expect(down).toBeCloseTo(0.785);
    expect(pose.upper + pose.knee + pose.foot).toBeCloseTo(0);
  }
});
