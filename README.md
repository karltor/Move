# Move

A browser-based incremental **"go as far as possible"** game. It opens with a
short story — a broke research lab, funded by a shadowy figure who just wants
them to **GO FAST** — and starts you as a lone **scientist on foot**, jogging
across a rough field as colleagues cheer. You earn physics-flavoured currencies
and spend them across a Path-of-Exile-style passive tree. Much later comes the
bicycle (rotational motion) and, eventually, relativistic regimes. Plays
actively or idles in the background; progress persists to `localStorage`.

Built with **Vite + TypeScript + React** (UI), **PixiJS** (canvas), and
**Zustand** (`persist`) for game state. Deploys to **GitHub Pages**.

## Core loop

1. **Run** (hold Space / hold on the canvas). Two pools govern a run, like real
   physiology: a finite **energy reserve** (only depletes — when it's gone the
   runner **collapses**, the run ends, and a results screen appears) and a fast
   **stamina** burst pool that exerting spends and easing-off refills from the
   reserve. No timer; no infinite stamina — pace your breath to go far. Each run
   rolls a **weather** condition (rain, heatwave, tailwind, mud…) that shifts the
   stats; the *Acclimatization* nodes dampen its effect.
2. The **results screen** breaks down the run (distance, top/avg speed in m/s,
   duration) and the **lump-sum** currencies it earned: 💰 Grants (distance),
   🏃 Pace (avg speed), ⚡ Kinetic Energy (½·m·v²), 🌀 Momentum (m·v). KE and
   momentum are log-scaled so future heavy/fast objects stay relevant.
3. Open the **Upgrades** panel (the run keeps going behind it). Spend
   **Research** on node **ranks**: some nodes are single unlocks, others are
   **multi-rank** (e.g. Lightweight Materials → weight −3%/rank).
   **Prerequisites** gate paths, and the strongest nodes also cost the physics
   currencies (Pace/Kinetic/Momentum), so you **specialise** rather than max
   everything — that's your build. Key nodes also upgrade the character's
   look (shoes, coat, goggles/helmet, exosuit) as they rank up.
4. **Run again** to go further (or **End run** early to bank what you have).
   Refresh — your progress is still there.

**Active vs idle.** Toggle **Auto-run** to loop runs on a conservative
auto-pilot (idle-friendly). Actively running earns an **active bonus** (up to
~2.5×) over idling. The simulation runs on a wall-clock accumulator, so a
hidden/background tab keeps progressing; when the page was fully closed, an
offline catch-up estimates idle earnings (capped at 8h, reduced efficiency)
and shows a *Welcome back* modal.

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

A workflow at `.github/workflows/deploy.yml` builds the site on every push to
`main` and publishes the **compiled** `dist/` to a **`gh-pages`** branch. That
branch contains real HTML/JS (no `src/main.tsx`), so Pages serves a working app.

**One manual step (only needed once):** after the workflow has run at least once
(so the `gh-pages` branch exists), go to
**Settings → Pages → Build and deployment**, set **Source = "Deploy from a
branch"**, **Branch = `gh-pages`**, folder **`/ (root)`**, and Save. The game
will be live at:

```
https://<your-username>.github.io/Move/
```

> Why a branch and not "GitHub Actions" source? Serving from a branch that holds
> the built output is unambiguous: if you ever see a `GET /src/main.tsx 404`, it
> means Pages is serving un-built source — the `gh-pages` branch can't do that.

If you rename the repository, update the one `base` string in
`vite.config.ts` (`/Move/`) to match the new repo name.

## Architecture (built to grow)

The long-term plan is multiple **main objects** (roller skates, car, train,
particle…), each its own passive tree with its own specialities, mutually
exclusive (switching is a respec). So content is **data, not code**:

- **`src/data/`** — typed config, no art files.
  - `types.ts` defines `GameObjectDef` (with a `renderKind`) → `TreeCategory` →
    `TreeNode` (cost/mods/prereqs/emoji icon), plus `StatKey`, `StatMod`,
    `CurrencyId` and typed **cosmetic slots** (`shoes`/`coat`/`headgear`/`back`
    with tier numbers — the renderer decides how a tier looks).
  - `currencies.ts` defines the currencies and how each is awarded from a run's
    `RunMetrics` (the log-scaled KE/momentum live here).
  - `scientist.ts` is the starting object: base stats + a research tech tree of
    categories → multi-rank nodes (prereqs, scaling costs, cosmetics). The
    **bicycle** is a future object (a new data file with a new renderKind);
    relativistic regimes come later still — neither touches existing code.
  - `index.ts` is the object registry. **Adding a new object = a new data file
    registered here** — no changes to the simulation or UI.
- **`src/sim/ride.ts`** — the **pure** physics. `rideStep(state, stats, exert,
  dt)` advances one tick (energy reserve + stamina model) with no
  rendering/state/randomness; `isFinished` ends a run on exhaustion;
  `simulateRide` runs it headlessly under a policy (offline catch-up and the
  unit tests in `ride.test.ts`).
- **`src/game/engine.ts`** — the **run engine**, plain TS with no React and no
  rendering. Owns the run lifecycle (idle → running → collapsing), rolls
  weather, applies the auto-run loop and the active-play bonus tracking, and
  steps the sim on a **wall-clock accumulator** from an interval timer — so a
  hidden tab catches up losslessly instead of freezing. React subscribes to
  throttled snapshots (`useSyncExternalStore`); the renderer `peek()`s live
  state each frame. Unit-tested in `engine.test.ts`.
- **`src/game/tree.ts`** — generic tech-tree logic: rank state, scaling rank
  costs, prerequisites, stat aggregation (additive then multiplicative
  passes), cosmetic-tier resolution and progress counts. No object-specific
  code. Unit-tested in `tree.test.ts`.
- **`src/render/`** — pure Pixi, consumes the engine read-only.
  - `walker.ts` draws the scientist **procedurally** (jointed two-segment
    limbs, speed-scaled gait, collapse pose) and applies cosmetic tiers
    synchronously — no texture loading, no async rebuild races.
  - `scenery.ts` generates sky/weather, parallax hills, ground detail and
    distance signs in **chunks around the camera** (constant cost no matter
    how far you run), plus the crowd and speed lines.
  - `stage.ts` composes them and follows the camera; `StageView.tsx` is the
    thin React mount.
- **`src/store/gameStore.ts`** — central Zustand store (wallet, `ranks`,
  best/run counters, auto-run, `introSeen`, `lastActive`, `saveVersion`)
  persisted to `localStorage`, with a **real `migrate`** (v1 → … → v5) and
  offline catch-up computed on rehydrate.
- **`src/ui/`** — React HUD (currencies), live ride bars (stamina, energy,
  freshness, speed in m/s), the tabbed **`UpgradePanel`** (category tabs, rank
  pips, cost chips, prereq locks), the end-of-run **`Results`** screen (titled
  by how the run ended), the `Intro` story, and `WelcomeBack`.

### Tuning (`src/config.ts`)

One file centralises the knobs you'll want to tweak: physics timestep and the
**skill mechanic** (`freshness` — holding continuously makes strides weaker, so
rhythmic *pulsing* beats mashing), engine timing (tick interval, collapse
length, auto-run gap, hidden-tab catch-up cap), render scale and gait params
(incl. a `gait.dir` flip if the run cycle ever looks reversed), the tree
**cost-growth exponent**, the active-play bonus, and the offline-earning rate,
plus UI hint text. Per-object physics (a specific
object's friction/drag/mass/power/energy) are its `baseStats` in its data file;
upgrade values/costs are the node definitions there; weather lives in
`src/data/weather.ts`.

### Out of scope (for now)

Electron/Steam, the bicycle and later vehicles, relativistic motion, prestige
layers, audio, polished art, and any backend or cloud saves. The architecture
(data-driven objects, a pure sim, generic tree logic) leaves clear room for all
of these without painting us into a corner.
