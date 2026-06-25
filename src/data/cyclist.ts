import type { GameObjectDef } from './types';

// SVG assets are imported so Vite fingerprints them and rewrites the URL to
// respect the Pages `base` path. Each slot's variants share the same 260x180
// viewBox, so layering them produces a complete cyclist.
import frame0 from '../assets/parts/frame-0.svg';
import frame1 from '../assets/parts/frame-1.svg';
import frame2 from '../assets/parts/frame-2.svg';
import wheels0 from '../assets/parts/wheels-0.svg';
import wheels1 from '../assets/parts/wheels-1.svg';
import wheels2 from '../assets/parts/wheels-2.svg';
import rider0 from '../assets/parts/rider-0.svg';
import rider1 from '../assets/parts/rider-1.svg';
import rider2 from '../assets/parts/rider-2.svg';

// ---------------------------------------------------------------------------
// THE CYCLIST — the one object in this prototype.
// Three slots, three tiers each. Each tier is purely data: cost, art, stats.
// Stat design intent (see `simulateLaunch`):
//   launchPower  -> higher initial speed off the ramp (more distance)
//   weight       -> more mass: resists air drag (rolls further) but heavier
//                   frames cost launchPower; a real trade-off
//   drag         -> air resistance; lower is better. Aero parts reduce it.
// ---------------------------------------------------------------------------
export const cyclist: GameObjectDef = {
  id: 'cyclist',
  name: 'Cyclist',
  baseStats: {
    launchPower: 40,
    weight: 8,
    drag: 0.9,
  },
  slots: [
    {
      id: 'wheels',
      name: 'Wheels',
      z: 0, // furthest back
      variants: [
        { id: 'wheels-rusty',  name: 'Rusty Wheels',  cost: 0,    svg: wheels0, stats: { weight: 0,   drag: 0,     launchPower: 0 } },
        { id: 'wheels-alloy',  name: 'Alloy Wheels',  cost: 120,  svg: wheels1, stats: { weight: 1,   drag: -0.1,  launchPower: 6 } },
        { id: 'wheels-carbon', name: 'Carbon Discs',  cost: 600,  svg: wheels2, stats: { weight: 2,   drag: -0.25, launchPower: 14 } },
      ],
    },
    {
      id: 'frame',
      name: 'Frame',
      z: 1,
      variants: [
        { id: 'frame-rusty',  name: 'Rusty Frame',   cost: 0,    svg: frame0, stats: { launchPower: 0,  weight: 0, drag: 0 } },
        { id: 'frame-steel',  name: 'Steel Frame',   cost: 200,  svg: frame1, stats: { launchPower: 10, weight: 3, drag: -0.05 } },
        { id: 'frame-carbon', name: 'Carbon Frame',  cost: 900,  svg: frame2, stats: { launchPower: 24, weight: -2, drag: -0.15 } },
      ],
    },
    {
      id: 'rider',
      name: 'Rider',
      z: 2, // front-most
      variants: [
        { id: 'rider-casual',  name: 'Casual Rider', cost: 0,    svg: rider0, stats: { launchPower: 0,  drag: 0,    weight: 0 } },
        { id: 'rider-athlete', name: 'Athlete',      cost: 300,  svg: rider1, stats: { launchPower: 16, drag: -0.1, weight: 1 } },
        { id: 'rider-aero',    name: 'Aero Pro',     cost: 1100, svg: rider2, stats: { launchPower: 26, drag: -0.3, weight: 1 } },
      ],
    },
  ],
};
