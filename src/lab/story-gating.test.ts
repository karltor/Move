import { describe, expect, it } from "vitest";
import { rollGear } from "./equipment";
import { fresh, restore, start, step } from "./game";
import { initializeSkillGuides, nextStory, storyDefinition, storySimulationRate } from "./Story";

describe("equipment story follows the equipment unlock", () => {
  it("explains the workshop when imported equipment makes it available", () => {
    const save = fresh();
    save.storySeen = ["intro", "research", "forest"];
    save.progress.runner.trials = 1;
    save.progress.runner.bestDistance = 240;
    save.inventory = [rollGear("runner", 240, 44, 1).gear];
    const loaded = restore(JSON.stringify(save));
    expect(loaded.inventory).toHaveLength(1);
    expect(nextStory(loaded, "field")).toBe("equipment");
  });

  it("opens the workshop guide after two trials or voucher funding, without needing a random drop", () => {
    const save = fresh();
    save.storySeen = ["intro", "research", "forest"];
    save.progress.runner.trials = 1;
    expect(nextStory(save, "field")).toBeNull();
    save.progress.runner.trials = 2;
    expect(nextStory(save, "field")).toBe("equipment");
    save.progress.runner.trials = 0;
    save.vouchers = 1;
    expect(nextStory(save, "field")).toBe("equipment");
  });
});

describe("funding and development explanations", () => {
  it("introduces the three RP spending routes at the first debrief", () => {
    const save = fresh();
    save.storySeen = ["intro"];
    save.progress.runner.trials = 1;
    save.debriefPending = true;
    expect(nextStory(save, "funding")).toBe("funding");
    const text = storyDefinition("funding", save).pages.flat().join(" ");
    expect(text).toContain("Talent Points");
    expect(text).toContain("equipment vouchers");
    expect(text).toContain("development project");
    expect(text).not.toContain("Endurance");
    save.storySeen.push("funding");
    expect(nextStory(save, "funding")).toBeNull();
  });
  it("introduces the newly funded era once without replaying older era tips", () => {
    const save = fresh();
    save.storySeen = ["intro", "research", "funding", "equipment"];
    save.development.athletics = 1;
    const initialized = initializeSkillGuides(save);
    expect(nextStory(initialized, "development")).toBeNull();
    initialized.development.biomechanics = 1;
    expect(nextStory(initialized, "development")).toBe("era:2");
    expect(storyDefinition("era:2", initialized).pages[0][1]).toContain("level 49");
    initialized.storySeen.push("era:2");
    expect(nextStory(initialized, "development")).toBeNull();
    initialized.development["supply-lab"] = 1;
    expect(nextStory(initialized, "development")).toBe("project:supply-lab");
  });
  it("keeps both runner and projectile simulations advancing at half speed under a story", () => {
    for (const program of ["runner", "projectile"] as const) {
      const save = fresh();
      save.program = program;
      if (program === "projectile") save.unlocked.push(program);
      const begun = start(save, 123);
      const normal = step(begun, 0.1 * storySimulationRate(null));
      const reading = step(begun, 0.1 * storySimulationRate("intro"));
      expect(reading.trial!.time).toBeGreaterThan(0);
      expect(reading.trial!.time).toBeCloseTo(normal.trial!.time / 2, 8);
      if (program === "runner") expect(reading.trial!.distance).toBeGreaterThan(0);
      else expect(reading.trial!.ballistic).toBeDefined();
    }
  });
  it("explains shared RP without promising retired program currencies", () => {
    const save = fresh();
    save.unlocked.push("projectile");
    const text = storyDefinition("programs", save).pages.flat().join(" ");
    expect(text).toContain("RP, Talent Points and equipment vouchers are shared");
    expect(text).not.toMatch(/Endurance|Impulse|Torque/);
  });
});

describe("field skill explanations", () => {
  it("avoids a popup backlog on old saves while explaining a future purchase", () => {
    const old = fresh();
    old.storySeen = ["intro", "research"];
    old.researched = ["runner-0-3"];
    const initialized = initializeSkillGuides(old);
    expect(nextStory(initialized, "research")).toBeNull();
    initialized.researched.push("runner-1-3");
    expect(nextStory(initializeSkillGuides(initialized), "research")).toBe(
      "skill:runner-1-3",
    );
  });
  it("explains a newly researched skill once, with its actual controls", () => {
    const save = fresh();
    save.storySeen = ["intro", "research"];
    save.researched = ["runner-0-3"];
    const id = nextStory(save, "research");
    expect(id).toBe("skill:runner-0-3");
    const explanation = storyDefinition(id!, save);
    expect(explanation.pages[1][1]).toContain("Steady");
    expect(explanation.pages[1][1]).toContain("12-second");
    save.storySeen.push(id!);
    expect(nextStory(save, "research")).toBeNull();
  });

  it("does not introduce a different program's skill or a running milestone from projectile distance", () => {
    const save = fresh();
    save.storySeen = ["intro", "research", "programs"];
    save.unlocked.push("projectile");
    save.program = "projectile";
    save.progress.projectile.bestDistance = 10000;
    save.researched = ["runner-0-3"];
    expect(nextStory(save, "field")).toBeNull();
    save.researched.push("projectile-0-3");
    const id = nextStory(save, "field");
    expect(id).toBe("skill:projectile-0-3");
    expect(storyDefinition(id!, save).pages[1][1]).toContain("next shot");
  });
});
