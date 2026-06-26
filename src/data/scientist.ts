import type { GameObjectDef, BuildSlot } from './types';

// Character art (composited onto the procedural walker when equipped).
import shoe0 from '../assets/char/shoe0.svg';
import shoe1 from '../assets/char/shoe1.svg';
import shoe2 from '../assets/char/shoe2.svg';
import torso0 from '../assets/char/torso0.svg';
import torso1 from '../assets/char/torso1.svg';
import torso2 from '../assets/char/torso2.svg';
import goggles from '../assets/char/goggles.svg';
import helmet from '../assets/char/helmet.svg';
import backpack from '../assets/char/backpack.svg';
// Board-only icons.
import iconDumbbell from '../assets/icons/dumbbell.svg';
import iconClipboard from '../assets/icons/clipboard.svg';
import iconBattery from '../assets/icons/battery.svg';
import iconNone from '../assets/icons/none.svg';

// ---------------------------------------------------------------------------
// THE SCIENTIST — the first object: a researcher on foot, building a loadout.
// ---------------------------------------------------------------------------
// Unlock costs scale steeply (you can't max the board in one run). Equip costs
// reserve secondary currencies, so your build is constrained by how you play.
// EXTENSION POINT: more slots/upgrades = more data here; the bicycle is a new
// data file entirely.
// ---------------------------------------------------------------------------

const slots: BuildSlot[] = [
  {
    id: 'footwear',
    name: 'Footwear',
    icon: shoe1,
    z: 0,
    upgrades: [
      {
        id: 'shoe_worn',
        name: 'Worn Sneakers',
        desc: 'Whatever was in the lab lost-and-found.',
        tier: 1,
        icon: shoe0,
        unlockCost: {},
        equipCost: {},
        mods: [],
        art: { layer: 'shoe', svg: shoe0 },
      },
      {
        id: 'shoe_running',
        name: 'Running Shoes',
        desc: 'Proper grip and a lighter step.',
        tier: 2,
        icon: shoe1,
        unlockCost: { grants: 150 },
        equipCost: { pace: 30 },
        mods: [
          { stat: 'rollResist', add: -0.2 },
          { stat: 'topSpeed', add: 1 },
        ],
        art: { layer: 'shoe', svg: shoe1 },
      },
      {
        id: 'shoe_spikes',
        name: 'Track Spikes',
        desc: 'Bite into the dirt and launch.',
        tier: 3,
        icon: shoe2,
        unlockCost: { grants: 900 },
        equipCost: { pace: 70, kinetic: 35 },
        mods: [
          { stat: 'rollResist', add: -0.35 },
          { stat: 'topSpeed', add: 2.5 },
          { stat: 'runPower', add: 30 },
        ],
        art: { layer: 'shoe', svg: shoe2 },
      },
    ],
  },
  {
    id: 'bodywear',
    name: 'Bodywear',
    icon: torso1,
    z: 2,
    upgrades: [
      {
        id: 'body_coat',
        name: 'Lab Coat',
        desc: 'Standard issue. Flaps dramatically.',
        tier: 1,
        icon: torso0,
        unlockCost: {},
        equipCost: {},
        mods: [],
        art: { layer: 'torso', svg: torso0 },
      },
      {
        id: 'body_jacket',
        name: 'Track Jacket',
        desc: 'Cuts the breeze a little.',
        tier: 2,
        icon: torso1,
        unlockCost: { grants: 200 },
        equipCost: { pace: 40 },
        mods: [{ stat: 'drag', add: -0.03 }],
        art: { layer: 'torso', svg: torso1 },
      },
      {
        id: 'body_skinsuit',
        name: 'Aero Skinsuit',
        desc: 'Slippery, light, slightly ridiculous.',
        tier: 3,
        icon: torso2,
        unlockCost: { grants: 1100 },
        equipCost: { kinetic: 70 },
        mods: [
          { stat: 'drag', mul: 0.7 },
          { stat: 'weight', add: -4 },
        ],
        art: { layer: 'torso', svg: torso2 },
      },
    ],
  },
  {
    id: 'headgear',
    name: 'Headgear',
    icon: helmet,
    z: 4,
    upgrades: [
      {
        id: 'head_none',
        name: 'Bare Head',
        desc: 'Wind in the hair.',
        tier: 1,
        icon: iconNone,
        unlockCost: {},
        equipCost: {},
        mods: [],
      },
      {
        id: 'head_goggles',
        name: 'Lab Goggles',
        desc: 'Focus and a touch less drag.',
        tier: 2,
        icon: goggles,
        unlockCost: { grants: 130 },
        equipCost: { pace: 20 },
        mods: [
          { stat: 'drag', add: -0.01 },
          { stat: 'staminaRefill', add: 3 },
        ],
        art: { layer: 'headgear', svg: goggles },
      },
      {
        id: 'head_helmet',
        name: 'Aero Helmet',
        desc: 'A teardrop for your skull.',
        tier: 3,
        icon: helmet,
        unlockCost: { grants: 950 },
        equipCost: { kinetic: 55 },
        mods: [
          { stat: 'drag', add: -0.04 },
          { stat: 'topSpeed', add: 1 },
        ],
        art: { layer: 'headgear', svg: helmet },
      },
    ],
  },
  {
    id: 'conditioning',
    name: 'Conditioning',
    icon: iconDumbbell,
    z: 99, // no character art
    upgrades: [
      {
        id: 'cond_base',
        name: 'Casual Jogger',
        desc: 'You run sometimes. On weekends.',
        tier: 1,
        icon: iconClipboard,
        unlockCost: {},
        equipCost: {},
        mods: [],
      },
      {
        id: 'cond_interval',
        name: 'Interval Training',
        desc: 'A bigger gas tank.',
        tier: 2,
        icon: iconDumbbell,
        unlockCost: { grants: 180 },
        equipCost: { momentum: 25 },
        mods: [{ stat: 'maxReserve', add: 45 }],
      },
      {
        id: 'cond_coach',
        name: 'Pro Coaching',
        desc: 'A deep tank and efficient form.',
        tier: 3,
        icon: iconClipboard,
        unlockCost: { grants: 1000 },
        equipCost: { pace: 40, momentum: 40 },
        mods: [
          { stat: 'maxReserve', add: 90 },
          { stat: 'staminaRefill', add: 6 },
          { stat: 'runDrain', add: -3 },
        ],
      },
    ],
  },
  {
    id: 'power',
    name: 'Power Source',
    icon: iconBattery,
    z: 1, // backpack behind torso
    upgrades: [
      {
        id: 'power_none',
        name: 'None',
        desc: 'Just muscle and willpower.',
        tier: 1,
        icon: iconNone,
        unlockCost: {},
        equipCost: {},
        mods: [],
      },
      {
        id: 'power_exosuit',
        name: 'Lab-Funded Exosuit',
        desc: 'An externally-powered exosuit adds passive force from the reserve — even idle runs go far. Heavy, expensive, tireless.',
        tier: 2,
        icon: iconBattery,
        unlockCost: { grants: 3500 },
        equipCost: { pace: 110, kinetic: 80, momentum: 80 },
        mods: [
          { stat: 'assist', add: 90 },
          { stat: 'walkPower', add: 25 },
          { stat: 'weight', add: 18 },
        ],
        art: { layer: 'back', svg: backpack },
      },
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
  },
  slots,
};
