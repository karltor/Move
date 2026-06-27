// ===========================================================================
// GAME CONFIG — tweak the feel of the game here.
// ===========================================================================
// This is the single place for global, object-agnostic tunables and UI text.
//
// NOTE on "per-object" physics: a specific object's friction / drag / mass /
// power / energy etc. are its BASE STATS and live in its data file
// (`src/data/scientist.ts` → `baseStats`). Upgrade *values* and *costs* are the
// node definitions in that same file; the cost-growth exponent default is here
// (`tree.costGrowth`). Weather conditions live in `src/data/weather.ts`.
// ===========================================================================

export const CONFIG = {
  sim: {
    /** Fixed physics timestep (seconds). */
    dt: 1 / 60,
    /** Hard safety cap on a single run (seconds). */
    maxRunSeconds: 150,
    /** Below this speed (with no energy) the run is considered stopped. */
    stopSpeed: 0.3,
    /** Exerting burns the energy reserve this many× the base walking rate. */
    runBurnMult: 1.7,

    // --- SKILL: "freshness" makes mashing-hold worse than rhythmic pulsing ---
    /** Freshness lost per second while exerting (held). */
    freshDecayPerSec: 0.62,
    /** Freshness recovered per second while easing off. */
    freshRecoverPerSec: 0.9,
    /** Run force when totally un-fresh (fraction of full). Fresh = 1.0. */
    freshFloor: 0.4,
    /** Extra reserve burn while "redlining" (exerting at empty stamina). */
    overexertBurnMult: 1.8,
  },

  render: {
    /** Pixels per simulation metre (how fast motion reads on screen). */
    pixelsPerMetre: 20,
    /** Collapse/faceplant animation length when energy runs out (ms). */
    collapseMs: 750,
    /** Walk/run animation. `dir` flips the gait direction if it looks wrong. */
    gait: {
      dir: 1,
      strideBase: 2.0,
      stridePerSpeed: 0.9,
      swingBase: 0.06,
      swingPerSpeed: 0.06,
      swingMax: 0.72,
    },
  },

  tree: {
    /** Default per-rank cost multiplier (rankN cost = base · growth^(N-1)). */
    costGrowth: 1.7,
    /** Default zoom when the upgrade window opens. */
    defaultZoom: 0.8,
  },

  economy: {
    /** Max active-play reward multiplier (idle = ×1). */
    activeBonusMax: 1.5,
    /** Fraction of an idle run's yield earned per offline run. */
    offlineEfficiency: 0.5,
    /** Cap on offline catch-up. */
    maxOfflineHours: 8,
  },

  texts: {
    runHint: 'Hold to run · pulse to stay fresh · energy ends the run',
    treeHint: 'Drag to pan · scroll to zoom · click a node to research it. You can’t max everything — specialise.',
  },
} as const;
