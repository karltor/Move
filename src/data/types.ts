// ---------------------------------------------------------------------------
// DATA-DRIVEN CONTENT MODEL
// ---------------------------------------------------------------------------
// Everything about a launchable object — its slots, the part tiers in each
// slot, their costs, art, and stat contributions — is expressed as data using
// the types below. The simulation (`src/sim`) and the UI (`src/game`,
// `src/ui`) consume these types generically and contain NO object-specific
// logic.
//
// EXTENSION POINT: to add a new object later (rocket, cannonball, train, ...)
//   1. create `src/data/<object>.ts` exporting a `GameObjectDef`,
//   2. add SVGs under `src/assets/parts/`,
//   3. register it in `src/data/index.ts`.
// No changes to sim or rendering code are required.
// ---------------------------------------------------------------------------

/** The stats that the simulation understands. Keep this the single source of
 *  truth for what a part can influence. Add a key here + handle it in
 *  `simulateLaunch` to introduce a new gameplay dimension for every object. */
export type StatKey = 'launchPower' | 'weight' | 'drag';

/** A part's contribution to the aggregated object stats. Sparse: a part only
 *  lists the stats it affects. Values are added to the object's base stats. */
export type StatContributions = Partial<Record<StatKey, number>>;

/** One tier of a slot (e.g. "Carbon Frame"). Ordered within `SlotDef.variants`
 *  from starter (index 0, usually free) to top tier. */
export interface PartVariant {
  /** Stable unique id within the slot, used in save data. */
  id: string;
  /** Display name shown in the upgrade menu. */
  name: string;
  /** Coin cost to unlock/equip. The starter tier (index 0) should cost 0. */
  cost: number;
  /** Vite-resolved URL of the SVG asset for this variant. */
  svg: string;
  /** Stats this variant adds to the object's base stats. */
  stats: StatContributions;
}

/** A mount point on an object that holds exactly one equipped variant. */
export interface SlotDef {
  /** Stable unique id within the object, used in save data. */
  id: string;
  /** Display name shown in the upgrade menu. */
  name: string;
  /** Draw order in the layered composition (lower = further back). */
  z: number;
  /** Ordered tiers; index 0 is the default equipped variant for a new save. */
  variants: PartVariant[];
}

/** A complete launchable object. */
export interface GameObjectDef {
  /** Stable unique id, used in save data and the object registry. */
  id: string;
  /** Display name. */
  name: string;
  /** Baseline stats before any part contributions are applied. */
  baseStats: Record<StatKey, number>;
  /** Mount points. The on-screen object is the layered composition of the
   *  currently-equipped variant in each slot, ordered by `z`. */
  slots: SlotDef[];
}
