import { useEffect, useState } from "react";
import { slotName, STAT_NAMES, RARITIES, gearName, type Gear, type Slot } from "./equipment";
import { equipGear, salvageGear, distance, type Save } from "./game";
import { PROGRAMS, type Program, type Stat } from "./research";
import { currentEra, ERA_NAMES } from "./development";
import { starterEquipmentGoal } from "./economy";
import { CRAFT_CATALOG, craftGear, craftRequirement, craftAlternate, effectiveBonus, nextMilestone, quoteAlternate, quoteUpgrade, stageLevelCap, upgradeGearTo, workshopSlots, slotRequirement, visibleGearPaths } from "./workshop";
import "./newworkshop.css";

const number = (value: number) => Math.floor(value).toLocaleString("en");
const art = (program: Program, slot: Slot) => import.meta.env.BASE_URL + "menu-art/" + (program === "projectile" ? "launcher" : program === "wheels" ? "wheels" : slot === "instrument" ? "workbench" : slot === "footwear" ? "shoes" : "vest") + ".webp";
export function formatGearBonus(value: number) {
  return value >= 9 ? "×" + (1 + value).toLocaleString("en", { maximumFractionDigits: 1 }) : (value < 0 ? "−" : "+") + (Math.abs(value) * 100).toLocaleString("en", { maximumFractionDigits: 1 }) + "%";
}
function GearStats({ gear, compare, changesOnly = false }: { gear: Gear; compare?: Gear; changesOnly?: boolean }) {
  return <dl className="gear-benefits">
    {(Object.keys(STAT_NAMES) as Stat[]).map((stat) => {
      const value = effectiveBonus(gear, stat), old = compare ? effectiveBonus(compare, stat) : 0;
      if ((Math.abs(value) < .00001 && Math.abs(old) < .00001) || (changesOnly && Math.abs(value - old) < .00001)) return null;
      return <div key={stat}><dt>{STAT_NAMES[stat]}</dt><dd className={value < 0 || (compare && value < old) ? "gear-cost" : "gear-gain"}>{compare && <span>{formatGearBonus(old)} → </span>}{formatGearBonus(value)}</dd></div>;
    })}
  </dl>;
}
function groupSpares(items: Gear[]) {
  const groups = new Map<string, Gear[]>();
  for (const gear of items) {
    const key = JSON.stringify([gear.slot, gearName(gear), gear.upgradeLevel ?? 0, gear.upgradePath ?? "", gear.affixes]);
    groups.set(key, [...(groups.get(key) ?? []), gear]);
  }
  return [...groups.values()];
}
/** Open the component Funding actually quoted, rather than an unrelated recent find. */
export function equipmentFocus(game: Save): { program: Program; slot: Slot; gearId: string | null } {
  const goal = currentEra(game) === 0 ? starterEquipmentGoal(game) : null;
  if (goal) return { program: goal.program, slot: goal.slot, gearId: goal.gearId };
  const fitted = game.inventory.filter((gear) => gear.program === game.program && gear.slot === "footwear")
    .sort((a, b) => Number(game.equipped.includes(b.id)) - Number(game.equipped.includes(a.id)) || (b.upgradeLevel ?? 0) - (a.upgradeLevel ?? 0))[0];
  return { program: game.program, slot: "footwear", gearId: fitted?.id ?? null };
}
export default function Equipment({ game, setGame, onFunding }: { game: Save; setGame: React.Dispatch<React.SetStateAction<Save>>; onFunding?: () => void }) {
  const [initialFocus] = useState(() => equipmentFocus(game));
  const [program, setProgram] = useState<Program>(initialFocus.program);
  const [selectedId, select] = useState<string | null>(initialFocus.gearId);
  const [selectedSlot, selectSlot] = useState<Slot>(initialFocus.slot);
  const [path, choosePath] = useState<string>();
  const [stored, showStored] = useState(false);
  const [recycle, setRecycle] = useState(false);
  const [batch, setBatch] = useState("stage");
  const items = game.inventory.filter((g) => g.program === program).sort((a, b) => Number(game.equipped.includes(b.id)) - Number(game.equipped.includes(a.id)) || (b.upgradeLevel ?? 0) - (a.upgradeLevel ?? 0) || RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity));
  const selected = items.find((g) => g.id === selectedId) ?? items.find((g) => g.slot === selectedSlot);
  const slot = selected?.slot ?? selectedSlot;
  const recipe = CRAFT_CATALOG[program][slot];
  const slots = workshopSlots(game, program);
  const era = currentEra(game), level = selected?.upgradeLevel ?? 0, cap = stageLevelCap(game);
  const milestone = selected ? nextMilestone(selected) : null;
  const tuning = !!selected && !selected.upgradePath && level < 5;
  const goal = tuning ? 5 : Math.min(cap, batch === "one" ? level + 1 : batch === "five" ? level + 5 : milestone?.level ?? cap);
  const quote = selected ? quoteUpgrade(game, selected.id, goal, selected.upgradePath ? undefined : path) : null;
  const equipped = !!selected && game.equipped.includes(selected.id);
  const active = !!(game.trial && selected && selected.program === game.program && equipped);
  const old = selected ? items.find((g) => g.slot === selected.slot && game.equipped.includes(g.id) && g.id !== selected.id) : undefined;
  const spareItems = items.filter((g) => !game.equipped.includes(g.id));
  const spareGroups = groupSpares(spareItems);
  const currentPath = selected && visibleGearPaths(selected).find((p) => p.id === selected.upgradePath);
  const alternative = selected && era >= 2 && currentPath ? visibleGearPaths(selected).find((p) => p.id !== currentPath.id) : undefined;
  const alternate = selected && alternative ? quoteAlternate(game, program, selected.slot, alternative.id) : null;
  const nextLocked = (["outfit", "instrument"] as Slot[]).find((candidate) => !slots.includes(candidate));
  useEffect(() => { choosePath(undefined); setRecycle(false); setBatch("stage"); }, [selected?.id]);
  function pick(gear?: Gear, emptySlot?: Slot) { select(gear?.id ?? null); selectSlot(gear?.slot ?? emptySlot ?? "footwear"); }
  function build() { const id = "gear-" + game.nextGear; setGame((s) => craftGear(s, program, slot)); select(id); }
  function improve() { if (selected) setGame((s) => upgradeGearTo(s, selected.id, goal, selected.upgradePath ? undefined : path)); }
  return <section className="equipment-workshop">
    <header className="workshop-heading"><div><span className="eyebrow">FIT FOR THE NEXT EXPERIMENT</span><h1>Equipment</h1></div>{game.unlocked.length > 1 && <div className="workshop-programs" aria-label="Equipment program">{game.unlocked.map((p) => <button key={p} className={program === p ? "active" : ""} onClick={() => { setProgram(p); pick(); }}>{PROGRAMS[p].short}</button>)}</div>}<div className="workshop-wallet"><span>Equipment vouchers</span><strong>{number(game.vouchers)}</strong>{onFunding && <button className="text-button" onClick={onFunding}>Buy with RP →</button>}</div></header>
    <div className="workshop-body">
      <aside className="workshop-bench"><h2>Your loadout</h2><div className="workshop-loadout">{slots.map((candidate) => {
        const gear = items.find((g) => g.slot === candidate && game.equipped.includes(g.id)) ?? items.find((g) => g.slot === candidate);
        return <button key={candidate} className={slot === candidate ? "selected" : ""} onClick={() => pick(gear, candidate)}><img src={art(program, candidate)} alt="" /><span><small>{slotName(program, candidate)}</small><b>{gear ? gearName(gear) : CRAFT_CATALOG[program][candidate].name}</b><em>{gear ? game.equipped.includes(gear.id) ? "Fitted" : "Ready to fit" : `Build · ${CRAFT_CATALOG[program][candidate].cost} vouchers`}</em></span></button>;
      })}</div>
      {nextLocked && <div className="workshop-unlock"><span className="eyebrow">NEXT WORKBENCH</span><b>{slotName(program, nextLocked)}</b><p>{slotRequirement(game, program, nextLocked)}</p>{era === 0 && onFunding && <button className="text-button" onClick={onFunding}>View training clinic →</button>}</div>}
      {spareItems.length > 0 && <div className="workshop-storage"><button className="workshop-storage-toggle" aria-expanded={stored} onClick={() => showStored(!stored)}>Stored gear <span>{spareItems.length} {stored ? "−" : "+"}</span></button>{stored && <div className="workshop-spares">{spareGroups.map((group) => <div key={group[0].id}><button className={selected?.id === group[0].id ? "selected" : ""} onClick={() => pick(group[0])}><b>{gearName(group[0])}</b><small>{group[0].upgradePath ? visibleGearPaths(group[0]).find((p) => p.id === group[0].upgradePath)?.name : group[0].rarity} · Lv {group[0].upgradeLevel ?? 0}{group.length > 1 ? ` · ${group.length} identical copies` : ""}</small></button>{group.length > 1 && <details><summary>Choose a copy</summary>{group.map((gear, index) => <button key={gear.id} onClick={() => pick(gear)}>Copy {index + 1}{gear.id === selected?.id ? " · Selected" : ""}</button>)}</details>}</div>)}</div>}</div>}
      {active && <p className="workshop-live-note">This loadout is in use. Finish the experiment before changing it.</p>}
      </aside>
      <article className={"workshop-project" + (!selected ? " starter" : "")}>
        <div className="workshop-project-scroll">
          <div className="workshop-hero"><div className="workshop-illustration"><img src={art(program, slot)} alt={program === "runner" && slot === "footwear" ? "A pair of running shoes on the workshop bench" : "Equipment on the workshop bench"} /><span>{selected ? equipped ? "FITTED" : "IN STORAGE" : "YOUR FIRST COMPONENT"}</span></div><div className="workshop-summary"><span className="eyebrow">{slotName(program, slot)}{selected && level >= 10 ? ` · Level ${level}` : ""}</span><h2>{selected ? gearName(selected) : recipe.name}</h2><p>{selected ? currentPath?.description ?? (selected.crafted ? recipe.description : `This field find adds ${selected.affixes.map((affix) => formatGearBonus(effectiveBonus(selected, affix.stat)) + " " + STAT_NAMES[affix.stat].toLowerCase()).join(", ")}. Choose how to modify it.`) : recipe.description}</p>{selected ? <><GearStats gear={selected} compare={old} /><small className="workshop-origin">{selected.crafted ? "Built by the team" : `Found at ${distance(selected.foundAt)}`} · {selected.rarity}{currentPath ? ` · ${currentPath.name}` : ""}</small></> : <div className="workshop-starter-effect"><b>+5%</b><span>{STAT_NAMES[recipe.stat]}<small>{game.trial ? "Built for your next experiment." : "Automatically fitted when you build it."}</small></span></div>}</div></div>
          {selected && tuning && <section className="workshop-tuning"><div className="workshop-section-heading"><div><span className="eyebrow">FIRST MODIFICATION</span><h3>How should this component perform?</h3></div><small>Choose one permanent fit</small></div><div className="workshop-fit-options" role="radiogroup" aria-label="Equipment specialization">{visibleGearPaths(selected).map((p) => {
            const preview = quoteUpgrade({ ...game, trial: null }, selected.id, 5, p.id);
            return <button key={p.id} role="radio" aria-checked={path === p.id} className={path === p.id ? "selected" : ""} disabled={active} onClick={() => choosePath(p.id)}><div><b>{p.name}</b><span>{number(preview.cost)} vouchers</span></div><p>{p.description}</p>{preview.gear && <GearStats gear={preview.gear} compare={selected} changesOnly />}<small>{path === p.id ? "Selected ✓" : "Choose this fit"}</small></button>;
          })}</div></section>}
          {selected && !tuning && level < cap && quote?.gear && <section className="workshop-next-build"><div className="workshop-section-heading"><div><span className="eyebrow">{goal === milestone?.level ? "HARDWARE BREAKTHROUGH" : "IMPROVE THIS COMPONENT"}</span><h3>{goal === milestone?.level ? milestone.name : currentPath ? `Refine ${currentPath.name.toLowerCase()}` : "Refine this component"}</h3></div><small>Lv {level} → {quote.level}</small></div><GearStats gear={quote.gear} compare={selected} changesOnly />{era >= 2 && <div className="workshop-batch" aria-label="Upgrade quantity">{[["stage", "Next breakthrough"], ["five", "+5 levels"], ["one", "+1 level"]].map(([id, label]) => <button key={id} className={batch === id ? "selected" : ""} disabled={active} onClick={() => setBatch(id)}>{label}</button>)}</div>}</section>}
          {selected && level >= cap && level < 200 && <div className="workshop-cap-goal"><b>Ready for new hardware</b><p>{milestone ? `${milestone.name} opens with ${ERA_NAMES[era + 1]}.` : `${ERA_NAMES[era + 1]} opens the next upgrade range.`}</p>{onFunding && <button className="text-button" onClick={onFunding}>View the next facility →</button>}</div>}
          {selected && alternative && alternate && !alternate.blocked && <div className="workshop-alternate"><div><b>Build an alternative: {alternative.name}</b><p>{alternative.description} Keep both builds and fit one before each experiment.</p></div><button className="secondary" disabled={game.vouchers < alternate.cost} onClick={() => { const id = "gear-" + game.nextGear; setGame((s) => craftAlternate(s, program, slot, alternative.id)); select(id); showStored(true); }}>Build alternative · {number(alternate.cost)} vouchers</button></div>}
        </div>
        <footer className="workshop-controls">{!selected ? <><div><b>{recipe.cost} equipment vouchers</b><small>{game.vouchers < recipe.cost ? `${recipe.cost - game.vouchers} more needed` : game.trial ? "Built for your next experiment." : "Fitted automatically."}</small></div><button className="primary" disabled={!!craftRequirement(game, program, slot) || game.vouchers < recipe.cost} onClick={build}>Build {recipe.name} · {recipe.cost} vouchers</button></> : <><div className="workshop-purchase"><button className="primary" disabled={active || !quote?.levels || !!quote.blocked || game.vouchers < quote.cost} onClick={improve}>{active ? "Finish this experiment first" : level >= 200 ? "Fully upgraded" : level >= cap ? "Next facility required" : tuning && !path ? "Choose a fit above" : `${tuning ? "Install " + visibleGearPaths(selected).find((p) => p.id === path)?.name : "Improve component"} · ${number(quote?.cost ?? 0)} vouchers`}</button>{quote && quote.cost > game.vouchers && !quote.blocked && <small>{number(quote.cost - game.vouchers)} more vouchers needed</small>}</div>{!equipped && <div className="workshop-fit-control"><button className="secondary" disabled={!!game.trial} onClick={() => setGame((s) => equipGear(s, selected.id))}>{old ? "Fit instead" : "Fit component"}</button>{recycle ? <span><button className="text-button" disabled={!!game.trial} onClick={() => { setGame((s) => salvageGear(s, selected.id)); setRecycle(false); select(null); }}>Recycle for {selected.affixes.length * 5} RP</button><button className="text-button" onClick={() => setRecycle(false)}>Keep</button></span> : <button className="text-button" disabled={!!game.trial} onClick={() => setRecycle(true)}>Recycle</button>}</div>}</>}</footer>
      </article>
    </div>
  </section>;
}



