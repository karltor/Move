import { useEffect, useRef, useState } from "react";
import { equipmentUnlocked, totalTrials, type Save } from "./game";
import { NODE_MAP, PROGRAMS } from "./research";
import { currentEra, ERA_NAMES } from "./development";
type StoryDefinition = {
  tag: string;
  title: string;
  pages: [string, string][];
  button: string;
};
export const STORIES = {
  intro: {
    tag: "Motion Laboratory",
    title: "The lab needs a new record.",
    pages: [
      [
        "DR. ELLIS",
        "The Velocity Prize funds research into faster travel. We need a working experiment to enter. Our first prototype is me, in running shoes. The budget meeting was short.",
      ],
      [
        "UNKNOWN VISITOR",
        "Measure distance, speed and fatigue. Use the data to improve your next attempt. I used to hold the record. You can call me SANIK.",
      ],
      [
        "DR. ELLIS",
        "We'll start with a run to the edge of town. Every attempt earns research points. If I tire out, the data still counts. First, let's choose a starting pace.",
      ],
    ],
    button: "Prepare the first test",
  },
  forest: {
    tag: "Route milestone · 100 m",
    title: "Into Lanternwood.",
    pages: [
      [
        "DR. ELLIS",
        "The forest path is narrower and rougher than the city road. Watch stamina and switch to Recover when you need energy. Finish banks the RP shown on the right; exhaustion banks it too.",
      ],
    ],
    button: "Continue the run",
  },
  research: {
    tag: "Talent training",
    title: "Choose what Ellis learns.",
    pages: [
      [
        "DR. ELLIS",
        "Start with six basic discoveries in three paths. Each costs one Talent Point. Learn any first talent to open the one below it. They improve different things: stamina, energy use, starts, grip, speed and fatigue.",
      ],
      [
        "SANIK",
        "The training clinic needs four learned talents, three finished runs, a 120-metre record and 180 RP. Its checklist is below the paths. Build it to open new skills and repeatable training. First we learn to run; the questionable machinery comes later.",
      ],
    ],
    button: "Explore talents",
  },
  funding: {
    tag: "The first field report",
    title: "Put the results to work.",
    pages: [[
      "SANIK",
      "Every experiment earns RP. Convert it into Talent Points for permanent skills, equipment vouchers for gear, or save it for a development project. The funding screen shows exactly what each conversion buys. You can keep the RP and decide later.",
    ]],
    button: "Choose where to invest",
  },
  equipment: {
    tag: "Equipment workshop",
    title: "Build it. Improve it. Fit it.",
    pages: [
      [
        "DR. ELLIS",
        "Build your first component with equipment vouchers and we'll fit it automatically. Then choose its first modification: sprint shoes recover speed quickly; trail shoes save energy and grip uneven ground. The workshop shows the price and every changed stat before you install it.",
      ],
      [
        "SANIK",
        "One pair of shoes is enough. New workbenches open as the lab grows, and useful finds can give you alternative gear. Talents always apply; equipment helps while fitted. We'll let you know when there is something new to build.",
      ],
    ],
    button: "Check the equipment",
  },
  distance: {
    tag: "Route milestone · 1 km",
    title: "A kilometre of evidence.",
    pages: [
      [
        "DR. ELLIS",
        "We've reached the country road. A longer route provides more data and RP. The next development projects will need distance records, talent ranks and upgraded gear as well as funding.",
      ],
      [
        "SANIK",
        "The prize accepts any moving object. Nobody said the scientist had to be attached to it.",
      ],
    ],
    button: "Continue",
  },
  programs: {
    tag: "New research program",
    title: "Choose the next experiment.",
    pages: [
      [
        "DR. ELLIS",
        "Choose an unlocked program in preparation before each experiment. Your RP, Talent Points and equipment vouchers are shared, while each program keeps its own talents, equipment and training level.",
      ],
      [
        "SANIK",
        "A projectile experiment launches six shots from a fixed station. Each landing earns RP and XP. Improve launch speed, drag and trajectory; there is no stamina bar for a rock.",
      ],
    ],
    button: "Prepare an experiment",
  },
  far: {
    tag: "Route milestone · 10 km",
    title: "A serious contender.",
    pages: [
      [
        "DR. ELLIS",
        "Ten kilometres. The desert route adds heat and stronger energy demands. Heat acclimation and cooling equipment help here. This distance record also brings bionic development closer.",
      ],
      ["SANIK", "Good. Now they'll have to read our application."],
    ],
    button: "Continue",
  },
} satisfies Record<string, StoryDefinition>;
export type StoryId = keyof typeof STORIES | `skill:${string}` | `era:${number}` | "project:supply-lab";
export const storySimulationRate = (story: StoryId | null) => story ? 0.5 : 1;
/** Explain future purchases without interrupting old saves with a backlog. */
export function initializeSkillGuides(save: Save): Save {
  const marker = "skill-guides-v1";
  if (save.storySeen.includes(marker) && save.storySeen.includes("era-guides-v1")) return save;
  const existing = save.researched
    .filter((id) => NODE_MAP.get(id)?.ability)
    .map((id) => "skill:" + id);
  return {
    ...save,
    storySeen: [...new Set([
      ...save.storySeen, marker, "era-guides-v1", ...existing,
      ...Array.from({ length: currentEra(save) }, (_, i) => `era:${i + 1}`),
      ...(save.development["supply-lab"] > 0 ? ["project:supply-lab"] : []),
    ])],
  };
}
const SKILL_GUIDANCE: Record<string, string> = {
  "second-wind":
    "Automatic, once per run. When stamina falls below 25%, stay at Steady to recover energy during the 12-second window. Push and Recover do not receive this extra recovery.",
  trailcraft:
    "Automatic on rough route sections. No new button: your running technique reduces their extra stamina cost.",
  "rolling-start":
    "Automatic at the beginning of each run. You start at half cruising speed.",
  shortcut:
    "Choose the fast route when a detour offers it. Its speed bonus remains, with no extra stamina cost.",
  "negative-split":
    "Automatic after travelling 1 km in one run. Your cruising speed increases by another 15%.",
  heat: "Automatic in the desert. It halves the desert's extra stamina penalty.",
  hydration:
    "When field supplies are available, Use supply restores an additional 10% of capacity and recharges 15 seconds sooner.",
  survey:
    "Automatic on entering a new biome. Each new biome adds 5 RP to the amount shown beside Finish.",
  supplies:
    "Three supplies are available each runner or vehicle experiment. Press Use supply to restore energy, then wait for its cooldown before using another.",
  "angle-control":
    "Set Launch angle in preparation or during an experiment, from 20° to 65°. A change applies to the next shot. Watch the landing distance to compare angles.",
  "skip-shot":
    "Automatic for hand-thrown rocks. The projectile can bounce once on landing at 40% of its remaining forward speed.",
  "charged-launch":
    "Automatic for launchers. Every third shot gets 18% more launch speed, with 1.5 seconds of extra preparation.",
  rangefinder:
    "Predicted range appears in the ballistics readout. Change the launch angle and compare the estimate with the actual landing.",
};
export function storyDefinition(id: StoryId, game: Save): StoryDefinition {
  if (id.startsWith("era:")) {
    const era = Number(id.slice(4));
    const details = [
      "",
      "The training clinic is open. Each talent path now continues into athletic skills, including Second wind and Rolling start. You can train learned talents up to twelve ranks, build an outfit, and evolve your shoes. Runs also earn 50% more RP.",
      "The biomechanics workshop is open. Assisted movement and organ monitoring add new talent paths. Equipment can now reach level 49.",
      "Bionic integration is ready. Powered legs and implanted organs can multiply speed, rather than adding small fitness bonuses. Equipment can now reach level 74.",
      "Synthetic physiology is ready. Engineered organs and thermal control support much higher speeds over longer distances. Equipment can now reach level 99.",
      "The inertial chamber is open. Inertia control and plasma propulsion add another scale of movement. Equipment can now evolve through level 100.",
      "The metric laboratory is open. Field-driven movement, the final talent chapter and repeatable equipment overclocking are available.",
    ];
    return { tag: "Development completed", title: ERA_NAMES[era] ?? "New development era", pages: [["DR. ELLIS", details[era] ?? "A new talent chapter is available."]], button: "Explore the new options" };
  }
  if (id === "project:supply-lab") return {
    tag: "Field supplies prepared", title: "Three supplies for each run.",
    pages: [["DR. ELLIS", "Running experiments now carry three stamina supplies. Press Use supply to restore energy, then wait for its cooldown before using another. Projectile launches do not use stamina or supplies."]], button: "Understood",
  };
  if (id === "programs") {
    const programs = game.unlocked.map((p) => PROGRAMS[p].short).join(" · ");
    return {
      ...STORIES.programs,
      pages: [
        [
          "DR. ELLIS",
          "Choose an unlocked program in preparation before each experiment: " + programs + ". RP, Talent Points and equipment vouchers are shared. Each program keeps its own talent paths, fitted gear and training level.",
        ],
        [
          "SANIK",
          game.unlocked.includes("projectile")
            ? "A projectile experiment launches six shots from a fixed station. Each landing earns RP and XP. Improve launch speed, drag and trajectory; a rock doesn't need stamina."
            : "Each program keeps its own research and training. Choose the experiment you want to improve next.",
        ],
      ],
    };
  }
  if (!id.startsWith("skill:")) return STORIES[id as keyof typeof STORIES];
  const node = NODE_MAP.get(id.slice(6));
  return {
    tag: "Field skill unlocked",
    title: node?.name ?? "New field skill",
    pages: [
      ["DR. ELLIS", node?.description ?? ""],
      [
        "FIELD NOTES",
        SKILL_GUIDANCE[node?.ability ?? ""] ??
          "This effect applies automatically during experiments in this research program.",
      ],
    ],
    button: "Understood",
  };
}
export function nextStory(s: Save, tab: string): StoryId | null {
  if (!s.tipsEnabled) return null;
  const seen = (id: StoryId) => s.storySeen.includes(id);
  if (!seen("intro")) return "intro";
  if ((tab === "funding" || s.debriefPending) && totalTrials(s) > 0 && !seen("funding")) return "funding";
  if (tab === "research" && totalTrials(s) > 0 && !seen("research"))
    return "research";
  const era = currentEra(s), eraStory = `era:${era}` as StoryId;
  if (era > 0 && !seen(eraStory)) return eraStory;
  if (s.development["supply-lab"] > 0 && !seen("project:supply-lab")) return "project:supply-lab";
  for (const id of s.researched) {
    const node = NODE_MAP.get(id),
      story = ("skill:" + id) as StoryId;
    if (
      node?.ability &&
      (node.program === s.program || node.program === "global") &&
      !seen(story)
    )
      return story;
  }
  if (equipmentUnlocked(s) && !seen("equipment"))
    return "equipment";
  if (s.unlocked.length > 1 && !seen("programs")) return "programs";
  // Distance milestones describe the running route, not a thrown object.
  const reach = Math.max(
    s.program === "runner" ? (s.trial?.distance ?? 0) : 0,
    s.progress.runner.bestDistance,
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
        MOTION LABORATORY
      </text>
    </svg>
  );
}
export default function Story({
  id,
  onDone,
  onSkip,
  game,
}: {
  id: StoryId;
  game: Save;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [page, setPage] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);
  const story = storyDefinition(id, game);
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
            : "VELOCITY PRIZE"}
        </span>
      </div>
      <div className="story-copy">
        <span className="eyebrow">{story.tag}</span>
        <h1>{story.title}</h1>
        <div className="speaker">{speaker}</div>
        <p>{text}</p>
        {game.trial && <small className="story-running-note">Experiment continues at half speed while you read.</small>}
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
          Turn off story tips
        </button>
      </div>
    </dialog>
  );
}
