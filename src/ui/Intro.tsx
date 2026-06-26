import { useState } from 'react';

interface Props {
  onDone: () => void;
}

// A shadowy benefactor with unmistakable spiky quills and a cocky grin.
function ShadowFigure() {
  return (
    <svg viewBox="0 0 200 200" className="shadow-figure" width="180" height="180">
      <defs>
        <radialGradient id="glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#1f3b66" />
          <stop offset="100%" stopColor="#0a0f1c" />
        </radialGradient>
      </defs>
      {/* spiky head + quills silhouette */}
      <path
        fill="url(#glow)"
        d="M100 28
           c-30 0 -52 18 -56 44
           l-30 -10 22 26 -26 8 28 12
           c4 30 30 52 66 52
           c40 0 70 -28 70 -64
           c0 -8 -2 -16 -6 -24
           l30 -14 -30 -6 18 -22 -28 8
           c-12 -16 -30 -24 -52 -24 z"
      />
      {/* body */}
      <ellipse cx="100" cy="168" rx="46" ry="24" fill="#0a0f1c" />
      {/* eyes */}
      <ellipse cx="86" cy="96" rx="9" ry="13" fill="#fff" />
      <ellipse cx="110" cy="96" rx="9" ry="13" fill="#fff" />
      <circle cx="88" cy="99" r="4" fill="#1a202c" />
      <circle cx="112" cy="99" r="4" fill="#1a202c" />
      {/* smirk */}
      <path d="M82 122 q20 14 40 0" stroke="#cbd5e0" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const SLIDES: { text: string; figure?: boolean }[] = [
  {
    text: 'Grantsville National Lab. Brilliant minds, empty coffers. The research has stalled — there is simply no money left to push anything forward.',
  },
  {
    text: '"I will fund all of it." A shadowy figure leans in from the dark, quills bristling, eyes gleaming. "Every beaker. Every blackboard. On one condition…"',
    figure: true,
  },
  {
    text: '"…you make something GO FAST. Faster than anything. I don\'t care how. Start small. Start now."',
    figure: true,
  },
  {
    text: 'So it begins — not with a rocket, but with a single scientist on a rough patch of field, colleagues cheering them on. Hold to run. Manage your breath. Go as far as you can.',
  },
];

export function Intro({ onDone }: Props) {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  return (
    <div className="modal-backdrop intro-backdrop">
      <div className="intro">
        <div className="intro-stage">{slide.figure && <ShadowFigure />}</div>
        <p className="intro-text">{slide.text}</p>
        <div className="intro-dots">
          {SLIDES.map((_, k) => (
            <span key={k} className={k === i ? 'dot on' : 'dot'} />
          ))}
        </div>
        <div className="intro-actions">
          <button className="intro-skip" onClick={onDone}>
            Skip
          </button>
          <button className="intro-next" onClick={() => (last ? onDone() : setI(i + 1))}>
            {last ? "Let's go →" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
