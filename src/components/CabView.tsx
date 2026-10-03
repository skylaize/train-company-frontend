import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createCabScene } from "./cabScene";
import { PremiumCTA, PremiumInfo } from "./PremiumCTA";
import { api } from "../api/client";
import { routeStations, routeTimeline } from "../geo";

/* ============================================================
   Vue cabine (1.4, Premium).

   La rame choisie, de profil, qui roule en direct : sa vraie position sur la
   ligne (calculée depuis son heure de départ), la météo en cours sur le
   réseau, sa livrée, son modèle et son usure. Une rame en panne reste
   arrêtée en pleine voie.

   Le paysage défile à vitesse de croisière ; ce sont les deux gares qui sont
   placées au bon endroit : la gare d'arrivée apparaît et la rame s'arrête sous
   son panneau exactement quand le trajet se termine dans la simulation.

   Joueur gratuit : quelques secondes de vue, puis l'invitation au Premium.
   ============================================================ */

export interface CabTrain {
  id: string;
  name: string;
  model: "STANDARD" | "EXPRESS" | "FRET_LOURD" | "COUCHETTES";
  status: "IDLE" | "EN_ROUTE" | "MAINTENANCE";
  progress: number;
  wear: number;
  departedAt?: string | null;
  line?: { departureStation: string; arrivalStation: string; durationMinutes?: number; stops?: string[]; electrified?: boolean } | null;
  // 1.7
  direction?: number;
  cars?: string[];
}

/* 1.7 : l'itinéraire dans le sens de marche, découpé en tronçons et arrêts,
   à l'échelle de la durée réelle du trajet (modèle, voitures, électrification). */
function tripPlan(t: CabTrain) {
  const duration =
    (t.line?.durationMinutes ?? 10) * 60 * (t.model === "EXPRESS" ? 0.7 : 1) * (1 + 0.03 * (t.cars?.length ?? 0)) * (t.line?.electrified ? 0.9 : 1);
  const base = t.line ? routeStations(t.line) : [];
  const route = t.direction === 1 ? [...base].reverse() : base;
  const { phases, total } = routeTimeline(route, 0);
  const k = total > 0 ? duration / (total * 60) : 1;
  return {
    duration,
    route,
    phases: phases.map((p) => ({ kind: p.kind, from: p.from, to: p.to, start: p.start * 60 * k, end: p.end * 60 * k })),
  };
}

const CRUISE = { STANDARD: 430, EXPRESS: 560, FRET_LOURD: 380, COUCHETTES: 400 }; // px/s à l'écran
const KMH = { STANDARD: 220, EXPRESS: 300, FRET_LOURD: 160, COUCHETTES: 200 };
const RAMP_S = 5; // secondes d'accélération au départ et de freinage à l'arrivée
const FREE_PREVIEW_S = 12;

function sceneWeather(type: string | undefined) {
  const h = new Date().getHours();
  const night = h >= 21 || h < 6;
  if (type === "BROUILLARD") return "brouillard";
  if (type === "VERGLAS" || type === "NEIGE") return "neige";
  if (type === "CANICULE") return night ? "nuit" : "canicule";
  return night ? "nuit" : "clair";
}

const WEATHER_LABEL: Record<string, string> = {
  clair: "Temps clair",
  nuit: "De nuit",
  brouillard: "Brouillard",
  neige: "Verglas",
  canicule: "Canicule",
};

// distance parcourue (px) après `t` secondes, rampe d'accélération comprise
function rampDistance(t: number, cruise: number) {
  if (t <= 0) return 0;
  return t < RAMP_S ? (cruise * t * t) / (2 * RAMP_S) : cruise * (t - RAMP_S / 2);
}

export function CabView({
  train,
  weatherType,
  livery,
  skin = null,
  company,
  onClose,
  preview = false,
}: {
  train: CabTrain;
  weatherType?: string;
  livery: string;
  skin?: string | null;
  company: PremiumInfo;
  onClose: () => void;
  preview?: boolean; // aperçu de boutique : ne compte pas pour le succès « En cabine »
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [locked, setLocked] = useState(false);
  const opened = useRef(Date.now());
  const hud = useCabScene(canvasRef, train, { weatherType, livery, skin, premium: company.isPremium }, () => {
    if (!company.isPremium && Date.now() - opened.current > FREE_PREVIEW_S * 1000) setLocked(true);
  });

  // première montée à bord : débloque le succès « En cabine » (idempotent côté serveur)
  useEffect(() => {
    if (!preview) api.patch("/company", { seenHint: "cabine" }).catch(() => {});
  }, [preview]);

  // Échap ferme la vue
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const back = train.direction === 1;
  const dep = (back ? train.line?.arrivalStation : train.line?.departureStation) ?? "—";
  const arr = (back ? train.line?.departureStation : train.line?.arrivalStation) ?? "—";
  const broken = train.status === "MAINTENANCE";

  /* Rendue directement dans <body> : la page des trains est animée (transform),
     ce qui décalerait une fenêtre « fixed » placée à l'intérieur. */
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 px-4" role="dialog" aria-label={`Vue cabine de ${train.name}`}>
      <div className="w-full max-w-5xl bg-navy-900 border border-line border-t-[3px] border-t-cobalt tutorial-step-enter max-h-[94vh] overflow-y-auto">
        <div className="px-5 py-3 border-b border-line flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-mono2 text-[10.5px] uppercase tracking-[0.16em] text-cobalt">Vue cabine</span>
          <span className="font-display text-lg leading-tight">{train.name}</span>
          <span className="font-mono2 text-[12px] text-slate2">
            {dep} → {arr}
          </span>
          <button
            onClick={onClose}
            className="ml-auto font-mono2 text-[11px] uppercase border border-line px-2.5 py-1 text-slate2 hover:text-offwhite"
          >
            Fermer
          </button>
        </div>

        <div className="relative bg-black">
          <canvas ref={canvasRef} className="block w-full aspect-[16/7] max-md:aspect-[4/3]" aria-label="La rame en route, de profil" />
          <span className="absolute top-3 left-3 font-mono2 text-[10.5px] uppercase tracking-[0.14em] bg-navy-950/75 border border-line px-2 py-1 text-offwhite">
            <span className={broken ? "text-rail-red" : "text-rail-red"}>●</span> En direct · {hud.phase} · {weatherType === "NEIGE" ? "Neige" : WEATHER_LABEL[sceneWeather(weatherType)]}
          </span>

          {locked && (
            <div className="absolute inset-0 backdrop-blur-sm bg-navy-950/60 flex items-center justify-center p-4">
              <div className="bg-navy-900 border border-line border-t-[3px] border-t-amber max-w-sm p-5">
                <h3 className="font-display text-xl mb-1">La suite est en Premium</h3>
                <p className="text-[13px] text-slate2 font-body mb-4">
                  Suivez chacune de vos rames en direct, du départ à l'arrêt en gare, avec la météo du réseau et votre
                  livrée.
                </p>
                <PremiumCTA company={company} />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pt-3">
          <div className="relative h-1.5 bg-line">
            <div className="absolute inset-y-0 left-0 bg-cobalt" style={{ width: `${hud.pct}%` }} />
            {hud.marks.map((m) => (
              <div
                key={m.name}
                className={`absolute top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 border-2 ${m.pct <= hud.pct ? "bg-cobalt border-cobalt" : "bg-navy-900 border-slate2"}`}
                style={{ left: `${m.pct}%` }}
                title={m.name}
              />
            ))}
            <div
              className="absolute top-1/2 w-3 h-3 rounded-full bg-navy-950 border-2 border-cobalt -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${hud.pct}%` }}
            />
          </div>
          <div className="relative h-4 font-mono2 text-[11px] text-slate2 mt-1.5">
            <span className="absolute left-0">{dep}</span>
            {hud.marks.map((m) => (
              <span key={m.name} className="absolute -translate-x-1/2 hidden sm:inline" style={{ left: `${m.pct}%` }}>{m.name}</span>
            ))}
            <span className="absolute right-0">{arr}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border-t border-line mt-3">
          {[
            { v: String(hud.kmh), l: "km/h", c: "text-offwhite" },
            { v: hud.left, l: hud.marks.length ? `Terminus ${arr} dans` : "Arrivée dans", c: "text-offwhite" },
            { v: train.model === "EXPRESS" ? "Express" : train.model === "FRET_LOURD" ? "Fret lourd" : train.model === "COUCHETTES" ? "Couchettes" : "Standard", l: "Matériel", c: "text-offwhite" },
            { v: `${train.wear} %`, l: "Usure", c: train.wear >= 80 ? "text-rail-red" : train.wear >= 50 ? "text-amber" : "text-rail-green" },
          ].map((c) => (
            <div key={c.l} className="bg-navy-900 px-5 py-3">
              <div className={`font-mono2 text-xl tabular-nums ${c.c}`}>{c.v}</div>
              <div className="text-[10.5px] text-slate2 font-body uppercase tracking-[0.1em] mt-0.5">{c.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* La scène animée, réutilisable (1.6) : la grande vue cabine et la vignette
   « En direct » de la flotte dessinent la même chose, à deux tailles. */
export function useCabScene(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  train: CabTrain,
  { weatherType, livery, skin, premium = false }: { weatherType?: string; livery: string; skin?: string | null; premium?: boolean },
  onTick?: () => void
) {
  const trainRef = useRef(train);
  trainRef.current = train;
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const [hud, setHud] = useState({ kmh: 0, left: "—", phase: "En route", pct: 0, next: "", marks: [] as { name: string; pct: number }[] });

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { sc, frame } = createCabScene(ctx);

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = cv!.getBoundingClientRect();
      sc.W = r.width;
      sc.H = r.height;
      sc.dpr = dpr;
      cv!.width = Math.round(r.width * dpr);
      cv!.height = Math.round(r.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = performance.now();
    let hudTick = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = trainRef.current;
      const cruise = CRUISE[t.model] ?? 430;
      const plan = tripPlan(t);
      const duration = plan.duration;
      const elapsed = t.departedAt ? (Date.now() - new Date(t.departedAt).getTime()) / 1000 : (t.progress / 100) * duration;
      const leftTotal = Math.max(0, duration - elapsed);
      const broken = t.status === "MAINTENANCE";
      // tronçon ou arrêt en cours : la scène ne montre que les deux gares qui l'encadrent
      const ph =
        plan.phases.find((p) => elapsed >= p.start && elapsed < p.end) ??
        (plan.phases.length ? plan.phases[plan.phases.length - 1] : { kind: "run" as const, from: t.line?.departureStation ?? "", to: t.line?.arrivalStation ?? "", start: 0, end: duration });
      const dwelling = ph.kind === "dwell";
      const segElapsed = dwelling ? 0 : elapsed - ph.start;
      const segLeft = dwelling ? 0 : Math.max(0, ph.end - elapsed);

      sc.weather = sceneWeather(weatherType);
      sc.livery = livery;
      sc.skin = skin ?? null;
      sc.express = t.model === "EXPRESS";
      sc.sleeper = t.model === "COUCHETTES";
      sc.cars = t.cars ?? [];
      sc.firstLivery = premium;
      sc.dep = dwelling ? "" : ph.from;
      sc.arr = ph.to;
      sc.depDist = dwelling ? 1e9 : rampDistance(segElapsed, cruise);
      sc.arrDist = rampDistance(segLeft, cruise);
      // vitesse : rampe au départ, freinage à l'arrivée, zéro à quai et en panne
      let v = cruise;
      if (segElapsed < RAMP_S) v = (cruise * segElapsed) / RAMP_S;
      if (segLeft < RAMP_S) v = Math.min(v, (cruise * segLeft) / RAMP_S);
      if (broken || dwelling) v = 0;
      if (sc.weather === "brouillard") v *= 0.85;
      sc.v = v;
      sc.s += v * dt;
      const leftS = leftTotal;

      frame(now / 1000);

      if (now - hudTick > 250) {
        hudTick = now;
        const pct = Math.min(100, Math.max(0, (elapsed / duration) * 100));
        const phase = broken
          ? "En panne"
          : leftS <= 0
          ? "À quai"
          : dwelling
          ? `Arrêt à ${ph.from}`
          : segLeft < RAMP_S * 2
          ? `Arrivée à ${ph.to}`
          : segElapsed < RAMP_S * 2
          ? "Départ"
          : "En route";
        const left = broken ? "à l'arrêt" : leftS <= 0 ? "à quai" : leftS >= 60 ? `${Math.ceil(leftS / 60)} min` : `${Math.ceil(leftS)} s`;
        const marks = plan.phases.filter((p) => p.kind === "dwell").map((p) => ({ name: p.from, pct: (p.start / duration) * 100 }));
        setHud({ kmh: Math.round((v / cruise) * (KMH[t.model] ?? 220)), left, phase, pct, next: dwelling ? ph.from : ph.to, marks });
        onTickRef.current?.();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef, weatherType, livery, skin, premium]);

  return hud;
}

export { sceneWeather, WEATHER_LABEL };
