# MOVE — Experimental Motion Laboratory

A browser incremental game about a research team trying to make things move faster and travel further.

## Play

Start a run with the single visible start button. Research appears after the first completed run, equipment after the first find, and shared science and automation after three runs. A fresh scientist can sustain a run for about five minutes. Stamina, accumulated fatigue, pace, supplies and research determine how far the expedition goes.

- **Steady** pace balances distance and energy. **Push** spends stamina for speed. **Recover** restores energy, but accumulated fatigue lowers recoverable capacity.
- Optional route, sampling and rest decisions unlock after the first run. Field logistics research later unlocks three supplies per run; none are given at the start.
- Experience arrives during expeditions. Each program has independent levels, records and currency: Endurance, Impulse or Torque.
- Finishing a run collects research and takes you to Research. Automatic repetition is optional and unlocks after three runs. Shared Research Points fund all programs.
- The landscape changes with expedition distance: city (0–100 m), woodland trail (100 m–1 km), country road (1–10 km), desert (10–100 km), alpine (100–1,000 km), then aurora.
- Unlock projectile and wheeled programs, then research equipment from paper planes and slingshots to cannons, accelerators, bikes and rockets.

The research web contains **108 discoveries** across three programs and shared science. Branches connect through alternative prerequisites and hybrid discoveries requiring two disciplines. All discoveries are permanent. The default research view shows the available frontier by discipline, clear affordability and resource shortfalls. Details expose AND/OR prerequisites and the paths a discovery opens, without drawing lines through other cards. The full catalog is available on demand.

Equipment randomly drops during runs. Distance improves rarity odds, but lucky finds are possible from the beginning. Common gear has one +5% bonus; Uncommon, Rare and Epic gear have two, three and four bonuses. Equip one piece per slot (footwear, outfit, instrument) per program between runs. Replacing an item shows the stat differences. Spare items can be recycled for research. Drop RNG and the next drop time are saved to prevent refresh rerolls.

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

The game uses Three.js with original low-poly assets generated in Blender. Blender is needed only to regenerate the assets, never to play the game or build the website.

```sh
blender --background --python-exit-code 1 --python tools/build_assets.py
```

The script was verified with Blender 5.2.2 LTS. It exports `public/models/move-lab.glb` and three researcher portraits. Character limbs have hip, knee, ankle, shoulder and elbow pivots. Runtime inverse kinematics animate ground contact; environment geometry is batched into instanced meshes to reduce draw calls.

## Main source files

- `src/lab/game.ts`: expedition simulation, stamina, progression, decisions and save validation.
- `src/lab/research.ts`: programs, equipment and research graph.
- `src/lab/World.tsx`: rendering, articulated animation and distance-driven environments.
- `src/lab/Expedition.tsx`: field controls and expedition HUD.
- `src/lab/ResearchPanel.tsx`: interactive research web.
- `src/lab/game.test.ts`: simulation, research graph, progression and save tests.

Earlier simulation modules remain in the source tree as reference; the application entry point uses the expedition system above.
