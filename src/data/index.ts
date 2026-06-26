import type { GameObjectDef } from './types';
import { scientist } from './scientist';

// ---------------------------------------------------------------------------
// OBJECT REGISTRY
// ---------------------------------------------------------------------------
// EXTENSION POINT: register additional main objects here once their data file
// and art exist. Planned progression:
//   scientist (on foot)  ->  bicycle (rotational motion, 'layers' renderKind
//   with spinning wheels)  ->  faster vehicles  ->  relativistic regimes.
// Each brings its own passive tree and specialities. The store, simulation and
// UI all read from this registry by id and need no further changes. Only one
// main object is active at a time; switching is a respec.
export const OBJECTS: Record<string, GameObjectDef> = {
  [scientist.id]: scientist,
};

/** The object active in this prototype. */
export const ACTIVE_OBJECT_ID = scientist.id;

export function getObject(id: string): GameObjectDef {
  const obj = OBJECTS[id];
  if (!obj) throw new Error(`Unknown object id: ${id}`);
  return obj;
}

export type {
  GameObjectDef,
  BuildSlot,
  Upgrade,
  UpgradeArt,
  Cost,
  StatKey,
  StatMod,
  CurrencyId,
  RenderKind,
} from './types';
