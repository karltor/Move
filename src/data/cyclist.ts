import type { GameObjectDef, TreeNode, TreeEdge } from './types';

// Composition art. All variants share the same 260x180 viewBox so layers
// stack into a complete bike + rider. Tree nodes swap these via `setArt`.
import frame0 from '../assets/parts/frame-0.svg';
import frame1 from '../assets/parts/frame-1.svg';
import frame2 from '../assets/parts/frame-2.svg';
import wheels0 from '../assets/parts/wheels-0.svg';
import wheels1 from '../assets/parts/wheels-1.svg';
import wheels2 from '../assets/parts/wheels-2.svg';
import rider0 from '../assets/parts/rider-0.svg';
import rider1 from '../assets/parts/rider-1.svg';
import rider2 from '../assets/parts/rider-2.svg';

// Tree layout is in abstract units; the renderer scales + lets you pan.
const nodes: TreeNode[] = [
  {
    id: 'root',
    kind: 'root',
    name: 'Bicycle',
    desc: 'The starter vehicle. Pedal-powered, stamina-limited. Future main vehicles (skates, car, train, particle) plug in here as their own trees.',
    pos: { x: 0, y: 0 },
    cost: {},
    mods: [],
  },

  // --- POWER branch (right) ------------------------------------------------
  {
    id: 'pow1',
    kind: 'minor',
    name: 'Stronger Legs',
    desc: 'More force on every pedal stroke.',
    pos: { x: 1, y: 0.25 },
    cost: { coins: 40 },
    mods: [{ stat: 'pedalPower', add: 35 }],
  },
  {
    id: 'pow2',
    kind: 'minor',
    name: 'Toe Clips',
    desc: 'Pedal more efficiently — more power, slightly less drain.',
    pos: { x: 2, y: 0.35 },
    cost: { coins: 95, tempo: 12 },
    mods: [
      { stat: 'pedalPower', add: 35 },
      { stat: 'staminaDrain', add: -3 },
    ],
  },
  {
    id: 'powN',
    kind: 'notable',
    name: "Sprinter's Thighs",
    desc: 'Explosive power and a higher speed ceiling.',
    pos: { x: 3, y: 0.15 },
    cost: { coins: 220, tempo: 30 },
    mods: [
      { stat: 'pedalPower', add: 80 },
      { stat: 'topSpeed', add: 1.5 },
    ],
    setArt: { slot: 'frame', svg: frame2, tier: 2 },
  },

  // --- STAMINA branch (up) -------------------------------------------------
  {
    id: 'sta1',
    kind: 'minor',
    name: 'Deep Breathing',
    desc: 'A bigger stamina pool.',
    pos: { x: 0.25, y: -1 },
    cost: { coins: 40 },
    mods: [{ stat: 'maxStamina', add: 30 }],
  },
  {
    id: 'sta2',
    kind: 'minor',
    name: 'Efficient Cadence',
    desc: 'Burn less, recover faster.',
    pos: { x: 0.35, y: -2 },
    cost: { coins: 95, tempo: 12 },
    mods: [
      { stat: 'staminaDrain', add: -4 },
      { stat: 'staminaRegen', add: 4 },
    ],
  },
  {
    id: 'staN',
    kind: 'notable',
    name: 'Iron Lungs',
    desc: 'Huge stamina and strong recovery.',
    pos: { x: 0.15, y: -3 },
    cost: { coins: 220, tempo: 30 },
    mods: [
      { stat: 'maxStamina', add: 70 },
      { stat: 'staminaRegen', add: 6 },
    ],
  },

  // --- AERO branch (left) --------------------------------------------------
  {
    id: 'aer1',
    kind: 'minor',
    name: 'Tuck Position',
    desc: 'Cut through the air a little better.',
    pos: { x: -1, y: 0.25 },
    cost: { coins: 50 },
    mods: [{ stat: 'drag', mul: 0.9 }],
  },
  {
    id: 'aer2',
    kind: 'minor',
    name: 'Slick Tires',
    desc: 'Less rolling resistance and drag.',
    pos: { x: -2, y: 0.35 },
    cost: { coins: 105, rush: 12 },
    mods: [
      { stat: 'rollResist', add: -0.3 },
      { stat: 'drag', add: -0.02 },
    ],
    setArt: { slot: 'wheels', svg: wheels1, tier: 1 },
  },
  {
    id: 'aerN',
    kind: 'notable',
    name: 'Aero Frame',
    desc: 'A slippery, lighter frame.',
    pos: { x: -3, y: 0.15 },
    cost: { coins: 240, rush: 25 },
    mods: [
      { stat: 'drag', mul: 0.8 },
      { stat: 'weight', add: -8 },
    ],
    setArt: { slot: 'frame', svg: frame1, tier: 1 },
  },

  // --- WHEELS / MOMENTUM branch (down) -------------------------------------
  {
    id: 'whl1',
    kind: 'minor',
    name: 'Bigger Wheels',
    desc: 'Roll faster at the cost of a little weight.',
    pos: { x: 0.25, y: 1 },
    cost: { coins: 60 },
    mods: [
      { stat: 'topSpeed', add: 1.5 },
      { stat: 'weight', add: 4 },
    ],
  },
  {
    id: 'whl2',
    kind: 'minor',
    name: 'Heavy Flywheel',
    desc: 'Store momentum — mass that keeps you rolling.',
    pos: { x: 0.35, y: 2 },
    cost: { coins: 120, momentum: 18 },
    mods: [
      { stat: 'weight', add: 22 },
      { stat: 'topSpeed', add: 1 },
    ],
  },
  {
    id: 'whlN',
    kind: 'notable',
    name: 'Carbon Discs',
    desc: 'Fast, slick, and surprisingly light.',
    pos: { x: 0.15, y: 3 },
    cost: { coins: 260, rush: 25, momentum: 20 },
    mods: [
      { stat: 'topSpeed', add: 2.5 },
      { stat: 'drag', add: -0.03 },
      { stat: 'weight', add: -3 },
    ],
    setArt: { slot: 'wheels', svg: wheels2, tier: 2 },
  },

  // --- SPECIALITIES (choose ONE) -------------------------------------------
  {
    id: 'spec_electric',
    kind: 'speciality',
    name: 'Electrified Bike',
    desc: 'SPECIALITY — Battery Management System. A battery passively assists every pedal stroke and recharges while you coast, so even idle runs go far. Adds weight.',
    pos: { x: 2.7, y: 2.6 },
    cost: { coins: 420, tempo: 50, momentum: 40 },
    mods: [
      { stat: 'battery', add: 130 },
      { stat: 'pedalPower', add: 25 },
      { stat: 'weight', add: 18 },
    ],
    setArt: { slot: 'rider', svg: rider1, tier: 1 },
  },
  {
    id: 'spec_aero',
    kind: 'speciality',
    name: 'Aerodynamicist',
    desc: 'SPECIALITY — All about top speed. Drag is slashed and the speed ceiling soars, but stamina suffers. Rewards aggressive active sprints.',
    pos: { x: -3.2, y: -0.9 },
    cost: { coins: 420, rush: 90 },
    mods: [
      { stat: 'drag', mul: 0.55 },
      { stat: 'topSpeed', add: 4 },
      { stat: 'maxStamina', add: -10 },
    ],
    setArt: { slot: 'rider', svg: rider2, tier: 2 },
  },
  {
    id: 'spec_endurance',
    kind: 'speciality',
    name: 'Endurance Machine',
    desc: 'SPECIALITY — Built to go forever. Massive stamina, strong regen, and noticeably longer runs.',
    pos: { x: 0.15, y: -4 },
    cost: { coins: 420, tempo: 90 },
    mods: [
      { stat: 'maxStamina', add: 120 },
      { stat: 'staminaRegen', add: 12 },
      { stat: 'runTime', add: 20 },
    ],
  },
];

// Edges define the paths. Cross-links give "a lot of paths" PoE-style.
const edges: TreeEdge[] = [
  { a: 'root', b: 'pow1' },
  { a: 'pow1', b: 'pow2' },
  { a: 'pow2', b: 'powN' },
  { a: 'root', b: 'sta1' },
  { a: 'sta1', b: 'sta2' },
  { a: 'sta2', b: 'staN' },
  { a: 'root', b: 'aer1' },
  { a: 'aer1', b: 'aer2' },
  { a: 'aer2', b: 'aerN' },
  { a: 'root', b: 'whl1' },
  { a: 'whl1', b: 'whl2' },
  { a: 'whl2', b: 'whlN' },
  // cross-links (loops / alternate routes)
  { a: 'pow1', b: 'whl1' },
  { a: 'aer1', b: 'sta1' },
  { a: 'pow2', b: 'whl2' },
  // speciality approaches
  { a: 'powN', b: 'spec_electric' },
  { a: 'whlN', b: 'spec_electric' },
  { a: 'aerN', b: 'spec_aero' },
  { a: 'staN', b: 'spec_endurance' },
];

export const cyclist: GameObjectDef = {
  id: 'cyclist',
  name: 'Cyclist',
  baseStats: {
    pedalPower: 320,
    maxStamina: 120,
    staminaRegen: 11,
    staminaDrain: 9,
    drag: 0.06,
    weight: 85,
    rollResist: 0.6,
    topSpeed: 16,
    runTime: 32,
    battery: 0,
  },
  slots: [
    { id: 'wheels', name: 'Wheels', z: 0, svg: wheels0 },
    { id: 'frame', name: 'Frame', z: 1, svg: frame0 },
    { id: 'rider', name: 'Rider', z: 2, svg: rider0 },
  ],
  tree: { rootId: 'root', nodes, edges },
};
