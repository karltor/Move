import { describe, expect, it } from "vitest";
import { rollGear } from "./equipment";
import { fresh, restore } from "./game";
import { nextStory } from "./Story";

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
