import type { ModeDef, ModeId } from './types';

// ---------------------------------------------------------------------------
// TRAVERSAL MODES — each mode node in the tree swaps the whole ride.
// ---------------------------------------------------------------------------
// The same pure sim runs every mode; a mode is just a different base-stat
// profile (and a different procedural vehicle on screen). 'run' is the
// built-in default when no mode node is equipped.
//
// The intended feel:
//   run        ~ 6-8 m/s   the first hour or two
//   skateboard ~ 10-13 m/s low rolling resistance, hard pushes
//   bicycle    ~ 18-24 m/s big sustained power, heavier
//   rocket     ~ 35-45 m/s late game: assist does the work, burns hot
// ---------------------------------------------------------------------------

export const MODES: Record<ModeId, ModeDef> = {
  run: {
    id: 'run',
    name: 'On Foot',
    icon: '🏃',
    blurb: 'One scientist, two legs, a rough field.',
    vehicle: 'none',
    baseStats: {
      walkPower: 150,
      runPower: 180,
      maxStamina: 100,
      staminaRefill: 9,
      runDrain: 14,
      maxReserve: 200,
      energyBurn: 7,
      drag: 0.05,
      weight: 75,
      rollResist: 0.7,
      topSpeed: 12,
      assist: 0,
      weatherResist: 0,
    },
  },
  skateboard: {
    id: 'skateboard',
    name: 'Skateboard',
    icon: '🛹',
    blurb: 'Push hard, then let the bearings do the talking.',
    vehicle: 'skateboard',
    baseStats: {
      walkPower: 130,
      runPower: 310,
      maxStamina: 100,
      staminaRefill: 9,
      runDrain: 16,
      maxReserve: 200,
      energyBurn: 6,
      drag: 0.07,
      weight: 79,
      rollResist: 0.12,
      topSpeed: 19,
      assist: 0,
      weatherResist: 0,
    },
  },
  bicycle: {
    id: 'bicycle',
    name: 'Bicycle',
    icon: '🚲',
    blurb: 'Rotational motion at last. The lab is very proud.',
    vehicle: 'bicycle',
    baseStats: {
      walkPower: 260,
      runPower: 430,
      maxStamina: 110,
      staminaRefill: 10,
      runDrain: 15,
      maxReserve: 210,
      energyBurn: 7.5,
      drag: 0.09,
      weight: 87,
      rollResist: 0.07,
      topSpeed: 30,
      assist: 0,
      weatherResist: 0,
    },
  },
  rocket: {
    id: 'rocket',
    name: 'Rocket Skates',
    icon: '🚀',
    blurb: 'Strictly speaking, not approved by the ethics board.',
    vehicle: 'rocket',
    baseStats: {
      walkPower: 200,
      runPower: 520,
      maxStamina: 120,
      staminaRefill: 11,
      runDrain: 15,
      maxReserve: 220,
      energyBurn: 12,
      drag: 0.06,
      weight: 83,
      rollResist: 0.1,
      topSpeed: 48,
      assist: 160,
      weatherResist: 0,
    },
  },
};
