import { useEffect, useRef } from "react";
import FundingPanel, { type FundingDestination } from "./FundingPanel";
import type { Save } from "./game";
import { fundingPreview } from "./economy";
export default function FundingModal({ game, setGame, onNavigate, onDismiss }: {
  game: Save;
  setGame: React.Dispatch<React.SetStateAction<Save>>;
  onNavigate: (destination: FundingDestination) => void;
  onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); return () => dialog.current?.close(); }, []);
  const last = game.history[0];
  const talent=fundingPreview(game,"talent"),voucher=fundingPreview(game,"voucher");
  const conversionNote=talent.capped||voucher.capped
    ? "Large conversions buy up to 100,000 units per batch. Remaining RP stays available for another batch."
    : talent.capacityLimited||voucher.capacityLimited
      ? "Conversions stop at the currency limit. Unspent RP stays available."
      : "Conversion uses all affordable RP in your current bank. Unspent RP stays available.";
  return <dialog ref={dialog} className="funding-modal" aria-label="Fund the next experiment" onCancel={(e) => { e.preventDefault(); onDismiss(); }}>
    {last && <div className="funding-receipt"><b>Experiment complete</b><span>+{Math.floor(last.science).toLocaleString("en")} RP earned</span><small>{last.program === "projectile" ? "Best landing" : "Distance"}: {Math.floor(last.distance).toLocaleString("en")} m · {last.speed.toFixed(1)} m/s peak</small></div>}
    <FundingPanel game={game} setGame={setGame} onNavigate={onNavigate} />
    <div className="funding-dismiss"><span>{conversionNote}</span><button autoFocus className="secondary" onClick={onDismiss}>Keep RP · return to experiment</button></div>
  </dialog>;
}
