import type { GameObjectDef, TreeCategory } from './types';

// ---------------------------------------------------------------------------
// THE SCIENTIST — research tech tree.
// Spend Research on node ranks; deeper/stronger nodes also cost the physics
// currencies. Prerequisites gate paths; you specialise rather than max it all.
// Certain nodes upgrade the character's look (typed cosmetic slots) as they
// rank up.
// ---------------------------------------------------------------------------

const categories: TreeCategory[] = [
  {
    id: 'footwear',
    name: 'Footwear',
    color: '#f6ad55',
    icon: '👟',
    blurb: 'Lab loafers were never meant for this. Better shoes, better strides.',
    nodes: [
      {
        id: 'fw_light', name: 'Lightweight Materials', desc: 'Shed shoe weight each rank.', icon: '🪶',
        maxRanks: 3, cost: { research: 60 }, mods: [{ stat: 'weight', mul: 0.97 }], prereqs: [],
        cosmetic: { slot: 'shoes', tiers: [{ minRank: 1, tier: 1 }, { minRank: 3, tier: 2 }] },
      },
      {
        id: 'fw_grip', name: 'Grip Enhancement', desc: 'Less rolling resistance.', icon: '🦶',
        maxRanks: 3, cost: { research: 55 }, mods: [{ stat: 'rollResist', add: -0.12 }], prereqs: [],
      },
      {
        id: 'fw_spring', name: 'Spring Soles', desc: 'Bounce into each stride.', icon: '🦘',
        maxRanks: 3, cost: { research: 140, kinetic: 12 }, mods: [{ stat: 'runPower', add: 14 }], prereqs: ['fw_light'],
      },
      {
        id: 'fw_terrain', name: 'All-Terrain Sole', desc: 'Top speed on rough ground.', icon: '⛰️',
        maxRanks: 2, cost: { research: 160, momentum: 14 }, mods: [{ stat: 'topSpeed', add: 0.8 }], prereqs: ['fw_grip'],
      },
    ],
  },
  {
    id: 'outerwear',
    name: 'Outerwear',
    color: '#fc8181',
    icon: '🧥',
    blurb: 'The lab coat flaps heroically — but it flaps. Tailor it for speed.',
    nodes: [
      {
        id: 'ow_aero', name: 'Aerodynamics', desc: 'Cut drag each rank.', icon: '🌀',
        maxRanks: 3, cost: { research: 80 }, mods: [{ stat: 'drag', mul: 0.9 }], prereqs: [],
        cosmetic: { slot: 'coat', tiers: [{ minRank: 1, tier: 1 }, { minRank: 3, tier: 2 }] },
      },
      {
        id: 'ow_seal', name: 'Weather Sealing', desc: 'Burn energy slower.', icon: '🧵',
        maxRanks: 2, cost: { research: 130 }, mods: [{ stat: 'energyBurn', mul: 0.93 }], prereqs: ['ow_aero'],
      },
      {
        id: 'ow_light', name: 'Synthetic Weave', desc: 'Lighter outer layer.', icon: '🧶',
        maxRanks: 3, cost: { research: 110, kinetic: 10 }, mods: [{ stat: 'weight', add: -2 }], prereqs: ['ow_aero'],
      },
    ],
  },
  {
    id: 'conditioning',
    name: 'Conditioning',
    color: '#68d391',
    icon: '🫀',
    blurb: 'You jog on weekends. Time to make a habit of it.',
    nodes: [
      {
        id: 'co_cardio', name: 'Cardio Capacity', desc: 'Deeper energy reserve.', icon: '🫁',
        maxRanks: 3, cost: { research: 70 }, mods: [{ stat: 'maxReserve', add: 35 }], prereqs: [],
      },
      {
        id: 'co_breath', name: 'Breath Control', desc: 'Refill stamina faster.', icon: '😮‍💨',
        maxRanks: 3, cost: { research: 65 }, mods: [{ stat: 'staminaRefill', add: 3 }], prereqs: [],
      },
      {
        id: 'co_recovery', name: 'Recovery Speed', desc: 'Tire slower while exerting.', icon: '💓',
        maxRanks: 2, cost: { research: 120, pace: 14 }, mods: [{ stat: 'runDrain', add: -2 }], prereqs: ['co_breath'],
      },
      {
        id: 'co_endless', name: 'Endless Stamina', desc: 'A huge second tank.', icon: '🔋',
        maxRanks: 1, cost: { research: 400, pace: 60 }, mods: [{ stat: 'maxReserve', add: 140 }], prereqs: ['co_cardio'],
      },
    ],
  },
  {
    id: 'muscles',
    name: 'Muscles & Strength',
    color: '#63b3ed',
    icon: '💪',
    blurb: 'Newfound gains. The bench press was a control group all along.',
    nodes: [
      {
        id: 'mu_explosive', name: 'Explosive Power', desc: 'Big running power.', icon: '🧨',
        maxRanks: 3, cost: { research: 90, kinetic: 12 }, mods: [{ stat: 'runPower', add: 18 }], prereqs: [],
      },
      {
        id: 'mu_core', name: 'Core Strength', desc: 'Stronger base stride.', icon: '🏋️',
        maxRanks: 3, cost: { research: 80 }, mods: [{ stat: 'walkPower', add: 14 }], prereqs: [],
      },
      {
        id: 'mu_peak', name: 'Peak Physique', desc: 'Capstone: power + ceiling.', icon: '🏆',
        maxRanks: 1, cost: { research: 500, kinetic: 60, momentum: 40 },
        mods: [{ stat: 'runPower', add: 50 }, { stat: 'topSpeed', add: 2 }], prereqs: ['mu_explosive', 'mu_core'],
      },
    ],
  },
  {
    id: 'mind',
    name: 'Brain & Mind',
    color: '#b794f4',
    icon: '🧠',
    blurb: 'Clearer thinking. The body follows where the mind paces it.',
    nodes: [
      {
        id: 'br_reaction', name: 'Reaction Time', desc: 'Raise your speed ceiling.', icon: '⚡',
        maxRanks: 3, cost: { research: 100 }, mods: [{ stat: 'topSpeed', add: 0.5 }], prereqs: [],
        cosmetic: { slot: 'headgear', tiers: [{ minRank: 1, tier: 1 }, { minRank: 3, tier: 2 }] },
      },
      {
        id: 'br_efficiency', name: 'Mental Efficiency', desc: 'Move more economically.', icon: '🧮',
        maxRanks: 3, cost: { research: 110 }, mods: [{ stat: 'energyBurn', mul: 0.95 }], prereqs: [],
      },
      {
        id: 'br_flow', name: 'Flow State', desc: 'Refill + drain in harmony.', icon: '🌊',
        maxRanks: 2, cost: { research: 200, pace: 20 },
        mods: [{ stat: 'staminaRefill', add: 4 }, { stat: 'runDrain', add: -1 }], prereqs: ['br_reaction'],
      },
    ],
  },
  {
    id: 'technology',
    name: 'Technology',
    color: '#4fd1c5',
    icon: '🔧',
    blurb: 'The lab hums to life. If legs won’t do it, servos will help.',
    nodes: [
      {
        id: 'te_exo', name: 'Exosuit Frame', desc: 'Powered assist; adds weight.', icon: '🦾',
        maxRanks: 3, cost: { research: 260, momentum: 30 },
        mods: [{ stat: 'assist', add: 28 }, { stat: 'weight', add: 6 }], prereqs: [],
        cosmetic: { slot: 'back', tiers: [{ minRank: 1, tier: 1 }] },
      },
      {
        id: 'te_servo', name: 'Servo Motors', desc: 'Mechanised power.', icon: '⚙️',
        maxRanks: 2, cost: { research: 320, kinetic: 30 }, mods: [{ stat: 'runPower', add: 22 }], prereqs: ['te_exo'],
      },
      {
        id: 'te_battery', name: 'Bigger Battery', desc: 'Assist that lasts the run.', icon: '🔌',
        maxRanks: 2, cost: { research: 300, momentum: 30 }, mods: [{ stat: 'assist', add: 20 }], prereqs: ['te_exo'],
      },
    ],
  },
  {
    id: 'survival',
    name: 'Survival',
    color: '#f6e05e',
    icon: '🏕️',
    blurb: 'Keep moving, keep breathing. The field is rougher than the lab.',
    nodes: [
      {
        id: 'su_pacing', name: 'Pacing', desc: 'Smarter effort each rank.', icon: '⏱️',
        maxRanks: 3, cost: { research: 75 },
        mods: [{ stat: 'staminaRefill', add: 2 }, { stat: 'runDrain', add: -1 }], prereqs: [],
      },
      {
        id: 'su_forage', name: 'Foraging', desc: 'Top up the energy tank.', icon: '🫐',
        maxRanks: 3, cost: { research: 85 }, mods: [{ stat: 'maxReserve', add: 25 }], prereqs: [],
      },
      {
        id: 'su_wind', name: 'Second Wind', desc: 'A burst pool that refuses to quit.', icon: '🌬️',
        maxRanks: 1, cost: { research: 260, pace: 30 }, mods: [{ stat: 'maxStamina', add: 50 }], prereqs: ['su_pacing'],
      },
      {
        id: 'su_acclim', name: 'Acclimatization', desc: 'Shrug off the weather — dampens its effects each rank.', icon: '🌦️',
        maxRanks: 3, cost: { research: 130, momentum: 12 }, mods: [{ stat: 'weatherResist', add: 0.18 }], prereqs: ['su_forage'],
      },
    ],
  },
  {
    id: 'specialization',
    name: 'Specialization',
    color: '#ed8936',
    icon: '🏅',
    blurb: 'Choose what you become. Capstones demand a mastered path.',
    nodes: [
      {
        id: 'sp_sprinter', name: 'Olympic Sprinter', desc: 'All-out speed specialist.', icon: '🥇',
        maxRanks: 1, cost: { research: 700, kinetic: 100 },
        mods: [{ stat: 'runPower', add: 70 }, { stat: 'topSpeed', add: 4 }, { stat: 'maxReserve', add: -20 }],
        prereqs: ['mu_peak'],
      },
      {
        id: 'sp_perpetual', name: 'Perpetual Motion', desc: 'Run nearly forever.', icon: '♾️',
        maxRanks: 1, cost: { research: 700, momentum: 100 },
        mods: [{ stat: 'energyBurn', mul: 0.7 }, { stat: 'maxReserve', add: 150 }],
        prereqs: ['co_endless'],
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
    weatherResist: 0,
  },
  categories,
};
