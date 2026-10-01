import { expect, it } from "vitest";
import { createTerrain, routeSurface, roughPatch } from "./terrain";
import { routeSegment } from "./game";

it("shows damaged paving where roadworks slow the runner without inventing a hill", () => {
  expect(routeSegment(50).kind).toBe("effort");
  expect(roughPatch(50)).toBe(1);
  expect(roughPatch(20)).toBe(0);
  const t = createTerrain();
  t.update(50);
  const g = t.mesh.geometry;
  expect(g.getAttribute("surfacePatch").getX(80 * 11 + 5)).toBe(1);
  expect(g.getAttribute("position").getY(80 * 11 + 5)).toBeCloseTo(0.003);
  const patch = Array.from(g.getAttribute("surfacePatch").array);
  t.update(50.1);
  expect(Array.from(g.getAttribute("surfacePatch").array)).toEqual(patch);
  t.mesh.geometry.dispose();
  t.mesh.material.dispose();
});

it("moves road cells forward without changing the width of a fixed piece of gravel", () => {
  const t = createTerrain();
  t.update(500);
  const a = t.mesh.geometry.getAttribute("position");
  const width = a.getZ(80 * 11 + 6),
    x = a.getX(80 * 11 + 6) + t.mesh.position.x;
  t.update(500.1);
  expect(a.getZ(80 * 11 + 6)).toBe(width);
  expect(a.getX(80 * 11 + 6) + t.mesh.position.x).toBeCloseTo(x - 0.065);
  // Once the rolling mesh advances a complete cell, the same piece moves one row.
  t.update(502);
  expect(a.getZ(79 * 11 + 6)).toBeCloseTo(width);
  t.mesh.geometry.dispose();
  t.mesh.material.dispose();
});

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
