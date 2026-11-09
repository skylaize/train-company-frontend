import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { REGION_SHAPES } from "./regionsMap";
import { Emblem } from "./Emblem";
import { GridSound, playDonate, playEruption, playGrid, playPowerUp } from "../sfx";

/* ============================================================
   2.7 : l'éruption solaire, côté joueur.

   - EruptionIntro : l'alerte plein écran, à la première ouverture du jeu
     après le début de l'éruption (rejouable depuis la page des sous-stations) ;
   - EruptionMapAnim : sur la carte, l'éruption et les régions qui tombent
     une à une, puis l'état réel ;
   - EruptionSection : la page des sous-stations, avec les points à donner
     et qui a donné quoi ;
   - EruptionCard : la ligne de l'accueil.
   ============================================================ */

export type RegionState = "normal" | "alerte" | "reduite" | "coupee" | "reparee";

export interface EruptionRegion {
  id: string;
  name: string;
  status: RegionState;
  alertAt: string;
  cutAt: string;
  autoAt: string;
  cost: number;
  points: number;
  repairedAt: string | null;
  auto: boolean;
  contributors: { companyId: string; name: string; liveryColor: string; points: number; me: boolean }[];
  contributorsCount: number;
  myPoints: number;
}

export interface EruptionData {
  startsAt: string;
  active: boolean;
  points: number;
  iconShare: number;
  regions: EruptionRegion[];
}

/* ---------------- données partagées ---------------- */

let cache: { at: number; data: EruptionData | null } | null = null;
let inflight: Promise<EruptionData | null> | null = null;
const listeners = new Set<(d: EruptionData | null) => void>();

export async function loadEruption(force = false): Promise<EruptionData | null> {
  if (!force && cache && Date.now() - cache.at < 20_000) return cache.data;
  if (!inflight) {
    inflight = api
      .get("/eruption")
      .then(({ data }) => (data?.eruption ?? null) as EruptionData | null)
      .catch(() => cache?.data ?? null)
      .then((d) => {
        cache = { at: Date.now(), data: d };
        listeners.forEach((l) => l(d));
        return d;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useEruption(refreshMs = 60_000) {
  const [data, setData] = useState<EruptionData | null>(cache?.data ?? null);
  useEffect(() => {
    listeners.add(setData);
    void loadEruption();
    const t = setInterval(() => void loadEruption(), refreshMs);
    return () => {
      listeners.delete(setData);
      clearInterval(t);
    };
  }, [refreshMs]);
  return data;
}

export const eruptionStarted = (d: EruptionData | null) => !!d && Date.parse(d.startsAt) <= Date.now();

/* ---------------- petites aides ---------------- */

const seenKey = (kind: "intro" | "carte", d: EruptionData) => `eruption-${kind}:${d.startsAt}`;
export function eruptionSeen(kind: "intro" | "carte", d: EruptionData) {
  try {
    return localStorage.getItem(seenKey(kind, d)) === "1";
  } catch {
    return true;
  }
}
export function markEruptionSeen(kind: "intro" | "carte", d: EruptionData) {
  try {
    localStorage.setItem(seenKey(kind, d), "1");
  } catch {
    /* rien */
  }
}

function reducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function inTime(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.round((Date.parse(iso) - now) / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}`;
  return `${Math.round(h / 24)} jours`;
}

const STATUS: Record<RegionState, { label: string; pill: string; fill: string; stroke: string }> = {
  normal: { label: "Courant normal", pill: "text-slate2 bg-line/40", fill: "rgb(var(--c-navy-800))", stroke: "rgb(var(--c-line))" },
  alerte: { label: "Pas encore touchée", pill: "text-slate2 bg-line/40", fill: "rgb(var(--c-navy-800))", stroke: "rgb(var(--c-amber) / 0.6)" },
  reduite: { label: "Courant faible", pill: "text-amber bg-amber/[0.12]", fill: "rgb(var(--c-amber) / 0.45)", stroke: "rgb(var(--c-amber))" },
  coupee: { label: "Coupée", pill: "text-rail-red bg-rail-red/[0.12]", fill: "rgb(var(--c-rail-red) / 0.16)", stroke: "rgb(var(--c-rail-red) / 0.85)" },
  reparee: { label: "Réparée", pill: "text-rail-green bg-rail-green/[0.12]", fill: "rgb(var(--c-rail-green) / 0.3)", stroke: "rgb(var(--c-rail-green))" },
};

/* ---------------- la carte des régions ---------------- */

function RegionMap({ states, highlight, className = "" }: { states: Record<string, RegionState>; highlight?: string | null; className?: string }) {
  return (
    <svg viewBox="-50 -8 440 432" className={className} role="img" aria-label="Carte des sous-stations">
      {REGION_SHAPES.map((r) => {
        const st = states[r.id] ?? "normal";
        const s = STATUS[st];
        return (
          <path
            key={r.id}
            d={r.d}
            fill={r.id === "corse" ? "rgb(var(--c-navy-800))" : s.fill}
            stroke={highlight === r.id ? "rgb(var(--c-offwhite))" : s.stroke}
            strokeWidth={highlight === r.id ? 2 : 1}
            style={{ transition: "fill .45s ease, stroke .45s ease" }}
            className={st === "reduite" ? "eruption-flicker" : undefined}
          />
        );
      })}
    </svg>
  );
}

// ce que veut dire chaque état, en clair
const MEANING: Partial<Record<RegionState, string>> = {
  alerte: "l'éruption n'y est pas encore arrivée, le courant passe",
  reduite: "les rames électriques roulent à moitié de leur vitesse, la coupure arrive",
  coupee: "plus de courant : les rames électriques restent à quai, le diesel roule",
  reparee: "la sous-station a tous ses points, tout roule à nouveau",
};

function Legend({ detail = false }: { detail?: boolean }) {
  const keys = ["alerte", "reduite", "coupee", "reparee"] as RegionState[];
  if (detail)
    return (
      <ul className="grid gap-1 text-[12px] font-body text-slate2">
        {keys.map((k) => (
          <li key={k} className="flex items-start gap-1.5">
            <span className="mt-[3px] w-3 h-3 shrink-0 rounded-[2px] border" style={{ background: STATUS[k].fill, borderColor: STATUS[k].stroke }} />
            <span>
              <span className="text-offwhite">{STATUS[k].label}</span> : {MEANING[k]}
            </span>
          </li>
        ))}
      </ul>
    );
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-body text-slate2">
      {keys.map((k) => (
        <span key={k} className="flex items-center gap-1.5" title={MEANING[k]}>
          <span className="w-3 h-3 rounded-[2px] border" style={{ background: STATUS[k].fill, borderColor: STATUS[k].stroke }} />
          {STATUS[k].label}
        </span>
      ))}
    </div>
  );
}

const STYLE = `
@keyframes eruption-flicker { 0%,100%{opacity:1} 45%{opacity:.55} 50%{opacity:.9} 55%{opacity:.4} 60%{opacity:1} }
.eruption-flicker { animation: eruption-flicker 2.6s infinite; }
@keyframes eruption-draw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
@keyframes sun-turn { from { transform: rotate(0deg) } to { transform: rotate(4deg) } }
@keyframes sun-flare { 0% { opacity: 0; transform: scale(.3) } 12% { opacity: 1; transform: scale(1.4) } 40% { opacity: .85; transform: scale(1) } 100% { opacity: .55; transform: scale(1.1) } }
@keyframes sun-loop { 0% { transform: translate(0,0) scale(.5); opacity: 0 } 12% { opacity: 1 } 55% { opacity: 1; transform: translate(-40px,-12px) scale(1.15) } 100% { transform: translate(-190px, -60px) scale(1.6); opacity: 0 } }
@keyframes sun-cme { 0% { transform: scale(1); opacity: 0 } 15% { opacity: .45 } 100% { transform: scale(1.8); opacity: 0 } }
@keyframes flash { 0% { opacity: 0 } 15% { opacity: .22 } 100% { opacity: 0 } }
@keyframes eruption-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
@keyframes eruption-shake { 0%,100%{transform:none} 20%{transform:translate(-2px,1px)} 40%{transform:translate(2px,-1px)} 60%{transform:translate(-1px,-2px)} 80%{transform:translate(1px,2px)} }
@keyframes eruption-blink { 0%,49%{opacity:1} 50%,100%{opacity:.25} }
@media (prefers-reduced-motion: reduce) { .eruption-flicker, .eruption-anim { animation: none !important } }
`;

/* ---------------- l'alerte plein écran ---------------- */


/* Le Soleil, dessiné à plat comme le reste du jeu (pas de texture photo) :
   un bord un peu plus sombre, un groupe de taches, et au moment de
   l'éruption un éclat blanc, une arche de plasma qui se détache du bord et
   l'onde qui part vers la Terre. */
function SunScene({ calm, dim }: { calm: boolean; dim: boolean }) {
  const go = (a: string) => (calm ? undefined : a);
  return (
    <div
      className="absolute pointer-events-none"
      style={{ width: "min(96vmin, 900px)", aspectRatio: "1", right: 0, top: "50%", transform: "translate(52%, -50%)", opacity: dim ? 0.45 : 1, transition: "opacity 1.2s" }}
      aria-hidden
    >
      <svg viewBox="0 0 1000 1000" className="w-full h-full overflow-visible">
        {/* deux halos plats, très discrets */}
        <circle cx="500" cy="500" r="470" fill="#f39a2e" opacity="0.07" />
        <circle cx="500" cy="500" r="432" fill="#f39a2e" opacity="0.1" />
        <g style={{ transformOrigin: "500px 500px", animation: go("sun-turn 20s linear forwards") }}>
          {/* le disque : trois aplats, plus sombre au bord */}
          <circle cx="500" cy="500" r="400" fill="#e8801f" />
          <circle cx="506" cy="500" r="376" fill="#f39b2c" />
          <circle cx="514" cy="500" r="344" fill="#f8b241" />
          {/* le groupe de taches, ombre et pénombre en aplats */}
          {[
            [262, 432, 24, 16],
            [298, 456, 14, 10],
            [246, 470, 9, 7],
          ].map(([x, y, rx, ry], i) => (
            <g key={i}>
              <ellipse cx={x} cy={y} rx={rx * 1.75} ry={ry * 1.75} fill="#c9621a" />
              <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#5a240b" />
            </g>
          ))}
        </g>
        {/* l'éclat de l'éruption : une étoile blanche au-dessus des taches */}
        <g style={{ transformOrigin: "272px 446px", opacity: calm ? 0.9 : 0, animation: go("sun-flare 2.6s 1.8s ease-out forwards") }}>
          <circle cx="272" cy="446" r="40" fill="#fff3d6" opacity="0.55" />
          <path d="M272 386 L284 434 L332 446 L284 458 L272 506 L260 458 L212 446 L260 434 Z" fill="#ffffff" />
        </g>
        {/* l'arche de plasma, posée sur le bord gauche, qui se soulève puis part */}
        <g style={{ transformOrigin: "104px 440px", opacity: 0, animation: go("sun-loop 3.4s 2s cubic-bezier(.3,.1,.3,1) forwards") }}>
          <path d="M112 392 C 34 366, 6 470, 104 486" fill="none" stroke="#f0702a" strokeWidth="18" strokeLinecap="round" />
          <path d="M112 392 C 40 372, 18 466, 104 486" fill="none" stroke="#ffb35c" strokeWidth="7" strokeLinecap="round" />
        </g>
        {/* l'onde qui part vers la Terre */}
        <path
          d="M 260 140 A 430 430 0 0 0 260 860"
          fill="none"
          stroke="#f8b443"
          strokeWidth="4"
          strokeDasharray="2 14"
          strokeLinecap="round"
          style={{ transformOrigin: "500px 500px", opacity: 0, animation: go("sun-cme 2.6s 2.1s ease-out forwards") }}
        />
      </svg>
    </div>
  );
}


export function EruptionIntro({ onClose, onOpenMap }: { onClose: () => void; onOpenMap: () => void }) {
  const calm = reducedMotion();
  const [phase, setPhase] = useState(calm ? 3 : 0);
  useEffect(() => {
    if (calm) return;
    const ts = [setTimeout(() => setPhase(1), 2400), setTimeout(() => setPhase(2), 3600), setTimeout(() => setPhase(3), 4600)];
    return () => ts.forEach(clearTimeout);
  }, [calm]);
  // les sons du poste électrique, coupés dès qu'on passe ou ferme
  useEffect(() => playEruption(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div role="alertdialog" aria-modal="true" aria-label="Urgence : défaillance électrique sur le réseau" className="fixed inset-0 z-[95] overflow-hidden bg-[#06080d] text-offwhite">
      <style>{STYLE}</style>
      {/* le Soleil, en bord d'écran : l'éruption part d'un groupe de taches */}
      <SunScene calm={calm} dim={phase >= 2} />
      {!calm && <div className="absolute inset-0 bg-[#fff4d6] pointer-events-none" style={{ opacity: 0, animation: "flash .9s 1.9s ease-out" }} />}
      {/* la France qui s'éteint */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg
          viewBox="-50 -8 440 432"
          style={{ width: "min(70vw, 560px)", height: "auto", opacity: phase >= 1 ? 0.35 : 0.9, transition: "opacity 1.2s", animation: phase === 1 && !calm ? "eruption-shake .35s 3" : undefined }}
          aria-hidden
        >
          {REGION_SHAPES.filter((r) => r.id !== "corse").map((r, i) => (
            <path
              key={r.id}
              d={r.d}
              fill={phase >= 1 ? "rgb(18 20 28)" : "rgb(var(--c-amber) / 0.35)"}
              stroke="rgb(var(--c-amber) / 0.7)"
              strokeWidth="1"
              style={{ transition: `fill .3s ${calm ? 0 : i * 0.07}s` }}
            />
          ))}
        </svg>
      </div>

      <button onClick={onClose} className="absolute top-4 right-4 z-10 font-body text-[13px] text-offwhite/80 hover:text-offwhite border border-offwhite/25 hover:border-offwhite/60 px-3 py-1.5 rounded-control bg-black/30">
        Passer
      </button>

      {phase >= 2 && (
        <div className="absolute inset-x-0 top-[12vh] flex justify-center px-4 z-10" style={{ animation: calm ? undefined : "eruption-in .4s ease-out" }}>
          <div className="flex items-center gap-3 border border-rail-red/60 bg-rail-red/15 px-4 py-2 font-mono2 text-[13px] tracking-[0.2em] uppercase text-[#ff9a8a]">
            <span className="w-2.5 h-2.5 rounded-full bg-rail-red" style={{ animation: calm ? undefined : "eruption-blink 1s infinite" }} />
            Urgence · régulation nationale
          </div>
        </div>
      )}

      {phase >= 3 && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center px-4 pb-[8vh]" style={{ animation: calm ? undefined : "eruption-in .5s ease-out" }}>
          <div className="w-full max-w-[560px] bg-[#0b0f19]/92 border border-line border-t-[3px] border-t-rail-red rounded-card px-6 py-5 shadow-2xl">
            <h1 className="font-display text-[26px] sm:text-[30px] leading-tight">Défaillance électrique sur le réseau</h1>
            <p className="font-body text-[14px] text-slate2 mt-2">
              Une éruption solaire a grillé les sous-stations. Les régions vont tomber une à une : les rames électriques ralentissent, puis restent à quai. Le diesel et la vapeur roulent.
            </p>
            <p className="font-body text-[14px] text-offwhite mt-2">
              Livrez du matériel électrique : chaque conteneur donne un point pour réparer la sous-station de votre choix.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <button onClick={onOpenMap} className="sm:flex-1 h-11 rounded-md bg-amber text-onaccent font-semibold text-[13.5px] hover:bg-amber/90">
                Voir la carte des pannes
              </button>
              <button onClick={onClose} className="sm:flex-1 h-11 rounded-md border border-line text-offwhite font-body text-[14px] hover:border-slate2">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

/* ---------------- l'animation de la carte ---------------- */

/* Le déroulé, en millisecondes : la cascade sur les régions déjà touchées
   (dans l'ordre réel), puis les régions réparées qui se rallument une à une.
   Chaque changement a son son : courant faible, coupure, réparation. */
const CASCADE_START = 700;
const CASCADE_STEP = 420;
const REPAIR_GAP = 450;
const REPAIR_STEP = 650;

type Beat = { at: number; region: string; state: RegionState; sound?: GridSound["kind"] };

function timeline(data: EruptionData): Beat[] {
  const touched = data.regions.filter((r) => r.status !== "alerte" && r.status !== "normal");
  const beats: Beat[] = [];
  touched.forEach((r, i) => {
    const at = CASCADE_START + (i + 1) * CASCADE_STEP;
    beats.push({ at, region: r.id, state: "reduite", sound: "faible" });
    // la coupure arrive avec la région suivante, sauf si la région en est encore au courant faible
    if (r.status !== "reduite") beats.push({ at: at + CASCADE_STEP, region: r.id, state: "coupee", sound: "coupure" });
  });
  const afterCascade = CASCADE_START + (touched.length + 1) * CASCADE_STEP + REPAIR_GAP;
  touched
    .filter((r) => r.status === "reparee")
    .forEach((r, j) => beats.push({ at: afterCascade + j * REPAIR_STEP, region: r.id, state: "reparee", sound: "reparee" }));
  return beats.sort((x, y) => x.at - y.at);
}

export function EruptionMapAnim({ data, onClose, onOpenStations }: { data: EruptionData; onClose: () => void; onOpenStations: () => void }) {
  const calm = reducedMotion();
  const beats = useMemo(() => timeline(data), [data]);
  const end = beats.length ? beats[beats.length - 1].at + 300 : 0;
  const [elapsed, setElapsed] = useState(calm ? Infinity : -1);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (calm) return;
    setElapsed(-1);
    // le son suit l'animation, planifié d'un coup
    const stopSound = playGrid([{ t: 0, kind: "grondement" }, ...beats.filter((b) => b.sound).map((b) => ({ t: b.at / 1000, kind: b.sound! }))]);
    const ts = beats.map((b) => setTimeout(() => setElapsed(b.at), b.at));
    ts.push(setTimeout(() => setElapsed(end), end));
    return () => {
      ts.forEach(clearTimeout);
      stopSound();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, calm, beats]);

  const done = elapsed >= end;
  const states = useMemo(() => {
    const out: Record<string, RegionState> = {};
    for (const r of data.regions) out[r.id] = done ? r.status : "normal";
    if (!done) for (const b of beats) if (b.at <= elapsed) out[b.region] = b.state;
    return out;
  }, [elapsed, done, data, beats]);
  // la dernière région qui a changé, pour l'encadré
  const last = !done ? [...beats].reverse().find((b) => b.at <= elapsed) : undefined;
  const current = last ? { ...data.regions.find((r) => r.id === last.region)!, shown: last.state } : null;
  const counts = data.regions.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {} as Record<string, number>);

  return (
    <div className="relative mb-6 border border-line rounded-card overflow-hidden bg-[#06080d]">
      <style>{STYLE}</style>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-line bg-navy-900">
        <span className="font-mono2 text-[12px] tracking-[0.18em] uppercase text-amber">Éruption solaire · état du réseau</span>
        <button onClick={onClose} className="text-slate2 hover:text-offwhite text-lg leading-none px-1" aria-label="Fermer">
          ×
        </button>
      </div>
      {/* 2.7.1 : la carte à gauche, à sa taille ; le texte prend le reste de la largeur.
          Avant, la carte flottait au milieu d'un grand cadre noir sur les écrans larges. */}
      <div className="grid md:grid-cols-[380px_1fr]">
        <div className="flex items-center justify-center p-3 md:border-r border-line">
          <RegionMap states={states} highlight={current?.id ?? null} className="w-full h-auto max-h-[340px]" />
        </div>
        <div className="border-t md:border-t-0 border-line p-5 flex flex-col gap-4 min-w-0">
          <div className="min-h-[64px]">
            {current ? (
              <div key={current.id + current.shown} style={{ animation: "eruption-in .25s ease-out" }}>
                <div className={`font-body text-[12.5px] ${current.shown === "reparee" ? "text-rail-green" : current.shown === "coupee" ? "text-[#ff9a8a]" : "text-amber"}`}>
                  {current.shown === "reparee" ? "Courant rétabli" : current.shown === "coupee" ? "Coupure" : "Courant faible"}
                </div>
                <div className="font-display text-[24px] leading-tight mt-0.5">{current.name}</div>
              </div>
            ) : done ? (
              <div style={{ animation: calm ? undefined : "eruption-in .3s ease-out" }}>
                <div className="font-display text-[22px] leading-tight">En ce moment</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["coupee", "reduite", "alerte", "reparee", "normal"] as RegionState[])
                    .filter((k) => counts[k])
                    .map((k) => (
                      <span key={k} className="inline-flex items-center gap-2 border border-line rounded-control px-2.5 py-1 font-body text-[13px]">
                        <span className="w-2.5 h-2.5 rounded-[2px] border" style={{ background: STATUS[k].fill, borderColor: STATUS[k].stroke }} />
                        <span className="text-slate2">{STATUS[k].label}</span>
                        <span className="font-mono2 text-offwhite">{counts[k]}</span>
                      </span>
                    ))}
                </div>
              </div>
            ) : (
              <div className="font-body text-[14px] text-slate2">L'éruption atteint le réseau…</div>
            )}
          </div>
          <Legend detail />
          <div className="flex flex-wrap gap-2">
            <button onClick={onOpenStations} className="text-[13px] font-body bg-amber text-onaccent px-3 py-1.5 font-semibold rounded-control">
              Réparer les sous-stations
            </button>
            <button onClick={() => setRun((n) => n + 1)} className="text-[13px] font-body border border-line px-3 py-1.5 rounded-control text-slate2 hover:text-offwhite">
              Rejouer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- la page des sous-stations ---------------- */

function RegionCard({ r, points, iconShare, onGive }: { r: EruptionRegion; points: number; iconShare: number; onGive: (region: string, n: number) => Promise<void> }) {
  const missing = Math.max(0, r.cost - r.points);
  const [n, setN] = useState(1);
  const [busy, setBusy] = useState(false);
  const iconAt = Math.ceil(r.cost * iconShare);
  const pct = r.cost ? Math.min(100, Math.round((r.points / r.cost) * 100)) : 0;
  const canGive = (r.status === "reduite" || r.status === "coupee") && points > 0 && missing > 0;
  const max = Math.min(points, missing);
  useEffect(() => setN((x) => Math.max(1, Math.min(x, max || 1))), [max]);

  return (
    <div className={`border rounded-card p-4 ${r.status === "coupee" ? "border-rail-red/40 bg-rail-red/[0.03]" : r.status === "reduite" ? "border-amber/40" : "border-line"} bg-navy-900/40`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-[17px] leading-tight">{r.name}</div>
          <div className="font-body text-[12px] text-slate2 mt-0.5">
            {r.status === "alerte" && `Touchée dans ${inTime(r.alertAt)}`}
            {r.status === "reduite" && `Coupure dans ${inTime(r.cutAt)}`}
            {r.status === "coupee" && `Réparation automatique dans ${inTime(r.autoAt)} si personne ne s'en charge`}
            {r.status === "reparee" && (r.auto ? "Réparée par les équipes d'astreinte" : `Réparée par ${r.contributorsCount} compagnie${r.contributorsCount > 1 ? "s" : ""}`)}
          </div>
        </div>
        <span className={`shrink-0 text-[11.5px] font-body rounded-full px-2 py-0.5 ${STATUS[r.status].pill}`}>{STATUS[r.status].label}</span>
      </div>

      <div className="mt-3">
        <div className="flex justify-between font-body text-[12px] text-slate2 mb-1">
          <span>Réparation</span>
          <span className="font-mono2 tabular-nums">
            {r.points} / {r.cost} points
          </span>
        </div>
        <div className="h-2 bg-navy-950 border border-line overflow-hidden">
          <div className={`h-full ${r.status === "reparee" ? "bg-rail-green" : "bg-amber"}`} style={{ width: `${r.status === "reparee" ? 100 : pct}%`, transition: "width .6s" }} />
        </div>
      </div>

      {r.myPoints > 0 && (
        <div className="mt-2 flex items-center gap-1.5 font-body text-[12.5px] text-amber">
          {r.myPoints >= iconAt && <Emblem id="pylone" size={14} />}
          Vous : {r.myPoints} point{r.myPoints > 1 ? "s" : ""}
          <span className="text-slate2">
            {r.myPoints >= iconAt ? " · icône gagnée" : ` · encore ${iconAt - r.myPoints} pour l'icône`}
          </span>
        </div>
      )}

      {canGive && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={max}
            value={n}
            onChange={(e) => setN(Math.max(1, Math.min(max, Math.floor(Number(e.target.value) || 1))))}
            className="w-20 h-9 bg-navy-950 border border-line rounded-control px-2 font-mono2 text-[14px] text-offwhite focus:outline-none focus:border-amber"
            aria-label={`Points à donner à ${r.name}`}
          />
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onGive(r.id, n);
              setBusy(false);
            }}
            className="h-9 px-3 rounded-control bg-amber text-onaccent font-semibold text-[13px] disabled:opacity-50"
          >
            {busy ? "…" : "Donner"}
          </button>
          {max > 1 && (
            <button onClick={() => setN(max)} className="text-[12px] font-body text-slate2 hover:text-offwhite underline underline-offset-2">
              tout ({max})
            </button>
          )}
        </div>
      )}

      {r.contributors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-line">
          <div className="font-body text-[11.5px] text-slate2 mb-1.5">Ils ont mis la main à la pâte</div>
          <ul className="space-y-1">
            {r.contributors.slice(0, 5).map((c) => (
              <li key={c.companyId} className={`flex items-center gap-2 font-body text-[13px] ${c.me ? "text-amber" : "text-offwhite"}`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.liveryColor }} />
                <span className="truncate flex-1">{c.name}</span>
                <span className="font-mono2 tabular-nums text-slate2">{c.points}</span>
              </li>
            ))}
          </ul>
          {r.contributorsCount > 5 && <div className="font-body text-[12px] text-slate2 mt-1">et {r.contributorsCount - 5} autre{r.contributorsCount - 5 > 1 ? "s" : ""}</div>}
        </div>
      )}
    </div>
  );
}

const RANK: Record<RegionState, number> = { coupee: 0, reduite: 1, alerte: 2, normal: 3, reparee: 4 };

export function EruptionSection({ onReplayIntro, onReplayMap, onOpenFreight }: { onReplayIntro: () => void; onReplayMap: () => void; onOpenFreight: () => void }) {
  const data = useEruption(30_000);
  const { showToast } = useToast();
  if (!data) return <div className="h-60 bg-navy-900/40 animate-skeleton rounded-card" />;
  const states = Object.fromEntries(data.regions.map((r) => [r.id, r.status])) as Record<string, RegionState>;
  const sorted = [...data.regions].sort((a, b) => RANK[a.status] - RANK[b.status] || b.points / Math.max(1, b.cost) - a.points / Math.max(1, a.cost));
  const repaired = data.regions.filter((r) => r.status === "reparee").length;

  async function give(region: string, n: number) {
    try {
      const { data: r } = await api.post(`/eruption/${region}/repair`, { points: n });
      // un cliquet pour le don, le transformateur qui repart si c'était le dernier point
      if (r.repaired) playPowerUp();
      else playDonate();
      const name = data!.regions.find((x) => x.id === region)?.name ?? region;
      showToast(r.repaired ? `Courant rétabli en ${name} !` : `${r.given} point${r.given > 1 ? "s" : ""} pour ${name}`, "success");
      if (r.icon) showToast("Icône électrique débloquée : elle vous attend dans les Paramètres", "success");
      await loadEruption(true);
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Une erreur est survenue", "error");
    }
  }

  return (
    <div>
      <style>{STYLE}</style>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px] mb-6">
        <div className="border border-line rounded-card bg-[#06080d] p-3">
          <RegionMap states={states} className="w-full h-auto max-h-[420px]" />
          <div className="px-2 pb-1">
            <Legend detail />
          </div>
        </div>
        <div className="space-y-3">
          <div className="border border-amber/40 bg-amber/[0.05] rounded-card p-4">
            <div className="font-body text-[12px] text-slate2">Vos points de réparation</div>
            <div className="font-mono2 text-4xl text-amber tabular-nums mt-1">{data.points}</div>
            <p className="font-body text-[12.5px] text-slate2 mt-2">
              Un point par conteneur de matériel électrique livré. Ils se trouvent au marché du fret et voyagent sur un wagon porte-conteneurs.
            </p>
            <button onClick={onOpenFreight} className="mt-3 text-[12.5px] font-body border border-amber/50 text-amber px-3 py-1.5 rounded-control hover:bg-amber/10">
              Aller au fret
            </button>
          </div>
          {/* 2.7 : quelles rames sont touchées */}
          <div className="border border-line rounded-card p-4 font-body text-[13px] text-slate2 space-y-1.5">
            <div className="text-offwhite">Quelles rames sont touchées ?</div>
            <p>
              <span className="text-amber">Électriques</span> : toute rame sur une ligne électrifiée, le TGV, et la locomotive de fret « Électrique longue distance ».
            </p>
            <p>
              <span className="text-offwhite">Diesel ou vapeur</span>, elles roulent : les rames sur une ligne non électrifiée, la vapeur, la Micheline, le locotracteur, le fret lourd et la messagerie rapide.
            </p>
            <p>La Flotte indique pour chaque rame si elle est électrique ou diesel.</p>
          </div>
          <div className="border border-line rounded-card p-4 font-body text-[13px] text-slate2 space-y-2">
            <div className="flex items-center gap-2 text-offwhite">
              <Emblem id="pylone" size={16} className="text-amber" />
              Icône électrique
            </div>
            <p>Apportez au moins {Math.round(data.iconShare * 100)} % des points d'une sous-station, n'importe laquelle, pour débloquer l'icône pour votre profil.</p>
            <p>
              {repaired} sous-station{repaired > 1 ? "s" : ""} réparée{repaired > 1 ? "s" : ""} sur {data.regions.length}.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button onClick={onReplayIntro} className="text-cobalt hover:underline">
                Revoir l'alerte
              </button>
              <button onClick={onReplayMap} className="text-cobalt hover:underline">
                Revoir la carte
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((r) => (
          <RegionCard key={r.id} r={r} points={data.points} iconShare={data.iconShare} onGive={give} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- la ligne de l'accueil ---------------- */

export function EruptionCard({ onOpen }: { onOpen: () => void }) {
  const data = useEruption();
  if (!data || !eruptionStarted(data)) return null;
  const cut = data.regions.filter((r) => r.status === "coupee").length;
  const low = data.regions.filter((r) => r.status === "reduite").length;
  const fixed = data.regions.filter((r) => r.status === "reparee").length;
  const total = data.regions.length;
  if (fixed === total) return null;
  return (
    <button onClick={onOpen} className="w-full mb-6 border border-rail-red/40 bg-rail-red/[0.04] rounded-card px-4 py-3 text-left flex flex-wrap items-center gap-x-4 gap-y-2 hover:border-rail-red/70 transition-colors">
      <span className="font-body text-[12px] text-[#ff9a8a] font-medium shrink-0">☀️ Éruption solaire</span>
      <span className="font-body text-[13.5px] text-offwhite flex-1 min-w-[12rem]">
        {cut ? `${cut} région${cut > 1 ? "s" : ""} sans courant` : "Le réseau tient encore"}
        {low ? `, ${low} au courant faible` : ""}
        {fixed ? ` · ${fixed} réparée${fixed > 1 ? "s" : ""}` : ""}
      </span>
      <span className="font-body text-[12.5px] text-amber shrink-0">
        {data.points ? `${data.points} point${data.points > 1 ? "s" : ""} à donner →` : "Réparer les sous-stations →"}
      </span>
    </button>
  );
}
