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
   physiology: a finite **energy reserve** (only depletes — when it's gone you
   coast to a stop and the run ends) and a fast **stamina** burst pool that
   exerting spends and easing-off refills from the reserve. No timer: pace your
   breath to go far. There's no infinite stamina — energy runs out.
2. The run scores **metrics** (distance, average/top speed, momentum, kinetic
   energy) that award four **currencies**: 💰 Grants (funding for distance),
   🏃 Pace (avg speed), ⚡ Kinetic Energy (½·m·v²), 🌀 Momentum (m·v). KE and
   momentum are log-scaled so future heavy/fast objects stay relevant.
3. Open the **Upgrade Lab** (a modal — the run keeps going behind it) and spend
   currencies in the **passive tree**: connected nodes (basics, "notables", and
   one exclusive **speciality** keystone like *Lab-Funded Exosuit*,
   *Olympic Runner* or *Ultramarathoner*).
4. **Run again** to go further. Refresh — your progress is still there.

**Active vs idle.** Toggle **Auto-run** to loop runs on a conservative
auto-pilot (idle-friendly). Actively running a run earns an **active bonus**
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
  - `types.ts` defines `GameObjectDef` (with a `renderKind`) → `PassiveTree`
    (`TreeNode`/`TreeEdge`) + optional `SlotDef` art layers, plus `StatKey`,
    `StatMod`, `CurrencyId`.
  - `currencies.ts` defines the currencies and how each is awarded from a run's
    `RunMetrics` (the log-scaled KE/momentum live here).
  - `scientist.ts` is the starting object: base stats + a tree of ~16 nodes
    incl. 3 specialities. The **bicycle** is a future object (a new data file
    with the `'layers'` renderKind + spinning-wheel art); relativistic regimes
    come later still — neither touches existing code.
  - `index.ts` is the object registry. **Adding a new object = a new data file
    (+ art) registered here** — no changes to the simulation or UI.
- **`src/sim/ride.ts`** — the **pure** physics. `rideStep(state, stats, exert,
  dt)` advances one tick (energy reserve + stamina model) with no
  rendering/state/randomness; `isFinished` ends a run on exhaustion;
  `simulateRide` runs it headlessly under a policy (idle auto-pilot, offline,
  and the unit tests in `ride.test.ts`). The real-time canvas steps the exact
  same function with live input.
- **`src/game/tree.ts`** — generic tree logic: allocation rules, currency
  affordability, stat aggregation (additive then multiplicative passes), and
  art resolution. No object-specific code.
- **`src/game/PixiStage.tsx`** — the canvas. Switches on `renderKind`: a
  procedurally-animated **walker** (the scientist — lab coat, swinging limbs,
  speed-scaled stride, cheering crowd) today, and a layered-SVG path ready for
  future vehicles. Follows the runner with a camera; speed lines at pace.
- **`src/store/gameStore.ts`** — central Zustand store (wallet, allocated
  nodes, best/run counters, auto-run, `introSeen`, `lastActive`,
  `saveVersion`) persisted to `localStorage`, with a **real `migrate`** (v1
  launch-prototype → v2 cyclist tree → v3 scientist) and offline catch-up
  computed on rehydrate.
- **`src/ui/`** — React HUD (currencies), live ride bars (stamina + energy),
  the interactive `SkillTree` (a modal: pan + click + allocate + respec), the
  `Intro` story, and the `WelcomeBack` modal.

### Out of scope (for now)

Electron/Steam, the bicycle and later vehicles, relativistic motion, prestige
layers, audio, polished art, and any backend or cloud saves. The architecture
(data-driven objects, a pure sim, generic tree logic) leaves clear room for all
of these without painting us into a corner.
