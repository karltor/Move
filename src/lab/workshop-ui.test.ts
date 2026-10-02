import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Equipment, { equipmentFocus } from "./EquipmentPanel";
import { fresh, type Save } from "./game";
import { craftGear, upgradeGearTo } from "./workshop";
import { fundingPreview, starterEquipmentGoal } from "./economy";

const render = (save: Save) => renderToStaticMarkup(createElement(Equipment, { game: save, setGame: () => {}, onFunding: () => {} }));

describe("progressive equipment workbench", () => {
  it("starts with one clear illustrated purchase and no inventory or upgrade spoilers", () => {
    const html = render({ ...fresh(), vouchers: 2 });
    expect(html).toContain("Build Running shoes · 2 vouchers");
    expect(html).toContain("Automatically fitted when you build it.");
    expect(html).toContain("menu-art/shoes.webp");
    expect(html).toContain("Build the training clinic");
    expect(html).not.toContain("Carbon stride boots");
    expect(html).not.toContain("Phase displacement");
    expect(html).not.toContain("Build basic gear");
    expect(html).not.toContain("Stored gear");
    expect(html).not.toContain("Equipment program");
    expect(html).not.toContain("Stopwatch");
  });
  it("offers meaningful alternative fits instead of selling duplicate shoes or tiny level clicks", () => {
    const save = craftGear({ ...fresh(), vouchers: 100 }, "runner", "footwear");
    const html = render(save);
    expect(html).toContain("Sprint fit");
    expect(html).toContain("Trail fit");
    expect(html).toContain("Choose one permanent fit");
    expect(html).toContain("Acceleration");
    expect(html).toContain("Surface grip");
    expect(html).not.toContain("Build Running shoes ·");
    expect(html).not.toContain("+1 level");
    expect(html).not.toContain("To next stage");
    expect(html).not.toContain("Unequip");
  });
  it("preserves old duplicate investments without showing an intimidating inventory by default", () => {
    const base = craftGear({ ...fresh(), vouchers: 100 }, "runner", "footwear");
    const duplicate = { ...base.inventory[0], id: "gear-2" };
    const save = { ...base, inventory: [...base.inventory, duplicate, { ...duplicate, id: "gear-3" }], nextGear: 4 };
    const html = render(save);
    expect(html).toContain("Stored gear");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Choose a copy");
    expect(save.inventory).toHaveLength(3);
  });
  it("points to a facility when the current equipment range is complete", () => {
    const save = upgradeGearTo(craftGear({ ...fresh(), vouchers: 100 }, "runner", "footwear"), "gear-1", 9, "kinetic");
    const html = render(save);
    expect(html).toContain("Ready for new hardware");
    expect(html).toContain("View the next facility");
    expect(html).toContain("Next facility required");
    expect(html).not.toContain("+1 level");
  });
  it("opens the fitted component that Funding quoted even when a recent spare costs more", () => {
    const fitted = upgradeGearTo(craftGear({ ...fresh(), vouchers: 100 }, "runner", "footwear"), "gear-1", 5, "kinetic");
    const spare = { ...fitted.inventory[0], id: "gear-2", name: "Track shoes", foundAt: 140, crafted: false, upgradeLevel: 0, upgradePath: undefined };
    const save = { ...fitted, science: 1000, vouchers: 0, inventory: [...fitted.inventory, spare], lastDrop: spare.id, nextGear: 3 };
    const goal = starterEquipmentGoal(save)!;
    expect(goal.gearId).toBe("gear-1");
    expect(goal.vouchers).toBe(8);
    expect(fundingPreview(save, "voucher").quantity).toBe(8);
    expect(equipmentFocus(save)).toEqual({ program: "runner", slot: "footwear", gearId: "gear-1" });
    const html = render(save);
    expect(html).toContain("Refine sprint fit");
    expect(html).toContain("Improve component · 8 vouchers");
    expect(html).not.toContain("How should this component perform?");
  });
  it("focuses the next owned starter slot and a missing component in another unlocked program", () => {
    const complete = upgradeGearTo(craftGear({ ...fresh(), vouchers: 100 }, "runner", "footwear"), "gear-1", 9, "distance");
    const vest = { ...complete.inventory[0], id: "gear-2", slot: "outfit" as const, name: "Trail jacket", crafted: false, foundAt: 180, upgradeLevel: 0, upgradePath: undefined, affixes: [{ stat: "stamina" as const, value: .05 }] };
    const withVest = { ...complete, inventory: [...complete.inventory, vest], lastDrop: "gear-1", nextGear: 3 };
    expect(equipmentFocus(withVest)).toEqual({ program: "runner", slot: "outfit", gearId: "gear-2" });
    expect(render(withVest)).toContain("This field find adds +5% stamina capacity");
    const projectile = { ...complete, unlocked: ["runner", "projectile"] as Save["unlocked"] };
    expect(equipmentFocus(projectile)).toEqual({ program: "projectile", slot: "footwear", gearId: null });
    expect(render(projectile)).toContain("Build Throwing grip · 2 vouchers");
  });
  it("keeps later and legacy loadouts focused on fitted gear or the best footwear", () => {
    const base = craftGear({ ...fresh(), vouchers: 100 }, "runner", "footwear");
    const better = { ...base.inventory[0], id: "gear-2", upgradeLevel: 4 };
    const latest = { ...base.inventory[0], id: "gear-3" };
    const later = { ...base, development: { athletics: 1 }, inventory: [...base.inventory, better, latest], lastDrop: latest.id, nextGear: 4 };
    expect(equipmentFocus(later).gearId).toBe("gear-1");
    expect(equipmentFocus({ ...later, equipped: [] }).gearId).toBe("gear-2");
    expect(equipmentFocus({ ...later, development: {}, equipped: [] }).gearId).toBe("gear-2");
    expect(later.inventory).toHaveLength(3);
  });
});


