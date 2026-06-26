// ---------------------------------------------------------------------------
// DATA-DRIVEN BUILD MODEL
// ---------------------------------------------------------------------------
// This is a BUILD game, not a node-buster. Content is data:
//   • An object has SLOTS (Footwear, Bodywear, …). Each slot offers several
//     tiered UPGRADES. You equip ONE upgrade per slot — that loadout is your
//     "build".
//   • Grants (the main currency) are SPENT to UNLOCK an upgrade permanently.
//   • The other currencies (Pace/Kinetic/Momentum) are RESERVED to keep an
//     upgrade EQUIPPED, and refunded when you unequip — a finite loadout budget
//     that forces real build choices. Because play-styles earn different
//     currencies, your build is shaped by how you play.
//   • Equipping changes STATS and the character's layered SVG ART.
//
// EXTENSION POINT: a new object (bicycle, …) is a new data file with its own
// slots/upgrades/art + a renderKind; relativistic regimes add new stats. The
// sim, store and UI are generic over this model.
// ---------------------------------------------------------------------------

/** Stats the simulation understands (see `src/sim/ride.ts`). */
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
  | 'assist';

/** Currencies derived from a run's metrics (see `src/data/currencies.ts`). */
export type CurrencyId = 'grants' | 'pace' | 'kinetic' | 'momentum';

/** A cost expressed in one or more currencies. */
export type Cost = Partial<Record<CurrencyId, number>>;

export interface StatMod {
  stat: StatKey;
  add?: number;
  mul?: number;
}

/** A character art layer this upgrade contributes when equipped. `layer` is a
 *  renderer-known attachment id (e.g. 'torso', 'shoe', 'headgear', 'back'). */
export interface UpgradeArt {
  layer: string;
  svg: string;
}

export interface Upgrade {
  id: string;
  name: string;
  desc: string;
  /** 1-based tier within its slot. Unlocking tier N requires tier N-1 unlocked. */
  tier: number;
  /** Small SVG symbol for the board tile. */
  icon: string;
  /** One-time GRANTS (mainly) spend to unlock. Empty = free base tier. */
  unlockCost: Cost;
  /** Currencies RESERVED while equipped (refunded on unequip). Empty = free. */
  equipCost: Cost;
  /** Stat modifiers applied while equipped. */
  mods: StatMod[];
  /** Optional character art shown while equipped. */
  art?: UpgradeArt;
}

export interface BuildSlot {
  id: string;
  name: string;
  /** Small SVG symbol for the slot header. */
  icon: string;
  /** Character layer draw order (lower = further back). */
  z: number;
  /** Tier-ordered upgrades; the first (tier 1, free) is the default equip. */
  upgrades: Upgrade[];
}

export type RenderKind = 'walker' | 'layers';

export interface GameObjectDef {
  id: string;
  name: string;
  renderKind: RenderKind;
  baseStats: Record<StatKey, number>;
  /** The build board. */
  slots: BuildSlot[];
}
