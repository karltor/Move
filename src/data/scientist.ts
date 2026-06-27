import type { GameObjectDef, TreeCategory } from './types';

import shoe1 from '../assets/char/shoe1.svg';
import shoe2 from '../assets/char/shoe2.svg';
import torso1 from '../assets/char/torso1.svg';
import torso2 from '../assets/char/torso2.svg';
import goggles from '../assets/char/goggles.svg';
import helmet from '../assets/char/helmet.svg';
import backpack from '../assets/char/backpack.svg';
import iconDumbbell from '../assets/icons/dumbbell.svg';
import iconClipboard from '../assets/icons/clipboard.svg';
import iconBattery from '../assets/icons/battery.svg';
import iconNone from '../assets/icons/none.svg';

// ---------------------------------------------------------------------------
// THE SCIENTIST — research tech tree (replaces the equip board).
// Spend Research on node ranks; deeper/stronger nodes also cost the physics
// currencies. Prerequisites gate paths; you specialise rather than max it all.
// Certain nodes swap the character's SVG art as they rank up.
// ---------------------------------------------------------------------------

const categories: TreeCategory[] = [
  // ===== TOP BAND ========================================================
  {
    id: 'footwear',
    name: 'Footwear',
    color: '#f6ad55',
    icon: shoe1,
    band: 'top',
    nodes: [
      { id: 'fw_root', name: 'Basic Shoes', desc: 'Something on your feet.', icon: shoe1, root: true, maxRanks: 1, cost: {}, mods: [], prereqs: [], col: 1, row: 0 },
      { id: 'fw_light', name: 'Lightweight Materials', desc: 'Shed shoe weight each rank.', icon: shoe1, maxRanks: 3, cost: { research: 60 }, mods: [{ stat: 'weight', mul: 0.97 }], prereqs: ['fw_root'], col: 0, row: 1,
        art: { layer: 'shoe', ranks: [{ minRank: 1, svg: shoe1 }, { minRank: 3, svg: shoe2 }] } },
      { id: 'fw_grip', name: 'Grip Enhancement', desc: 'Less rolling resistance.', icon: shoe1, maxRanks: 3, cost: { research: 55 }, mods: [{ stat: 'rollResist', add: -0.12 }], prereqs: ['fw_root'], col: 2, row: 1 },
      { id: 'fw_spring', name: 'Spring Soles', desc: 'Bounce into each stride.', icon: shoe2, maxRanks: 3, cost: { research: 140, kinetic: 12 }, mods: [{ stat: 'runPower', add: 14 }], prereqs: ['fw_light'], col: 0, row: 2 },
      { id: 'fw_terrain', name: 'All-Terrain Sole', desc: 'Top speed on rough ground.', icon: shoe2, maxRanks: 2, cost: { research: 160, momentum: 14 }, mods: [{ stat: 'topSpeed', add: 0.8 }], prereqs: ['fw_grip'], col: 2, row: 2 },
    ],
  },
  {
    id: 'outerwear',
    name: 'Outerwear',
    color: '#fc8181',
    icon: torso1,
    band: 'top',
    nodes: [
      { id: 'ow_root', name: 'Lab Coat', desc: 'Flaps heroically.', icon: torso1, root: true, maxRanks: 1, cost: {}, mods: [], prereqs: [], col: 1, row: 0 },
      { id: 'ow_aero', name: 'Aerodynamics', desc: 'Cut drag each rank.', icon: torso1, maxRanks: 3, cost: { research: 80 }, mods: [{ stat: 'drag', mul: 0.9 }], prereqs: ['ow_root'], col: 1, row: 1,
        art: { layer: 'torso', ranks: [{ minRank: 1, svg: torso1 }, { minRank: 3, svg: torso2 }] } },
      { id: 'ow_seal', name: 'Weather Sealing', desc: 'Burn energy slower.', icon: torso2, maxRanks: 2, cost: { research: 130 }, mods: [{ stat: 'energyBurn', mul: 0.93 }], prereqs: ['ow_aero'], col: 0, row: 2 },
      { id: 'ow_light', name: 'Synthetic Weave', desc: 'Lighter outer layer.', icon: torso2, maxRanks: 3, cost: { research: 110, kinetic: 10 }, mods: [{ stat: 'weight', add: -2 }], prereqs: ['ow_aero'], col: 2, row: 2 },
    ],
  },
  {
    id: 'conditioning',
    name: 'Conditioning',
    color: '#68d391',
    icon: iconClipboard,
    band: 'top',
    nodes: [
      { id: 'co_root', name: 'Stamina I', desc: 'You jog on weekends.', icon: iconClipboard, root: true, maxRanks: 1, cost: {}, mods: [], prereqs: [], col: 1, row: 0 },
      { id: 'co_cardio', name: 'Cardio Capacity', desc: 'Deeper energy reserve.', icon: iconDumbbell, maxRanks: 3, cost: { research: 70 }, mods: [{ stat: 'maxReserve', add: 35 }], prereqs: ['co_root'], col: 0, row: 1 },
      { id: 'co_breath', name: 'Breath Control', desc: 'Refill stamina faster.', icon: iconDumbbell, maxRanks: 3, cost: { research: 65 }, mods: [{ stat: 'staminaRefill', add: 3 }], prereqs: ['co_root'], col: 2, row: 1 },
      { id: 'co_recovery', name: 'Recovery Speed', desc: 'Tire slower while exerting.', icon: iconClipboard, maxRanks: 2, cost: { research: 120, pace: 14 }, mods: [{ stat: 'runDrain', add: -2 }], prereqs: ['co_breath'], col: 2, row: 2 },
      { id: 'co_endless', name: 'Endless Stamina', desc: 'A huge second tank.', icon: iconClipboard, maxRanks: 1, cost: { research: 400, pace: 60 }, mods: [{ stat: 'maxReserve', add: 140 }], prereqs: ['co_cardio'], col: 0, row: 2 },
    ],
  },
  {
    id: 'muscles',
    name: 'Muscles & Strength',
    color: '#63b3ed',
    icon: iconDumbbell,
    band: 'top',
    nodes: [
      { id: 'mu_root', name: 'Strength I', desc: 'Newfound gains.', icon: iconDumbbell, root: true, maxRanks: 1, cost: {}, mods: [], prereqs: [], col: 1, row: 0 },
      { id: 'mu_explosive', name: 'Explosive Power', desc: 'Big running power.', icon: iconDumbbell, maxRanks: 3, cost: { research: 90, kinetic: 12 }, mods: [{ stat: 'runPower', add: 18 }], prereqs: ['mu_root'], col: 0, row: 1 },
      { id: 'mu_core', name: 'Core Strength', desc: 'Stronger base stride.', icon: iconDumbbell, maxRanks: 3, cost: { research: 80 }, mods: [{ stat: 'walkPower', add: 14 }], prereqs: ['mu_root'], col: 2, row: 1 },
      { id: 'mu_peak', name: 'Peak Physique', desc: 'Capstone: power + ceiling.', icon: iconDumbbell, maxRanks: 1, cost: { research: 500, kinetic: 60, momentum: 40 }, mods: [{ stat: 'runPower', add: 50 }, { stat: 'topSpeed', add: 2 }], prereqs: ['mu_explosive', 'mu_core'], col: 1, row: 2 },
    ],
  },
  {
    id: 'brain',
    name: 'Brain & Mind',
    color: '#b794f4',
    icon: goggles,
    band: 'top',
    nodes: [
      { id: 'br_root', name: 'Focus I', desc: 'Clearer thinking.', icon: goggles, root: true, maxRanks: 1, cost: {}, mods: [], prereqs: [], col: 1, row: 0 },
      { id: 'br_reaction', name: 'Reaction Time', desc: 'Raise your speed ceiling.', icon: goggles, maxRanks: 3, cost: { research: 100 }, mods: [{ stat: 'topSpeed', add: 0.5 }], prereqs: ['br_root'], col: 1, row: 1,
        art: { layer: 'headgear', ranks: [{ minRank: 1, svg: goggles }, { minRank: 3, svg: helmet }] } },
      { id: 'br_efficiency', name: 'Mental Efficiency', desc: 'Move more economically.', icon: goggles, maxRanks: 3, cost: { research: 110 }, mods: [{ stat: 'energyBurn', mul: 0.95 }], prereqs: ['br_root'], col: 0, row: 2 },
      { id: 'br_flow', name: 'Flow State', desc: 'Refill + drain in harmony.', icon: helmet, maxRanks: 2, cost: { research: 200, pace: 20 }, mods: [{ stat: 'staminaRefill', add: 4 }, { stat: 'runDrain', add: -1 }], prereqs: ['br_reaction'], col: 2, row: 2 },
    ],
  },

  // ===== BOTTOM BAND =====================================================
  {
    id: 'technology',
    name: 'Technology',
    color: '#4fd1c5',
    icon: iconBattery,
    band: 'bottom',
    nodes: [
      { id: 'te_root', name: 'Basic Research', desc: 'The lab hums to life.', icon: iconBattery, root: true, maxRanks: 1, cost: {}, mods: [], prereqs: [], col: 1, row: 0 },
      { id: 'te_exo', name: 'Exosuit Frame', desc: 'Powered assist; adds weight.', icon: iconBattery, maxRanks: 3, cost: { research: 260, momentum: 30 }, mods: [{ stat: 'assist', add: 28 }, { stat: 'weight', add: 6 }], prereqs: ['te_root'], col: 1, row: 1,
        art: { layer: 'back', ranks: [{ minRank: 1, svg: backpack }] } },
      { id: 'te_servo', name: 'Servo Motors', desc: 'Mechanised power.', icon: iconBattery, maxRanks: 2, cost: { research: 320, kinetic: 30 }, mods: [{ stat: 'runPower', add: 22 }], prereqs: ['te_exo'], col: 0, row: 2 },
      { id: 'te_battery', name: 'Bigger Battery', desc: 'Assist that lasts the run.', icon: iconBattery, maxRanks: 2, cost: { research: 300, momentum: 30 }, mods: [{ stat: 'assist', add: 20 }], prereqs: ['te_exo'], col: 2, row: 2 },
    ],
  },
  {
    id: 'survival',
    name: 'Survival',
    color: '#f6e05e',
    icon: iconNone,
    band: 'bottom',
    nodes: [
      { id: 'su_root', name: 'Survival Basics', desc: 'Keep moving, keep breathing.', icon: iconNone, root: true, maxRanks: 1, cost: {}, mods: [], prereqs: [], col: 1, row: 0 },
      { id: 'su_pacing', name: 'Pacing', desc: 'Smarter effort each rank.', icon: iconClipboard, maxRanks: 3, cost: { research: 75 }, mods: [{ stat: 'staminaRefill', add: 2 }, { stat: 'runDrain', add: -1 }], prereqs: ['su_root'], col: 0, row: 1 },
      { id: 'su_forage', name: 'Foraging', desc: 'Top up the energy tank.', icon: iconNone, maxRanks: 3, cost: { research: 85 }, mods: [{ stat: 'maxReserve', add: 25 }], prereqs: ['su_root'], col: 2, row: 1 },
      { id: 'su_wind', name: 'Second Wind', desc: 'A burst pool that refuses to quit.', icon: iconClipboard, maxRanks: 1, cost: { research: 260, pace: 30 }, mods: [{ stat: 'maxStamina', add: 50 }], prereqs: ['su_pacing'], col: 0, row: 2 },
      { id: 'su_acclim', name: 'Acclimatization', desc: 'Shrug off the weather — dampens its effects each rank.', icon: iconNone, maxRanks: 3, cost: { research: 130, momentum: 12 }, mods: [{ stat: 'weatherResist', add: 0.18 }], prereqs: ['su_forage'], col: 2, row: 2 },
    ],
  },
  {
    id: 'specialization',
    name: 'Specialization',
    color: '#f6ad55',
    icon: helmet,
    band: 'bottom',
    nodes: [
      { id: 'sp_root', name: 'Scientist Path', desc: 'Choose what you become.', icon: helmet, root: true, maxRanks: 1, cost: {}, mods: [], prereqs: [], col: 1, row: 0 },
      { id: 'sp_sprinter', name: 'Olympic Sprinter', desc: 'All-out speed specialist.', icon: shoe2, maxRanks: 1, cost: { research: 700, kinetic: 100 }, mods: [{ stat: 'runPower', add: 70 }, { stat: 'topSpeed', add: 4 }, { stat: 'maxReserve', add: -20 }], prereqs: ['sp_root', 'mu_peak'], col: 0, row: 1 },
      { id: 'sp_perpetual', name: 'Perpetual Motion', desc: 'Run nearly forever.', icon: iconBattery, maxRanks: 1, cost: { research: 700, momentum: 100 }, mods: [{ stat: 'energyBurn', mul: 0.7 }, { stat: 'maxReserve', add: 150 }], prereqs: ['sp_root', 'co_endless'], col: 2, row: 1 },
    ],
  },
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
    weatherResist: 0,
  },
  categories,
};
