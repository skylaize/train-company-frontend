import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { modelLabel } from "../models";
import { TrainStage } from "./TrainStage";
import { TrainPicture } from "./TrainPicture";
import { WAGON_TYPES, freightModel, wagonById, LOAD_FACTOR, WAGON_DRAG, fmtLoad } from "../freight";

/* ============================================================
   2.1 : la composition d'une locomotive de fret.

   En haut, la rame à quai : le wagon qu'on attelle arrive et s'accroche.
   Au milieu, ce qu'elle peut porter maintenant, marchandise par
   marchandise, avec la charge (×1, ×1,6…) : on voit tout de suite qu'un
   deuxième wagon-trémie fait payer plus les céréales, et qu'un wagon
   d'un autre type ouvre une deuxième cargaison.
   En bas, les sept wagons, chacun dessiné avec sa marchandise.
   ============================================================ */

type FreightTrain = {
  id: string;
  name: string;
  model: string;
  status: string;
  cars?: string[] | null;
  line?: { departureStation: string } | null;
};

export function FreightComposition({ train, balance, livery, onClose, onChange }: { train: FreightTrain; balance: number; livery: string | null; onClose: () => void; onChange: () => void }) {
  const cars = (train.cars ?? []).filter((c) => wagonById(c));
  const fm = freightModel(train.model);
  const max = fm?.maxWagons ?? 0;
  const [busy, setBusy] = useState<string | null>(null);
  const { showToast } = useToast();
  const atDepot = train.status === "IDLE";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function change(id: string, action: "add" | "remove") {
    if (busy) return;
    setBusy(id + action);
    try {
      await api.post("/trains/cars", { trainId: train.id, car: id, action });
      const w = wagonById(id)!;
      showToast(action === "add" ? `${w.label} attelé à ${train.name}` : `${w.label} dételé, ${Math.floor(w.price / 2)} pi. récupérées`);
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusy(null);
    }
  }

  // ce que la rame peut charger, par type de wagon attelé
  const groups = WAGON_TYPES.map((w) => ({ w, n: cars.filter((c) => c === w.id).length })).filter((g) => g.n > 0);
  const pace = (fm?.pace ?? 1) * (1 + WAGON_DRAG * Math.max(0, cars.length - 1));
  const speedPct = Math.round((1 / pace - 1) * 100);

  return createPortal(
    <div data-modal className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-navy-900 border border-line border-t-[3px] border-t-amber rounded-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Composition de ${train.name}`}
      >
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-line">
          <div>
            <div className="text-[12.5px] text-amber font-body">Locomotive de fret, {modelLabel(train.model).toLowerCase()}</div>
            <h3 className="font-display text-xl leading-tight">{train.name}</h3>
          </div>
          <button onClick={onClose} className="text-slate2 hover:text-offwhite text-lg leading-none px-1" aria-label="Fermer">
            ×
          </button>
        </div>

        <div className="border-b border-line">
          <TrainStage model={train.model as never} cars={cars} maxCars={max} livery={livery ?? "#38bdf8"} station={train.line?.departureStation ?? "Dépôt"} />
          {cars.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pb-3 pt-1 bg-navy-950">
              {cars.map((c, i) => (
                <button
                  key={i}
                  onClick={() => change(c, "remove")}
                  disabled={!!busy || !atDepot}
                  className="text-[12.5px] font-body text-slate2 border border-line px-2 py-1 hover:text-rail-red hover:border-rail-red/60 disabled:opacity-40 rounded-control"
                  title={`Dételer (${Math.floor((wagonById(c)?.price ?? 0) / 2)} pi. récupérées)`}
                >
                  Dételer : {wagonById(c)?.short.toLowerCase()} n° {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 border-b border-line text-center">
          <div className="py-3 border-r border-line">
            <div className="font-mono2 text-lg tabular-nums">
              {cars.length}/{max}
            </div>
            <div className="text-[12px] text-slate2 font-body">wagons</div>
          </div>
          <div className="py-3 border-r border-line">
            <div className={`font-mono2 text-lg tabular-nums ${speedPct >= 0 ? "text-rail-green" : "text-amber"}`}>
              {speedPct >= 0 ? "+" : "−"}
              {Math.abs(speedPct)} %
            </div>
            <div className="text-[12px] text-slate2 font-body">vitesse des livraisons</div>
          </div>
          <div className="py-3">
            <div className={`font-mono2 text-lg tabular-nums ${(fm?.bonus ?? 1) > 1 ? "text-amber" : ""}`}>{(fm?.bonus ?? 1) > 1 ? `+${Math.round(((fm?.bonus ?? 1) - 1) * 100)} %` : "—"}</div>
            <div className="text-[12px] text-slate2 font-body">{(fm?.bonus ?? 1) > 1 ? "sur chaque livraison" : "pas de bonus de paie"}</div>
          </div>
        </div>

        {/* ce qu'elle peut porter */}
        <div className="px-5 pt-4 pb-2">
          <h4 className="font-display text-[17px]">Ce qu'elle peut porter</h4>
          {groups.length === 0 ? (
            <p className="text-[13.5px] text-slate2 font-body mt-1">Rien pour l'instant : attelez au moins un wagon pour prendre un contrat.</p>
          ) : (
            <>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {groups.map(({ w, n }) => {
                  const next = LOAD_FACTOR[Math.min(n + 1, LOAD_FACTOR.length - 1)];
                  return (
                    <li key={w.id} className="flex items-center justify-between gap-3 py-2 text-[13.5px] font-body">
                      <span className="min-w-0">
                        <span className="text-offwhite">{w.cargos.join(", ")}</span>
                        <span className="text-slate2"> en {w.short.toLowerCase()}, {n} wagon{n > 1 ? "s" : ""}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="font-mono2 text-amber tabular-nums">{fmtLoad(LOAD_FACTOR[Math.min(n, LOAD_FACTOR.length - 1)])}</span>
                        {n < max && cars.length < max && <span className="block text-[11.5px] text-slate2">un de plus : {fmtLoad(next)}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[12.5px] text-slate2 font-body mt-2">
                {groups.length > 1
                  ? `${groups.length} cargaisons différentes : elle peut partir en tournée avec ${groups.length} contrats d'un coup.`
                  : "Un wagon d'un autre type permettrait une deuxième cargaison dans la même tournée."}
              </p>
            </>
          )}
        </div>

        {!atDepot && (
          <p className="mx-5 mt-3 text-[13px] font-body text-amber border border-amber/40 bg-amber/[0.06] px-3 py-2">
            {train.name} est en tournée : les wagons s'attellent et se dételent au dépôt.
          </p>
        )}

        <div className="p-5 grid gap-2 sm:grid-cols-2">
          {WAGON_TYPES.map((w) => {
            const full = cars.length >= max;
            const poor = balance < w.price;
            const n = cars.filter((c) => c === w.id).length;
            return (
              <div key={w.id} className={`border px-3 pt-2 pb-3 flex flex-col gap-1.5 rounded-card bg-navy-900/40 ${n > 0 ? "border-amber/50" : "border-line"}`}>
                <div className="-mx-1 h-[46px]">
                  <TrainPicture model="WAGONS" cars={[w.id]} livery={livery ?? "#38bdf8"} height={46} label={w.label} />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[14px] font-body text-offwhite">{w.label}</span>
                  {n > 0 && <span className="text-[12px] font-mono2 text-amber">×{n}</span>}
                </div>
                <div className="text-[12.5px] text-slate2 font-body flex-1">{w.cargos.join(", ")}</div>
                <button
                  onClick={() => change(w.id, "add")}
                  disabled={!!busy || full || poor || !atDepot}
                  title={full ? `${max} wagons au plus` : poor ? "Trésorerie insuffisante" : !atDepot ? "Au dépôt seulement" : undefined}
                  className="self-start text-[13px] font-body text-cobalt border border-cobalt/40 px-2.5 py-1 hover:bg-cobalt/10 disabled:opacity-35 disabled:hover:bg-transparent rounded-control"
                >
                  Atteler, {w.price} pi.
                </button>
              </div>
            );
          })}
        </div>
        <p className="px-5 pb-5 -mt-2 text-[12px] text-slate2 font-body">
          Chaque wagon après le premier ralentit la locomotive de {Math.round(WAGON_DRAG * 100)} %. Un wagon dételé rend la moitié de son prix.
        </p>
      </div>
    </div>,
    document.body
  );
}
