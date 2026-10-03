import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import { PremiumCTA } from "./PremiumCTA";

/* ============================================================
   Remplissage d'une ligne sur 24 h (1.7, Premium).

   Une barre par heure : la part des places occupées, et en rouge au-dessus
   les voyageurs restés à quai. De quoi voir l'heure de pointe, et savoir s'il
   faut une voiture de plus ou un billet plus cher.
   ============================================================ */

interface LoadData {
  hours: { hour: string; trips: number; passengers: number; left: number; fill: number | null }[];
  totals: { trips: number; passengers: number; left: number };
  peak: string | null;
}

const hh = (iso: string) => `${Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Paris" }).formatToParts(new Date(iso)).find((p) => p.type === "hour")?.value ?? 0)} h`;

export function LineLoadModal({ lineId, title, isPremium, onClose }: { lineId: string; title: string; isPremium: boolean; onClose: () => void }) {
  const [data, setData] = useState<LoadData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isPremium) return;
    api.get(`/lines/${lineId}/load`).then(({ data }) => setData(data)).catch(() => setError(true));
  }, [lineId, isPremium]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const H = 140;
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-navy-900 border border-line border-t-[3px] border-t-cobalt" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Remplissage de ${title}`}>
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-line">
          <div>
            <div className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-slate2">Remplissage · 24 dernières heures</div>
            <h3 className="font-display text-xl leading-tight">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate2 hover:text-offwhite text-lg leading-none px-1" aria-label="Fermer">×</button>
        </div>

        {!isPremium ? (
          <div className="p-5 space-y-3">
            {/* aperçu flou : la forme d'une journée, sans les chiffres */}
            <div className="flex items-end gap-[3px] h-[100px] blur-[2px] opacity-60" aria-hidden>
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="flex-1 bg-cobalt/70" style={{ height: `${25 + 60 * Math.max(0, Math.sin(((i - 5) / 24) * Math.PI * 2)) + (i % 5) * 3}%` }} />
              ))}
            </div>
            <p className="text-[13px] font-body text-slate2">
              Les abonnés Premium voient le remplissage de chaque ligne heure par heure, l'heure de pointe et les voyageurs perdus faute de places.
            </p>
            <PremiumCTA company={{ isPremium }} compact />
          </div>
        ) : error ? (
          <p className="p-5 text-slate2 font-body">La courbe ne répond pas pour le moment.</p>
        ) : !data ? (
          <div className="m-5 h-40 bg-navy-950 animate-skeleton" />
        ) : (
          <div className="p-5">
            <div className="grid grid-cols-3 border border-line divide-x divide-line text-center mb-5">
              <div className="py-2.5">
                <div className="font-mono2 text-lg tabular-nums">{data.totals.trips}</div>
                <div className="text-[10.5px] uppercase tracking-wide text-slate2 font-body">trajets</div>
              </div>
              <div className="py-2.5">
                <div className="font-mono2 text-lg tabular-nums">{data.totals.passengers.toLocaleString("fr-FR")}</div>
                <div className="text-[10.5px] uppercase tracking-wide text-slate2 font-body">voyageurs</div>
              </div>
              <div className="py-2.5">
                <div className={`font-mono2 text-lg tabular-nums ${data.totals.left ? "text-rail-red" : ""}`}>{data.totals.left.toLocaleString("fr-FR")}</div>
                <div className="text-[10.5px] uppercase tracking-wide text-slate2 font-body">restés à quai</div>
              </div>
            </div>
            <div className="relative" style={{ height: H + 22 }}>
              {/* repère des 100 % */}
              <div className="absolute inset-x-0 border-t border-dashed border-line" style={{ top: 0 }} />
              <span className="absolute right-0 -top-4 font-mono2 text-[10px] text-slate2">100 %</span>
              <div className="absolute inset-x-0 top-0 flex items-end gap-[3px]" style={{ height: H }}>
                {data.hours.map((h) => {
                  const fill = h.fill ?? 0;
                  const lost = h.trips ? Math.min(40, Math.round((h.left / Math.max(1, h.passengers + h.left)) * 100)) : 0;
                  const peak = data.peak === h.hour;
                  return (
                    <div key={h.hour} className="flex-1 flex flex-col justify-end h-full" title={h.trips ? `${hh(h.hour)} : ${fill} % · ${h.passengers} voyageurs${h.left ? ` · ${h.left} à quai` : ""}` : `${hh(h.hour)} : aucun trajet`}>
                      {lost > 0 && <div className="bg-rail-red/80" style={{ height: `${(lost / 100) * H}px` }} />}
                      <div className={h.trips ? (peak ? "bg-amber" : "bg-cobalt") : "bg-line/50"} style={{ height: h.trips ? `${Math.max(2, (Math.min(100, fill) / 100) * H)}px` : "2px" }} />
                    </div>
                  );
                })}
              </div>
              <div className="absolute inset-x-0 bottom-0 flex justify-between font-mono2 text-[10px] text-slate2">
                <span>{hh(data.hours[0].hour)}</span>
                <span>{hh(data.hours[12].hour)}</span>
                <span>{hh(data.hours[23].hour)}</span>
              </div>
            </div>
            <p className="text-[12px] font-body text-slate2 mt-3">
              {data.peak ? (
                <>
                  Heure de pointe : <span className="text-amber">{hh(data.peak)}</span>.{" "}
                </>
              ) : null}
              En rouge, la part des voyageurs restés à quai : une voiture de plus ou un billet plus cher les convertit en recette.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
