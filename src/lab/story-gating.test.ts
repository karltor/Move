import { describe, expect, it } from "vitest";
import { rollGear } from "./equipment";
import { fresh, restore } from "./game";
import { initializeSkillGuides, nextStory, storyDefinition } from "./Story";

describe("equipment story follows the equipment unlock", () => {
  it("keeps an imported early item without introducing equipment too soon", () => {
    const save = fresh();
    save.storySeen = ["intro", "research", "forest"];
    save.progress.runner.trials = 1;
    save.progress.runner.bestDistance = 240;
    save.inventory = [rollGear("runner", 240, 44, 1).gear];
    const loaded = restore(JSON.stringify(save));
    expect(loaded.inventory).toHaveLength(1);
    expect(nextStory(loaded, "field")).toBeNull();
    loaded.progress.runner.trials = 4;
    expect(nextStory(loaded, "field")).toBe("equipment");
  });

  it("requires distance as well as completed runs before showing an equipment tip", () => {
    const save = fresh();
    save.storySeen = ["intro", "research", "forest"];
    save.progress.runner.trials = 5;
    save.progress.runner.bestDistance = 199;
    save.inventory = [rollGear("runner", 100, 44, 1).gear];
    expect(nextStory(save, "field")).toBeNull();
    save.progress.runner.bestDistance = 200;
    expect(nextStory(save, "field")).toBe("equipment");
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
