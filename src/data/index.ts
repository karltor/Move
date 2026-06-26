import type { GameObjectDef } from './types';
import { cyclist } from './cyclist';

// ---------------------------------------------------------------------------
// OBJECT REGISTRY
// ---------------------------------------------------------------------------
// EXTENSION POINT: register additional main objects here once their data file
// and SVGs exist (roller skates, car, train, particle…). Each brings its own
// passive tree and specialities. The store, simulation and UI all read from
// this registry by id and need no further changes. Only one main object is
// active at a time (the root node of its tree); switching is a respec.
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

export type {
  GameObjectDef,
  SlotDef,
  TreeNode,
  TreeEdge,
  PassiveTree,
  StatKey,
  StatMod,
  CurrencyId,
  NodeKind,
} from './types';
