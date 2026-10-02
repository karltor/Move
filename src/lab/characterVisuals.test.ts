import { describe, expect, it } from "vitest";
import { characterEquipment } from "./characterVisuals";
import type { Gear } from "./equipment";

const shoes: Gear = { id: "gear-2", program: "runner", name: "Track shoes", slot: "footwear", rarity: "Uncommon", foundAt: 150, affixes: [{ stat: "speed", value: .05 }] };
const vest: Gear = { ...shoes, id: "gear-3", slot: "outfit", rarity: "Rare" };
describe("equipment shown on the scientist", () => {
  it("keeps found but unequipped gear off the model", () => {
    const result = characterEquipment({ inventory: [shoes], equipped: [], program: "runner" });
    expect(result.visible.GearShoeL).toBe(false);
    expect(result.visible.EverydayShoeL).toBe(true);
    expect(result.visible.GearInstrument).toBe(false);
  });
  it("shows the actual worn slots and their later attachments", () => {
    const result = characterEquipment({ inventory: [shoes, vest], equipped: [shoes.id, vest.id], program: "runner" });
    expect(result.visible.GearShoeL).toBe(true);
    expect(result.visible.EverydayShoeR).toBe(false);
    expect(result.visible.GearOutfit).toBe(true);
    expect(result.visible.GearPack).toBe(true);
    expect(result.colors.footwear).not.toBe(result.colors.outfit);
  });
  it("does not wear equipment from another discipline", () => {
    const result = characterEquipment({ inventory: [shoes], equipped: [shoes.id], program: "wheels" });
    expect(result.visible.GearShoeL).toBe(false);
    expect(result.visible.EverydayShoeL).toBe(true);
  });
  it('updates the visible equipment when the same item evolves',()=>{
    const basic=characterEquipment({inventory:[shoes],equipped:[shoes.id],program:'runner'});
    const upgraded=characterEquipment({inventory:[{...shoes,upgradeLevel:100,upgradePath:'kinetic'}],equipped:[shoes.id],program:'runner'});
    expect(upgraded.key).not.toBe(basic.key);
    expect(upgraded.colors.footwear).not.toBe(basic.colors.footwear);
    expect(upgraded.glow).toBeGreaterThan(0);
    expect(upgraded.augmentation).toBe(true);
  });
});
