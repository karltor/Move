import type { NodeDef } from './types';

// ---------------------------------------------------------------------------
// THE NODE GRAPH — the whole game.
// ---------------------------------------------------------------------------
// Columns are depth (left = start, right = late game); rows group branches:
//   rows 0-1  BODY   (endurance & strength)
//   rows 2-3  MIND   (pacing & efficiency)
//   rows 3-4  MODE   (traversal: skateboard → bicycle → rocket skates)
//   rows 4-5  GEAR   (worn equipment; changes the character's look)
//   row  6    TECH   (powered assist)
//
// Balance intent: unlock costs (Research ≈ metres run) roughly triple per
// column, so the skateboard lands after the first hour and the bicycle a
// couple of hours in. Equip costs always add up to far more Flux than you
// have — the loadout is where the choices happen.
// ---------------------------------------------------------------------------

export const NODES: NodeDef[] = [
  // ===== BODY ==============================================================
  {
    id: 'b_stride', name: 'Longer Strides', icon: '🦵', branch: 'body', pos: { col: 0, row: 0 },
    desc: 'Cover more ground with every step.',
    prereqs: [], unlockCost: 60, maxRanks: 3, rankCost: 12, equipCost: 20,
    mods: [{ stat: 'walkPower', add: 12 }],
  },
  {
    id: 'b_lungs', name: 'Bigger Lungs', icon: '🫁', branch: 'body', pos: { col: 0, row: 1 },
    desc: 'A deeper energy reserve before you drop.',
    prereqs: [], unlockCost: 70, maxRanks: 3, rankCost: 14, equipCost: 25,
    mods: [{ stat: 'maxReserve', add: 30 }],
  },
  {
    id: 'b_sprint', name: 'Sprint Muscles', icon: '💨', branch: 'body', pos: { col: 1, row: 0 },
    desc: 'Explosive force while you push.',
    prereqs: ['b_stride'], unlockCost: 220, maxRanks: 3, rankCost: 22, equipCost: 45,
    mods: [{ stat: 'runPower', add: 20 }],
  },
  {
    id: 'b_recovery', name: 'Fast Recovery', icon: '💓', branch: 'body', pos: { col: 1, row: 1 },
    desc: 'Catch your breath quicker between bursts.',
    prereqs: ['b_lungs'], unlockCost: 200, maxRanks: 3, rankCost: 20, equipCost: 40,
    mods: [{ stat: 'staminaRefill', add: 3 }],
  },
  {
    id: 'b_feather', name: 'Featherweight', icon: '🪶', branch: 'body', pos: { col: 2, row: 0 },
    desc: 'Train off every gram you can spare.',
    prereqs: ['b_sprint'], unlockCost: 1000, maxRanks: 3, rankCost: 55, equipCost: 95,
    mods: [{ stat: 'weight', mul: 0.95 }],
  },
  {
    id: 'b_marathon', name: 'Marathon Blood', icon: '🩸', branch: 'body', pos: { col: 2, row: 1 },
    desc: 'Burn energy slower, run further.',
    prereqs: ['b_recovery'], unlockCost: 800, maxRanks: 3, rankCost: 45, equipCost: 90,
    mods: [{ stat: 'energyBurn', mul: 0.93 }],
  },
  {
    id: 'b_titan', name: 'Titan Legs', icon: '🏋️', branch: 'body', pos: { col: 3, row: 0 },
    desc: 'Power AND a higher ceiling.',
    prereqs: ['b_feather'], unlockCost: 3000, maxRanks: 2, rankCost: 120, equipCost: 180,
    mods: [{ stat: 'runPower', add: 45 }, { stat: 'topSpeed', add: 1.5 }],
  },
  {
    id: 'b_heart', name: 'Second Heart', icon: '❤️‍🔥', branch: 'body', pos: { col: 4, row: 1 },
    desc: 'Not a metaphor. The lab checked.',
    prereqs: ['b_marathon'], unlockCost: 9000, maxRanks: 1, rankCost: 0, equipCost: 320,
    mods: [{ stat: 'maxReserve', add: 180 }, { stat: 'staminaRefill', add: 4 }],
  },

  // ===== MIND ==============================================================
  {
    id: 'm_focus', name: 'Focus', icon: '🎯', branch: 'mind', pos: { col: 0, row: 2 },
    desc: 'A clearer head raises your speed ceiling.',
    prereqs: [], unlockCost: 80, maxRanks: 3, rankCost: 15, equipCost: 25,
    mods: [{ stat: 'topSpeed', add: 0.6 }],
  },
  {
    id: 'm_meditate', name: 'Meditation', icon: '🧘', branch: 'mind', pos: { col: 0, row: 3 },
    desc: 'A bigger burst pool to draw on.',
    prereqs: [], unlockCost: 90, maxRanks: 3, rankCost: 15, equipCost: 25,
    mods: [{ stat: 'maxStamina', add: 15 }],
  },
  {
    id: 'm_rhythm', name: 'Rhythm', icon: '🎵', branch: 'mind', pos: { col: 1, row: 2 },
    desc: 'Waste less burst with every push.',
    prereqs: ['m_focus'], unlockCost: 250, maxRanks: 3, rankCost: 24, equipCost: 45,
    mods: [{ stat: 'runDrain', add: -1.5 }],
  },
  {
    id: 'm_econ', name: 'Economy of Motion', icon: '🧮', branch: 'mind', pos: { col: 2, row: 2 },
    desc: 'No wasted movement, no wasted heat.',
    prereqs: ['m_rhythm'], unlockCost: 900, maxRanks: 3, rankCost: 50, equipCost: 100,
    mods: [{ stat: 'energyBurn', mul: 0.94 }, { stat: 'drag', mul: 0.97 }],
  },
  {
    id: 'm_flow', name: 'Flow State', icon: '🌊', branch: 'mind', pos: { col: 3, row: 2 },
    desc: 'Refill and drain in perfect harmony.',
    prereqs: ['m_econ'], unlockCost: 3500, maxRanks: 2, rankCost: 140, equipCost: 200,
    mods: [{ stat: 'staminaRefill', add: 5 }, { stat: 'runDrain', add: -2 }],
  },

  // ===== MODES (traversal spine) ==========================================
  {
    id: 'v_skate', name: 'Skateboard', icon: '🛹', branch: 'mode', pos: { col: 2, row: 3 },
    desc: 'TRAVERSAL — swap your legs for four wheels. Push hard, glide far.',
    prereqs: ['b_sprint'], unlockCost: 1500, maxRanks: 1, rankCost: 0, equipCost: 150,
    mods: [], mode: 'skateboard',
  },
  {
    id: 'v_wheels', name: 'Ceramic Bearings', icon: '💠', branch: 'mode', pos: { col: 3, row: 3 },
    desc: 'Everything that rolls, rolls smoother.',
    prereqs: ['v_skate'], unlockCost: 2500, maxRanks: 3, rankCost: 90, equipCost: 130,
    mods: [{ stat: 'rollResist', mul: 0.7 }],
  },
  {
    id: 'v_deck', name: 'Carbon Deck', icon: '🪵', branch: 'mode', pos: { col: 3, row: 4 },
    desc: 'Aerospace off-cuts, don’t ask which project.',
    prereqs: ['v_skate'], unlockCost: 2200, maxRanks: 2, rankCost: 80, equipCost: 120,
    mods: [{ stat: 'weight', add: -5 }],
  },
  {
    id: 'v_bike', name: 'Bicycle', icon: '🚲', branch: 'mode', pos: { col: 4, row: 3 },
    desc: 'TRAVERSAL — rotational motion. Sustained power, real speed.',
    prereqs: ['v_skate'], unlockCost: 12000, maxRanks: 1, rankCost: 0, equipCost: 400,
    mods: [], mode: 'bicycle',
  },
  {
    id: 'v_gears', name: 'Racing Gears', icon: '🔩', branch: 'mode', pos: { col: 5, row: 3 },
    desc: 'The right ratio for every stretch.',
    prereqs: ['v_bike'], unlockCost: 20000, maxRanks: 3, rankCost: 400, equipCost: 350,
    mods: [{ stat: 'walkPower', add: 40 }],
  },
  {
    id: 'v_tires', name: 'Slick Tires', icon: '🛞', branch: 'mode', pos: { col: 5, row: 4 },
    desc: 'Barely any tread, barely any friction.',
    prereqs: ['v_bike'], unlockCost: 18000, maxRanks: 2, rankCost: 350, equipCost: 300,
    mods: [{ stat: 'rollResist', mul: 0.6 }, { stat: 'drag', mul: 0.9 }],
  },
  {
    id: 't_rocket', name: 'Rocket Skates', icon: '🚀', branch: 'mode', pos: { col: 6, row: 3 },
    desc: 'TRAVERSAL — strap in. The ethics board resigned.',
    prereqs: ['v_bike', 't_battery'], unlockCost: 60000, maxRanks: 1, rankCost: 0, equipCost: 900,
    mods: [], mode: 'rocket',
  },

  // ===== GEAR ==============================================================
  {
    id: 'g_shoes', name: 'Running Shoes', icon: '👟', branch: 'gear', pos: { col: 0, row: 4 },
    desc: 'Lab loafers were never meant for this.',
    prereqs: [], unlockCost: 50, maxRanks: 3, rankCost: 12, equipCost: 20,
    mods: [{ stat: 'rollResist', add: -0.15 }],
    cosmetic: { slot: 'shoes', tiers: [{ minRank: 1, tier: 1 }, { minRank: 3, tier: 2 }] },
  },
  {
    id: 'g_coat', name: 'Tailored Coat', icon: '🧥', branch: 'gear', pos: { col: 0, row: 5 },
    desc: 'It still flaps heroically — just less.',
    prereqs: [], unlockCost: 60, maxRanks: 3, rankCost: 12, equipCost: 20,
    mods: [{ stat: 'drag', mul: 0.9 }],
    cosmetic: { slot: 'coat', tiers: [{ minRank: 1, tier: 1 }] },
  },
  {
    id: 'g_springs', name: 'Spring Soles', icon: '🦘', branch: 'gear', pos: { col: 1, row: 4 },
    desc: 'Bounce into every stride.',
    prereqs: ['g_shoes'], unlockCost: 240, maxRanks: 3, rankCost: 24, equipCost: 50,
    mods: [{ stat: 'runPower', add: 16 }],
  },
  {
    id: 'g_weather', name: 'All-Weather Kit', icon: '🌦️', branch: 'gear', pos: { col: 1, row: 5 },
    desc: 'Rain, heat, headwind — shrug it all off.',
    prereqs: ['g_coat'], unlockCost: 700, maxRanks: 3, rankCost: 40, equipCost: 80,
    mods: [{ stat: 'weatherResist', add: 0.2 }],
  },
  {
    id: 'g_helmet', name: 'Aero Helmet', icon: '⛑️', branch: 'gear', pos: { col: 2, row: 5 },
    desc: 'Cuts the wind and the risk assessment.',
    prereqs: ['g_coat'], unlockCost: 1000, maxRanks: 2, rankCost: 55, equipCost: 110,
    mods: [{ stat: 'drag', mul: 0.88 }, { stat: 'topSpeed', add: 0.4 }],
    cosmetic: { slot: 'headgear', tiers: [{ minRank: 1, tier: 1 }, { minRank: 2, tier: 2 }] },
  },
  {
    id: 'g_suit', name: 'Speed Suit', icon: '🥷', branch: 'gear', pos: { col: 3, row: 5 },
    desc: 'Skin-tight, matte black, extremely serious.',
    prereqs: ['g_helmet'], unlockCost: 8000, maxRanks: 2, rankCost: 260, equipCost: 300,
    mods: [{ stat: 'drag', mul: 0.8 }, { stat: 'weight', add: -4 }],
    cosmetic: { slot: 'coat', tiers: [{ minRank: 1, tier: 2 }] },
  },

  // ===== TECH ==============================================================
  {
    id: 't_exo', name: 'Exo Frame', icon: '🦾', branch: 'tech', pos: { col: 1, row: 6 },
    desc: 'Powered assist that never tires. Adds weight.',
    prereqs: [], unlockCost: 400, maxRanks: 3, rankCost: 35, equipCost: 70,
    mods: [{ stat: 'assist', add: 20 }, { stat: 'weight', add: 5 }],
    cosmetic: { slot: 'back', tiers: [{ minRank: 1, tier: 1 }] },
  },
  {
    id: 't_servo', name: 'Servo Boost', icon: '⚙️', branch: 'tech', pos: { col: 2, row: 6 },
    desc: 'Mechanised power behind every push.',
    prereqs: ['t_exo'], unlockCost: 1200, maxRanks: 2, rankCost: 70, equipCost: 120,
    mods: [{ stat: 'runPower', add: 30 }],
  },
  {
    id: 't_battery', name: 'Battery Pack', icon: '🔋', branch: 'tech', pos: { col: 3, row: 6 },
    desc: 'Assist that lasts the whole run.',
    prereqs: ['t_exo'], unlockCost: 2800, maxRanks: 2, rankCost: 110, equipCost: 160,
    mods: [{ stat: 'assist', add: 30 }],
  },
  {
    id: 't_dynamo', name: 'Dynamo', icon: '🌀', branch: 'tech', pos: { col: 4, row: 6 },
    desc: 'Harvest your own motion back.',
    prereqs: ['t_battery'], unlockCost: 9000, maxRanks: 2, rankCost: 280, equipCost: 350,
    mods: [{ stat: 'assist', add: 50 }, { stat: 'energyBurn', mul: 0.95 }],
  },
];

export const NODES_BY_ID: ReadonlyMap<string, NodeDef> = new Map(NODES.map((n) => [n.id, n]));

export const BRANCH_COLORS: Record<NodeDef['branch'], string> = {
  body: '#68d391',
  mind: '#b794f4',
  gear: '#f6ad55',
  tech: '#4fd1c5',
  mode: '#f6e05e',
};
