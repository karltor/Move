import type { Stat } from "./research";
export type Discovery = [
  name: string,
  description: string,
  effects: Partial<Record<Stat, number>>,
  icon: string,
  ability?: string,
  maxRank?: number,
  multipliers?: Partial<Record<Stat, number>>,
];

// Specializations join again after either branch. Costs and exclusions live
// in research.ts; every advertised effect has a simulation stat or ability.
export const RUNNER: Discovery[][] = [
  [
    [
      "Warm-up ritual",
      "A proper warm-up gives Ellis a larger stamina reserve for the next run.",
      { stamina: 0.15 },
      "heart",
    ],
    [
      "Long, slow training",
      "Practise relaxed distance runs. Every stride uses less energy at the same pace.",
      { economy: 0.22 },
      "lungs",
    ],
    [
      "Interval training",
      "Alternate short efforts with easy jogging. Ellis regains stamina faster when you switch to Recover pace.",
      { recovery: 0.35 },
      "wave",
    ],
    [
      "Second wind",
      "Once per run, dropping below 25% stamina opens a 12-second recovery window. Use Steady pace during it to regain energy.",
      { recovery: 0.18 },
      "heart",
      "second-wind",
    ],
    [
      "Marathon conditioning",
      "Choose economical long-distance conditioning. Cheaper strides and slower fatigue favour a sustained run over fast pace changes.",
      { economy: 0.25, resilience: 0.28 },
      "infinity",
    ],
    [
      "Lactate shuttle",
      "Choose repeated hard efforts. Rebuild speed after rough sections and recover more effectively when you ease the pace.",
      { acceleration: 0.4, recovery: 0.3 },
      "cycle",
    ],
    [
      "Heat acclimation",
      "Training in warm conditions slows fatigue. Desert sections also impose half their extra energy cost.",
      { resilience: 0.3 },
      "sun",
      "heat",
    ],
    [
      "Ultra-distance training",
      "Improve the body's ability to supply muscle through a long attempt before artificial organs become available.",
      { stamina: 0.55, resilience: 0.4 },
      "mountain",
    ],
  ],
  [
    [
      "Cadence metronome",
      "A regular step rhythm helps Ellis regain speed after rough patches. Acceleration matters each time the route slows him down.",
      { acceleration: 0.12 },
      "wave",
    ],
    [
      "Quiet footfall",
      "Place each foot securely on uneven ground. Better grip reduces the slowdown through roadworks and rough trail sections.",
      { traction: 0.3 },
      "foot",
    ],
    [
      "Trail-running technique",
      "Short, quick steps rebuild speed on broken surfaces. Reduce the extra energy cost of rough sections by 35%, at a small cost to everyday efficiency.",
      { acceleration: 0.45, economy: -0.06 },
      "mountain",
      "trailcraft",
    ],
    [
      "Rolling start",
      "Start each attempt at half cruising speed. The warm-up jog happens before the measurements begin.",
      { acceleration: 0.25 },
      "arrow",
      "rolling-start",
    ],
    [
      "Clean racing line",
      "Choose efficient detours. Fast detours keep their speed bonus without the extra energy cost.",
      { economy: 0.12 },
      "route",
      "shortcut",
    ],
    [
      "Negative split",
      "Choose a stronger finish. Beyond 1 km, cruising speed increases by an extra 15%.",
      { resilience: 0.2 },
      "split",
      "negative-split",
    ],
    [
      "Elastic running form",
      "Use the spring in each landing to carry the next stride. Less energy is lost without forcing a higher pace.",
      { economy: 0.3, acceleration: 0.2 },
      "spring",
    ],
    [
      "Race rehearsal",
      "Practised pace changes improve acceleration, cruising speed and the rate of learning from a run.",
      { acceleration: 0.5, speed: 0.25, xp: 0.25 },
      "flag",
    ],
  ],
  [
    [
      "Proper running shoes",
      "Replace the lab slippers with running soles. Ellis holds a faster pace. This footwear research stays active; collected equipment comes later.",
      { speed: 0.08 },
      "shoe",
    ],
    [
      "Blister prevention",
      "Test cushioning and fit before a long run. Comfortable feet slow the buildup of fatigue, so Ellis can hold his pace for longer.",
      { resilience: 0.32 },
      "foot",
    ],
    [
      "Ventilated trail kit",
      "A breathable coat and cushioned kit slow fatigue. The comfortable setup sacrifices a little cruising speed.",
      { resilience: 0.38, speed: -0.03 },
      "coat",
    ],
    [
      "Lightweight pockets",
      "Carry the same instruments with less bulk. Increase speed and reduce the energy cost of movement.",
      { speed: 0.1, economy: 0.12 },
      "pack",
    ],
    [
      "Tuned racing foam",
      "Choose aggressive rebound. Racing foam adds speed and acceleration, but builds fatigue faster.",
      { speed: 0.25, acceleration: 0.25, resilience: -0.1 },
      "shoe",
    ],
    [
      "All-weather layers",
      "Choose a durable expedition kit. A larger reserve and slower fatigue favour distance over explosive acceleration.",
      { stamina: 0.3, resilience: 0.35 },
      "coat",
    ],
    [
      "Servo-assisted knees",
      "Small motors help push through every stride. Rebuild speed faster while spending less energy.",
      { acceleration: 0.45, economy: 0.2 },
      "bolt",
    ],
    [
      "Instrumented hydration vest",
      "Collect richer measurements on long runs. Once supplies are available, each restores 10% more capacity and its cooldown is 15 seconds shorter.",
      { yield: 0.35, stamina: 0.3 },
      "flask",
      "hydration",
    ],
  ],
  [
    [
      "Pocket tailwind",
      "A compact backpack fan adds 0.4 m/s of following wind. It uses energy, so pair its extra speed with efficient running.",
      { wind: 0.2, economy: -0.06 },
      "wind",
    ],
    [
      "Wind-reading ribbons",
      "Airflow markers help adjust the fan direction. More air pushes forward and less energy is wasted.",
      { wind: 0.22, economy: 0.14 },
      "flag",
    ],
    [
      "Trail sampling net",
      "A light collection net gathers useful samples. Increase research yield and equipment discovery odds.",
      { luck: 0.3, yield: 0.12 },
      "pack",
    ],
    [
      "Ducted backpack fan",
      "Guide airflow through a shaped outlet. A stronger tailwind costs additional running energy.",
      { wind: 0.4, economy: -0.08 },
      "wind",
    ],
    [
      "Field survey drone",
      "Record each new biome reached during the attempt. Each one adds 5 RP to the final report.",
      { yield: 0.2 },
      "eye",
      "survey",
    ],
    [
      "Adaptive fan controller",
      "Match fan output to speed instead of running at full power throughout. Improve tailwind and efficiency together.",
      { wind: 0.45, economy: 0.2 },
      "gear",
    ],
    [
      "Sample recognition camera",
      "Recognise unusual finds before Ellis passes them. Improve gear discovery odds and learning from the route.",
      { luck: 0.65, xp: 0.25 },
      "eye",
    ],
    [
      "Personal wind tunnel",
      "A larger ducted rig produces a powerful following wind. Faster movement comes with an energy-efficiency penalty.",
      { wind: 1.1, economy: -0.15 },
      "comet",
    ],
  ],
];

export const PROJECTILE: Discovery[][] = [
  [
    [
      "Smooth river stone",
      "A rounded, balanced stone loses less speed to air resistance and leaves the hand more consistently.",
      { drag: 0.12, stability: 0.15 },
      "stone",
    ],
    [
      "Power throw",
      "A full-body release increases launch speed. The longer wind-up means fewer throws per minute.",
      { launchSpeed: 0.25, reload: -0.15 },
      "spring",
    ],
    [
      "Quick-release throw",
      "A shorter throwing motion prepares the next shot sooner. Each stone leaves the hand slightly slower.",
      { reload: 0.4, launchSpeed: -0.08 },
      "cycle",
    ],
    [
      "Adjustable release angle",
      "Set the next shot's angle between 20° and 65°. Low arcs trade airtime for speed; high arcs keep a stone in the air longer.",
      { stability: 0.18 },
      "route",
      "angle-control",
    ],
    [
      "Skipping stone",
      "Choose a bouncing release for rocks. One ground skip retains 40% of horizontal speed and adds distance after the first landing.",
      { launchSpeed: 0.12 },
      "stone",
      "skip-shot",
    ],
    [
      "Throwing carousel",
      "Choose rapid repeated throws. A carousel feeds the next projectile into position with less preparation and more consistent release.",
      { reload: 0.45, stability: 0.25 },
      "gear",
    ],
    [
      "Robotic throwing arm",
      "Repeat the same release with stronger motors. Increase launch velocity and reduce shot-to-shot dispersion.",
      { launchSpeed: 0.35, stability: 0.4 },
      "bolt",
    ],
    [
      "Flywheel launch arm",
      "Store rotational energy between releases. Very high launch speed needs a longer preparation cycle.",
      { launchSpeed: 0.65, reload: -0.15 },
      "comet",
    ],
  ],
  [
    [
      "Paper airplane",
      "Unlock a paper-plane loadout. Wings provide lift: the plane follows a shallower, longer flight than a rock.",
      { lift: 0.12 },
      "plane",
    ],
    [
      "Needle dart fold",
      "Fold narrow wings and a sharp nose. Air resistance falls, but the plane has less lift. Choose a fast, low flight.",
      { drag: 0.35, lift: -0.15 },
      "arrow",
    ],
    [
      "Broad glider wings",
      "Fold a broad wing that stays aloft longer. Extra lift also adds drag. Choose airtime over speed.",
      { lift: 0.5, drag: -0.12 },
      "feather",
    ],
    [
      "Balanced centre of mass",
      "A correctly placed nose weight keeps the wing level and makes the release repeatable.",
      { stability: 0.35, lift: 0.12 },
      "weight",
    ],
    [
      "Laminar dart skin",
      "Choose a fast dart airframe. A smooth surface preserves forward velocity rather than maximizing time aloft.",
      { drag: 0.5, launchSpeed: 0.15 },
      "wind",
    ],
    [
      "Carbon glider frame",
      "Choose a sustained glider airframe. A stiff, light wing adds lift and consistency at a small aerodynamic penalty.",
      { lift: 0.55, stability: 0.3, drag: -0.08 },
      "hex",
    ],
    [
      "Retractable flight surfaces",
      "Fold the wing during launch, then open it in flight. Improve lift and reduce the overall drag penalty.",
      { lift: 0.3, drag: 0.3 },
      "plane",
    ],
    [
      "High-altitude airframe",
      "A stable frame and efficient wing keep more launch energy through a long flight.",
      { drag: 0.6, lift: 0.4, stability: 0.3 },
      "cloud",
    ],
  ],
  [
    [
      "Slingshot",
      "Unlock a fixed slingshot station. The band stores energy before release; the scientist stays beside the launcher.",
      { stability: 0.15 },
      "fork",
    ],
    [
      "Heavy tension bands",
      "Store more energy in thick elastic bands. Higher launch velocity takes longer to prepare.",
      { launchSpeed: 0.35, reload: -0.18 },
      "spring",
    ],
    [
      "Compound release",
      "Pulleys and a trigger prepare a consistent shot quickly. Launch velocity is slightly lower than the heavy-band setup.",
      { reload: 0.4, stability: 0.25, launchSpeed: -0.06 },
      "gear",
    ],
    [
      "Charged launch",
      "Every third shot stores extra energy: +18% launch velocity, with 1.5 seconds of extra preparation. The other two shots use the normal cycle.",
      { stability: 0.15 },
      "bolt",
      "charged-launch",
    ],
    [
      "Field cannon",
      "Choose heavy launch energy and unlock a field cannon. Its fixed barrel sends a fast projectile along a ballistic arc, with a longer preparation cycle.",
      { launchSpeed: 0.2, reload: -0.12 },
      "cannon",
    ],
    [
      "Rapid-cycle feed",
      "Choose a fast loading cycle. Increase repeated-shot speed, consistency and RP earned from landed shots instead of unlocking the cannon here.",
      { reload: 0.5, stability: 0.3, payload: 0.2 },
      "magnet",
    ],
    [
      "Railgun capacitor bank",
      "Store more launch energy in capacitors. Higher exit speed comes with a slower firing cycle.",
      { launchSpeed: 0.65, reload: -0.2 },
      "bolt",
    ],
    [
      "Orbital mass driver",
      "A long electromagnetic track increases exit velocity and keeps the projectile centred during acceleration.",
      { launchSpeed: 0.8, stability: 0.5 },
      "comet",
    ],
  ],
  [
    [
      "Laser rangefinder",
      "Show a predicted landing range for the selected launcher and angle. Compare it with the actual landing to find the best setup.",
      { xp: 0.15 },
      "eye",
      "rangefinder",
    ],
    [
      "Impact sensors",
      "Measure the energy remaining at landing. Landing measurements provide more RP.",
      { payload: 0.3, yield: 0.12 },
      "wave",
    ],
    [
      "High-speed camera",
      "Track the entire flight to improve launch consistency and learning from each test.",
      { stability: 0.35, xp: 0.25 },
      "eye",
    ],
    [
      "Vacuum test chamber",
      "Reduce air resistance around the test path. Projectiles preserve more horizontal velocity.",
      { drag: 0.5 },
      "flask",
    ],
    [
      "Magnetic beam guides",
      "Centred magnetic guides reduce dispersion and provide cleaner impact measurements.",
      { stability: 0.45, payload: 0.2 },
      "magnet",
    ],
    [
      "Linear acceleration stages",
      "Apply launch energy in successive stages. Increase exit speed, with a longer charging cycle.",
      { launchSpeed: 0.6, reload: -0.1 },
      "arrow",
    ],
    [
      "Recovered beam energy",
      "Recover unused charge between tests. Shorten preparation and increase data from completed shots.",
      { reload: 0.45, yield: 0.25 },
      "cycle",
    ],
    [
      "Particle accelerator",
      "Unlock the accelerator loadout. A fixed emitter launches a small packet at extreme speed; beam stability improves shot consistency.",
      { launchSpeed: 0.5, stability: 0.5, payload: 0.35 },
      "orbit",
    ],
  ],
];

export const WHEELS: Discovery[][] = [
  [
    [
      "Greased bearings",
      "Lubricated bearings reduce rolling losses and slightly increase cruising speed.",
      { economy: 0.18, speed: 0.06 },
      "gear",
    ],
    [
      "Short gearing",
      "Lower gear ratios regain speed quickly after a rough section, but reduce cruising speed.",
      { acceleration: 0.6, speed: -0.08 },
      "cycle",
    ],
    [
      "Tall gearing",
      "Higher gear ratios increase cruising speed. Acceleration is slower after every speed loss.",
      { speed: 0.22, acceleration: -0.12 },
      "gear",
    ],
    [
      "Limited-slip axle",
      "Keep force on the wheel with grip. Acceleration improves and rough sections cause less fatigue.",
      { resilience: 0.25, acceleration: 0.25 },
      "split",
    ],
    [
      "Sequential gearbox",
      "Choose rapid sequential shifts. Rebuild speed faster between rough road sections, with lower transmission losses.",
      { acceleration: 0.55, economy: 0.12 },
      "arrow",
    ],
    [
      "Overdrive transmission",
      "Choose a long cruising ratio. Greater cruising speed comes with slower acceleration after each speed loss.",
      { speed: 0.3, acceleration: -0.1 },
      "gear",
    ],
    [
      "Magnetic bearings",
      "Reduce mechanical contact inside the hubs. Lower rolling losses preserve energy at speed.",
      { economy: 0.45, speed: 0.2 },
      "magnet",
    ],
    [
      "Direct-drive hubs",
      "Put the drive at each wheel. Increase speed and response without losses through long transmission paths.",
      { speed: 0.4, acceleration: 0.4, economy: 0.3 },
      "infinity",
    ],
  ],
  [
    [
      "Flexible deck",
      "A flexible deck absorbs bumps instead of passing every shock to the rider.",
      { resilience: 0.2, stamina: 0.12 },
      "board",
    ],
    [
      "Soapbox cart",
      "Unlock a seated cart. Its stable chassis carries more reserve, but its weight slows acceleration.",
      { stamina: 0.25, resilience: 0.2, acceleration: -0.12 },
      "cart",
    ],
    [
      "Bicycle",
      "Unlock a bicycle. Efficient pedals and a light frame improve acceleration, with a smaller energy reserve.",
      { economy: 0.2, acceleration: 0.25, stamina: -0.08 },
      "bike",
    ],
    [
      "Reinforced chassis",
      "Strengthen the chosen frame. Rough sections build less fatigue and the team can carry more energy.",
      { stamina: 0.18, resilience: 0.25 },
      "hex",
    ],
    [
      "Streamlined cart shell",
      "Choose a streamlined cart. An enclosed shell reduces energy losses and increases comfortable speed.",
      { economy: 0.3, speed: 0.2 },
      "feather",
    ],
    [
      "Land-speed car",
      "Choose a land-speed car. A larger energy reserve supports this much faster vehicle.",
      { stamina: 0.35 },
      "car",
    ],
    [
      "Rocket sled",
      "Unlock a rocket-driven sled. A rigid chassis resists fatigue from sustained high-speed testing.",
      { resilience: 0.4 },
      "comet",
    ],
    [
      "Maglev prototype",
      "Reduce ground contact using magnetic support. Lower losses improve efficiency and cruising speed.",
      { economy: 0.5, speed: 0.35 },
      "orbit",
    ],
  ],
  [
    [
      "Efficient push-off",
      "A better push-off transfers more of the rider's effort into the skateboard's motion.",
      { economy: 0.15, acceleration: 0.12 },
      "foot",
    ],
    [
      "Large battery pack",
      "Carry more stored energy. The extra mass reduces acceleration.",
      { stamina: 0.4, acceleration: -0.12 },
      "pack",
    ],
    [
      "High-output motor",
      "A compact motor accelerates quickly. Its high output uses energy less efficiently.",
      { acceleration: 0.6, economy: -0.12 },
      "bolt",
    ],
    [
      "Battery cooling",
      "Keep the battery within its useful temperature range. Fatigue builds slower and Recovery pace restores more energy.",
      { resilience: 0.35, recovery: 0.3 },
      "snow",
    ],
    [
      "Regenerative braking",
      "Choose energy recovery. Regenerative braking restores more reserve at Recovery pace and reduces movement losses.",
      { recovery: 0.45, economy: 0.15 },
      "cycle",
    ],
    [
      "Turbine drive",
      "Choose a turbine drive. Faster cruising comes with an energy-efficiency penalty.",
      { speed: 0.4, economy: -0.15 },
      "wind",
    ],
    [
      "Rocket fuel chemistry",
      "A more efficient propellant stores more usable energy in the same tank.",
      { stamina: 0.45, economy: 0.3 },
      "flask",
    ],
    [
      "Fusion drive",
      "A compact reactor provides a stronger drive and a larger usable energy reserve for long-distance tests.",
      { speed: 0.5, stamina: 0.5, resilience: 0.3 },
      "sun",
    ],
  ],
  [
    [
      "Tyre compound",
      "Softer tyres improve grip and acceleration on uneven surfaces.",
      { acceleration: 0.18, resilience: 0.12 },
      "wheel",
    ],
    [
      "Grip telemetry",
      "Record wheel slip as it happens. Learn faster and bring home more useful research.",
      { xp: 0.25, yield: 0.18 },
      "wave",
    ],
    [
      "Active suspension",
      "Let the wheels follow bumps while the chassis stays stable. Reduce fatigue and movement losses.",
      { resilience: 0.35, economy: 0.12 },
      "spring",
    ],
    [
      "Ground-effect bodywork",
      "Shape airflow beneath the vehicle to maintain grip. A stable chassis can sustain a faster pace.",
      { resilience: 0.2, speed: 0.2 },
      "feather",
    ],
    [
      "Traction controller",
      "Adjust power when grip changes. Regain speed faster and waste less energy on wheel slip.",
      { economy: 0.3, acceleration: 0.25 },
      "route",
    ],
    [
      "Ceramic brakes",
      "Heat-resistant brakes make pace changes repeatable. Recovery improves and the vehicle can hold a faster cruising pace.",
      { speed: 0.25, recovery: 0.35 },
      "wheel",
    ],
    [
      "Roadside lidar",
      "Spot useful equipment before it passes the vehicle. More finds and cleaner route measurements improve each attempt.",
      { luck: 0.7, yield: 0.25 },
      "eye",
    ],
    [
      "Inertial dampers",
      "Reduce loads transferred to the chassis during long tests. Less fatigue supports a higher sustained speed.",
      { resilience: 0.6, speed: 0.3 },
      "orbit",
    ],
  ],
];

export const SHARED: Discovery[][] = [
  [
    [
      "Field notebooks",
      "Record the conditions alongside each measurement. All programs bring home more RP.",
      { yield: 0.12 },
      "book",
    ],
    [
      "Peer review",
      "Compare independent measurements before accepting a result. Research yield and learning improve in every program.",
      { yield: 0.2, xp: 0.15 },
      "eye",
    ],
    [
      "Open science",
      "Share methods between the teams. Increase research yield and the chance of noticing useful equipment.",
      { yield: 0.35, luck: 0.2 },
      "flask",
    ],
  ],
  [
    [
      "Sample archive",
      "Label recovered equipment and samples. Improve the chance of identifying useful finds.",
      { luck: 0.18 },
      "pack",
    ],
    [
      "Field logistics",
      "Unlock three supplies per running or wheeled attempt. Each restores energy; projectile tests use a launcher cycle instead.",
      { yield: 0.12 },
      "pack",
      "supplies",
    ],
    [
      "Mobile workshop",
      "Service equipment between tests. Improve runner and vehicle recovery, and shorten projectile preparation.",
      { recovery: 0.3, reload: 0.3 },
      "gear",
    ],
  ],
  [
    [
      "Team coaching",
      "Review each attempt with the team. Increase experience earned in every program.",
      { xp: 0.2 },
      "heart",
    ],
    [
      "Motion analysis",
      "Learn faster, accelerate runners and wheels faster, and launch projectiles more consistently.",
      { xp: 0.25, acceleration: 0.18, stability: 0.18 },
      "wave",
    ],
    [
      "Experiment planning",
      "Use earlier results to choose the next conditions. Improve learning and the amount of RP earned.",
      { xp: 0.4, yield: 0.2 },
      "book",
    ],
  ],
  [
    [
      "Field timing instruments",
      "Accurate split and flight times turn each test into more useful research data.",
      { yield: 0.15 },
      "wave",
    ],
    [
      "Weather station",
      "Measure airflow before each attempt. Better fan settings help runners; calibrated release settings improve projectile consistency.",
      { wind: 0.25, stability: 0.25 },
      "flag",
    ],
    [
      "Lightweight materials",
      "Stronger, lighter materials reduce runner and wheel energy costs; streamlined projectiles lose less speed to drag.",
      { economy: 0.2, drag: 0.2 },
      "hex",
    ],
  ],
];

const t = (
  name: string,
  description: string,
  effects: Partial<Record<Stat, number>>,
  icon: string,
  multipliers?: Partial<Record<Stat, number>>,
  maxRank = 12,
  ability?: string,
): Discovery => [name, description, effects, icon, ability, maxRank, multipliers];

const runnerLate: Discovery[][] = [
  [
    t("Artificial lung membranes", "Gas-exchange membranes supply working muscles at speeds that ordinary lungs cannot sustain.", { oxygen: .15 }, "lungs", { stamina: 1.06 }),
    t("Auxiliary circulation pump", "A second pump maintains blood flow under sustained acceleration.", { oxygen: .18, cooling: .1 }, "heart", { resilience: 1.06 }),
    t("Synthetic metabolic organs", "Engineered organs convert stored fuel directly into usable muscular energy.", { cooling: .15 }, "flask", { economy: 1.07, stamina: 1.06 }),
    t("Closed-loop physiology", "Replace the biological energy limit with a sealed synthetic circulation system.", { oxygen: 2, cooling: 2 }, "infinity", { stamina: 10, economy: 4 }, 1),
  ],
  [
    t("Predictive motor cortex", "Predict the next foot placement before impact and rebuild speed with less hesitation.", { traction: .08 }, "eye", { acceleration: 1.08 }),
    t("Parallel movement processing", "Separate balance and propulsion into independent neural control loops.", { traction: .12, overdrive: .06 }, "split", { acceleration: 1.06 }),
    t("Inertial cadence model", "Plan stride timing against the body's measured inertia at extreme speed.", { economy: .12 }, "wave", { acceleration: 1.09, speed: 1.025 }),
    t("Continuous stride control", "Correct each stride continuously rather than reacting after a stumble.", { traction: 2 }, "orbit", { acceleration: 8, speed: 3 }, 1),
  ],
  [
    t("Magnetic return soles", "Store landing energy magnetically and return it at the next push-off.", { economy: .06 }, "magnet", { speed: 1.05 }),
    t("Active sole suspension", "Keep the sole in contact with the route while the leg cycles faster.", { traction: .14, cooling: .04 }, "spring", { speed: 1.04 }),
    t("Inertial step plates", "Route impact forces through a controlled plate rather than the ankle.", { traction: .12 }, "shoe", { speed: 1.06, resilience: 1.04 }),
    t("Field-contact shoes", "A controlled contact field transfers thrust without ordinary sole compression.", { traction: 1 }, "orbit", { speed: 5, economy: 3 }, 1),
  ],
  [
    t("Boundary-layer blower", "A thin moving layer of air reduces losses around the runner.", { aerodynamics: .18, wind: .04 }, "wind"),
    t("Pressure-balanced suit", "Active vents balance pressure around the body and remove heat from fast movement.", { aerodynamics: .16, cooling: .15 }, "coat"),
    t("Plasma airflow sheath", "Guide surrounding air around a narrow controlled plasma sheath.", { cooling: .12 }, "sun", { aerodynamics: 1.1, speed: 1.025 }),
    t("Travelling pressure field", "Move the air ahead of the runner, reducing drag before the body reaches it.", { wind: 1 }, "cloud", { aerodynamics: 8, speed: 3 }, 1),
  ],
];
RUNNER.forEach((lane, i) => lane.push(...runnerLate[i]));
RUNNER.push(
  [
    t("Balance drills", "Improve foot placement and retain more speed on rough surfaces.", { traction: .1 }, "foot"),
    t("Ankle stabilisers", "Support the ankle during uneven landings without increasing cruising speed.", { traction: .1, resilience: .04 }, "shoe"),
    t("Gait sensors", "Measure foot contact to improve traction and learn from each run.", { traction: .08, xp: .04 }, "wave"),
    t("Servo ankle joints", "Small joint motors help recover speed after the route slows you.", { acceleration: .1, traction: .06 }, "gear"),
    t("Passive exoskeleton", "An elastic support frame saves energy and handles heat, favouring sustained distance.", { economy: .12, cooling: .08 }, "spring"),
    t("Powered exoskeleton", "Motor-assisted strides favour fast Push pace, at an additional energy cost.", { overdrive: .1, economy: -.025 }, "bolt", { speed: 1.06 }),
    t("Bionic legs", "Replace the propulsion limit of biological legs with powered artificial limbs.", { cooling: .05 }, "bolt", { speed: 1.16 }),
    t("Synthetic muscle fibres", "Engineered fibres produce repeatable high-speed contractions with a larger usable reserve.", { oxygen: .06 }, "spring", { speed: 1.08, stamina: 1.04 }),
    t("Neural movement bus", "Implanted connections coordinate the bionic joints without biological signalling delays.", { traction: .08 }, "wave", { speed: 1.08, acceleration: 1.05 }),
    t("Reinforced skeleton", "A synthetic frame carries the loads from much faster strides.", { resilience: .12 }, "hex", { speed: 1.1 }),
    t("Inertial limb actuators", "Actuators manage acceleration loads inside each limb, enabling another step in speed.", { cooling: .1 }, "orbit", { speed: 1.15 }),
    t("Metric stride", "A laboratory field extends each stride beyond the distance the legs physically travel.", {}, "infinity", { speed: 18, acceleration: 4 }, 1),
  ],
  [
    t("Split-time notes", "Record each route section to improve experience from a run.", { xp: .06 }, "book"),
    t("Repeatable route tests", "Consistent measurement procedures increase research yield from the same distance.", { yield: .06 }, "wave"),
    t("Sample tags", "Mark unusual finds as they pass so the team can identify more useful equipment.", { luck: .07 }, "flag"),
    t("Automated run logs", "Automated records improve repeated testing and income from lab work between sessions.", { automation: .08 }, "book"),
    t("Onboard analysis", "Process motion measurements during the attempt instead of waiting for the debrief.", { xp: .08, yield: .04 }, "eye"),
    t("Drone sample collection", "A collector recovers findings without asking the runner to stop.", { luck: .12, yield: .04 }, "pack"),
    t("Distributed field computers", "Share processing between field devices and the lab to support repeated experiments.", { automation: .12, xp: .06 }, "hex"),
    t("Adaptive test schedule", "Use the previous attempt to improve the next experiment's measurements.", { yield: .1, automation: .06 }, "route"),
    t("Synthetic training data", "Compare real motion with a high-resolution movement model.", { xp: .14 }, "wave"),
    t("Remote laboratory staff", "A larger analysis team keeps the lab productive while experiments repeat.", { automation: .15, yield: .08 }, "book"),
    t("Predictive discoveries", "Identify useful equipment signatures from the route's sensor stream.", { luck: .2, yield: .12 }, "eye"),
    t("Autonomous field laboratory", "A complete analysis system increases the value and learning of every recorded run.", {}, "flask", { yield: 6, xp: 5, automation: 4 }, 1),
  ],
);

const projectileLate: Discovery[][] = [
  [
    t("Superconducting release motor", "Strong release motors transfer more launch energy with less shot dispersion.", { stability: .1 }, "magnet", { launchSpeed: 1.07 }),
    t("Staged rotation arm", "Successive flywheel stages build launch velocity before release.", { reload: -.015 }, "cycle", { launchSpeed: 1.08 }),
    t("Inertial release bearings", "Control the loads inside the throwing arm instead of limiting the release speed.", { stability: .12 }, "orbit", { launchSpeed: 1.1 }),
    t("Field-driven release", "A controlled field transfers the launch impulse directly to the projectile.", {}, "comet", { launchSpeed: 12, stability: 4 }, 1),
  ],
  [
    t("Smart wing surfaces", "Adjust wing surfaces during a glide to preserve lift without excessive drag.", { lift: .1, drag: .08 }, "plane"),
    t("Variable-span airframe", "Change wing span between fast flight and the slower landing approach.", { stability: .08 }, "feather", { lift: 1.07 }),
    t("Plasma boundary layer", "Guide airflow along the projectile to reduce high-speed aerodynamic losses.", { lift: .06 }, "sun", { drag: 1.1 }),
    t("Vacuum flight corridor", "Create a low-pressure corridor ahead of the projectile.", {}, "wind", { drag: 15, launchSpeed: 3 }, 1),
  ],
  [
    t("Superconducting launcher", "Reduce electrical losses through a superconducting launch track.", { reload: .1 }, "magnet", { launchSpeed: 1.1 }),
    t("Plasma pulse stages", "Apply successive pulses along the barrel without relying on a single charge.", { stability: .08 }, "sun", { launchSpeed: 1.12 }),
    t("Inertial launch chamber", "Contain the acceleration loads inside a field-supported launcher.", { reload: -.02 }, "orbit", { launchSpeed: 1.15 }),
    t("Metric mass driver", "A field-supported track multiplies exit velocity beyond the limit of its physical length.", {}, "infinity", { launchSpeed: 15, payload: 5 }, 1),
  ],
  [
    t("Particle tracking array", "Track small packets at extreme speed and resolve the landing measurement.", { yield: .12, payload: .08 }, "eye"),
    t("Beam energy recovery", "Recover unused beam charge to shorten the next preparation cycle.", { reload: .15, payload: .08 }, "cycle"),
    t("Inertial impact sensors", "Measure impacts without losing the sensor to the first high-energy shot.", { payload: .16, stability: .1 }, "hex"),
    t("Complete beam tomography", "Resolve the full experiment rather than measuring only its endpoint.", {}, "flask", { yield: 8, payload: 6, xp: 4 }, 1),
  ],
];
PROJECTILE.forEach((lane, i) => lane.push(...projectileLate[i]));
PROJECTILE.push(
  [
    t("Balanced payloads", "Uniform mass distribution reduces differences between repeated shots.", { stability: .06 }, "weight"),
    t("Polished surfaces", "A smoother projectile surface loses less forward velocity to drag.", { drag: .06 }, "stone"),
    t("Thin-wall shells", "Lighter shells provide a richer impact measurements for each test.", { payload: .08 }, "hex"),
    t("Composite projectile skin", "A rigid composite skin preserves the tested shape through flight.", { drag: .08, stability: .04 }, "feather"),
    t("Dense impact core", "Trade a longer preparation cycle for richer measurements at landing.", { payload: .18, reload: -.025 }, "weight"),
    t("Lightweight test shell", "Trade some impact data for faster repeated launches.", { reload: .15, payload: -.025 }, "plane"),
    t("Ceramic heat shield", "Preserve a repeatable aerodynamic shape during high-speed flight.", { drag: .12, stability: .06 }, "sun"),
    t("Synthetic test material", "Engineered material keeps its shape under the largest ordinary launcher loads.", { payload: .15 }, "hex", { stability: 1.04 }),
    t("Self-aligning mass", "Internal mass control keeps the projectile aligned with its travel direction.", { drag: .12 }, "orbit", { stability: 1.05 }),
    t("Plasma-resistant skin", "A surface treatment maintains aerodynamic efficiency through hot airflow.", { payload: .1 }, "sun", { drag: 1.06 }),
    t("Field-supported payload", "A supporting field lets the payload withstand greater launch velocity.", {}, "magnet", { launchSpeed: 1.06, payload: 1.05 }),
    t("Programmable matter shell", "A programmable shell changes its shape during the test while keeping measurements repeatable.", {}, "infinity", { drag: 5, stability: 5, payload: 4 }, 1),
  ],
  [
    t("Release timing marks", "A visible release reference improves shot consistency.", { stability: .06 }, "flag"),
    t("Landing notebooks", "Record range and angle together for more research from each shot.", { yield: .06 }, "book"),
    t("Preparation checklist", "A repeatable procedure prepares the next projectile sooner.", { reload: .06 }, "book"),
    t("Automatic loader", "Mechanised loading reduces preparation time between shots.", { reload: .1, automation: .05 }, "gear"),
    t("Flight reconstruction", "Recover useful motion data from the complete flight.", { xp: .1, yield: .06 }, "route"),
    t("Servo release trigger", "An actuator releases each projectile at a more consistent angle.", { stability: .12 }, "bolt"),
    t("Launcher control computer", "Coordinate charging, loading and release as one repeatable cycle.", { reload: .1, automation: .1 }, "hex"),
    t("Adaptive angle calibration", "Calibrate the release from the previous landing measurements.", { stability: .15, xp: .06 }, "eye"),
    t("Synthetic launch controller", "A dedicated controller handles repeated launches and analysis.", { automation: .15, reload: .08 }, "wave"),
    t("Remote ballistic laboratory", "Keep analyzing tests while the launcher repeats its sequence.", { automation: .15, yield: .1 }, "flask"),
    t("Predictive launch scheduling", "Schedule charging around the upcoming shot to shorten preparation.", { reload: .18 }, "cycle"),
    t("Autonomous launch range", "Automated launch and analysis systems increase the value of each completed experiment.", {}, "orbit", { reload: 4, yield: 5, automation: 4 }, 1),
  ],
);

const wheelsLate: Discovery[][] = [
  [
    t("Superconducting drivetrain", "Lower losses in the drivetrain while transferring much larger loads.", { economy: .12 }, "magnet", { speed: 1.04 }),
    t("Variable-ratio hubs", "Adjust the drive ratio continuously as the vehicle regains speed.", { acceleration: .15 }, "gear", { speed: 1.05 }),
    t("Inertial drive coupling", "Transfer propulsion through a coupling that manages acceleration loads.", { traction: .08 }, "orbit", { speed: 1.09 }),
    t("Field-coupled transmission", "A controlled field transfers drive energy without an ordinary mechanical gear limit.", {}, "infinity", { speed: 10, economy: 4 }, 1),
  ],
  [
    t("Synthetic chassis frame", "A synthetic frame carries higher loads without a large weight increase.", { resilience: .12 }, "hex", { speed: 1.05 }),
    t("Active geometry chassis", "Change chassis geometry as speed and the road surface change.", { traction: .15, aerodynamics: .1 }, "route"),
    t("Inertial passenger cradle", "Isolate the scientist from extreme acceleration loads.", { resilience: .2 }, "orbit", { speed: 1.08 }),
    t("Field-supported chassis", "Support the vehicle frame through a controlled field rather than its structural material alone.", {}, "hex", { speed: 8, resilience: 5 }, 1),
  ],
  [
    t("Synthetic energy cells", "Store more usable energy without proportionally increasing battery weight.", { cooling: .1 }, "pack", { stamina: 1.08 }),
    t("Closed-cycle reactor", "Recover heat and unused drive energy inside a closed power system.", { economy: .15, cooling: .15 }, "cycle"),
    t("Inertial energy reservoir", "Buffer the drive's largest power demands through a field-supported reservoir.", { overdrive: .15 }, "orbit", { stamina: 1.08 }),
    t("Metric power core", "A field energy source supports sustained drive output far beyond conventional batteries.", {}, "sun", { stamina: 15, economy: 5 }, 1),
  ],
  [
    t("Predictive surface scanning", "Read the road ahead and maintain useful speed through rough sections.", { traction: .18 }, "eye"),
    t("Synthetic contact patches", "A controlled wheel surface improves grip across different road materials.", { traction: .15, resilience: .08 }, "wheel"),
    t("Inertial suspension", "Manage road forces inside the suspension instead of transmitting them into the chassis.", { traction: .12 }, "spring", { resilience: 1.08 }),
    t("Field road interface", "A controlled contact field replaces the usual tyre limit on transferring drive force.", {}, "orbit", { traction: 10, speed: 4 }, 1),
  ],
];
WHEELS.forEach((lane, i) => lane.push(...wheelsLate[i]));
WHEELS.push(
  [
    t("Launch push technique", "A stronger initial push improves recovery of speed after each rough section.", { acceleration: .07 }, "foot"),
    t("Compact drive fan", "A rear fan provides additional output at Push pace.", { overdrive: .08 }, "wind"),
    t("Drive cooling fins", "Fins remove the heat generated during sustained high-output driving.", { cooling: .1 }, "snow"),
    t("Assisted thrust motor", "An additional motor increases acceleration without changing the selected vehicle.", { acceleration: .1, overdrive: .06 }, "bolt"),
    t("Efficient thrust duct", "A shaped duct reduces losses, favouring sustained efficient travel.", { economy: .12, aerodynamics: .08 }, "wind"),
    t("High-output thrust nozzle", "A narrow nozzle favours greater Push output while using energy less efficiently.", { overdrive: .15, economy: -.025 }, "comet", { speed: 1.06 }),
    t("Plasma drive", "A controlled plasma jet raises the cruising capability of the selected chassis.", { cooling: .05 }, "sun", { speed: 1.15 }),
    t("Synthetic thrust chamber", "An engineered chamber handles repeatable high-energy propulsion.", { cooling: .1 }, "hex", { speed: 1.08 }),
    t("Vector thrust steering", "Direct thrust to support motion without sacrificing road contact.", { traction: .12 }, "route", { speed: 1.06 }),
    t("Inertial propulsion mount", "Manage drive loads inside the propulsion mount to permit higher output.", { resilience: .1 }, "orbit", { speed: 1.1 }),
    t("Field-drive stages", "Successive drive fields apply forward thrust beyond the ordinary mechanical limit.", { cooling: .1 }, "magnet", { speed: 1.12 }),
    t("Metric propulsion", "Field-driven travel multiplies the vehicle's effective speed without spinning its wheels at the same rate.", {}, "infinity", { speed: 15, acceleration: 4 }, 1),
  ],
  [
    t("Wheel-speed logging", "Measure wheel speed against actual travel to improve learning.", { xp: .06 }, "wave"),
    t("Vehicle test notes", "Keep comparable records of each vehicle experiment.", { yield: .06 }, "book"),
    t("Slip warning sensors", "Detect wheel slip before it wastes much speed.", { traction: .08 }, "eye"),
    t("Automated service checks", "Automated checks keep the lab ready between repeated experiments.", { automation: .08 }, "gear"),
    t("Road-data analysis", "Analyze changing road conditions during the attempt.", { xp: .1, yield: .05 }, "route"),
    t("Sample collection trailer", "A small collector recovers more useful roadside findings.", { luck: .12 }, "pack"),
    t("Integrated vehicle computer", "Coordinate service checks and motion logging during repeat tests.", { automation: .1, yield: .06 }, "hex"),
    t("Adaptive route controller", "Use the previous attempt to handle the next road section more consistently.", { traction: .12, xp: .06 }, "route"),
    t("Synthetic driver assistant", "A dedicated assistant keeps repeated experiments consistent.", { automation: .15, traction: .08 }, "eye"),
    t("Remote vehicle laboratory", "Analyze repeated motion tests without waiting for the vehicle to return.", { automation: .15, yield: .1 }, "flask"),
    t("Predictive service planner", "Schedule service before it interrupts the repeat test cycle.", { automation: .2 }, "book"),
    t("Autonomous vehicle test range", "A complete control system improves the analysis and repetition of every experiment.", {}, "orbit", { yield: 5, xp: 4, automation: 4 }, 1),
  ],
);

const sharedLate: Discovery[][] = [
  [
    t("Interdisciplinary modelling", "Combine measured motion from each team into a better model of the next experiment.", { yield: .15, xp: .08 }, "hex"),
    t("Synthetic research staff", "Dedicated analysis systems process large experiments while the field teams keep working.", { automation: .15, yield: .12 }, "eye"),
    t("Whole-laboratory simulation", "Simulate every recorded test and extract useful results across all three programs.", {}, "flask", { yield: 8, xp: 4 }, 1),
  ],
  [
    t("Automated field service", "Routine service happens between attempts, improving preparation and motion recovery.", { automation: .1, recovery: .08, reload: .08 }, "gear"),
    t("Predictive sample sorting", "Sensor models identify useful recovered equipment before the team sorts it by hand.", { luck: .18, yield: .08 }, "pack"),
    t("Autonomous expedition support", "An independent support system collects samples and prepares the next experiment.", {}, "orbit", { luck: 4, automation: 5 }, 1),
  ],
  [
    t("Neural training laboratory", "Motor-control models improve learning and repeatability in every program.", { xp: .18, acceleration: .08, stability: .08 }, "wave"),
    t("Synthetic test rehearsals", "High-fidelity rehearsals make the real experiment more valuable without replacing field measurements.", { xp: .2, yield: .12 }, "route"),
    t("Parallel learning systems", "Independent models learn from each test at once instead of competing for analysis time.", {}, "infinity", { xp: 8, automation: 3 }, 1),
  ],
  [
    t("Thermal materials lab", "Develop heat-resistant surfaces and cooling systems for fast movement and launch experiments.", { cooling: .15, drag: .1 }, "sun"),
    t("Field fabrication", "Produce repeatable advanced materials for contact surfaces, airflow and launch preparation.", { traction: .15, aerodynamics: .12, reload: .1 }, "hex"),
    t("Programmable laboratory matter", "Reconfigure support materials around the requirements of each experiment.", {}, "magnet", { cooling: 5, drag: 3, aerodynamics: 3 }, 1),
  ],
];
SHARED.forEach((lane, index) => lane.push(...sharedLate[index]));

