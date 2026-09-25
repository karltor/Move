import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("ships the complete Blender library at origin with the required animation pivots", () => {
  const data = readFileSync(
    new URL("../../public/models/move-world.glb", import.meta.url),
  );
  expect(data.toString("utf8", 0, 4)).toBe("glTF");
  expect(data.readUInt32LE(8)).toBe(data.length);
  const gltf = JSON.parse(
    data.toString("utf8", 20, 20 + data.readUInt32LE(12)),
  );
  const nodes = gltf.nodes;
  const rootNames = gltf.scenes[gltf.scene].nodes.map(
    (i) => nodes[i].name,
  );
  for (const name of [
    "Scientist",
    "Townhouse",
    "Bakery",
    "Workshop",
    "Apartments",
    "Greenhouse",
    "StreetLamp",
    "ParkBench",
    "Oak",
    "Birch",
    "Rowan",
    "Spruce",
    "FernPatch",
    "FieldRock",
    "Barn",
    "Cactus",
    "Boulder",
    "SnowPeak",
  ]) {
    expect(rootNames).toContain(name);
    expect(
      nodes.find((n) => n.name === name)?.translation ?? [0, 0, 0],
    ).toEqual([0, 0, 0]);
  }
  for (const side of ["L", "R"]) {
    const leg = nodes.find((n) => n.name === "Leg" + side);
    const knee = nodes.find((n) => n.name === "Knee" + side);
    expect(leg.children?.map((i) => nodes[i].name)).toContain("Knee" + side);
    expect(knee.children?.map((i) => nodes[i].name)).toContain("Foot" + side);
    expect(Math.abs(knee.translation[1])).toBeCloseTo(0.43);
  }
  expect(gltf.buffers.every((b) => !b.uri)).toBe(true);
});
