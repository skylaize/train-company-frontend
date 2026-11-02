import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { CampaignData } from "./CampaignSection";

/* ============================================================
   2.5.1 : la campagne en cours, d'un coup d'œil sur le tableau de bord.

   Sans elle, il fallait aller dans Progression → Campagnes pour savoir où on
   en était, ou qu'une étape attendait d'être validée. Sans campagne commencée,
   une ligne discrète propose d'en choisir une.
   ============================================================ */

export function CampaignChip({ onOpen }: { onOpen: () => void }) {
  const [data, setData] = useState<CampaignData | null>(null);
  useEffect(() => {
    const load = () => api.get("/campaigns").then((r) => setData(r.data)).catch(() => undefined);
    load();
    const t = setInterval(load, 120_000);
    return () => clearInterval(t);
  }, []);
  if (!data) return null;
  const c = data.current;

  if (!c) {
    // une invitation, seulement tant qu'aucune campagne n'a été commencée
    if (data.regions.some((r) => r.started)) return null;
    return (
      <button onClick={onOpen} className="w-full mb-6 border border-dashed border-line rounded-card px-4 py-3 text-left font-body text-[13.5px] text-slate2 hover:border-slate2 hover:text-offwhite transition-colors">
        <span className="text-amber font-medium">Campagnes régionales</span> · huit étapes par région et un titre au bout. Choisir une région →
      </button>
    );
  }

  const step = c.steps[c.step];
  const pct = Math.round((c.progress.current / Math.max(1, c.progress.target)) * 100);
  return (
    <button
      onClick={onOpen}
      className={`w-full mb-6 border rounded-card px-4 py-3 text-left flex flex-wrap items-center gap-x-4 gap-y-2 transition-colors ${c.ready ? "border-rail-green/60 bg-rail-green/[0.05]" : "border-line bg-navy-900/40 hover:border-slate2"}`}
    >
      <span className="font-body text-[12px] text-amber font-medium shrink-0">
        Campagne {c.name} · {c.step + 1}/{c.steps.length}
      </span>
      <span className="font-body text-[13.5px] text-offwhite flex-1 min-w-[12rem]">{step?.title}</span>
      <span className="flex items-center gap-2 shrink-0">
        <span className="w-24 h-1.5 bg-navy-950 border border-line">
          <span className={`block h-full ${c.ready ? "bg-rail-green" : "bg-cobalt"}`} style={{ width: `${pct}%` }} />
        </span>
        <span className="font-mono2 text-[12px] text-slate2 tabular-nums">
          {c.progress.current}/{c.progress.target}
        </span>
        {c.ready && <span className="font-body text-[12.5px] text-rail-green font-medium">Étape à valider · +{step?.reward} pi.</span>}
      </span>
    </button>
  );
}
