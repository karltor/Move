# MOVE — Experimental Motion Laboratory

A browser incremental game about a research team entering the Velocity Prize to fund its laboratory. The first prototype is a scientist in running shoes. A former record holder named SANIK offers advice as the team develops new experiments. First-encounter story scenes explain newly unlocked features, pause the simulation and can be skipped or replayed in Settings.

## Play

Choose your experiment, equipment and starting pace in the preparation popup, then begin. Only unlocked programs appear. Research opens after the first completed run. The first review offers one simple, permanent improvement; any extra RP stays in the bank until the next run. Equipment appears after at least four runs and a 200 m personal best. Shared science opens after ten runs, a 1 km best and eight runner discoveries. Automatic repetition opens after four runs. Stamina pressure rises towards a new biome, so passing a frontier needs training and deliberate pacing.

- **Steady** pace balances distance and energy. **Push** gives more speed but burns stamina much faster. **Recover** restores energy and slows progress while fatigue continues to accumulate. Visible roadworks and rough trail sections slow movement; acceleration helps regain speed afterwards.
- Six possible route, sampling and rest decisions appear after three runs. The event and interval use saved random state, avoid immediate repeats and show the actual currency reward. Route choices expire after a short stretch. Field logistics research later unlocks supplies; none are given at the start.
- Experience arrives during expeditions and fills a visible level bar. Each program has independent levels, records and currency: Endurance, Impulse or Torque.
- Finishing a run collects research and takes you to Research. Automatic repetition is optional and unlocks after four runs. Shared Research Points fund all programs.
- Finish run displays the exact additional RP that will be banked; previously paid milestone RP is not counted twice. Very short aborts return little evidence and training XP, so repeated restarts are not the best way to progress. Desktop PC is the design and validation target; run controls stay inside the viewport.
- Sky and terrain blend across biome boundaries. Asphalt and paved sidewalks give way to a narrower, irregular gravel trail with grassy shoulders. The transition occupies a physical stretch of the route, visible ahead and behind simultaneously. Road markings disappear in the forest.
- The landscape changes with expedition distance: city (0–100 m), woodland trail (100 m–1 km), country road (1–10 km), desert (10–100 km), alpine (100–1,000 km), then aurora.
- Projectiles appear after three runs, a 1 km best, four runner discoveries and 1.5 km total travel (220 RP). Wheels follow after six runs, projectiles and 6 km total (600 RP). Choose unlocked programs in preparation. Research vehicles from paper planes and slingshots to cannons, accelerators, bikes and rockets.
- A projectile experiment launches six shots from a fixed station. Gravity, air resistance, wing lift and launch angle determine each flight and landing. The scientist stands beside the launcher. Only landed shots earn RP, Impulse and XP; a rock has no stamina. Long ranges use a consistent scene scale. Unlock angle control, a rangefinder, a bouncing shot or a charged launch through research.

The research web contains **108 discoveries** across three programs and shared science. The runner opens with a short experiment notebook, then reveals the branching atlas after four runner discoveries. All discoveries are permanent. Specialized pairs offer different benefits and drawbacks; choosing one closes its alternative. Later paths reconnect through explicit either/or prerequisites. Existing saves that already own both keep their findings. The map is pannable and zoomable, reveals unexplored discoveries gradually, and shows exact effects, affordability and prerequisites. Runner research covers physiology, technique, kit and wind; projectile research covers launch speed, drag reduction, wing lift, stability, reload time and payload. Field skills receive an explanation when unlocked. Telemetry shows acquired modifiers relevant to the current experiment.

Equipment randomly drops during runs after the equipment milestone. Distance improves rarity odds, but lucky rare finds remain possible as soon as drops unlock. Common gear has one +5% bonus; Uncommon, Rare and Epic gear have two, three and four bonuses. Equip one piece per slot (footwear, outfit, instrument) per program between runs. The runner's equipped pieces change the 3D model. Replacing an item shows the stat differences. Spare items can be recycled for research. Drop RNG and the next drop time are saved to prevent refresh rerolls.

Progress saves locally in this browser. Settings exports and imports saves. **Reset** clears currencies, levels, discoveries, equipment and history after confirmation. Existing expedition saves retain progression; previously optional research is now permanent. Equipment starts empty.

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

```sh
blender --background --python-exit-code 1 --python tools/build_world.py
```

`build_world.py` creates a separate MOVE Atelier scene and exports `public/models/move-world.glb`. It contains the smooth articulated scientist, five building designs, street furniture, oak/birch/rowan/spruce trees, ferns, rocks, a timber barn, ribbed cactus and alpine ridges. The scientist has tailored clothing, glasses, swept hair, laced shoes, and hip/knee/ankle/shoulder/elbow pivots. Runtime inverse kinematics handle foot placement with counter-swinging arms, torso movement and breathing. Material batching and shared instanced geometry keep draw calls bounded despite the extra detail. Desktop rendering uses up to 1.75× pixel density and 2048px shadows.

The earlier `move-lab.glb` still provides vehicles and projectiles. Its generator is `tools/build_assets.py`. Rebuilding the new library does not require rebuilding that legacy file. The new library takes precedence for all character and environment objects.

## Main source files

- `src/lab/game.ts`: expedition simulation, stamina, progression, decisions and save validation.
- `src/lab/research.ts`: programs, equipment and research graph.
- `src/lab/World.tsx`: rendering, articulated animation and distance-driven environments.
- `src/lab/terrain.ts`: continuous road geometry, gravel, paving and surface transitions.
- `src/lab/Expedition.tsx`: field controls and expedition HUD.
- `src/lab/ResearchPanel.tsx`: interactive research web.
- `src/lab/game.test.ts`: simulation, research graph, progression and save tests.

Earlier simulation modules remain in the source tree as reference; the application entry point uses the expedition system above.
