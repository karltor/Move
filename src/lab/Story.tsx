import { useEffect, useRef, useState } from "react";
import { equipmentUnlocked, totalTrials, type Save } from "./game";
export const STORIES = {
  intro: {
    tag: "An unsolicited research proposal",
    title: "The clocks stopped at 08:03.",
    pages: [
      [
        "DR. ELLIS",
        "Every clock in town stopped. The kettle stopped boiling. Even the dean stopped complaining. Briefly, we thought things had improved.",
      ],
      [
        "UNKNOWN VISITOR",
        "Your inertia engine has misplaced Tuesday. I can fix that. Probably. First I need motion data. Your budget covers one scientist and two shoes. Guess who's the vehicle.",
      ],
      [
        "DR. ELLIS",
        "Start a run. Collect data. Improve one thing. Repeat. We won't reach the forest immediately; that last hill is vicious. The visitor calls himself SANIK. He is a hedgehog. HR has questions.",
      ],
    ],
    button: "For science. Apparently.",
  },
  forest: {
    tag: "Field transmission · 100 m",
    title: "The pavement gives up.",
    pages: [
      [
        "SANIK",
        "You made it! Trees: nature's crash barriers. This trail asks more of your legs. The finish button shows exactly how many RP you'll keep. Exhaustion banks them too. I have negotiated this with the trees.",
      ],
    ],
    button: "Keep moving",
  },
  research: {
    tag: "The first field report",
    title: "A breakthrough. Also a blister.",
    pages: [
      [
        "DR. ELLIS",
        "A proper warm-up gives us 25% more stamina. Better running shoes give us 15% more top speed. Gather enough data for one improvement. Which problem should we solve first?",
      ],
      [
        "SANIK",
        "Both are permanent. When you can afford one, pick it, run again, and see what changed. More paths open as you learn. Your legs also gain XP during every run. Mine gained a parking ticket.",
      ],
    ],
    button: "Inspect the research desk",
  },
  equipment: {
    tag: "An unexpected find",
    title: "Someone left science on the road.",
    pages: [
      [
        "SANIK",
        "A piece of equipment! Ordinary finds have one small bonus. Rarer ones do several useful things at once. Travel further to improve your odds, or just be offensively lucky.",
      ],
      [
        "DR. ELLIS",
        "Fit one piece in each slot between runs. Your shoes, outfit and accessory show up on the scientist. Please stop calling the abandoned coat a 'legendary torso'.",
      ],
    ],
    button: "Noted. Legendary torso.",
  },
  distance: {
    tag: "Field transmission · 1 km",
    title: "The visitor keeps catching up.",
    pages: [
      [
        "DR. ELLIS",
        "SANIK arrived before us. On foot. He claims the orange scarf is 'aerodynamic paperwork'. The quills are apparently a comb-over. We are investigating.",
      ],
      [
        "SANIK",
        "Running is only the beginning. First, prove the lab can finish a kilometre and make a few discoveries. Then we'll discuss throwing things. Ideally things with no employment contract.",
      ],
    ],
    button: "More research required",
  },
  programs: {
    tag: "A broader interpretation of movement",
    title: "The scientist may now sit down.",
    pages: [
      [
        "SANIK",
        "Other ways to move! Your unlocked programs have their own buttons and currencies. Each keeps its research and equipment. I'm told wheels are an excellent invention. Personally, I find them a little... leisurely.",
      ],
    ],
    button: "Expand the experiment",
  },
  far: {
    tag: "Classified transmission · 10 km",
    title: "S.A.N.I.K.",
    pages: [
      [
        "DR. ELLIS",
        "The visitor crossed ten kilometres while my stopwatch was blinking. Asked how, he said: 'Suspiciously Agile, Non-disclosed Independent Kineticist.' That is not a qualification.",
      ],
      ["SANIK", "The scarf stays on. Tuesday is getting closer. Keep going."],
    ],
    button: "Chase the answer",
  },
};
export type StoryId = keyof typeof STORIES;
export function nextStory(s: Save, tab: string): StoryId | null {
  if (!s.tipsEnabled) return null;
  const seen = (id: StoryId) => s.storySeen.includes(id);
  if (!seen("intro")) return "intro";
  if (tab === "research" && totalTrials(s) > 0 && !seen("research"))
    return "research";
  if (equipmentUnlocked(s) && s.inventory.length && !seen("equipment"))
    return "equipment";
  if (s.unlocked.length > 1 && !seen("programs")) return "programs";
  const reach = Math.max(
    s.trial?.distance ?? 0,
    ...Object.values(s.progress).map((p) => p.bestDistance),
  );
  if (reach >= 100 && !seen("forest")) return "forest";
  if (reach >= 1000 && !seen("distance")) return "distance";
  if (reach >= 10000 && !seen("far")) return "far";
  return null;
}
export function SanikPortrait({ anonymous = false }: { anonymous?: boolean }) {
  return (
    <svg
      viewBox="0 0 260 330"
      role="img"
      aria-label={
        anonymous
          ? "An unidentified, unusually fast visitor"
          : "SANIK, a mischievous turquoise hedgehog with swept-back quills, an amber scarf and oversized purple running shoes"
      }
    >
      <defs>
        <linearGradient id="sanik-quills" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#2cb6ab" />
          <stop offset="1" stopColor="#126d78" />
        </linearGradient>
        <linearGradient id="sanik-shoes" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#8b63b0" />
          <stop offset="1" stopColor="#593c7c" />
        </linearGradient>
      </defs>
      <circle cx="130" cy="149" r="112" fill="#dceee4" />
      <path
        d="M24 140h35m-42 15h28m-6 18h22M198 75h32m-17 15h27"
        stroke="#98c9bd"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse cx="140" cy="294" rx="88" ry="10" fill="#a7bcab" opacity=".4" />
      <g
        stroke="#21494c"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path
          d="m111 158-41 12 16-27-57 1 43-27-53-18 54-10-36-34 58 10 29-32 41 30 25 51-30 48Z"
          fill="url(#sanik-quills)"
        />
        <path
          d="m139 216-18 52-23 0 13-57m41-2 17 42-17 15-29-49"
          fill="#299690"
        />
        <path
          d="m97 260 30 5-8 23H57c-4-16 24-26 40-28Z"
          fill="url(#sanik-shoes)"
        />
        <path
          d="m160 252 24 8 32 18c6 4 7 12-1 14h-73l2-24Z"
          fill="url(#sanik-shoes)"
        />
        <path d="M56 287h66v8H57Zm85 1h78v9h-79Z" fill="#f6eed6" />
        <path
          d="m88 267 25 4m-29 3 26 4m55-12 19 8m-24-2 20 9"
          stroke="#e4dfc9"
        />
        <path
          d="M108 152c-12 19-15 43-4 65 14 15 44 15 54-5 4-17-3-37-17-54Z"
          fill="#249b94"
        />
        <path
          d="M122 169c-13 2-20 24-13 38 8 14 27 11 32-1 3-13-2-35-19-37Z"
          fill="#e8cda0"
          strokeWidth="2"
        />
        <path
          d="m102 165-22 20 12 22m50-41 27 23 14-18"
          fill="none"
          stroke="#289d94"
          strokeWidth="14"
        />
        <path d="m90 198 14 2 4 16-12 11-13-9 0-11Z" fill="#fff5db" />
        <path
          d="m173 178 13-5 4-13 9-8 6 3-7 16 6 1 4-6 6 2-1 16-13 13-15-5Z"
          fill="#fff5db"
        />
        <path d="m142 149 29 2 41-18-10 20 35 3-31 15-56-6Z" fill="#e2a344" />
        <path d="M103 71 101 42l22 20m33 0 16-20 6 35" fill="#32afa5" />
        <path d="m106 60 8 8m49-5 7-10" stroke="#e5c699" strokeWidth="4" />
        <path
          d="M117 64c29-12 60 10 63 37 3 29-16 56-41 57-26 0-43-22-41-47 0-20 6-38 19-47Z"
          fill="#31ada3"
        />
        <path
          d="M107 105c8-10 23-6 28 6 6-15 23-17 32-6l-2 27-52 4Z"
          fill="#fff6df"
          strokeWidth="2"
        />
        <ellipse cx="124" cy="113" rx="4" ry="9" fill="#203b43" stroke="none" />
        <ellipse cx="154" cy="109" rx="4" ry="9" fill="#203b43" stroke="none" />
        <path d="m112 92 17 4m13-6 16-6" fill="none" strokeWidth="4" />
        <path
          d="M109 126c8-9 22-7 32-1 8-7 23-10 30-1 1 14-12 27-29 28-18 0-32-10-33-26Z"
          fill="#e8cda0"
          strokeWidth="2"
        />
        <ellipse
          cx="164"
          cy="122"
          rx="9"
          ry="6"
          fill="#233f45"
          transform="rotate(-16 164 122)"
        />
        <path d="m126 135 11 4c9 1 16-3 20-7" fill="none" strokeWidth="2" />
        <path d="m99 153 46-4 14 10-19 13-36-8Z" fill="#eba744" />
        <path d="m140 151 13 6-9 16-14-11Z" fill="#c7802f" strokeWidth="2" />
      </g>
      <text
        x="130"
        y="322"
        textAnchor="middle"
        fill="#4d5c69"
        fontSize="10"
        letterSpacing="3"
      >
        FAST. VAGUE. PROBABLY QUALIFIED.
      </text>
    </svg>
  );
}
export default function Story({
  id,
  onDone,
  onSkip,
}: {
  id: StoryId;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [page, setPage] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);
  const story = STORIES[id];
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  const [speaker, text] = story.pages[page];
  return (
    <dialog
      ref={ref}
      className="story-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onDone();
      }}
    >
      <div
        className={
          "story-art " +
          (id === "intro" && page < 2 ? "unknown-visitor" : "visitor-revealed")
        }
      >
        <SanikPortrait anonymous={id === "intro" && page < 2} />
        <span>
          {id === "intro" && page < 2
            ? "UNIDENTIFIED / VERY FAST"
            : "PROJECT / LOST TUESDAY"}
        </span>
      </div>
      <div className="story-copy">
        <span className="eyebrow">{story.tag}</span>
        <h1>{story.title}</h1>
        <div className="speaker">{speaker}</div>
        <p>{text}</p>
        <div className="story-progress">
          {story.pages.map((_, i) => (
            <i className={i === page ? "active" : ""} key={i} />
          ))}
        </div>
        <button
          autoFocus
          className="primary"
          onClick={() =>
            page + 1 < story.pages.length ? setPage(page + 1) : onDone()
          }
        >
          {page + 1 < story.pages.length ? "Go on →" : story.button}
        </button>
        <button className="text-button" onClick={onSkip}>
          Skip story tips
        </button>
      </div>
    </dialog>
  );
}
