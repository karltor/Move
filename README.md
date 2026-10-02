# MOVE — Experimental Motion Laboratory

A browser incremental game about a research team entering the Velocity Prize to fund its laboratory. The first prototype is a scientist in running shoes. A former record holder named SANIK offers advice as the team develops new experiments. First-encounter story scenes explain newly unlocked features while an active experiment continues at half speed. Tips can be skipped, disabled or replayed in Settings.

## Play

Choose your experiment, fitted equipment and starting pace in the preparation popup, then begin. Only unlocked programs and controls appear. Stamina pressure rises towards a new biome, so passing a frontier needs training and deliberate pacing. The game targets desktop PC: the experiment controls, talent map and funding choices stay inside the viewport. Larger inventories and project lists scroll inside their panels.

**RP is the shared funding currency.** After a manually completed experiment, the funding modal shows concrete choices: buy Talent Points for permanent skills, buy equipment vouchers when the workshop opens, or save for the next facility. The first facility is the training clinic, with its 180 RP price and a checklist: a 120 m record, three completed runs and four basic talents. Its build button stays locked until all requirements are met. Each conversion shows the exact price, currency received and RP retained. Early purchases cover useful starter improvements rather than buying hundreds of unusable points. Keeping RP for later is always an option. Automatic repetition continues without a spending modal after every experiment.

- **Steady** pace balances distance and energy. **Push** gives more speed but burns stamina much faster. **Recover** restores energy and slows progress while fatigue continues to accumulate. Visible roadworks and rough trail sections slow movement; acceleration helps regain speed afterwards.
- Six possible route, sampling and rest decisions appear after three runs. The event and interval use saved random state, avoid immediate repeats and show RP rewards. Route choices expire after a short stretch. A later field-supply project unlocks rations; none are given at the start.
- Experience arrives during expeditions and fills a visible level bar. Each program has independent training levels and records. XP thresholds grow more steeply after level 100.
- Automatic repetition is optional and unlocks after four runs. After the training clinic opens Athletic science, running and vehicle experiments can stop at exhaustion or use a **2, 5 or 15 minute** time limit. Timed runs bank their results automatically; repetition keeps the selected limit.
- Finish run displays the exact additional RP that will be banked; previously paid milestone RP is not counted twice. Very short aborts return little evidence and training XP, so repeated restarts are not the best way to progress. Desktop PC is the design and validation target; run controls stay inside the viewport.
- Sky and terrain blend across biome boundaries. Asphalt and paved sidewalks give way to a narrower, irregular gravel trail with grassy shoulders. The transition occupies a physical stretch of the route, visible ahead and behind simultaneously. Road markings disappear in the forest.
- The landscape changes with expedition distance: city (0–100 m), woodland trail (100 m–1 km), country road (1–10 km), desert (10–100 km), alpine (100–1,000 km), then aurora.
- Projectiles appear after three runs, a 1 km best, four runner talents and 1.5 km total travel (220 RP). Wheels follow after six runs, projectiles and 6 km total (600 RP). Choose unlocked programs in preparation. Talent paths unlock paper planes, slingshots, cannons, accelerators, bikes and rockets.
- A projectile experiment launches six shots from a fixed station. Gravity, air resistance, wing lift and launch angle determine each flight and landing. The scientist stands beside the launcher. Only landed shots earn RP and XP; a rock has no stamina. Long ranges use a consistent scene scale. Unlock angle control, a rangefinder, a bouncing shot or a charged launch through talents.

**Talents contains 240 named talents** across three movement programs and the laboratory. A new runner starts with six one-purchase discoveries in three illustrated paths, covering stamina, energy use, acceleration, grip, speed and fatigue separately. The clinic opens repeatable training and new skills; further facilities reveal more paths and technologies. Paths continue downwards in one view, with no chapter submenus or crossing prerequisites. Permanent specialization pairs offer different benefits and drawbacks, close the alternative and rejoin within their own path. Selected talents show exact effects, TP costs and requirements. Field skills receive an explanation when unlocked. Telemetry shows acquired modifiers relevant to the current experiment.

Development projects open Athletic science, Biomechanics, Bionic integration, Synthetic physiology, Inertial engineering and Metric engineering. They need measured distance, completed experiments, talent ranks and equipment development as well as RP. New chapters introduce powered legs, augmented organs, synthetic physiology and field-driven movement, including multiplicative speed increases. Repeatable projects improve RP analysis, coaching and expedition support. Shared laboratory talents appear in Biomechanics. Each new era is introduced when its project is completed.

The **equipment workshop** opens after two experiments, or when equipment or vouchers are already held. Start with one component, automatically fitted when built. Duplicate basics cannot be crafted. The first modification offers a complete level-5 package with a permanent Sprint or Trail fit and explicit benefits, trade-offs and cost. Outfit and instrument workbenches open later; measuring instruments require the clinic plus a 400 m record or twelve experiments. Found gear remains accessible. Biomechanics permits a genuinely different alternate specialization, while old duplicate saves stay preserved in collapsed storage. Gear develops through **200 upgrade levels**. Transformations at levels 10, 25, 50, 75 and 100 add components and change the item: ordinary running shoes can become carbon boots, bionic drives and phase-displacement legs. Development eras raise upgrade caps; Metric engineering opens later component overclocking. Each purchase or batch upgrade shows its complete cost and resulting effects before spending.

Equipment also randomly drops during experiments. Distance improves rarity odds, but lucky rare finds remain possible after drops unlock. Unupgraded Common finds have one +5% bonus; Uncommon, Rare and Epic finds have two, three and four bonuses. Fit one item per slot per program between experiments. Runner slots are footwear, outfit and instrument; projectile slots are launch rig, projectile body and measuring instrument. Equipped runner pieces change the 3D model. Replacing an item shows stat differences. Spare gear can be recycled for RP. Drop RNG and the next drop time are saved to prevent refresh rerolls.

Progress saves locally in this browser. Settings exports and imports saves. With automatic repetition enabled, offline lab work earns RP for up to seven days without inventing distance or completed experiments. **Reset** clears currencies, levels, talents, projects, equipment and history after confirmation. Equipment starts empty. While development is ongoing, Settings also provides a logarithmic **test RP slider from 10 to 10 million** and an explicit grant button; moving the slider alone does not change the bank.

## Development

Requires Node.js 20.19+ and npm.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

In restricted Windows environments, append `-- --configLoader runner` to the build, preview or test commands.

The GitHub Actions workflow tests and builds every push to main, then deploys the dist artifact directly to GitHub Pages.

## 3D assets

The game uses Three.js with original stylized assets authored in Blender 5.2.2. Blender is needed only to regenerate assets, never to play or build the website.

Ten original transparent Blender menu illustrations live in `public/menu-art/`: shoes, endurance kit, timing track, clinic, vest, workbench, bionic leg, launcher, bicycle and backpack fan. The 768 px WebP assets total about 255 KB. Regenerate them with `blender --background --python tools/build_menu_art.py`; the generator keeps its artwork in a separate scene.

```sh
blender --background --python-exit-code 1 --python tools/build_world.py
```

`build_world.py` creates a separate MOVE Atelier scene and exports `public/models/move-world.glb`. It contains the smooth articulated scientist, five building designs, street furniture, oak/birch/rowan/spruce trees, ferns, rocks, a timber barn, ribbed cactus and alpine ridges. The scientist has tailored clothing, glasses, swept hair, laced shoes, and hip/knee/ankle/shoulder/elbow pivots. Runtime inverse kinematics handle foot placement with counter-swinging arms, torso movement and breathing. Material batching and shared instanced geometry keep draw calls bounded despite the extra detail. Desktop rendering uses up to 1.75× pixel density and 2048px shadows.

The earlier `move-lab.glb` still provides vehicles and projectiles. Its generator is `tools/build_assets.py`. Rebuilding the new library does not require rebuilding that legacy file. The new library takes precedence for all character and environment objects.

## Main source files

- `src/App.tsx`: navigation, automatic saving, debrief funding and story simulation rate.
- `src/lab/game.ts`: expedition simulation, stamina, timed runs, progression, decisions and save validation.
- `src/lab/research.ts` and `src/lab/discoveries.ts`: talent definitions, rank limits, independent paths and program unlocks.
- `src/lab/economy.ts`: RP exchange quotes, TP/voucher conversion and project funding requirements.
- `src/lab/development.ts`: development eras, unlock projects and repeatable facilities.
- `src/lab/FundingPanel.tsx` and `src/lab/FundingModal.tsx`: spending routes, conversion previews and experiment debrief.
- `src/lab/workshop.ts` and `src/lab/equipment.ts`: crafting, enhancement paths, upgrade quotes, transformations and equipment drops.
- `src/lab/EquipmentPanel.tsx`: equipment inventory and workshop controls.
- `src/lab/ballistics.ts`: fixed-step projectile flight, trajectory prediction, shot preparation and landing.
- `src/lab/World.tsx`: rendering, articulated animation and distance-driven environments.
- `src/lab/terrain.ts`: continuous road geometry, gravel, paving and surface transitions.
- `src/lab/Expedition.tsx`: field controls and expedition HUD.
- `src/lab/ResearchPanel.tsx` and `src/lab/talent-tree.css`: progressively revealed talent paths, next-facility goals and effect comparisons.
- `src/lab/Story.tsx`: SANIK introductions, era guides and unlocked skill explanations.
- `src/lab/Records.tsx`: experiment records, save controls, reset and test RP grants.
- `src/lab/*.test.ts`: simulation, talent paths, economy, equipment, flight, UI and save tests.

Earlier simulation modules remain in the source tree as reference; the application entry point uses the expedition system above.
