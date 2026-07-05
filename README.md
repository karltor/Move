# Move

A browser-based incremental **"go as far as possible"** game. It opens with a
short story — a broke research lab, funded by a suspiciously fast-looking
shadowy figure who just wants them to **GO FAST** — and starts you as a lone
**scientist on foot**, jogging across a rough field as colleagues cheer.

The whole game is **one node graph**: you unlock nodes, upgrade nodes, and —
because your loadout budget is always smaller than your collection — choose
which nodes to actually equip. Deeper in the graph, traversal nodes replace
your legs entirely: **skateboard → bicycle → rocket skates**. Plays actively
or idles in the background; progress persists to `localStorage`.

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
   duration) and the currencies it earned. **Three currencies, three verbs**:
   - 🔬 **Research** (from distance) → **unlocks** nodes, permanently.
   - 💡 **Insight** (from speed) → **upgrades** node ranks, permanently.
   - ⚡ **Flux** (from peak momentum, log-scaled) → **equips** nodes. Flux is a
     *budget*, not a payment: an equipped node reserves its cost and frees it
     when unequipped.
3. Open **The Lab** (the run keeps going behind it) — one full-window node
   graph where you can see at a glance what's locked, unlockable, unlocked and
   equipped. The sidebar shows the selected node's actions, your **loadout**
   with its Flux meter, and **every stat of the current build** with a
   plain-language explanation of what each one does. Unlocked nodes do
   *nothing* until equipped — you'll unlock far more than you can power, so
   the loadout is where the choices happen. **Traversal nodes** (skateboard,
   bicycle, rocket skates) swap the whole ride: new base stats, new vehicle on
   screen, one at a time.
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

Everything the player progresses through is **data, not code** — the node
graph, the traversal modes and the currencies are plain typed definitions:

- **`src/data/`** — typed config, no art files.
  - `types.ts` defines `NodeDef` (unlock/rank/equip costs, per-rank `StatMod`s,
    prereqs, grid position, optional traversal `mode`), `ModeDef` (base stats +
    vehicle), `StatKey`, `CurrencyId` and typed **cosmetic slots**
    (`shoes`/`coat`/`headgear`/`back` tiers — the renderer decides how a tier
    looks).
  - `nodes.ts` is the whole game: ~30 nodes across five branches (body, mind,
    gear, tech, modes) with balance intent documented at the top. **Adding
    content = adding a node here.**
  - `modes.ts` defines the rides (on foot → skateboard → bicycle → rocket
    skates) as base-stat profiles — the same pure sim runs all of them.
  - `currencies.ts` maps run metrics to the three currencies (🔬 distance,
    💡 speed, ⚡ log-scaled momentum) and states each one's verb.
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
- **`src/game/tree.ts`** — the unlock/upgrade/equip rules: prereqs, scaling
  rank costs, the **Flux budget** (reserved by equipped nodes, freed on
  unequip), mode exclusivity, stat aggregation from the active mode's base
  stats + equipped mods (additive then multiplicative passes), and
  cosmetic/vehicle resolution. Unit-tested in `tree.test.ts`.
- **`src/render/`** — pure Pixi, consumes the engine read-only.
  - `walker.ts` draws the scientist **procedurally** (jointed two-segment
    limbs, speed-scaled gait, collapse pose) plus the vehicles: skateboard
    (push cycle), bicycle (pedal IK from the saddle, spinning spoked wheels)
    and rocket skates (flames). Cosmetics apply synchronously — no texture
    loading, no async rebuild races.
  - `scenery.ts` generates sky/weather, parallax hills, ground detail and
    distance signs in **chunks around the camera** (constant cost no matter
    how far you run), plus the crowd and speed lines.
  - `stage.ts` composes them and follows the camera; `StageView.tsx` is the
    thin React mount.
- **`src/store/gameStore.ts`** — central Zustand store (wallet, `ranks`,
  `equipped` loadout, best/run counters, auto-run, `introSeen`, `lastActive`,
  `saveVersion`) persisted to `localStorage`, with a **real `migrate`**
  (v1 → … → v6) and offline catch-up computed on rehydrate.
- **`src/ui/`** — React HUD (currencies), live ride bars (stamina, energy,
  freshness, speed in m/s), **`Lab.tsx`** (the full-window node graph with the
  loadout + build-stats sidebar; stat explanations live in `statInfo.ts`), the
  end-of-run **`Results`** screen (titled by how the run ended), the `Intro`
  story, and `WelcomeBack`.

### Tuning (`src/config.ts`)

One file centralises the knobs you'll want to tweak: physics timestep and the
**skill mechanic** (`freshness` — holding continuously makes strides weaker, so
rhythmic *pulsing* beats mashing), engine timing (tick interval, collapse
length, auto-run gap, hidden-tab catch-up cap), render scale and gait params
(incl. a `gait.dir` flip if the run cycle ever looks reversed), the tree
**cost-growth exponent**, the active-play bonus, and the offline-earning rate,
plus UI hint text. Per-mode physics (a ride's friction/drag/mass/power/energy)
are its `baseStats` in `src/data/modes.ts`; node values/costs live in
`src/data/nodes.ts`; weather lives in `src/data/weather.ts`.

### Out of scope (for now)

Electron/Steam, further vehicles beyond the rocket skates, relativistic
motion, prestige layers, audio, polished art, and any backend or cloud saves.
The architecture (a data-defined node graph, mode base-stat profiles, a pure
sim) leaves clear room for all of these without painting us into a corner.
