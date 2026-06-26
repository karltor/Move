import type { GameObjectDef, TreeNode, TreeEdge } from './types';

// ---------------------------------------------------------------------------
// THE SCIENTIST — the very first object: a researcher on foot.
// ---------------------------------------------------------------------------
// The game opens with a lab scientist jogging across a rough field, cheered on
// by colleagues and funded by a shadowy backer who just wants them to "go
// fast". No vehicle yet — locomotion is pure legwork governed by energy.
//
// Tree themes (all DATA — adding nodes never touches sim or UI):
//   • Stride     — walk/run force and speed ceiling
//   • Endurance  — the energy reserve (how long a run lasts)
//   • Technique  — the stamina burst pool and its refill
//   • Groundwork — terrain & drag (rolling/air resistance)
//   • Specialities (pick ONE) — Exosuit (assist), Olympian (speed),
//     Ultramarathoner (endurance).
//
// EXTENSION POINT: the BICYCLE is a much-later main object (its own data file
// with 'layers' renderKind + spinning-wheel art). Relativistic regimes come
// later still as new stats/objects. None of that changes this file.
// ---------------------------------------------------------------------------

const nodes: TreeNode[] = [
  {
    id: 'root',
    kind: 'root',
    name: 'Scientist',
    desc: 'On foot, on a rough field, with a backer yelling "GO FAST". Everything starts here.',
    pos: { x: 0, y: 0 },
    cost: {},
    mods: [],
  },

  // --- STRIDE (right) — force & speed ---
  {
    id: 'str1',
    kind: 'minor',
    name: 'Determined Stride',
    desc: 'Push off harder with every step.',
    pos: { x: 1, y: 0.25 },
    cost: { grants: 40 },
    mods: [{ stat: 'walkPower', add: 25 }],
  },
  {
    id: 'str2',
    kind: 'minor',
    name: 'Power Walk',
    desc: 'More force when you exert yourself.',
    pos: { x: 2, y: 0.35 },
    cost: { grants: 95, pace: 12 },
    mods: [{ stat: 'runPower', add: 45 }],
  },
  {
    id: 'strN',
    kind: 'notable',
    name: "Sprinter's Form",
    desc: 'Explosive running and a higher speed ceiling.',
    pos: { x: 3, y: 0.15 },
    cost: { grants: 220, kinetic: 30 },
    mods: [
      { stat: 'runPower', add: 90 },
      { stat: 'topSpeed', add: 1.5 },
    ],
  },

  // --- ENDURANCE (up) — energy reserve ---
  {
    id: 'end1',
    kind: 'minor',
    name: 'Hearty Breakfast',
    desc: 'Start each run with more energy.',
    pos: { x: 0.25, y: -1 },
    cost: { grants: 45 },
    mods: [{ stat: 'maxReserve', add: 25 }],
  },
  {
    id: 'end2',
    kind: 'minor',
    name: 'Efficient Metabolism',
    desc: 'Burn energy more slowly.',
    pos: { x: 0.35, y: -2 },
    cost: { grants: 95, pace: 12 },
    mods: [{ stat: 'energyBurn', mul: 0.85 }],
  },
  {
    id: 'endN',
    kind: 'notable',
    name: 'Marathoner',
    desc: 'A deep tank and steady recovery.',
    pos: { x: 0.15, y: -3 },
    cost: { grants: 220, pace: 30 },
    mods: [
      { stat: 'maxReserve', add: 50 },
      { stat: 'staminaRefill', add: 5 },
    ],
  },

  // --- TECHNIQUE (left) — stamina pool ---
  {
    id: 'tec1',
    kind: 'minor',
    name: 'Steady Breathing',
    desc: 'A bigger burst-stamina pool.',
    pos: { x: -1, y: 0.25 },
    cost: { grants: 45 },
    mods: [{ stat: 'maxStamina', add: 30 }],
  },
  {
    id: 'tec2',
    kind: 'minor',
    name: 'Second Wind',
    desc: 'Recover faster, tire slower.',
    pos: { x: -2, y: 0.35 },
    cost: { grants: 100, kinetic: 12 },
    mods: [
      { stat: 'staminaRefill', add: 5 },
      { stat: 'runDrain', add: -3 },
    ],
  },
  {
    id: 'tecN',
    kind: 'notable',
    name: 'Iron Will',
    desc: 'Huge stamina and strong recovery.',
    pos: { x: -3, y: 0.15 },
    cost: { grants: 230, kinetic: 30 },
    mods: [
      { stat: 'maxStamina', add: 60 },
      { stat: 'staminaRefill', add: 7 },
    ],
  },

  // --- GROUNDWORK (down) — terrain & drag ---
  {
    id: 'grd1',
    kind: 'minor',
    name: 'Better Shoes',
    desc: 'Less rolling resistance on rough ground.',
    pos: { x: 0.25, y: 1 },
    cost: { grants: 55 },
    mods: [{ stat: 'rollResist', add: -0.25 }],
  },
  {
    id: 'grd2',
    kind: 'minor',
    name: 'Smoother Path',
    desc: 'Grade the field — less resistance, less drag.',
    pos: { x: 0.35, y: 2 },
    cost: { grants: 120, momentum: 18 },
    mods: [
      { stat: 'rollResist', add: -0.3 },
      { stat: 'drag', add: -0.02 },
    ],
  },
  {
    id: 'grdN',
    kind: 'notable',
    name: 'Aerodynamic Lean',
    desc: 'Cut the air and pick up speed.',
    pos: { x: 0.15, y: 3 },
    cost: { grants: 260, momentum: 22, kinetic: 20 },
    mods: [
      { stat: 'drag', mul: 0.78 },
      { stat: 'topSpeed', add: 2 },
    ],
  },

  // --- SPECIALITIES (choose ONE) ---
  {
    id: 'spec_exosuit',
    kind: 'speciality',
    name: 'Lab-Funded Exosuit',
    desc: 'SPECIALITY — a powered exosuit adds passive force from your energy reserve, so even idle runs go far. Heavier, but tireless.',
    pos: { x: 2.7, y: 2.6 },
    cost: { grants: 420, pace: 50, momentum: 40 },
    mods: [
      { stat: 'assist', add: 70 },
      { stat: 'walkPower', add: 20 },
      { stat: 'weight', add: 16 },
    ],
  },
  {
    id: 'spec_olympian',
    kind: 'speciality',
    name: 'Olympic Runner',
    desc: 'SPECIALITY — all-out speed. Huge running power and ceiling, but a smaller energy reserve. Rewards aggressive active sprints.',
    pos: { x: -3.2, y: -0.9 },
    cost: { grants: 420, kinetic: 90 },
    mods: [
      { stat: 'runPower', add: 140 },
      { stat: 'topSpeed', add: 4 },
      { stat: 'maxReserve', add: -20 },
    ],
  },
  {
    id: 'spec_ultra',
    kind: 'speciality',
    name: 'Ultramarathoner',
    desc: 'SPECIALITY — built to go forever. Enormous reserve and recovery for very long runs.',
    pos: { x: 0.15, y: -4 },
    cost: { grants: 420, pace: 90 },
    mods: [
      { stat: 'maxReserve', add: 120 },
      { stat: 'staminaRefill', add: 10 },
      { stat: 'energyBurn', mul: 0.9 },
    ],
  },
];

const edges: TreeEdge[] = [
  { a: 'root', b: 'str1' },
  { a: 'str1', b: 'str2' },
  { a: 'str2', b: 'strN' },
  { a: 'root', b: 'end1' },
  { a: 'end1', b: 'end2' },
  { a: 'end2', b: 'endN' },
  { a: 'root', b: 'tec1' },
  { a: 'tec1', b: 'tec2' },
  { a: 'tec2', b: 'tecN' },
  { a: 'root', b: 'grd1' },
  { a: 'grd1', b: 'grd2' },
  { a: 'grd2', b: 'grdN' },
  // cross-links (alternate routes)
  { a: 'str1', b: 'grd1' },
  { a: 'tec1', b: 'end1' },
  { a: 'str2', b: 'grd2' },
  // speciality approaches
  { a: 'strN', b: 'spec_exosuit' },
  { a: 'grdN', b: 'spec_exosuit' },
  { a: 'tecN', b: 'spec_olympian' },
  { a: 'endN', b: 'spec_ultra' },
];

export const scientist: GameObjectDef = {
  id: 'scientist',
  name: 'Scientist',
  renderKind: 'walker',
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
  },
  slots: [],
  tree: { rootId: 'root', nodes, edges },
};
