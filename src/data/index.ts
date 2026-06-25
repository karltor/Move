import type { GameObjectDef } from './types';
import { cyclist } from './cyclist';

// ---------------------------------------------------------------------------
// OBJECT REGISTRY
// ---------------------------------------------------------------------------
// EXTENSION POINT: register additional objects here once their data file and
// SVGs exist (e.g. `rocket`, `cannonball`, `train`). The store, simulation and
// UI all read from this registry by id and need no further changes.
export const OBJECTS: Record<string, GameObjectDef> = {
  [cyclist.id]: cyclist,
};

/** The object active in this prototype. Later this becomes a player choice. */
export const ACTIVE_OBJECT_ID = cyclist.id;

export function getObject(id: string): GameObjectDef {
  const obj = OBJECTS[id];
  if (!obj) throw new Error(`Unknown object id: ${id}`);
  return obj;
}

export type { GameObjectDef, SlotDef, PartVariant, StatKey, StatContributions } from './types';
