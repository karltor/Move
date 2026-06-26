// ---------------------------------------------------------------------------
// DATA-DRIVEN CONTENT MODEL
// ---------------------------------------------------------------------------
// Everything about a launchable object — its base stats, its passive skill
// tree (Path-of-Exile-style graph of nodes), the art layers, and which stats
// each node grants — is expressed as data using the types below. The
// simulation (`src/sim`), stat aggregation (`src/game`) and UI (`src/ui`)
// consume these generically and contain NO object-specific logic.
//
// EXTENSION POINT: to add a new "main" object later (roller skates, car,
// train, particle…):
//   1. create `src/data/<object>.ts` exporting a `GameObjectDef` (its own
//      tree, including its own speciality keystones),
//   2. add SVG art under `src/assets/parts/`,
//   3. register it in `src/data/index.ts`.
// Main objects are mutually exclusive in-game (you pick one); switching is a
// respec, handled generically by the store.
// ---------------------------------------------------------------------------

/** Stats the ride simulation understands. Add a key here + handle it in
 *  `src/sim/ride.ts` to introduce a new gameplay dimension for every object. */
export type StatKey =
  | 'pedalPower' // forward force applied while actively pedaling
  | 'maxStamina' // stamina pool that pedaling consumes
  | 'staminaRegen' // stamina/sec recovered while coasting
  | 'staminaDrain' // stamina/sec spent while pedaling
  | 'drag' // quadratic air resistance coefficient (lower = better)
  | 'weight' // mass (affects accel, momentum currency, drag damping)
  | 'rollResist' // constant ground deceleration (lower = better)
  | 'topSpeed' // soft speed cap; pedal force fades as you approach it
  | 'runTime' // how many seconds a single run lasts
  | 'battery'; // speciality: battery capacity that auto-assists (0 = none)

/** Currencies are derived from a run's metrics (see `src/data/currencies.ts`).
 *  Tree nodes can cost any mix of them. */
export type CurrencyId = 'coins' | 'tempo' | 'rush' | 'momentum';

/** A single stat modifier granted by a tree node. `add` is applied in the
 *  additive pass, `mul` in a later multiplicative pass. */
export interface StatMod {
  stat: StatKey;
  add?: number;
  mul?: number;
}

export type NodeKind =
  | 'root' // the main vehicle; auto-allocated, exclusive across objects
  | 'minor' // small stat node
  | 'notable' // stronger, "intriguing" node
  | 'speciality'; // keystone — you may allocate only ONE per object

/** A node in the passive tree. */
export interface TreeNode {
  id: string;
  kind: NodeKind;
  name: string;
  desc: string;
  /** Layout position in abstract tree units (rendered scaled + pannable). */
  pos: { x: number; y: number };
  /** Currency cost to allocate. Empty for the root. */
  cost: Partial<Record<CurrencyId, number>>;
  /** Stat modifiers granted while allocated. */
  mods: StatMod[];
  /** Optional: allocating this node swaps a composition art layer. The
   *  highest `tier` among allocated nodes wins for a given slot. */
  setArt?: { slot: string; svg: string; tier: number };
}

export interface TreeEdge {
  a: string;
  b: string;
}

/** A default art layer for the object (shown before any art-swapping node). */
export interface SlotDef {
  id: string;
  name: string;
  z: number; // draw order (lower = further back)
  svg: string; // default/tier-0 art
}

export interface PassiveTree {
  rootId: string;
  nodes: TreeNode[];
  edges: TreeEdge[];
}

/** A complete launchable object. */
export interface GameObjectDef {
  id: string;
  name: string;
  /** Baseline stats before any tree nodes are allocated. */
  baseStats: Record<StatKey, number>;
  /** Default composition layers; tree nodes' `setArt` override per slot. */
  slots: SlotDef[];
  /** The passive skill tree for this object (includes its specialities). */
  tree: PassiveTree;
}
