import type { GameObjectDef, Upgrade, StatKey, CurrencyId } from '../data/types';
import { CURRENCIES, getCurrency } from '../data/currencies';
import {
  isUnlocked,
  unlockBlock,
  equipBlock,
  reservedTotals,
  availableTotals,
  type Wallet,
  type Unlocked,
  type Equipped,
} from '../game/builds';

const STAT_LABELS: Record<StatKey, string> = {
  walkPower: 'Walk',
  runPower: 'Run',
  maxStamina: 'Stamina',
  staminaRefill: 'Refill',
  runDrain: 'Drain',
  maxReserve: 'Energy',
  energyBurn: 'Burn',
  drag: 'Drag',
  weight: 'Weight',
  rollResist: 'Roll',
  topSpeed: 'Top Spd',
  assist: 'Assist',
};

const LOWER_BETTER: StatKey[] = ['drag', 'weight', 'runDrain', 'rollResist', 'energyBurn'];

function modText(m: { stat: StatKey; add?: number; mul?: number }) {
  if (m.add != null) {
    const r = Math.round(m.add * 100) / 100;
    return `${STAT_LABELS[m.stat]} ${r > 0 ? '+' : ''}${r}`;
  }
  return `${STAT_LABELS[m.stat]} ×${Math.round((m.mul ?? 1) * 100) / 100}`;
}
function modGood(m: { stat: StatKey; add?: number; mul?: number }) {
  const delta = m.add != null ? m.add : (m.mul ?? 1) - 1;
  return LOWER_BETTER.includes(m.stat) ? delta < 0 : delta > 0;
}

interface Props {
  object: GameObjectDef;
  wallet: Wallet;
  unlocked: Unlocked;
  equipped: Equipped;
  onUnlock: (id: string) => void;
  onEquip: (slotId: string, id: string) => void;
  onClose: () => void;
}

export function Board({ object, wallet, unlocked, equipped, onUnlock, onEquip, onClose }: Props) {
  const reserved = reservedTotals(object, equipped);
  const available = availableTotals(object, wallet, equipped);

  return (
    <section className="board">
      <header className="board-head">
        <h2>🔬 Build — {object.name}</h2>
        <div className="board-curr">
          {CURRENCIES.map((c) => (
            <div className="bc" key={c.id} title={c.blurb}>
              <span className="bc-sym">{c.symbol}</span>
              <span className="bc-val" style={{ color: c.color }}>
                {c.id === 'grants'
                  ? Math.floor(wallet.grants)
                  : Math.floor(available[c.id])}
              </span>
              {c.id !== 'grants' && reserved[c.id] > 0 && (
                <span className="bc-res">/{Math.floor(wallet[c.id])} ({reserved[c.id]}🔒)</span>
              )}
            </div>
          ))}
        </div>
        <button className="board-close" onClick={onClose} title="Close (the run keeps going)">
          ✕
        </button>
      </header>

      <div className="board-note">
        <strong>Grants</strong> unlock upgrades for good · other currencies are{' '}
        <strong>reserved</strong> while equipped (unequip to free them). One equip per slot —
        that loadout is your build.
      </div>

      <div className="board-grid">
        {object.slots.map((slot) => (
          <div className="slot-col" key={slot.id}>
            <div className="slot-col-head">
              <img className="slot-icon" src={slot.icon} alt="" />
              <span>{slot.name}</span>
            </div>
            {slot.upgrades.map((u) => (
              <UpgradeCard
                key={u.id}
                object={object}
                slotId={slot.id}
                upgrade={u}
                wallet={wallet}
                unlocked={unlocked}
                equipped={equipped}
                available={available}
                onUnlock={onUnlock}
                onEquip={onEquip}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function UpgradeCard({
  object,
  slotId,
  upgrade: u,
  wallet,
  unlocked,
  equipped,
  available,
  onUnlock,
  onEquip,
}: {
  object: GameObjectDef;
  slotId: string;
  upgrade: Upgrade;
  wallet: Wallet;
  unlocked: Unlocked;
  equipped: Equipped;
  available: Wallet;
  onUnlock: (id: string) => void;
  onEquip: (slotId: string, id: string) => void;
}) {
  const unlockedNow = isUnlocked(object, unlocked, u.id);
  const equippedNow = equipped[slotId] === u.id;
  const uBlock = unlockBlock(object, unlocked, wallet, u.id);
  const eBlock = equipBlock(object, unlocked, wallet, equipped, u.id);

  let state: 'equipped' | 'equip' | 'unlock' | 'lockedPrereq' | 'cantAfford' | 'cantReserve';
  if (equippedNow) state = 'equipped';
  else if (unlockedNow) state = eBlock === null ? 'equip' : 'cantReserve';
  else if (uBlock === null) state = 'unlock';
  else if (uBlock === 'prereq') state = 'lockedPrereq';
  else state = 'cantAfford';

  const click = () => {
    if (state === 'unlock') onUnlock(u.id);
    else if (state === 'equip' || state === 'equipped') onEquip(slotId, u.id);
  };

  const equipChips = (Object.keys(u.equipCost) as CurrencyId[]).filter(
    (c) => (u.equipCost[c] ?? 0) > 0,
  );

  return (
    <button className={`ucard ${state}`} onClick={click} disabled={state === 'lockedPrereq'}>
      <div className="ucard-top">
        <img className="ucard-icon" src={u.icon} alt="" />
        <span className="ucard-name">{u.name}</span>
        {equippedNow && <span className="ucard-eqbadge">EQUIPPED</span>}
      </div>

      {u.mods.length > 0 && (
        <div className="ucard-mods">
          {u.mods.map((m, i) => (
            <span key={i} className={modGood(m) ? 'good' : 'bad'}>
              {modText(m)}
            </span>
          ))}
        </div>
      )}

      <div className="ucard-foot">
        {!unlockedNow ? (
          <span className={`pill unlock ${state === 'cantAfford' ? 'short' : ''}`}>
            🔒 {(Object.keys(u.unlockCost) as CurrencyId[]).map((c) => (
              <em key={c}>{getCurrency(c).symbol}{u.unlockCost[c]}</em>
            ))}
          </span>
        ) : equipChips.length === 0 ? (
          <span className="pill free">{equippedNow ? 'equipped' : 'free equip'}</span>
        ) : (
          <span className={`pill equip ${state === 'cantReserve' ? 'short' : ''}`}>
            {equipChips.map((c) => {
              const need = u.equipCost[c] ?? 0;
              const ok = equippedNow || (available[c] ?? 0) >= need;
              return (
                <em key={c} className={ok ? '' : 'short'}>
                  {getCurrency(c).symbol}{need}
                </em>
              );
            })}
            <span className="pill-tag">reserve</span>
          </span>
        )}
        <span className="ucard-action">
          {state === 'unlock' && 'Unlock'}
          {state === 'equip' && 'Equip'}
          {state === 'equipped' && '✓'}
          {state === 'cantReserve' && 'No budget'}
          {state === 'cantAfford' && 'Need grants'}
          {state === 'lockedPrereq' && 'Locked'}
        </span>
      </div>
    </button>
  );
}
