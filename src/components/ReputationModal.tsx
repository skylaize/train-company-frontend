import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";

/* ============================================================
   D'où vient la réputation.

   La note = part des trajets sans incident depuis le début, plus les points
   gagnés ou perdus (décisions, conteneurs scellés, échéances impayées), plus
   les contrôleurs à bord. Lue à l'ouverture de la fenêtre seulement.
   ============================================================ */

type Detail = {
  total: number;
  trips: number;
  incidents: number;
  base: number;
  adjust: number;
  crew: { points: number; max: number; controlled: number; lineTrains: number };
  revenue: number;
  week: { incidents: number; latest: { train: string; message: string; at: string }[] };
};

const nf = (n: number) => n.toLocaleString("fr-FR");
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60) return `il y a ${Math.max(1, m)} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return `il y a ${d} jour${d > 1 ? "s" : ""}`;
};

function Row({ label, detail, value, tone }: { label: string; detail: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="font-body text-[14px] text-offwhite">{label}</div>
        <div className="font-body text-[12.5px] text-slate2 mt-0.5">{detail}</div>
      </div>
      <div className={`font-mono2 text-[17px] tabular-nums shrink-0 ${tone === "good" ? "text-rail-green" : tone === "bad" ? "text-rail-red" : "text-offwhite"}`}>{value}</div>
    </div>
  );
}

export function ReputationModal({ onClose }: { onClose: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get("/company/reputation").then(({ data }) => setD(data)).catch(() => setError(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const color = (n: number) => (n >= 80 ? "text-rail-green" : n >= 50 ? "text-amber" : "text-rail-red");
  const missingCtrl = d ? Math.max(0, d.crew.lineTrains - d.crew.controlled) : 0;

  return createPortal(
    <div data-modal className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-navy-900 border border-line border-t-[3px] border-t-cobalt rounded-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Détail de la réputation">
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-line">
          <div>
            <div className="font-body text-[12px] text-slate2 font-medium">Votre compagnie</div>
            <h3 className="font-display text-xl leading-tight">Réputation</h3>
          </div>
          <button onClick={onClose} className="text-slate2 hover:text-offwhite text-lg leading-none px-1" aria-label="Fermer">
            ×
          </button>
        </div>

        {error ? (
          <p className="p-5 text-slate2 font-body">Le détail ne répond pas pour le moment.</p>
        ) : !d ? (
          <div className="m-5 h-48 bg-navy-950 animate-skeleton" />
        ) : (
          <div className="p-5">
            <div className="flex items-end gap-3">
              <div className={`font-mono2 text-5xl leading-none tabular-nums ${color(d.total)}`}>{d.total}</div>
              <div className="font-body text-[13px] text-slate2 pb-1">
                sur 100 · vos billets rapportent <span className="text-offwhite">{d.revenue} %</span> de leur prix
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-navy-950 border border-line overflow-hidden">
              <div className={`h-full ${d.total >= 80 ? "bg-rail-green" : d.total >= 50 ? "bg-amber" : "bg-rail-red"}`} style={{ width: `${d.total}%` }} />
            </div>

            <div className="mt-4 divide-y divide-line border-y border-line">
              <Row
                label="Trajets sans incident"
                detail={d.trips + d.incidents ? `${nf(d.trips)} trajets réussis, ${nf(d.incidents)} incident${d.incidents > 1 ? "s" : ""} depuis le début` : "Pas encore de trajet : 100 par défaut"}
                value={`${d.base}`}
              />
              <Row
                label="Points gagnés ou perdus"
                detail="Décisions du directeur, conteneurs scellés, échéances d'emprunt impayées"
                value={signed(d.adjust)}
                tone={d.adjust > 0 ? "good" : d.adjust < 0 ? "bad" : undefined}
              />
              <Row
                label="Contrôleurs à bord"
                detail={d.crew.lineTrains ? `${d.crew.controlled} rame${d.crew.controlled > 1 ? "s" : ""} sur ${d.crew.lineTrains} en ont un · jusqu'à +${d.crew.max}` : `Jusqu'à +${d.crew.max} quand vos rames en ligne en ont un`}
                value={signed(d.crew.points)}
                tone={d.crew.points > 0 ? "good" : undefined}
              />
            </div>

            <div className="mt-5">
              <div className="font-body text-[12px] text-slate2 font-medium mb-2">
                Ces 7 derniers jours · {d.week.incidents ? `${d.week.incidents}${d.week.incidents >= 50 ? "+" : ""} incident${d.week.incidents > 1 ? "s" : ""}` : "aucun incident"}
              </div>
              {d.week.latest.length > 0 && (
                <ul className="space-y-1.5">
                  {d.week.latest.map((i, k) => (
                    <li key={k} className="font-body text-[13px] flex gap-2">
                      <span className="text-slate2 shrink-0 w-[92px]">{ago(i.at)}</span>
                      <span className="min-w-0">
                        <span className="text-offwhite">{i.train}</span> <span className="text-slate2">· {i.message}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-5 border border-line bg-navy-950 rounded-md px-4 py-3">
              <div className="font-body text-[12px] text-slate2 font-medium mb-1.5">Pour la faire monter</div>
              <ul className="font-body text-[13px] text-offwhite space-y-1 list-disc pl-4 marker:text-slate2">
                {missingCtrl > 0 && <li>Un contrôleur sur chaque rame en ligne ({missingCtrl} sans).</li>}
                <li>Des rames peu usées : l'usure fait les pannes, l'atelier et les mécaniciens la réduisent.</li>
                <li>Un conducteur à bord : moins de retards, deux fois moins d'incidents.</li>
              </ul>
              <p className="font-body text-[12px] text-slate2 mt-2">
                La note porte sur tous vos trajets depuis le début : elle bouge lentement, dans un sens comme dans l'autre.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
