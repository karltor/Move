// ---------------------------------------------------------------------------
// DATA-DRIVEN TECH-TREE MODEL
// ---------------------------------------------------------------------------
// The upgrade system is a research tree: categories of NODES, each node has
// 1..N RANKS bought with currencies. Some nodes are single unlocks (maxRanks
// 1), others scale (e.g. weight -5/-10/-15%). PREREQUISITES gate nodes. You
// can never max everything, so what you specialise into is your build. Certain
// nodes also swap the character's SVG art when ranked.
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

/** Character art a node contributes once it reaches `minRank`. Highest
 *  satisfied entry wins for its `layer`. */
export interface NodeArt {
  layer: string; // renderer attachment id: 'shoe' | 'torso' | 'headgear' | 'back'
  ranks: { minRank: number; svg: string }[];
}

export interface TreeNode {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** 1 = single unlock; >1 = multi-rank. */
  maxRanks: number;
  /** Cost of rank 1. Each further rank multiplies by `costGrowth`. */
  cost: Cost;
  costGrowth?: number; // default 1.7
  /** Stat mods applied per allocated rank. */
  mods: StatMod[];
  /** Node ids that must have >=1 rank before this node can be started. */
  prereqs: string[];
  /** Grid position within its category (col, row from the header). */
  col: number;
  row: number;
  art?: NodeArt;
  /** Free, auto-allocated category entry node (rendered as the header anchor). */
  root?: boolean;
}

export interface TreeCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  /** Which band around the central hub this category sits in. Nodes lay out
   *  away from the hub (top band grows up, bottom band grows down). */
  band: 'top' | 'bottom';
  nodes: TreeNode[];
}

export type RenderKind = 'walker' | 'layers';

export interface GameObjectDef {
  id: string;
  name: string;
  renderKind: RenderKind;
  baseStats: Record<StatKey, number>;
  categories: TreeCategory[];
}
