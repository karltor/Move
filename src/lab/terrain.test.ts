import { expect, it } from "vitest";
import { createTerrain, routeSurface } from "./terrain";

it("replaces the city road with a narrower unmarked forest trail, then returns to a country road", () => {
  expect(routeSurface(0).markings).toBe(1);
  expect(routeSurface(500).markings).toBe(0);
  expect(routeSurface(500).halfWidth).toBeLessThan(routeSurface(0).halfWidth);
  expect(routeSurface(2000).markings).toBe(1);
  for (const boundary of [70, 100, 130, 960, 1000, 1040]) {
    expect(
      Math.abs(
        routeSurface(boundary - 0.01).halfWidth -
          routeSurface(boundary + 0.01).halfWidth,
      ),
    ).toBeLessThan(0.001);
  }
});

it("shows asphalt behind and gravel ahead in the same frame at the forest boundary", () => {
  const t = createTerrain();
  t.update(100);
  const surface = t.mesh.geometry.getAttribute("surface");
  expect(surface.getX(20 * 11 + 5)).toBe(0);
  expect(surface.getX(140 * 11 + 5)).toBe(1);
  for (const d of [0, 100, 1000, 10000, 100000, 1000000]) {
    t.update(d);
    const p = t.mesh.geometry.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      expect(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i))).toBe(true);
    }
  }
  t.mesh.geometry.dispose();
  t.mesh.material.dispose();
});
