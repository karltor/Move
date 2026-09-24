import { useRef, useState } from "react";
import { PROGRAMS } from "./research";
import { totalTrials, restore, distance, clock, type Save } from "./game";
export default function Records({
  game,
  setGame,
  guide,
  onField,
  onReset,
}: {
  game: Save;
  setGame: React.Dispatch<React.SetStateAction<Save>>;
  guide: boolean;
  onField: () => void;
  onReset: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  function exportSave() {
    const blob = new Blob(
      [JSON.stringify({ ...game, lastActive: Date.now() }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "move-research-save.json";
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  }
  if (!guide)
    return (
      <section className="journal">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE EVIDENCE</span>
            <h2>{totalTrials(game)} experiments. And counting.</h2>
          </div>
          <button className="secondary" onClick={exportSave}>
            {saved ? "Save exported ✓" : "Export save ↓"}
          </button>
        </div>
        <div className="journal-scroll">
          <table>
            <thead>
              <tr>
                <th>TRIAL</th>
                <th>PROGRAM</th>
                <th>VELOCITY</th>
                <th>DISTANCE</th>
                <th>RESEARCH</th>
                <th>TIME</th>
              </tr>
            </thead>
            <tbody>
              {game.history.map((r) => (
                <tr key={r.id}>
                  <td>#{String(r.id).padStart(3, "0")}</td>
                  <td>{PROGRAMS[r.program].name}</td>
                  <td>{r.speed.toFixed(1)} m/s</td>
                  <td>{distance(r.distance)}</td>
                  <td className="reward">+{r.science} RP</td>
                  <td>{clock(r.duration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!game.history.length && (
            <div className="empty">
              <span>↗</span>
              <h3>Your first breakthrough is waiting.</h3>
              <p>
                Start an experiment in the field lab. Results appear here
                automatically.
              </p>
              <button className="primary" onClick={onField}>
                To the field lab →
              </button>
            </div>
          )}
        </div>
        <p className="small-note">
          Showing your 30 most recent expeditions. Lifetime records stay with
          each program.
        </p>
      </section>
    );
  return (
    <section className="guide">
      <div>
        <span className="eyebrow">SETTINGS & HELP</span>
        <h2>
          Make things go faster.
          <br />
          Then question the limit.
        </h2>
        <p>
          You lead a small research team with a very large ambition. Pick a
          program, run experiments and turn the results into discoveries.
        </p>
        <div className="guide-steps">
          {[
            [
              "01",
              "Run the experiment",
              "Expeditions last until stamina runs out, or you choose to finish. A new runner can travel for several minutes. Every 100 metres earns resources; every 15 seconds earns experience.",
            ],
            [
              "02",
              "Manage the journey",
              "Sustainable pace conserves energy. Push hard goes faster but drains stamina. Walk to recover and make route decisions. Field logistics research unlocks supplies later. Fatigue gradually reduces recoverable capacity.",
            ],
            [
              "03",
              "Follow your curiosity",
              "Research is shared. Endurance, Impulse and Torque belong to their own programs. Every discovery is permanent. Follow alternate paths and combine disciplines for hybrid discoveries. Find equipment during runs and equip one piece per slot in the Equipment menu.",
            ],
            [
              "04",
              "Build something unreasonable",
              "Projectile research appears after three runs, a 1 km personal best, four runner discoveries and 1.5 km total travel. Open it for 220 RP. Wheels follow after six runs, the projectile program and 6 km total travel, for 600 RP. Choose unlocked vehicles between runs. Rare finds become more likely further along the road.",
            ],
          ].map(([num, title, desc]) => (
            <article key={num}>
              <span>{num}</span>
              <div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <aside>
        <h3>Save & backup</h3>
        <p>
          The game saves automatically in this browser. Export a backup to move
          your progress to another device.
        </p>
        <button className="primary" onClick={exportSave}>
          {saved ? "Save exported ✓" : "Export save ↓"}
        </button>
        <button
          className="secondary"
          onClick={() => importRef.current?.click()}
        >
          Import save ↑
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const raw = await file.text();
              const parsed = JSON.parse(raw);
              if (parsed.version !== 2 || !parsed.progress)
                throw new Error("Invalid save");
              if (
                window.confirm(
                  "Replace current progress with this save? Export a backup first if needed.",
                )
              )
                setGame(restore(raw));
            } catch {
              setGame((s) => ({
                ...s,
                notice: "That file is not a valid MOVE save.",
              }));
            }
            e.target.value = "";
          }}
        />
        <p className="small-note">
          The support team earns research offline for up to two hours with
          auto-repeat enabled. Your current expedition resumes where you left
          it. No offline distance is invented.
        </p>
        <hr />
        <h3>Start from scratch.</h3>
        <p>
          Clear all research, currencies and expedition records in this browser.
        </p>
        <button className="danger" onClick={onReset}>
          Reset all progress
        </button>
        <p role="status">{game.notice}</p>
      </aside>
    </section>
  );
}
