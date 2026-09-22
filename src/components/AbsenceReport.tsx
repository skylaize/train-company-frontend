import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

/* ============================================================
   Bilan de retour.

   Le joueur revient après une nuit ou une journée de travail : avant de
   plonger dans le tableau de bord, il veut savoir ce qui s'est passé, et
   surtout ce qui attend une décision de sa part. L'écran répond dans cet
   ordre : le solde, puis ce qui est à traiter, puis le détail.

   En gratuit, on ne montre que le solde, dans un encart discret qui ne
   bloque rien : le détail est l'avantage Premium, pas une punition.
   ============================================================ */

interface Report {
  pending: boolean;
  locked?: boolean;
  hours?: number;
  net?: number;
  lineRevenue?: number;
  trips?: number;
  freight?: number;
  deliveries?: number;
  repairs?: number;
  repairCount?: number;
  autoRepairs?: number;
  breakdowns?: number;
  upkeep?: number;
  marketTrades?: number;
  marketNet?: number;
  constructionsDone?: string[];
  staffLeft?: number;
  raiseRequests?: string[];
  brokenNow?: string[];
  bestLine?: { label: string; revenue: number } | null;
  movers?: { cargoType: string; change: number }[];
}

const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n))}`;
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

function formatAway(h: number) {
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  const rest = h % 24;
  return rest ? `${d} j ${rest} h` : `${d} j`;
}

export function AbsenceReport({ onNavigate }: { onNavigate: (view: "trains" | "personnel" | "cours" | "rentabilite") => void }) {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    api
      .get("/report/absence")
      .then(({ data }) => {
        if (data?.pending) setReport(data);
      })
      .catch(() => undefined);
  }, []);

  async function close(then?: () => void) {
    setReport(null);
    api.post("/report/absence/dismiss").catch(() => undefined);
    then?.();
  }

  async function upgrade() {
    setBusy(true);
    try {
      const { data } = await api.post("/billing/checkout");
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Impossible d'ouvrir la page de paiement", "error");
      setBusy(false);
    }
  }

  if (!report) return null;
  const net = report.net ?? 0;
  const hours = report.hours ?? 0;

  /* ---- gratuit : un encart, pas une fenêtre ---- */
  if (report.locked) {
    return (
      <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-[360px] z-40 bg-navy-900 border border-line border-t-[3px] border-t-cobalt p-4 shadow-xl tutorial-step-enter">
        <div className="font-mono2 text-[10.5px] text-slate2 uppercase tracking-[0.14em]">Pendant votre absence · {formatAway(hours)}</div>
        <div className={`font-mono2 text-2xl mt-1 ${net < 0 ? "text-rail-red" : "text-offwhite"}`}>{signed(net)} pi.</div>
        <p className="text-[12px] text-slate2 font-body mt-2">
          Le détail — pannes, chantiers, cours, demandes du personnel — est inclus dans le Premium.
        </p>
        <div className="flex gap-2 mt-3">
          <button onClick={() => close()} className="px-3 py-1.5 border border-line font-mono2 text-[11px] uppercase tracking-wide text-slate2 hover:text-offwhite">
            Fermer
          </button>
          <button onClick={upgrade} disabled={busy} className="px-3 py-1.5 bg-cobalt text-onaccent font-mono2 text-[11px] uppercase tracking-wide disabled:opacity-50">
            {busy ? "Ouverture…" : "Passer Premium"}
          </button>
        </div>
      </div>
    );
  }

  /* ---- Premium : le bilan complet ---- */
  const todo: { text: string; action?: { label: string; go: () => void } }[] = [];
  if (report.brokenNow?.length) {
    todo.push({
      text: `${plural(report.brokenNow.length, "rame à l'arrêt", "rames à l'arrêt")}, en attente de réparation : ${report.brokenNow.slice(0, 3).join(", ")}${report.brokenNow.length > 3 ? "…" : ""}`,
      action: { label: "Voir la flotte", go: () => close(() => onNavigate("trains")) },
    });
  }
  if (report.raiseRequests?.length) {
    todo.push({
      text: `${plural(report.raiseRequests.length, "demande", "demandes")} d'augmentation : ${report.raiseRequests.slice(0, 3).join(", ")}${report.raiseRequests.length > 3 ? "…" : ""}`,
      action: { label: "Répondre", go: () => close(() => onNavigate("personnel")) },
    });
  }
  if (report.staffLeft) {
    todo.push({ text: `${plural(report.staffLeft, "employé est parti", "employés sont partis")} faute de trésorerie` });
  }

  const rows: [string, string, string][] = [];
  if (report.trips) rows.push(["Trajets voyageurs", fmt(report.trips), signed(report.lineRevenue ?? 0)]);
  if (report.deliveries) rows.push(["Livraisons de fret", fmt(report.deliveries), signed(report.freight ?? 0)]);
  if (report.repairCount)
    rows.push([
      `Réparations${report.autoRepairs ? ` (dont ${report.autoRepairs} d'office)` : ""}`,
      fmt(report.repairCount),
      signed(-(report.repairs ?? 0)),
    ]);
  if (report.upkeep) rows.push(["Entretien du réseau", "", signed(-(report.upkeep ?? 0))]);
  if (report.marketTrades) rows.push(["Achats et ventes au marché", fmt(report.marketTrades), signed(report.marketNet ?? 0)]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 px-4">
      <div className="w-full max-w-lg bg-navy-900 border border-line border-t-[3px] border-t-cobalt tutorial-step-enter max-h-[90vh] overflow-y-auto">
        <div className="px-5 pt-5 pb-4 border-b border-line">
          <div className="font-mono2 text-[10.5px] text-slate2 uppercase tracking-[0.14em]">Pendant votre absence · {formatAway(hours)}</div>
          <div className="flex items-baseline gap-3 mt-1">
            <span className={`font-mono2 text-3xl ${net < 0 ? "text-rail-red" : "text-offwhite"}`}>{signed(net)} pi.</span>
            <span className="text-[12px] text-slate2 font-body">de trésorerie, salaires compris</span>
          </div>
        </div>

        {todo.length > 0 && (
          <section className="px-5 py-4 border-b border-line bg-amber/5">
            <h3 className="font-mono2 text-[10.5px] text-amber uppercase tracking-[0.14em] mb-2">À traiter</h3>
            <ul className="space-y-2">
              {todo.map((t) => (
                <li key={t.text} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-body text-offwhite">{t.text}</span>
                  {t.action && (
                    <button onClick={t.action.go} className="font-mono2 text-[10.5px] uppercase text-cobalt border border-cobalt/40 px-2 py-1 hover:bg-cobalt/10">
                      {t.action.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="px-5 py-4">
          {rows.length === 0 ? (
            <p className="text-[13px] text-slate2 font-body">Rien n'a roulé pendant votre absence.</p>
          ) : (
            <table className="w-full text-[13px] font-body">
              <tbody>
                {rows.map(([label, count, amount]) => (
                  <tr key={label} className="border-b border-line last:border-0">
                    <td className="py-1.5 text-slate2">{label}</td>
                    <td className="py-1.5 text-right font-mono2 text-slate2 w-14">{count}</td>
                    <td className="py-1.5 text-right font-mono2 text-offwhite w-24">{amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <ul className="mt-4 space-y-1.5 text-[12.5px] font-body text-slate2">
            {report.breakdowns ? <li>{plural(report.breakdowns, "panne", "pannes")} sur la période</li> : null}
            {report.constructionsDone?.map((c) => (
              <li key={c} className="text-rail-green">Chantier livré : {c}</li>
            ))}
            {report.bestLine && (
              <li>
                Meilleure ligne : <span className="text-offwhite">{report.bestLine.label}</span> ({signed(report.bestLine.revenue)} pi.)
              </li>
            )}
            {report.movers && report.movers.length > 0 && (
              <li>
                Cours :{" "}
                {report.movers.map((m, i) => (
                  <span key={m.cargoType}>
                    {i > 0 && " · "}
                    <span className="text-offwhite">{m.cargoType}</span> {m.change > 0 ? "+" : ""}
                    {m.change.toLocaleString("fr-FR")} %
                  </span>
                ))}
              </li>
            )}
          </ul>
        </section>

        <div className="px-5 pb-5 flex flex-wrap gap-2 justify-end">
          <button
            onClick={() => close(() => onNavigate("rentabilite"))}
            className="px-3 py-2 border border-line font-mono2 text-[11px] uppercase tracking-wide text-slate2 hover:text-offwhite"
          >
            Rentabilité détaillée
          </button>
          <button onClick={() => close()} className="px-4 py-2 bg-cobalt text-onaccent font-mono2 text-[11px] uppercase tracking-wide">
            Reprendre
          </button>
        </div>
      </div>
    </div>
  );
}
