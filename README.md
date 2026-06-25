# Move

A browser-based incremental **"launch as far as possible"** game. This is the
first playable prototype: one launchable object (a **cyclist** off a ramp) with
a complete core loop — launch → distance → coins → buy upgrades (visible part
swaps + stat changes) → relaunch — with progress persisted to `localStorage`.

Built with **Vite + TypeScript + React** (UI), **PixiJS** (launch canvas), and
**Zustand** (`persist`) for game state. Deploys to **GitHub Pages**.

## Core loop

1. The cyclist sits on a ramp. Hit **Launch**.
2. A pure simulation computes the trajectory; the cyclist flies + rolls while
   the camera follows and the distance counter ticks up.
3. Distance becomes coins (`coins = floor(distance)`).
4. Spend coins in the **Garage** to upgrade Wheels / Frame / Rider. Each
   upgrade visibly swaps the part art and changes the aggregated stats.
5. **Relaunch** to go further. Refresh the page — your progress is still there.

## Local development

```bash
npm install
npm run dev        # start the dev server (prints a localhost URL)
```

Other scripts:

```bash
npm test           # run the simulation unit tests (Vitest)
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

The long-term plan is multiple launchable objects (cannonball, rocket, train…)
made of modular, upgradeable parts. So content is **data, not code**:

- **`src/data/`** — typed config. `types.ts` defines `GameObjectDef → SlotDef →
  PartVariant`. `cyclist.ts` is the one object (3 slots × 3 tiers); `index.ts`
  is the object registry. **Adding a new object = a new data file + SVGs
  registered in `index.ts`** — no changes to the simulation or UI.
- **`src/sim/simulateLaunch.ts`** — a **pure** function
  `simulateLaunch(stats) → { distance, trajectory }`. No rendering, no state,
  deterministic, unit-tested (`simulateLaunch.test.ts`). Reused by every object.
- **`src/game/stats.ts`** — aggregates the equipped variants' stat
  contributions over the object's base stats (generic across objects).
- **`src/game/PixiStage.tsx`** — object-agnostic canvas: renders the layered
  composition of the equipped part SVGs and animates along whatever trajectory
  it's handed.
- **`src/store/gameStore.ts`** — central Zustand store (coins, equipped parts,
  best distance, run count, `saveVersion`) persisted to `localStorage`, with a
  stubbed `migrate` hook keyed on `saveVersion` for future save migrations.
- **`src/ui/`** — React HUD and upgrade menu.

Part SVGs live in `src/assets/parts/`. All variants of the cyclist share one
`260×180` viewBox so the layers compose into a complete bike + rider.

### Out of scope (deliberately)

Electron/Steam, multiple objects, prestige layers, audio, idle/auto-launch,
polished art, and any backend or cloud saves. The architecture leaves room for
these without painting us into a corner.
