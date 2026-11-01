import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

/* ============================================================
   2.5 : les campagnes régionales.

   Huit étapes dans une région, de la première gare desservie à la région
   entière. La page montre la campagne en cours (où l'on en est, ce qu'il
   faut faire, le bouton pour encaisser l'étape), puis toutes les régions.
   ============================================================ */

export interface CampaignData {
  current: null | {
    region: string;
    name: string;
    intro: string;
    title: string;
    step: number;
    progress: { current: number; target: number; detail?: string };
    ready: boolean;
    steps: { title: string; text: string; reward: number; done: boolean }[];
  };
  total: number;
  regions: { id: string; name: string; intro: string; title: string; stations: string[]; steps: number; step: number; started: boolean; done: boolean; active: boolean }[];
}

const fmt = (n: number) => n.toLocaleString("fr-FR");

/* les étapes sur une voie : franchies en ambre, celle en cours cerclée */
function StepTrack({ total, step }: { total: number; step: number }) {
  return (
    <div className="relative h-4 mx-2" aria-hidden="true">
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-line" />
      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] bg-amber transition-all duration-700" style={{ width: `${(Math.min(step, total - 1) / (total - 1)) * 100}%` }} />
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 ${i < step ? "w-3 h-3 bg-amber border-amber" : i === step ? "w-4 h-4 bg-navy-900 border-cobalt" : "w-3 h-3 bg-navy-900 border-slate2/50"}`}
          style={{ left: `${(i / (total - 1)) * 100}%` }}
        />
      ))}
    </div>
  );
}

export function CampaignSection({ onChange }: { onChange: () => void }) {
  const { showToast, showComposter } = useToast();
  const [data, setData] = useState<CampaignData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => {
    api.get("/campaigns").then((r) => setData(r.data)).catch(() => undefined);
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  async function start(region: string) {
    setBusy(region);
    try {
      await api.post("/campaigns/start", { region });
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Impossible pour le moment", "error");
    } finally {
      setBusy(null);
    }
  }
  async function claim() {
    setBusy("claim");
    try {
      const { data: r } = await api.post("/campaigns/claim");
      if (r.finished) showComposter(`Campagne terminée : +${fmt(r.reward)} pi. et le titre « ${r.title} »`);
      else showToast(`Étape validée : +${fmt(r.reward)} pi.`);
      load();
      onChange();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Pas encore", "error");
      load();
    } finally {
      setBusy(null);
    }
  }

  if (!data) return <div className="h-40 bg-navy-900 animate-skeleton rounded-card" />;
  const c = data.current;
  const step = c ? c.steps[c.step] : null;
  const pct = c ? Math.round((c.progress.current / Math.max(1, c.progress.target)) * 100) : 0;

  return (
    <div className="space-y-8">
      {c && step ? (
        <section className="border border-line border-t-[3px] border-t-amber bg-navy-900/60 rounded-card">
          <div className="px-5 pt-4 pb-3 border-b border-line flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-[14rem]">
              <div className="text-[12px] font-body text-amber font-medium">Campagne en cours · étape {c.step + 1} sur {c.steps.length}</div>
              <h2 className="font-display text-2xl leading-tight">{c.name}</h2>
              <p className="font-body text-[13px] text-slate2 mt-1 max-w-[60ch]">{c.intro}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[12px] font-body text-slate2">À la fin</div>
              <div className="font-body text-[13.5px] text-offwhite">titre « {c.title} »</div>
            </div>
          </div>
          <div className="px-5 pt-4">
            <StepTrack total={c.steps.length} step={c.step} />
          </div>
          <div className="px-5 py-4 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[16rem]">
              <div className="font-display text-xl leading-tight">{step.title}</div>
              <p className="font-body text-[13.5px] text-slate2 mt-0.5">{step.text}</p>
              <div className="mt-3 max-w-[420px]">
                <div className="flex justify-between text-[12px] font-body text-slate2 mb-1">
                  <span>{c.progress.detail ?? "Progression"}</span>
                  <span className="tabular-nums">
                    {fmt(c.progress.current)} / {fmt(c.progress.target)}
                  </span>
                </div>
                <div className="h-1.5 bg-navy-950 border border-line">
                  <div className={`h-full transition-all duration-500 ${c.ready ? "bg-rail-green" : "bg-cobalt"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
            <button
              onClick={claim}
              disabled={!c.ready || busy === "claim"}
              className="shrink-0 bg-amber text-onaccent text-[13.5px] font-semibold font-body px-4 py-2.5 disabled:opacity-40 rounded-control"
            >
              {c.ready ? `Valider l'étape · +${fmt(step.reward)} pi.` : `+${fmt(step.reward)} pi. à la clé`}
            </button>
          </div>
          <ol className="px-5 pb-4 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 border-t border-line pt-3">
            {c.steps.map((s, i) => (
              <li key={i} className={`flex items-baseline gap-2 font-body text-[13px] ${i === c.step ? "text-offwhite" : "text-slate2"}`}>
                <span className={`w-5 shrink-0 font-mono2 text-[11.5px] ${s.done ? "text-rail-green" : ""}`}>{s.done ? "✓" : i + 1}</span>
                <span className={`flex-1 ${s.done ? "line-through decoration-slate2/40" : ""}`}>{s.title}</span>
                <span className="font-mono2 text-[11.5px] tabular-nums">+{fmt(s.reward)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className="border border-line bg-navy-900/60 rounded-card px-5 py-4">
          <div className="text-[12px] font-body text-amber font-medium">Campagnes régionales</div>
          <h2 className="font-display text-2xl leading-tight">Choisissez une région</h2>
          <p className="font-body text-[13.5px] text-slate2 mt-1 max-w-[70ch]">
            Huit étapes par région, de la première gare desservie à la région entière : {fmt(data.total)} pi. de primes en tout, et le titre « Compagnie de … » à la fin.
            Une campagne à la fois ; en changer met l'autre en pause sans rien perdre.
          </p>
        </section>
      )}

      <section>
        <h3 className="font-display text-[20px] mb-3">Les régions</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.regions.map((r) => (
            <div key={r.id} className={`border rounded-card px-4 py-3 flex flex-col gap-2 ${r.active ? "border-amber/60 bg-amber/[0.04]" : "border-line bg-navy-900/40"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-display text-lg leading-tight">{r.name}</div>
                <div className="font-mono2 text-[12px] text-slate2 tabular-nums shrink-0">
                  {r.done ? <span className="text-rail-green">✓ terminée</span> : `${r.step} / ${r.steps}`}
                </div>
              </div>
              <p className="font-body text-[12.5px] text-slate2 leading-snug flex-1">{r.intro}</p>
              <div className="font-body text-[12px] text-slate2/80">{r.stations.join(" · ")}</div>
              {r.done ? (
                <div className="font-body text-[12.5px] text-rail-green">Titre « {r.title} » gagné</div>
              ) : r.active ? (
                <div className="font-body text-[12.5px] text-amber">Campagne en cours</div>
              ) : (
                <button
                  onClick={() => start(r.id)}
                  disabled={busy === r.id}
                  className="self-start text-[13px] font-body border border-line px-3 py-1.5 hover:border-slate2 disabled:opacity-50 rounded-control"
                >
                  {r.started ? "Reprendre" : c ? "Commencer (met l'autre en pause)" : "Commencer"}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
