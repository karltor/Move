// ---------------------------------------------------------------------------
// DATA-DRIVEN GAME MODEL
// ---------------------------------------------------------------------------
// The upgrade system is a research tree: categories of NODES, each node has
// 1..N RANKS bought with currencies. Some nodes are single unlocks (maxRanks
// 1), others scale (e.g. weight −3%/rank). PREREQUISITES gate nodes. You can
// never max everything, so what you specialise into is your build. Certain
// nodes also upgrade the character's look via typed COSMETIC slots — the
// renderer draws each slot procedurally from its tier number, so data never
// references art files.
//
// EXTENSION POINT: add categories/nodes here (the tree is pure data). A new
// object (bicycle, …) is a new data file with its own categories + renderKind.
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

export type CurrencyId = 'research' | 'pace' | 'kinetic' | 'momentum';
export type Cost = Partial<Record<CurrencyId, number>>;

/** A stat modifier applied PER allocated rank (add: +add·rank; mul: mul^rank). */
export interface StatMod {
  stat: StatKey;
  add?: number;
  mul?: number;
}

/** Renderer attachment points on the character. Tier 0 = base look. */
export type CosmeticSlot = 'shoes' | 'coat' | 'headgear' | 'back';

/** Cosmetic tiers a node grants as it ranks up (highest satisfied wins). */
export interface NodeCosmetic {
  slot: CosmeticSlot;
  tiers: { minRank: number; tier: number }[];
}

export interface TreeNode {
  id: string;
  name: string;
  desc: string;
  /** Emoji shown on the node card. */
  icon: string;
  /** 1 = single unlock; >1 = multi-rank. */
  maxRanks: number;
  /** Cost of rank 1. Each further rank multiplies by `costGrowth`. */
  cost: Cost;
  costGrowth?: number; // default from CONFIG.tree.costGrowth
  /** Stat mods applied per allocated rank. */
  mods: StatMod[];
  /** Node ids that must have >=1 rank before this node can be started. */
  prereqs: string[];
  cosmetic?: NodeCosmetic;
}

export interface TreeCategory {
  id: string;
  name: string;
  color: string;
  /** Emoji shown on the category tab. */
  icon: string;
  blurb: string;
  nodes: TreeNode[];
}

export type RenderKind = 'walker';

export interface GameObjectDef {
  id: string;
  name: string;
  renderKind: RenderKind;
  baseStats: Record<StatKey, number>;
  categories: TreeCategory[];
}
