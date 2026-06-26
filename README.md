# Move

A browser-based incremental **"go as far as possible"** game. You ride a
stamina-limited vehicle (a **cyclist** for now), earn metric-based currencies,
and spend them across a Path-of-Exile-style passive tree to go further. Plays
actively or idles in the background; progress persists to `localStorage`.

Built with **Vite + TypeScript + React** (UI), **PixiJS** (ride canvas), and
**Zustand** (`persist`) for game state. Deploys to **GitHub Pages**.

## Core loop

1. **Ride** (hold Space / hold on the canvas to pedal). Pedalling spends
   stamina and accelerates; releasing coasts and recovers stamina. A run lasts
   `runTime` seconds — manage stamina to maximise distance.
2. The run scores **metrics** (distance, average speed, top speed, momentum),
   which award four **currencies**: 🪙 Coins, ⏱️ Tempo, ⚡ Rush, 🌀 Momentum.
   Momentum is log-scaled so future objects (a heavy train, a fast particle)
   stay relevant rather than trivialising or being worthless.
3. Spend currencies in the **passive tree**: a connected graph of nodes (basic
   stats, stronger "notables", and one exclusive **speciality** keystone such
   as *Electrified Bike → Battery Management System*). Allocating a node updates
   stats and can visibly swap the bike's art.
4. **Ride again** to go further. Refresh — your progress is still there.

**Active vs idle.** Toggle **Auto-run** to loop runs on a conservative
auto-pilot (idle-friendly). Actively pedalling a run earns an **active bonus**
(up to ~2.5×) over idling. When you're away, an offline catch-up estimates idle
earnings (capped at 8h, at reduced efficiency) and shows a *Welcome back* modal.

## Local development

```bash
npm install
npm run dev        # start the dev server (prints a localhost URL)
```

Other scripts:

```bash
npm test           # run the ride-simulation unit tests (Vitest)
npm run build      # type-check + production build into dist/
npm run preview    # serve the built dist/ with the Pages base path
```

> `npm run preview` serves under the `/Move/` base path, so open the
> `/Move/` URL it prints (matching GitHub Pages project-page hosting).

## Deploying to GitHub Pages

A workflow at `.github/workflows/deploy.yml` builds and deploys `dist/` on every
push to `main` using the official `upload-pages-artifact` / `deploy-pages`
actions.

**One manual step (only needed once):** in the GitHub repo, go to
**Settings → Pages → Build and deployment → Source** and set it to
**"GitHub Actions"**. After the next push to `main`, the game will be live at:

```
https://<your-username>.github.io/Move/
```

If you rename the repository, update the one `base` string in
`vite.config.ts` (`/Move/`) to match the new repo name.

## Architecture (built to grow)

The long-term plan is multiple **main objects** (roller skates, car, train,
particle…), each its own passive tree with its own specialities, mutually
exclusive (switching is a respec). So content is **data, not code**:

- **`src/data/`** — typed config.
  - `types.ts` defines `GameObjectDef` → `SlotDef` (art layers) + `PassiveTree`
    (`TreeNode`/`TreeEdge`), plus `StatKey`, `StatMod`, `CurrencyId`.
  - `currencies.ts` defines the currencies and how each is awarded from a run's
    `RunMetrics` (the log-scaled momentum lives here).
  - `cyclist.ts` is the one object: base stats + a tree of ~16 nodes incl. 3
    specialities.
  - `index.ts` is the object registry. **Adding a new object = a new data file
    + SVGs registered here** — no changes to the simulation or UI.
- **`src/sim/ride.ts`** — the **pure** physics. `rideStep(state, stats, pedal,
  dt)` advances one tick with no rendering/state/randomness; `simulateRide`
  runs it headlessly under a policy (idle auto-pilot, offline, and the unit
  tests in `ride.test.ts`). The real-time canvas steps the exact same function
  with live input.
- **`src/game/tree.ts`** — generic tree logic: allocation rules, currency
  affordability, stat aggregation (additive then multiplicative passes), and
  art resolution. No object-specific code.
- **`src/game/PixiStage.tsx`** — object-agnostic canvas: renders the layered
  SVG composition the allocated nodes describe and runs the ride with a
  following camera.
- **`src/store/gameStore.ts`** — central Zustand store (wallet, allocated
  nodes, best/run counters, auto-run, `lastActive`, `saveVersion`) persisted to
  `localStorage`, with a **real `migrate`** (v1 slot-prototype → v2 tree) and
  offline catch-up computed on rehydrate.
- **`src/ui/`** — React HUD (currencies), live ride bars, the interactive
  `SkillTree` (pan + click + allocate + respec), and the `WelcomeBack` modal.

Part SVGs live in `src/assets/parts/`. All variants share one `260×180` viewBox
so the layers compose into a complete bike + rider.

### Out of scope (deliberately)

Electron/Steam, multiple objects shipped, prestige layers, audio, polished art,
and any backend or cloud saves. The architecture leaves room for these without
painting us into a corner.
