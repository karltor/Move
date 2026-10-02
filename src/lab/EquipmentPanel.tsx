import { useEffect, useState } from "react";
import { SLOTS, slotName, STAT_NAMES, RARITIES, GEAR_STAGE_NAMES, gearName, gearPaths, gearStage, type Gear, type Slot } from "./equipment";
import { equipGear, salvageGear, distance, type Save } from "./game";
import { PROGRAMS, type Program, type Stat } from "./research";
import { currentEra, ERA_NAMES } from "./development";
import { CRAFT_CATALOG, craftGear, effectiveBonus, nextMilestone, quoteUpgrade, stageLevelCap, upgradeGearTo, upgradeRequirement } from "./workshop";
import Glyph from "./ResearchGlyph";
import "./newworkshop.css";

const number = (value: number) => Math.floor(value).toLocaleString("en");
export function formatGearBonus(value: number) {
  return value >= 9 ? "×" + (1 + value).toLocaleString("en", { maximumFractionDigits: 1 }) : (value < 0 ? "−" : "+") + (Math.abs(value) * 100).toLocaleString("en", { maximumFractionDigits: 1 }) + "%";
}
function GearStats({ gear, compare, compact = false }: { gear: Gear; compare?: Gear; compact?: boolean }) {
  return <dl className={"workshop-stats" + (compact ? " compact" : "")}>
    {(Object.keys(STAT_NAMES) as Stat[]).map((stat) => {
      const value = effectiveBonus(gear, stat), old = compare ? effectiveBonus(compare, stat) : 0;
      if (Math.abs(value) < .00001 && Math.abs(old) < .00001) return null;
      return <div key={stat}><dt>{STAT_NAMES[stat]}</dt><dd className={value < 0 ? "short" : "enough"}>{compare && <span className="workshop-old-stat">{formatGearBonus(old)} → </span>}{formatGearBonus(value)}</dd></div>;
    })}
  </dl>;
}
export default function Equipment({ game, setGame, onFunding }: { game: Save; setGame: React.Dispatch<React.SetStateAction<Save>>; onFunding?: () => void }) {
  const [program, setProgram] = useState<Program>(game.program);
  const [selectedId, select] = useState<string | null>(game.lastDrop);
  const [path, choosePath] = useState<string>();
  const [recycle, setRecycle] = useState(false);
  const [target, setTarget] = useState("one");
  const items = game.inventory.filter((g) => g.program === program).sort((a, b) => Number(game.equipped.includes(b.id)) - Number(game.equipped.includes(a.id)) || (b.upgradeLevel ?? 0) - (a.upgradeLevel ?? 0) || RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || Number(b.id.slice(5)) - Number(a.id.slice(5)));
  const selected = items.find((g) => g.id === selectedId) ?? items[0];
  useEffect(() => { choosePath(undefined); setRecycle(false); setTarget("one"); }, [selected?.id]);
  const level = selected?.upgradeLevel ?? 0, cap = stageLevelCap(game);
  const milestone = selected ? nextMilestone({ ...selected, upgradePath: selected.upgradePath ?? path }) : null;
  const goal = target === "milestone" ? Math.min(cap, milestone?.level ?? cap) : target === "five" ? Math.min(cap, level + 5) : level + 1;
  const quote = selected ? quoteUpgrade(game, selected.id, goal, selected.upgradePath ? undefined : path) : null;
  const needsPath = selected && !selected.upgradePath && goal >= 5 && cap >= 5;
  const equipped = selected && game.equipped.includes(selected.id);
  const old = selected ? items.find((g) => g.slot === selected.slot && game.equipped.includes(g.id) && g.id !== selected.id) : undefined;
  const upgradeBlocked = selected ? upgradeRequirement(game, selected.id) : "";
  const activeComponent = !!(game.trial && selected && selected.program === game.program && equipped);
  function build(slot: Slot) {
    const id = "gear-" + game.nextGear;
    setGame((s) => craftGear(s, program, slot));
    select(id);
  }
  return <section className="equipment-workshop">
    <header className="workshop-heading"><div><span className="eyebrow">{ERA_NAMES[currentEra(game)]} / COMPONENT WORKSHOP</span><h1>Equipment</h1></div><div className="workshop-programs" aria-label="Equipment program">{game.unlocked.map((p) => <button key={p} className={program === p ? "active" : ""} onClick={() => { setProgram(p); select(null); }}>{PROGRAMS[p].short}</button>)}</div><div className="workshop-wallet"><span>EQUIPMENT VOUCHERS</span><strong>{number(game.vouchers)}</strong>{onFunding && <button className="text-button" onClick={onFunding}>Buy with RP →</button>}</div></header>
    <div className="workshop-loadout" aria-label="Current loadout">{SLOTS.map((slot) => {
      const gear = items.find((g) => g.slot === slot && game.equipped.includes(g.id));
      return <button key={slot} className={"workshop-loadout-slot" + (gear?.id === selected?.id ? " selected" : "")} disabled={!gear} onClick={() => gear && select(gear.id)}><Glyph name={slot === "footwear" ? "shoe" : slot === "outfit" ? "heart" : "target"} /><span><small>{slotName(program, slot)}</small><b>{gear ? gearName(gear) : "Empty"}</b></span>{gear && <em>Lv {gear.upgradeLevel ?? 0}</em>}</button>;
    })}</div>
    <div className="workshop-body">
      <aside className="workshop-stock"><div className="workshop-stock-heading"><h2>Build basic gear</h2><small>2 vouchers each</small></div><div className="workshop-recipes">{SLOTS.map((slot) => {
        const recipe = CRAFT_CATALOG[program][slot];
        return <div key={slot}><span><b>{recipe.name}</b><small>+5% {STAT_NAMES[recipe.stat].toLowerCase()}</small></span><button className="secondary" disabled={game.vouchers < recipe.cost || game.inventory.length >= 90} onClick={() => build(slot)} aria-label={`Build ${recipe.name} for ${recipe.cost} vouchers`}>Build · {recipe.cost}</button></div>;
      })}</div><div className="workshop-stock-heading"><h2>Your components</h2><small>{game.inventory.length} / 90 stored</small></div><div className="workshop-inventory">{!items.length && <p className="workshop-empty-stock">Build a starter component here. Field finds can have several original bonuses; both can follow the same upgrade stages.</p>}{items.map((g) => <button className={"workshop-inventory-item " + g.rarity.toLowerCase() + (selected?.id === g.id ? " selected" : "")} key={g.id} onClick={() => select(g.id)}><span><small>{slotName(program, g.slot)} · {g.rarity}{game.equipped.includes(g.id) ? " · Equipped" : ""}</small><b>{gearName(g)}</b></span><strong>{g.upgradeLevel ?? 0}<small>LEVEL</small></strong></button>)}</div></aside>
      {selected ? <article className="workshop-component">
        <div className="workshop-component-header"><div><span className="eyebrow">{slotName(program, selected.slot)} / {GEAR_STAGE_NAMES[gearStage(selected)]}{level > 100 ? " / Overclocked" : ""}</span><h2>{gearName(selected)}</h2><small>{selected.crafted ? "Built in the workshop" : `Found at ${distance(selected.foundAt)}`} · {selected.rarity}{selected.upgradePath ? " · " + gearPaths(selected).find((p) => p.id === selected.upgradePath)?.name : ""}</small></div><div className="workshop-level"><strong>{level}</strong><span>LEVEL / {cap}</span></div></div>
        <div className="workshop-detail-scroll">
          <div className="workshop-component-stats"><section><h3>{old ? "Replace comparison" : "Current component bonuses"}</h3><GearStats gear={selected} compare={old} /></section><section className="workshop-next-stage"><span className="eyebrow">{milestone ? `NEXT COMPONENT STAGE · LEVEL ${milestone.level}` : "FINAL COMPONENT STAGE"}</span><h3>{milestone?.name ?? "Fully overclocked"}</h3>{milestone && <GearStats gear={milestone.preview} compare={selected} compact />}{milestone && milestone.level > cap && <small>Open {ERA_NAMES[currentEra(game) + 1]} in Development to reach this stage.</small>}</section></div>
          {needsPath && !activeComponent && <fieldset className="workshop-paths"><legend>Choose the enhancement path · permanent from level 5</legend>{gearPaths(selected).map((p) => <label key={p.id} className={path === p.id ? "selected" : ""}><input type="radio" name="enhancement" checked={path === p.id} onChange={() => choosePath(p.id)} /><span><b>{p.name}</b><small>{p.description}</small><span className="workshop-path-effects">{Object.entries(p.effects).map(([stat, effect]) => <em className={effect! < 0 ? "short" : "enough"} key={stat}>{formatGearBonus(effect! * (1 + goal / 50))} {STAT_NAMES[stat as Stat]}</em>)}</span></span></label>)}</fieldset>}
          {quote?.gear && quote.levels > 0 && <section className="workshop-next-rank"><h3>This purchase · level {level} → {quote.level}</h3><GearStats gear={quote.gear} compare={selected} compact /></section>}
          {!!upgradeBlocked && (!needsPath || activeComponent) && <p className="workshop-requirement">{upgradeBlocked}</p>}
        </div>
        <footer className="workshop-controls"><div className="workshop-upgrade-control"><div className="workshop-buy-size" aria-label="Upgrade quantity">{[["one", "+1 level"], ["five", "+5 levels"], ["milestone", "To next stage"]].map(([id, label]) => <button key={id} className={target === id ? "active" : ""} disabled={level >= cap || activeComponent} onClick={() => setTarget(id)}>{label}</button>)}</div><button className="primary" disabled={!quote?.levels || !!quote.blocked || game.vouchers < quote.cost} onClick={() => setGame((s) => upgradeGearTo(s, selected.id, goal, selected.upgradePath ? undefined : path))}>{level >= 200 ? "Fully overclocked" : level >= cap ? "Development required" : activeComponent ? "Component in active experiment" : needsPath && !path ? "Choose an enhancement path" : `Upgrade · ${number(quote?.cost ?? 0)} vouchers`}</button></div><div className="workshop-equip-control"><button className="secondary" disabled={!!game.trial} onClick={() => setGame((s) => equipGear(s, selected.id))}>{equipped ? "Unequip" : old ? "Replace equipped item" : "Equip component"}</button>{!equipped && (recycle ? <span className="workshop-recycle"><button className="text-button" disabled={!!game.trial} onClick={() => { setGame((s) => salvageGear(s, selected.id)); setRecycle(false); }}>Confirm · +{selected.affixes.length * 5} RP</button><button className="text-button" onClick={() => setRecycle(false)}>Keep</button></span> : <button className="text-button" disabled={!!game.trial} onClick={() => setRecycle(true)}>Recycle</button>)}</div></footer>
      </article> : <article className="workshop-empty"><Glyph name="gear" /><h2>Start with one useful component.</h2><p>{CRAFT_CATALOG[program].footwear.description}</p><p>A component gains new stats and changes hardware at levels 10, 25, 50, 75 and 100. Development facilities open the next range of levels.</p>{onFunding && <button className="primary" onClick={onFunding}>Get equipment vouchers →</button>}</article>}
    </div>
  </section>;
}
