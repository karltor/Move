import { useState } from "react";
import {
  SLOTS,
  SLOT_NAMES,
  STAT_NAMES,
  RARITIES,
  type Gear,
} from "./equipment";
import { equipGear, salvageGear, distance, type Save } from "./game";
import { PROGRAMS } from "./research";
export default function Equipment({
  game,
  setGame,
}: {
  game: Save;
  setGame: React.Dispatch<React.SetStateAction<Save>>;
}) {
  const [recycle, setRecycle] = useState<string | null>(null);
  const items = game.inventory
    .filter((g) => g.program === game.program)
    .sort(
      (a, b) =>
        RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) ||
        Number(b.id.slice(5)) - Number(a.id.slice(5)),
    );
  const affixes = (g: Gear) => (
    <ul className="affixes">
      {g.affixes.map((a) => (
        <li key={a.stat}>
          <b>+{Math.round(a.value * 100)}%</b> {STAT_NAMES[a.stat]}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="equipment-page">
      <div className="section-title">
        <div>
          <span className="eyebrow">
            {PROGRAMS[game.program].short} loadout
          </span>
          <h1>Equipment</h1>
          <p>Find it on the road. Equip it between runs.</p>
        </div>
        <span>{game.inventory.length} / 90 pieces</span>
      </div>
      <div className="equipment-slots">
        {SLOTS.map((slot) => {
          const g = items.find(
            (g) => g.slot === slot && game.equipped.includes(g.id),
          );
          return (
            <section key={slot} className="equipment-slot">
              <span className="eyebrow">{SLOT_NAMES[slot]}</span>
              {g ? (
                <>
                  <h2>{g.name}</h2>
                  <span className={"rarity " + g.rarity.toLowerCase()}>
                    {g.rarity}
                  </span>
                  {affixes(g)}
                  <button
                    className="text-button"
                    disabled={!!game.trial}
                    onClick={() => setGame((s) => equipGear(s, g.id))}
                  >
                    Unequip
                  </button>
                </>
              ) : (
                <>
                  <h2>Empty slot</h2>
                  <p>
                    One piece of{" "}
                    {slot === "instrument"
                      ? "equipment"
                      : SLOT_NAMES[slot].toLowerCase()}{" "}
                    fits here.
                  </p>
                </>
              )}
            </section>
          );
        })}
      </div>
      {game.trial && (
        <p className="inline-note">
          Your run is still going. You can change equipment when it ends.
        </p>
      )}
      <div className="section-title small">
        <h2>Your finds</h2>
        <p>
          Longer distances improve rarity odds. Lucky finds can happen anywhere.
        </p>
      </div>
      {!items.length && (
        <div className="empty">
          <h2>The road has something for you.</h2>
          <p>
            Keep running to find your first piece. Ordinary gear has one modest
            bonus; rarer gear has up to four.
          </p>
        </div>
      )}
      <div className="inventory-grid">
        {items.map((g) => {
          const equipped = game.equipped.includes(g.id),
            old = items.find(
              (x) => game.equipped.includes(x.id) && x.slot === g.slot,
            );
          return (
            <article
              key={g.id}
              className={
                "gear-card " +
                g.rarity.toLowerCase() +
                (equipped ? " equipped" : "")
              }
            >
              <div className="discovery-top">
                <span className={"rarity " + g.rarity.toLowerCase()}>
                  {g.rarity}
                </span>
                <small>{SLOT_NAMES[g.slot]}</small>
              </div>
              <h3>{g.name}</h3>
              {affixes(g)}
              <small>Found at {distance(g.foundAt)}</small>
              {old && !equipped && (
                <div className="gear-comparison">
                  <span>Compared with {old.name}</span>
                  {(["speed", "stamina", "yield", "xp"] as const).map(
                    (stat) => {
                      const delta = Math.round(
                        100 *
                          ((g.affixes.find((a) => a.stat === stat)?.value ??
                            0) -
                            (old.affixes.find((a) => a.stat === stat)?.value ??
                              0)),
                      );
                      return delta ? (
                        <small
                          className={delta > 0 ? "enough" : "short"}
                          key={stat}
                        >
                          {delta > 0 ? "+" : ""}
                          {delta}% {STAT_NAMES[stat]}
                        </small>
                      ) : null;
                    },
                  )}
                </div>
              )}
              <button
                className={equipped ? "secondary" : "primary"}
                disabled={!!game.trial}
                onClick={() => setGame((s) => equipGear(s, g.id))}
              >
                {equipped
                  ? "Equipped · remove"
                  : old
                    ? "Replace " + old.name
                    : "Equip"}
              </button>
              {!equipped &&
                (recycle === g.id ? (
                  <div className="recycle-confirm">
                    <span>Recycle for {g.affixes.length * 5} RP?</span>
                    <button
                      disabled={!!game.trial}
                      onClick={() => {
                        setGame((s) => salvageGear(s, g.id));
                        setRecycle(null);
                      }}
                    >
                      Recycle
                    </button>
                    <button onClick={() => setRecycle(null)}>Keep</button>
                  </div>
                ) : (
                  <button
                    className="text-button"
                    disabled={!!game.trial}
                    onClick={() => setRecycle(g.id)}
                  >
                    Recycle for {g.affixes.length * 5} RP
                  </button>
                ))}
            </article>
          );
        })}
      </div>
    </div>
  );
}
