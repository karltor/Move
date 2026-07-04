import { Application } from 'pixi.js';
import type { RunEngine } from '../game/engine';
import type { Cosmetics } from '../game/tree';
import { Walker } from './walker';
import { Scenery } from './scenery';
import { CONFIG } from '../config';

// ---------------------------------------------------------------------------
// STAGE — a read-only view of the engine. Pure Pixi, no React, no sim logic.
// ---------------------------------------------------------------------------
// Every frame it `peek()`s the engine's live state and draws it: camera
// follows distance, the walker is posed from speed / collapse progress, and
// scenery windows follow the camera. It never advances the simulation.
// ---------------------------------------------------------------------------

const PPU = CONFIG.render.pixelsPerMetre;
const GROUND_FROM_BOTTOM = 96;
const WALKER_SCREEN_FRAC = 0.2;

export class Stage {
  private app: Application | null = null;
  private scenery: Scenery | null = null;
  private walker: Walker | null = null;
  private cosmetics: Cosmetics;
  private destroyed = false;

  constructor(
    private readonly engine: RunEngine,
    private readonly host: HTMLElement,
    cosmetics: Cosmetics,
  ) {
    this.cosmetics = cosmetics;
  }

  async init() {
    const app = new Application();
    await app.init({
      background: '#cdeafe',
      antialias: true,
      resizeTo: this.host,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    if (this.destroyed) {
      app.destroy(true, { children: true });
      return;
    }
    this.app = app;
    this.host.appendChild(app.canvas);

    const scenery = new Scenery();
    const walker = new Walker(this.cosmetics);
    this.scenery = scenery;
    this.walker = walker;
    app.stage.addChild(scenery.sky, scenery.hills, scenery.groundStrip, scenery.details, walker.root, scenery.overlay);

    this.layout();
    app.renderer.on('resize', this.layout);
    app.ticker.add((t) => this.frame(t.deltaMS));
  }

  setCosmetics(c: Cosmetics) {
    this.cosmetics = c;
    this.walker?.setCosmetics(c);
  }

  destroy() {
    this.destroyed = true;
    if (this.app) {
      this.app.renderer.off('resize', this.layout);
      this.app.destroy(true, { children: true });
      this.app = null;
    }
    this.scenery = null;
    this.walker = null;
  }

  private layout = () => {
    const app = this.app;
    if (!app || !this.scenery || !this.walker) return;
    const gy = app.screen.height - GROUND_FROM_BOTTOM;
    this.scenery.layout(app.screen.width, app.screen.height, gy);
    this.walker.root.position.set(app.screen.width * WALKER_SCREEN_FRAC, gy);
  };

  private frame(deltaMS: number) {
    const app = this.app;
    const scenery = this.scenery;
    const walker = this.walker;
    if (!app || !scenery || !walker) return;

    const p = this.engine.peek();
    const running = p.phase !== 'idle';
    const camPx = (p.ride?.x ?? 0) * PPU;
    const v = p.phase === 'running' ? p.ride!.v : 0;

    scenery.setWeather(running ? (p.weather?.id ?? null) : null);
    scenery.update(camPx, app.screen.width * WALKER_SCREEN_FRAC, v, performance.now());

    if (p.phase === 'collapsing') {
      walker.collapse(p.collapseT);
    } else if (p.phase === 'idle' && p.ride && p.lastEnd && p.lastEnd !== 'stopped') {
      walker.collapse(1); // stay down where the run ended until the next start
    } else {
      walker.run(v, deltaMS);
    }
  }
}
