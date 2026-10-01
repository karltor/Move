import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import Expedition, { telemetryStats } from "./Expedition";
import { fresh, start } from "./game";

const render = (game = fresh()) =>
  renderToStaticMarkup(
    createElement(Expedition, {
      game,
      setGame: () => {},
      onResearch: () => {},
      onEquipment: () => {},
    }),
  );

describe("experiment preparation and program-specific controls", () => {
  it("keeps locked programs and unavailable equipment out of first preparation", () => {
    const html = render();
    expect(html).toContain("The first field test");
    expect(html).toContain("Begin experiment");
    expect(html).not.toContain("Start run");
    expect(html).not.toContain("staging-programs");
    expect(html).not.toContain("staging-gear");
    expect(html).not.toContain("Launch angle");
    expect(html).not.toContain("mission-decision");
    expect(render(start(fresh(), 11))).not.toContain("mission-decision");
  });

  it("shows ballistic instruments without runner controls for projectile experiments", () => {
    const game = fresh();
    game.unlocked.push("projectile");
    game.program = "projectile";
    const html = render(start(game, 22));
    expect(html).toContain("LAUNCH SERIES");
    expect(html).toContain("Shots left");
    expect(html).not.toContain("console-stamina");
    expect(html).not.toContain("console-pace");
    expect(html).not.toContain("Use supply");
    expect(html).not.toContain('type="range"');
    game.researched.push("projectile-0-3");
    expect(render(game)).toContain('aria-label="Launch angle"');
  });

  it("shows acquired relevant modifiers without disclosing untouched stats", () => {
    const game = fresh();
    expect(telemetryStats(game)).toEqual([]);
    game.researched.push("runner-0-0");
    expect(telemetryStats(game)).toEqual(["stamina"]);
    game.unlocked.push("projectile");
    game.program = "projectile";
    game.researched.push("projectile-0-0");
    expect(telemetryStats(game)).toContain("drag");
    expect(telemetryStats(game)).not.toContain("stamina");
  });
});
