// ---------------------------------------------------------------------------
// DATA-DRIVEN GAME MODEL — the whole game is one node graph.
// ---------------------------------------------------------------------------
// Three currencies, three verbs:
//   🔬 Research (earned from DISTANCE)  → UNLOCK a node, once, permanently.
//   💡 Insight  (earned from SPEED)     → UPGRADE a node's ranks, permanently.
//   ⚡ Flux     (earned from MOMENTUM)  → EQUIP a node into your loadout.
// Flux is a BUDGET, not a payment: an equipped node reserves its equip cost
// and frees it when unequipped. You will unlock far more than you can power,
// so the loadout is a genuine choice.
//
// Traversal is nodes too: mode nodes (skateboard, bicycle, …) swap the whole
// ride — new base stats, new on-screen vehicle. Only one mode can be
// equipped at a time; with none equipped you're on foot.
// ---------------------------------------------------------------------------

export type StatKey =
  | 'walkPower'
  | 'runPower'
  | 'maxStamina'
  | 'staminaRefill'
  | 'runDrain'
  | 'maxReserve'
  | 'energyBurn'
  | 'drag'
  | 'weight'
  | 'rollResist'
  | 'topSpeed'
  | 'assist'
  | 'weatherResist'; // 0..~0.9: dampens weather effects (good and bad)

export type CurrencyId = 'research' | 'insight' | 'flux';

/** A stat modifier applied PER rank (add: +add·rank; mul: mul^rank). */
export interface StatMod {
  stat: StatKey;
  add?: number;
  mul?: number;
}

export type ModeId = 'run' | 'skateboard' | 'bicycle' | 'rocket';
export type VehicleId = 'none' | 'skateboard' | 'bicycle' | 'rocket';

/** Renderer attachment points on the character. Tier 0 = base look. */
export type CosmeticSlot = 'shoes' | 'coat' | 'headgear' | 'back';

/** Cosmetic tiers a node grants as it ranks up (highest satisfied wins). */
export interface NodeCosmetic {
  slot: CosmeticSlot;
  tiers: { minRank: number; tier: number }[];
}

export type BranchId = 'body' | 'mind' | 'gear' | 'tech' | 'mode';

export interface NodeDef {
  id: string;
  name: string;
  desc: string;
  /** Emoji shown on the node. */
  icon: string;
  branch: BranchId;
  /** Grid position in the Lab graph (col ≈ tier / depth). */
  pos: { col: number; row: number };
  /** Node ids that must be UNLOCKED (not equipped) before this one. */
  prereqs: string[];
  /** 🔬 Research to unlock (buys rank 1). */
  unlockCost: number;
  /** Ranks including the unlock rank; 1 = no upgrades possible. */
  maxRanks: number;
  /** 💡 Insight for rank 2; each further rank scales by CONFIG.tree.costGrowth. */
  rankCost: number;
  /** ⚡ Flux reserved while this node is in the loadout. */
  equipCost: number;
  /** Stat mods applied per rank — ONLY while the node is equipped. */
  mods: StatMod[];
  /** Present on traversal nodes: equipping switches to this mode. */
  mode?: ModeId;
  cosmetic?: NodeCosmetic;
}

export interface ModeDef {
  id: ModeId;
  name: string;
  icon: string;
  blurb: string;
  vehicle: VehicleId;
  baseStats: Record<StatKey, number>;
}
