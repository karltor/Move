import { Container, Graphics } from 'pixi.js';
import type { Cosmetics } from '../game/tree';
import { CONFIG } from '../config';

// ---------------------------------------------------------------------------
// PROCEDURAL WALKER — the scientist, drawn entirely with Pixi Graphics.
// ---------------------------------------------------------------------------
// No SVG assets, no async texture loads, no rebuild races: `setCosmetics`
// rebuilds the rig synchronously from typed cosmetic tiers. The rig is the
// classic side-view runner: two-segment legs (knee) and arms (elbow) on a
// body container, so the gait math can pose every joint each frame.
//
// Origin is at the feet (ground); up is negative y. All lengths in px.
// ---------------------------------------------------------------------------

const HIP_Y = -62;
const THIGH_LEN = 28;
const SHIN_LEN = 30;
const SHOULDER_Y = -104;
const UPARM_LEN = 24;
const FOREARM_LEN = 22;
const HEAD_CY = SHOULDER_Y - 18;

const SKIN = 0xeeb98a;
const SKIN_SHADE = 0xd9a276;
const HAIR = 0x5b4632;
const TROUSER = 0x3f4a5c;
const TROUSER_SHADE = 0x323b4a;

/** Coat body + sleeve colours per tier (0 lab coat, 1 windbreaker, 2 aero suit). */
const COATS = [
  { body: 0xf4f6f8, shade: 0xd7dde4, sleeve: 0xe9edf2, trim: 0x9aa7b5 },
  { body: 0x3b82f6, shade: 0x2563eb, sleeve: 0x60a5fa, trim: 0xdbeafe },
  { body: 0x1e293b, shade: 0x0f172a, sleeve: 0x334155, trim: 0x22d3ee },
];

/** Shoe colours per tier (0 loafers, 1 runners, 2 spring soles). */
const SHOES = [
  { body: 0x6b4f2a, sole: 0x4a371d, accent: 0x6b4f2a },
  { body: 0xf97316, sole: 0xf8fafc, accent: 0xffffff },
  { body: 0x0ea5e9, sole: 0xe0f2fe, accent: 0x22d3ee },
];

const BACK_TINT = 0xb9c1cc;

interface Limb {
  upper: Container; // rotates at the proximal joint (hip / shoulder)
  lower: Container; // rotates at the distal joint (knee / elbow)
}

function tintAll(c: Container, tint: number) {
  for (const child of c.children) {
    if (child instanceof Graphics) child.tint = tint;
    if (child instanceof Container) tintAll(child, tint);
  }
}

function drawShoe(g: Graphics, tier: number) {
  const s = SHOES[Math.min(tier, SHOES.length - 1)];
  const y = SHIN_LEN - 4;
  g.roundRect(-5, y - 4, 19, 9, 4).fill(s.body);
  g.roundRect(-5, y + 2, 20, 4, 2).fill(s.sole);
  if (tier >= 1) g.moveTo(-1, y).lineTo(6, y + 2).stroke({ width: 1.5, color: s.accent });
  if (tier >= 2) {
    // spring coil under the sole
    for (let i = 0; i < 3; i++) {
      g.moveTo(-2 + i * 5, y + 6).lineTo(1 + i * 5, y + 8).stroke({ width: 1.5, color: s.accent });
    }
  }
}

export class Walker {
  /** Position this at (screenX, groundY); everything else is internal. */
  readonly root = new Container();

  private body = new Container();
  private legF!: Limb;
  private legB!: Limb;
  private armF!: Limb;
  private armB!: Limb;
  private coatTail!: Graphics;
  private phase = 0;

  constructor(cosmetics: Cosmetics) {
    this.root.addChild(this.body);
    this.build(cosmetics);
  }

  setCosmetics(cosmetics: Cosmetics) {
    for (const c of this.body.removeChildren()) c.destroy({ children: true });
    this.build(cosmetics);
  }

  // --- assembly ------------------------------------------------------------

  private build(cos: Cosmetics) {
    const coat = COATS[Math.min(cos.coat, COATS.length - 1)];

    this.legB = this.makeLeg(-3, cos.shoes);
    this.armB = this.makeArm(-2, coat.sleeve);
    tintAll(this.legB.upper, BACK_TINT);
    tintAll(this.armB.upper, BACK_TINT);
    this.body.addChild(this.legB.upper, this.armB.upper);

    if (cos.back >= 1) this.body.addChild(this.makeBackpack());

    this.coatTail = this.makeCoatTail(coat.shade);
    this.body.addChild(this.coatTail);
    this.body.addChild(this.makeTorso(coat, cos.coat));
    this.body.addChild(this.makeHead(cos.headgear));

    this.armF = this.makeArm(5, coat.sleeve);
    this.legF = this.makeLeg(4, cos.shoes);
    this.body.addChild(this.armF.upper, this.legF.upper);
  }

  private makeLeg(hipX: number, shoeTier: number): Limb {
    const upper = new Container();
    upper.position.set(hipX, HIP_Y);
    const thigh = new Graphics();
    thigh.roundRect(-5, -3, 10, THIGH_LEN + 7, 5).fill(TROUSER);
    upper.addChild(thigh);

    const lower = new Container();
    lower.position.set(0, THIGH_LEN);
    const shin = new Graphics();
    shin.roundRect(-4, -2, 8, SHIN_LEN - 4, 4).fill(TROUSER_SHADE);
    shin.roundRect(-3, SHIN_LEN - 12, 6, 7, 2).fill(0xf8fafc); // sock
    drawShoe(shin, shoeTier);
    lower.addChild(shin);
    upper.addChild(lower);
    return { upper, lower };
  }

  private makeArm(shoulderX: number, sleeve: number): Limb {
    const upper = new Container();
    upper.position.set(shoulderX, SHOULDER_Y);
    const ua = new Graphics();
    ua.roundRect(-4, -3, 8, UPARM_LEN + 6, 4).fill(sleeve);
    upper.addChild(ua);

    const lower = new Container();
    lower.position.set(0, UPARM_LEN);
    const fa = new Graphics();
    fa.roundRect(-3.5, -2, 7, FOREARM_LEN, 3.5).fill(SKIN);
    fa.circle(0, FOREARM_LEN - 1, 4).fill(SKIN_SHADE); // hand
    lower.addChild(fa);
    upper.addChild(lower);
    return { upper, lower };
  }

  private makeTorso(coat: (typeof COATS)[number], tier: number): Graphics {
    const g = new Graphics();
    // coat body from shoulders past the hips
    g.roundRect(-12, SHOULDER_Y - 2, 24, HIP_Y - SHOULDER_Y + 14, 7).fill(coat.body);
    // shading down the back
    g.roundRect(-12, SHOULDER_Y - 2, 7, HIP_Y - SHOULDER_Y + 14, 7).fill(coat.shade);
    // collar
    g.moveTo(-8, SHOULDER_Y + 2).lineTo(9, SHOULDER_Y + 2).stroke({ width: 3, color: coat.trim });
    if (tier === 0) {
      // lab-coat buttons
      for (let i = 0; i < 3; i++) g.circle(7, SHOULDER_Y + 14 + i * 11, 1.6).fill(coat.trim);
    } else {
      // zip / glow line
      g.moveTo(7, SHOULDER_Y + 6).lineTo(7, HIP_Y + 8).stroke({ width: 2, color: coat.trim });
    }
    return g;
  }

  private makeCoatTail(color: number): Graphics {
    const g = new Graphics();
    g.poly([-10, HIP_Y + 4, -22, HIP_Y + 26, -8, HIP_Y + 14]).fill(color);
    g.pivot.set(-10, HIP_Y + 4);
    g.position.set(-10, HIP_Y + 4);
    return g;
  }

  private makeHead(headgearTier: number): Container {
    const c = new Container();
    const g = new Graphics();
    g.circle(0, HEAD_CY - 1, 15.5).fill(HAIR); // hair ball (back + top)
    g.circle(4, HEAD_CY + 2, 13).fill(SKIN); // face carved out, facing right
    g.circle(-2, HEAD_CY + 6, 3).fill(SKIN_SHADE); // ear
    g.circle(10, HEAD_CY, 1.8).fill(0x2d3748); // eye (facing right)
    g.moveTo(12, HEAD_CY + 8).lineTo(16, HEAD_CY + 7).stroke({ width: 1.5, color: SKIN_SHADE }); // mouth
    c.addChild(g);

    if (headgearTier === 1) {
      const gg = new Graphics();
      gg.moveTo(-12, HEAD_CY - 4).lineTo(4, HEAD_CY - 6).stroke({ width: 3, color: 0x334155 }); // strap
      gg.circle(10, HEAD_CY - 5, 6).fill(0xfbbf24).stroke({ width: 2, color: 0x334155 }); // lens
      c.addChild(gg);
    } else if (headgearTier >= 2) {
      const h = new Graphics();
      // shell: half-dome (explicit moveTo so the arc doesn't pick up a connector)
      h.moveTo(-14.5, HEAD_CY - 2).arc(2, HEAD_CY - 2, 16.5, Math.PI, Math.PI * 2).closePath().fill(0xe11d48);
      h.roundRect(-15, HEAD_CY - 4, 34, 5, 2).fill(0xf8fafc); // rim
      h.circle(2, HEAD_CY - 16, 3).fill(0xf8fafc); // vent bump
      c.addChild(h);
    }
    return c;
  }

  private makeBackpack(): Graphics {
    const g = new Graphics();
    g.roundRect(-24, SHOULDER_Y + 2, 13, 34, 5).fill(0x475569);
    g.roundRect(-22, SHOULDER_Y + 6, 9, 12, 3).fill(0x22d3ee); // energy core
    g.moveTo(-18, SHOULDER_Y + 36).lineTo(-18, HIP_Y + 4).stroke({ width: 3, color: 0x64748b }); // strut
    return g;
  }

  // --- posing --------------------------------------------------------------

  /** Run/walk cycle; `v = 0` gives a gentle idle sway. */
  run(v: number, dtMs: number) {
    const G = CONFIG.render.gait;
    this.phase += (G.strideBase + v * G.stridePerSpeed) * (dtMs / 1000);
    const ph = this.phase * G.dir;
    const swing = Math.min(G.swingMax, G.swingBase + v * G.swingPerSpeed);

    // Stance leg sweeps front-to-back; the knee bends during the recovery
    // half (foot lifted, swinging forward). Arms counter-swing with a
    // relaxed elbow.
    const kneeF = Math.max(0, -Math.cos(ph)) * swing * 1.9;
    const kneeB = Math.max(0, Math.cos(ph)) * swing * 1.9;
    this.setLimb(this.legF, Math.sin(ph) * swing, kneeF);
    this.setLimb(this.legB, -Math.sin(ph) * swing, kneeB);
    this.setLimb(this.armF, -Math.sin(ph) * swing * 0.85, 0.3 + Math.max(0, Math.cos(ph)) * 0.35);
    this.setLimb(this.armB, Math.sin(ph) * swing * 0.85, 0.3 + Math.max(0, -Math.cos(ph)) * 0.35);

    this.coatTail.rotation = -0.2 - v * 0.02 + Math.sin(ph) * 0.08;
    this.body.y = -Math.abs(Math.sin(ph)) * (1.5 + v * 0.18);
    this.body.rotation = Math.min(0.1, v * 0.01);
  }

  /** Faceplant, `t` 0..1 (eased internally). */
  collapse(t: number) {
    const e = 1 - Math.pow(1 - t, 3);
    this.setLimb(this.legF, 0.5 * e, 0.2 * e);
    this.setLimb(this.legB, -0.5 * e, 0.9 * e);
    this.setLimb(this.armF, 1.2 * e, 0.6 * e);
    this.setLimb(this.armB, -0.8 * e, 0.4 * e);
    this.coatTail.rotation = -0.2 + 0.5 * e;
    this.body.rotation = 1.5 * e;
    this.body.y = 4 * e;
  }

  private setLimb(limb: Limb, upperRot: number, lowerRot: number) {
    limb.upper.rotation = upperRot;
    limb.lower.rotation = lowerRot;
  }
}
