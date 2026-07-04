import { Container, Graphics, Text } from 'pixi.js';
import { CONFIG } from '../config';

// ---------------------------------------------------------------------------
// SCENERY — sky, parallax hills, ground, crowd, distance markers, effects.
// ---------------------------------------------------------------------------
// The old renderer pre-drew 200 km of ground detail into a single Graphics
// (tens of thousands of shapes) at startup. Here everything world-anchored is
// generated in fixed-width CHUNKS around the camera and destroyed once it
// falls behind, so cost is constant regardless of how far the run goes.
// Chunk content is seeded by chunk index, so re-visiting an index (or
// resizing) regenerates identical scenery.
// ---------------------------------------------------------------------------

const PPU = CONFIG.render.pixelsPerMetre;
const CHUNK = 512; // px
const HILL_PARALLAX = 0.45;
const SIGN_EVERY_M = 50;

/** Deterministic per-chunk RNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKY: Record<string, number> = {
  default: 0xcdeafe,
  rain: 0xa9bccd,
  heat: 0xffe3b8,
  cold: 0xe3edf6,
};

interface ChunkLayer {
  container: Container;
  chunks: Map<number, Container>;
  build: (chunk: Container, index: number) => void;
}

export class Scenery {
  readonly sky = new Graphics(); // screen space
  readonly hills = new Container(); // parallax world layer (y = ground)
  readonly groundStrip = new Graphics(); // screen space
  readonly details = new Container(); // world layer (y = ground)
  readonly overlay = new Graphics(); // screen-space effects

  private screenW = 0;
  private screenH = 0;
  private groundY = 0;
  private weatherId: string | null = null;
  private hillLayer: ChunkLayer;
  private detailLayer: ChunkLayer;

  constructor() {
    this.hillLayer = { container: this.hills, chunks: new Map(), build: (c, i) => this.buildHillChunk(c, i) };
    this.detailLayer = { container: this.details, chunks: new Map(), build: (c, i) => this.buildDetailChunk(c, i) };
    this.details.addChild(this.buildCrowd());
  }

  /** Call on init and every resize. */
  layout(w: number, h: number, groundY: number) {
    this.screenW = w;
    this.screenH = h;
    this.groundY = groundY;
    this.hills.y = groundY;
    this.details.y = groundY;
    this.drawSky();
    this.groundStrip.clear();
    this.groundStrip.rect(0, groundY, w, h - groundY).fill(0x6b4f2a);
    this.groundStrip.rect(0, groundY, w, 7).fill(0x866137);
  }

  setWeather(id: string | null) {
    if (id === this.weatherId) return;
    this.weatherId = id;
    this.drawSky();
  }

  /** Per frame: slide layers, maintain chunk windows, draw effects. */
  update(camPx: number, viewOffset: number, v: number, timeMs: number) {
    this.details.x = viewOffset - camPx;
    this.hills.x = viewOffset - camPx * HILL_PARALLAX;
    this.ensureChunks(this.detailLayer, camPx - viewOffset);
    this.ensureChunks(this.hillLayer, camPx * HILL_PARALLAX - viewOffset);
    this.drawEffects(v, timeMs);
  }

  // --- chunk management ------------------------------------------------------

  private ensureChunks(layer: ChunkLayer, windowStart: number) {
    const first = Math.floor((windowStart - CHUNK) / CHUNK);
    const last = Math.floor((windowStart + this.screenW + CHUNK) / CHUNK);
    for (let i = first; i <= last; i++) {
      if (!layer.chunks.has(i)) {
        const chunk = new Container();
        chunk.x = i * CHUNK;
        layer.build(chunk, i);
        layer.container.addChild(chunk);
        layer.chunks.set(i, chunk);
      }
    }
    for (const [i, chunk] of layer.chunks) {
      if (i < first - 1 || i > last + 1) {
        layer.chunks.delete(i);
        chunk.destroy({ children: true });
      }
    }
  }

  private buildHillChunk(chunk: Container, index: number) {
    const rng = mulberry32(index * 2654435761 + 101);
    const g = new Graphics();
    for (let k = 0; k < 2; k++) {
      const cx = k * 300 + rng() * 120;
      const rx = 220 + rng() * 130;
      const ry = 120 + rng() * 90;
      g.ellipse(cx, 40, rx, ry).fill(rng() > 0.5 ? 0xa7d98a : 0x93cc74);
    }
    chunk.addChild(g);
  }

  private buildDetailChunk(chunk: Container, index: number) {
    const rng = mulberry32(index * 2654435761 + 7);
    const g = new Graphics();
    for (let k = 0; k < 9; k++) {
      const x = rng() * CHUNK;
      const r = rng();
      if (r < 0.45) {
        g.rect(x, 11 + rng() * 8, 4, 4).fill(0x5a4222); // pebble
      } else if (r < 0.85) {
        g.ellipse(x, 4, 6, 3).fill(rng() > 0.5 ? 0x4e7a3a : 0x3f6e29); // tuft
      } else {
        g.circle(x, 1, 2.4).fill(rng() > 0.5 ? 0xf6ad55 : 0xfc8181); // flower
        g.moveTo(x, 2).lineTo(x, 8).stroke({ width: 1.5, color: 0x3f6e29 });
      }
    }
    chunk.addChild(g);

    // Distance signs on round metres within this chunk (skip the start line).
    const signStep = SIGN_EVERY_M * PPU;
    const x0 = index * CHUNK;
    for (let s = Math.ceil(x0 / signStep) * signStep; s < x0 + CHUNK; s += signStep) {
      if (s <= 0) continue;
      chunk.addChild(this.buildSign(s - x0, s / PPU));
    }
  }

  private buildSign(localX: number, metres: number): Container {
    const c = new Container();
    const g = new Graphics();
    g.rect(-2, -46, 4, 46).fill(0x8b6a3a); // post
    g.roundRect(-30, -66, 60, 24, 5).fill(0xf8fafc).stroke({ width: 2, color: 0x8b6a3a });
    c.addChild(g);
    const label = new Text({
      text: `${Math.round(metres)} m`,
      style: { fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: '700', fill: 0x4a5568 },
    });
    label.anchor.set(0.5);
    label.position.set(0, -54);
    c.addChild(label);
    c.x = localX;
    return c;
  }

  private buildCrowd(): Graphics {
    const g = new Graphics();
    const colors = [0xe57373, 0x64b5f6, 0xffffff, 0xffd54f, 0x81c784, 0xba68c8];
    for (let i = 0; i < 7; i++) {
      const x = -150 - i * 26 - (i % 2) * 6;
      g.roundRect(x - 7, -34, 14, 26, 5).fill(colors[i % colors.length]);
      g.circle(x, -40, 7).fill(0xf1c27d);
      g.rect(x - 1, -58, 2, 16).fill(0x777777); // sign stick
      g.roundRect(x - 1, -60, 12, 8, 2).fill(0xffeb3b); // "GO!" placard
    }
    return g;
  }

  // --- sky & effects ---------------------------------------------------------

  private drawSky() {
    const g = this.sky;
    g.clear();
    const base = SKY[this.weatherId ?? 'default'] ?? SKY.default;
    g.rect(0, 0, this.screenW, this.screenH).fill(base);
    if (this.weatherId === 'heat' || this.weatherId === 'clear' || this.weatherId === null) {
      g.circle(this.screenW - 90, 80, this.weatherId === 'heat' ? 42 : 32).fill(0xffd54f);
    }
    const cloudy = this.weatherId === 'rain';
    const cloudColor = cloudy ? 0x8fa2b5 : 0xffffff;
    for (let i = 0; i < (cloudy ? 5 : 3); i++) {
      const cx = ((i * 331 + 140) % Math.max(1, this.screenW)) + 20;
      const cy = 60 + (i % 3) * 44;
      g.ellipse(cx, cy, 58, 18).fill({ color: cloudColor, alpha: cloudy ? 0.85 : 0.8 });
      g.ellipse(cx + 34, cy + 8, 40, 14).fill({ color: cloudColor, alpha: cloudy ? 0.8 : 0.7 });
    }
  }

  private drawEffects(v: number, timeMs: number) {
    const g = this.overlay;
    g.clear();

    if (this.weatherId === 'rain') {
      for (let i = 0; i < 36; i++) {
        const x = (i * 137 + timeMs * 0.55) % (this.screenW + 60) - 30;
        const y = (i * 89 + timeMs * 0.9) % this.groundY;
        g.moveTo(x, y).lineTo(x - 4, y + 14).stroke({ width: 1.5, color: 0xdbeafe, alpha: 0.4 });
      }
    }

    if (v >= 4) {
      const n = Math.min(12, Math.floor(v));
      const alpha = Math.min(0.5, (v - 4) / 16);
      for (let i = 0; i < n; i++) {
        const y = (i * 47 + ((timeMs / 2) % 47)) % this.screenH;
        const len = 34 + (i % 4) * 26;
        const x = this.screenW - ((timeMs / 2.5 + i * 110) % (this.screenW + 140));
        g.rect(x, y, len, 2).fill({ color: 0xffffff, alpha });
      }
    }
  }
}
