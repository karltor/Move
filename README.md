# MOVE — Experimental Motion Laboratory

A browser incremental game about a research team trying to make things move faster and travel further.

## Play

Start a human expedition in the Field lab. A fresh scientist can sustain a run for about five minutes. Stamina, accumulated fatigue, pace, supplies and research determine how far the expedition goes.

- **Sustainable** pace balances distance and energy. **Push hard** spends stamina for speed. **Walk & recover** restores energy, but accumulated fatigue lowers recoverable capacity.
- Three field rations and optional route, sampling and rest decisions let you influence the expedition without timing clicks.
- Experience arrives during expeditions. Each program has independent levels, records and currency: Endurance, Impulse or Torque.
- Finish an expedition to collect research, or let the team automatically repeat after exhaustion. Shared Research Points fund all programs.
- The landscape changes with expedition distance: city (0–100 m), woodland trail (100 m–1 km), country road (1–10 km), desert (10–100 km), alpine (100–1,000 km), then aurora.
- Unlock projectile and wheeled programs, then research equipment from paper planes and slingshots to cannons, accelerators, bikes and rockets.

The research web contains **108 discoveries** across three programs and shared science. Branches connect through alternative prerequisites and hybrid discoveries requiring two disciplines. Permanent discoveries stay active; optional modules have benefits and tradeoffs with three equipped slots per program. Pan, zoom, fit or hide the detail panel to explore.

Progress saves locally in this browser. The journal exports and imports saves. **Reset** clears currencies, levels, discoveries, equipment and history after confirmation. This overhaul uses a new save format; earlier versions are intentionally not migrated.

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
