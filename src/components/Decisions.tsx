import { useEffect, useState } from "react";
import { api } from "../api/client";

/* ============================================================
   Décisions (1.7).

   Les retours : « le jeu n'est pas assez vivant, il manque des décisions ».
   Jusqu'ici tout se réglait une fois pour toutes : une ligne, une rame, et le
   réseau tournait seul. Désormais, de temps en temps, quelque chose arrive
   sur le bureau du directeur : une grève, une fissure sur une rame, un maire
   qui veut sa ligne. Deux ou trois réponses, chacune avec son prix, et une
   limite de temps. Sans réponse, la moins bonne s'applique d'elle-même.
   ============================================================ */

export type EffectTone = "gain" | "cout" | "risque" | "neutre";

export interface DecisionChoice {
  id: string;
  label: string;
  effects: { text: string; tone: EffectTone }[];
  locked?: string | null; // raison si le choix n'est pas possible (trésorerie, grade…)
}

export interface Decision {
  id: string;
  kind: "GREVE" | "FISSURE" | "FESTIVAL" | "MAIRE" | "PRESSE" | "RIVAL" | "METEO" | "VIP" | "OCCASION" | "TOURISME" | "TRAVAUX";
  title: string;
  body: string;
  place?: string | null;
  createdAt: string;
  expiresAt: string;
  defaultChoiceId: string; // appliqué à l'expiration
  choices: DecisionChoice[];
  status: "OUVERTE" | "TRANCHEE" | "EXPIREE";
  chosenId?: string | null;
  outcome?: string | null;
}

const KIND_LABEL: Record<Decision["kind"], string> = {
  GREVE: "Mouvement social",
  FISSURE: "Atelier",
  FESTIVAL: "Affluence",
  MAIRE: "Collectivité",
  PRESSE: "Presse",
  RIVAL: "Concurrence",
  METEO: "Météo",
  VIP: "Voyageur de marque",
  OCCASION: "Matériel",
  TOURISME: "Tourisme",
  TRAVAUX: "Infrastructure",
};

const TONE_CLASS: Record<EffectTone, string> = {
  gain: "text-rail-green border-rail-green/40 bg-rail-green/10",
  cout: "text-amber border-amber/40 bg-amber/10",
  risque: "text-rail-red border-rail-red/40 bg-rail-red/10",
  neutre: "text-slate2 border-line bg-navy-950/40",
};

/* Un pictogramme par famille, dans le trait des autres icônes du jeu. */
export function DecisionGlyph({ kind, size = 22 }: { kind: Decision["kind"]; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<Decision["kind"], JSX.Element> = {
    GREVE: <><path d="M5 20V9l7-5 7 5v11" {...common} /><path d="M9 20v-5h6v5M8 11h8" {...common} /></>,
    FISSURE: <><rect x="3" y="7" width="18" height="10" rx="2" {...common} /><path d="M11 7l-1.5 4 3 1.5L11 17" {...common} /></>,
    FESTIVAL: <><path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18.4 5.6l-2.1 2.1M21 12h-3" {...common} /><circle cx="12" cy="14" r="4" {...common} /><path d="M8 21h8" {...common} /></>,
    MAIRE: <><path d="M4 21h16M6 21V10M18 21V10M10 21v-6h4v6M3 10l9-6 9 6" {...common} /></>,
    PRESSE: <><rect x="4" y="4" width="16" height="16" rx="1.5" {...common} /><path d="M8 8h8M8 12h8M8 16h5" {...common} /></>,
    RIVAL: <><path d="M4 8h12l-3-3M20 16H8l3 3" {...common} /></>,
    METEO: <><circle cx="12" cy="12" r="4" {...common} /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...common} /></>,
    VIP: <><path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.8z" {...common} /></>,
    OCCASION: <><rect x="4" y="6" width="16" height="10" rx="2" {...common} /><path d="M8 20l2-4M16 20l-2-4M8 11h8" {...common} /></>,
    TOURISME: <><path d="M4 20V8l8-4 8 4v12" {...common} /><path d="M9 20v-6h6v6M12 8v2" {...common} /></>,
    TRAVAUX: <><path d="M3 20h18M5 20l7-14 7 14M8.5 13h7" {...common} /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {paths[kind]}
    </svg>
  );
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function remaining(expiresAt: string, now: number) {
  const s = Math.max(0, Math.round((Date.parse(expiresAt) - now) / 1000));
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
  if (s >= 60) return `${Math.floor(s / 60)} min`;
  return `${s} s`;
}

/* La bande en haut de chaque page : discrète, mais impossible à rater. */
export function DecisionBanner({ decisions, onOpen }: { decisions: Decision[]; onOpen: (d: Decision) => void }) {
  const now = useNow();
  const open = decisions.filter((d) => d.status === "OUVERTE");
  if (open.length === 0) return null;
  const first = [...open].sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt))[0];
  const urgent = Date.parse(first.expiresAt) - now < 10 * 60000;
  return (
    <button
      onClick={() => onOpen(first)}
      className="decision-banner w-full text-left flex items-center gap-3 px-4 md:px-6 py-2.5 border-b border-amber/40 bg-amber/[0.08] hover:bg-amber/[0.14] transition-colors"
    >
      <span className="relative flex w-2 h-2 shrink-0">
        <span className="absolute inline-flex w-full h-full rounded-full bg-amber opacity-70 animate-ping" />
        <span className="relative inline-flex w-2 h-2 rounded-full bg-amber" />
      </span>
      <span className="text-amber shrink-0 hidden sm:inline-flex">
        <DecisionGlyph kind={first.kind} size={16} />
      </span>
      <span className="font-mono2 text-[10.5px] uppercase tracking-[0.16em] text-amber shrink-0">
        {open.length > 1 ? `${open.length} décisions` : "Décision"}
      </span>
      <span className="font-body text-[13.5px] text-offwhite truncate">{first.title}</span>
      <span className={`ml-auto shrink-0 font-mono2 text-[11px] ${urgent ? "text-rail-red" : "text-slate2"}`}>
        {remaining(first.expiresAt, now)}
      </span>
      <span className="shrink-0 font-mono2 text-[10.5px] uppercase tracking-wide bg-amber text-onaccent px-2.5 py-1">Trancher</span>
    </button>
  );
}

export function DecisionModal({
  decision,
  onClose,
  onDone,
}: {
  decision: Decision;
  onClose: () => void;
  onDone: () => void;
}) {
  const now = useNow();
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ outcome: string; tone: EffectTone } | null>(
    decision.status !== "OUVERTE" && decision.outcome ? { outcome: decision.outcome, tone: "neutre" } : null
  );
  const [error, setError] = useState<string | null>(null);

  async function choose(choiceId: string) {
    setPicked(choiceId);
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post(`/decisions/${decision.id}/choose`, { choiceId });
      setResult({ outcome: data.outcome, tone: data.tone ?? "neutre" });
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Impossible pour l'instant");
      setPicked(null);
    } finally {
      setBusy(false);
    }
  }

  const left = remaining(decision.expiresAt, now);

  return (
    <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-navy-950/80 px-0 sm:px-4" role="dialog" aria-modal="true" aria-labelledby="decision-title" onClick={onClose}>
      <div
        className="w-full sm:max-w-xl bg-navy-900 border border-line border-t-[3px] border-t-amber tutorial-step-enter max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-line flex items-start gap-4">
          <span className="w-11 h-11 shrink-0 flex items-center justify-center border border-amber/40 bg-amber/10 text-amber">
            <DecisionGlyph kind={decision.kind} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-mono2 text-[10px] uppercase tracking-[0.18em] text-slate2">
              <span className="text-amber">{KIND_LABEL[decision.kind]}</span>
              {decision.place && <span>· {decision.place}</span>}
            </div>
            <h2 id="decision-title" className="font-display text-2xl leading-tight mt-1">{decision.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate2 hover:text-offwhite text-xl leading-none -mt-1" aria-label="Fermer">
            ×
          </button>
        </div>

        <p className="px-6 pt-4 font-body text-[14px] text-slate2 leading-relaxed">{decision.body}</p>

        {result ? (
          <div className="px-6 py-5">
            <div className="border border-line bg-navy-950/40 px-4 py-3.5">
              <div className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-cobalt mb-1">Ce qui s'est passé</div>
              <p className="font-body text-[14px] text-offwhite leading-relaxed">{result.outcome}</p>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={onClose} className="bg-cobalt text-onaccent text-xs font-semibold uppercase tracking-wide px-5 py-2.5 hover:bg-cobalt/90">
                Retour au réseau
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 grid gap-2.5">
              {decision.choices.map((c) => {
                const disabled = busy || !!c.locked;
                return (
                  <button
                    key={c.id}
                    disabled={disabled}
                    onClick={() => choose(c.id)}
                    className={`group text-left border px-4 py-3 transition-colors ${
                      picked === c.id ? "border-amber bg-amber/10" : "border-line hover:border-amber/60 hover:bg-navy-950/50"
                    } disabled:opacity-50 disabled:hover:border-line disabled:hover:bg-transparent`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-body text-[14.5px] text-offwhite">{c.label}</span>
                      {c.id === decision.defaultChoiceId && (
                        <span className="shrink-0 font-mono2 text-[9.5px] uppercase tracking-wide text-slate2">Si vous ne faites rien</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {c.effects.map((e, i) => (
                        <span key={i} className={`font-mono2 text-[10.5px] border px-1.5 py-0.5 ${TONE_CLASS[e.tone]}`}>
                          {e.text}
                        </span>
                      ))}
                    </div>
                    {c.locked && <div className="font-body text-[11.5px] text-rail-red mt-1.5">{c.locked}</div>}
                  </button>
                );
              })}
            </div>
            {error && <p className="px-6 text-rail-red text-sm">{error}</p>}
            <div className="px-6 pb-5 pt-1 flex items-center justify-between font-mono2 text-[11px] text-slate2">
              <span>Réponse attendue dans {left}</span>
              <button onClick={onClose} className="uppercase tracking-wide hover:text-offwhite">Plus tard</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
