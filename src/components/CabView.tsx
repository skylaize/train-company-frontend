import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createCabScene } from "./cabScene";
import { PremiumCTA, PremiumInfo } from "./PremiumCTA";
import { api } from "../api/client";

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
  model: "STANDARD" | "EXPRESS" | "FRET_LOURD";
  status: "IDLE" | "EN_ROUTE" | "MAINTENANCE";
  progress: number;
  wear: number;
  departedAt?: string | null;
  line?: { departureStation: string; arrivalStation: string; durationMinutes?: number } | null;
}

const CRUISE = { STANDARD: 430, EXPRESS: 560, FRET_LOURD: 380 }; // px/s à l'écran
const KMH = { STANDARD: 220, EXPRESS: 300, FRET_LOURD: 160 };
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
}: {
  train: CabTrain;
  weatherType?: string;
  livery: string;
  skin?: string | null;
  company: PremiumInfo;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trainRef = useRef(train);
  trainRef.current = train;
  const [hud, setHud] = useState({ kmh: 0, left: "—", phase: "En route", pct: 0 });
  const [locked, setLocked] = useState(false);
  const opened = useRef(Date.now());

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
      const duration = (t.line?.durationMinutes ?? 10) * 60 * (t.model === "EXPRESS" ? 0.7 : 1);
      const elapsed = t.departedAt ? (Date.now() - new Date(t.departedAt).getTime()) / 1000 : (t.progress / 100) * duration;
      const leftS = Math.max(0, duration - elapsed);
      const broken = t.status === "MAINTENANCE";

      sc.weather = sceneWeather(weatherType);
      sc.livery = livery;
      sc.skin = skin;
      sc.express = t.model === "EXPRESS";
      sc.dep = t.line?.departureStation ?? "";
      sc.arr = t.line?.arrivalStation ?? "";
      sc.depDist = rampDistance(elapsed, cruise);
      sc.arrDist = rampDistance(leftS, cruise);
      // vitesse : rampe au départ, freinage à l'arrivée, zéro en panne
      let v = cruise;
      if (elapsed < RAMP_S) v = (cruise * elapsed) / RAMP_S;
      if (leftS < RAMP_S) v = Math.min(v, (cruise * leftS) / RAMP_S);
      if (broken) v = 0;
      if (sc.weather === "brouillard") v *= 0.85;
      sc.v = v;
      sc.s += v * dt;

      frame(now / 1000);

      if (now - hudTick > 250) {
        hudTick = now;
        const pct = Math.min(100, Math.max(0, (elapsed / duration) * 100));
        const phase = broken ? "En panne" : leftS <= 0 ? "À quai" : leftS < RAMP_S * 2 ? "Arrivée imminente" : elapsed < RAMP_S * 2 ? "Départ" : "En route";
        const left = broken ? "à l'arrêt" : leftS <= 0 ? "à quai" : leftS >= 60 ? `${Math.ceil(leftS / 60)} min` : `${Math.ceil(leftS)} s`;
        setHud({ kmh: Math.round((v / cruise) * (KMH[t.model] ?? 220)), left, phase, pct });
        if (!company.isPremium && Date.now() - opened.current > FREE_PREVIEW_S * 1000) setLocked(true);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [weatherType, livery, skin, company.isPremium]);

  // première montée à bord : débloque le succès « En cabine » (idempotent côté serveur)
  useEffect(() => {
    api.patch("/company", { seenHint: "cabine" }).catch(() => {});
  }, []);

  // Échap ferme la vue
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dep = train.line?.departureStation ?? "—";
  const arr = train.line?.arrivalStation ?? "—";
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
            <div
              className="absolute top-1/2 w-3 h-3 rounded-full bg-navy-950 border-2 border-cobalt -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${hud.pct}%` }}
            />
          </div>
          <div className="flex justify-between font-mono2 text-[11px] text-slate2 mt-1.5">
            <span>{dep}</span>
            <span>{arr}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border-t border-line mt-3">
          {[
            { v: String(hud.kmh), l: "km/h", c: "text-offwhite" },
            { v: hud.left, l: "Arrivée dans", c: "text-offwhite" },
            { v: train.model === "EXPRESS" ? "Express" : train.model === "FRET_LOURD" ? "Fret lourd" : "Standard", l: "Matériel", c: "text-offwhite" },
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
