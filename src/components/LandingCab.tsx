import { useEffect, useRef, useState } from "react";
import { createCabScene } from "./cabScene";

/* ============================================================
   Vue cabine en vitrine : la vraie scène du jeu, qui tourne en boucle sur
   quelques liaisons, avec la météo qui change à chaque trajet. Elle ne
   s'anime que lorsqu'elle est à l'écran.
   ============================================================ */

const TRIPS = [
  { dep: "Paris", arr: "Lyon", weather: "clair", livery: "#1f5c4d", express: true },
  { dep: "Lyon", arr: "Marseille", weather: "canicule", livery: "#1f5c4d", express: true },
  { dep: "Marseille", arr: "Nice", weather: "nuit", livery: "#1f5c4d", express: false },
  { dep: "Lille", arr: "Paris", weather: "brouillard", livery: "#6b1f2a", express: false },
  { dep: "Grenoble", arr: "Lyon", weather: "neige", livery: "#1d4e89", express: false },
];

const LABEL: Record<string, string> = {
  clair: "Temps clair",
  canicule: "Canicule",
  nuit: "De nuit",
  brouillard: "Brouillard",
  neige: "Verglas",
};

const TRIP_S = 26; // durée d'un trajet de démonstration
const DWELL_S = 3; // arrêt en gare avant le trajet suivant
const RAMP_S = 5;

function rampDistance(t: number, cruise: number) {
  if (t <= 0) return 0;
  return t < RAMP_S ? (cruise * t * t) / (2 * RAMP_S) : cruise * (t - RAMP_S / 2);
}

export function LandingCab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({ trip: 0, kmh: 0, left: "" });

  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const { sc, frame } = createCabScene(ctx);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    let visible = false;
    let last = performance.now();
    let clock = reduce ? 10 : 0; // secondes écoulées dans la démonstration
    let hudTick = 0;

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduce) clock += dt;

      const cycle = TRIP_S + DWELL_S;
      const index = Math.floor(clock / cycle) % TRIPS.length;
      const trip = TRIPS[index];
      const elapsed = Math.min(TRIP_S, clock % cycle);
      const left = Math.max(0, TRIP_S - elapsed);
      const cruise = trip.express ? 560 : 430;

      sc.weather = trip.weather;
      sc.livery = trip.livery;
      sc.express = trip.express;
      sc.skin = null;
      sc.dep = trip.dep;
      sc.arr = trip.arr;
      sc.depDist = rampDistance(elapsed, cruise);
      sc.arrDist = rampDistance(left, cruise);
      let v = cruise;
      if (elapsed < RAMP_S) v = (cruise * elapsed) / RAMP_S;
      if (left < RAMP_S) v = Math.min(v, (cruise * left) / RAMP_S);
      if (trip.weather === "brouillard") v *= 0.85;
      sc.v = v;
      sc.s += v * dt;
      frame(now / 1000);

      if (now - hudTick > 250) {
        hudTick = now;
        const top = trip.express ? 300 : 220;
        setHud({ trip: index, kmh: Math.round((v / cruise) * top), left: left <= 0 ? "à quai" : `${Math.ceil(left)} s` });
      }
      if (visible && !reduce) raf = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      last = performance.now();
      if (visible) raf = requestAnimationFrame(step);
    });
    io.observe(cv);
    // une première image tout de suite : la scène n'est jamais vide
    step(performance.now());

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const trip = TRIPS[hud.trip];
  return (
    <figure className="lp-cab">
      <div className="lp-cab-win">
        <canvas ref={canvasRef} aria-label={`Une rame en route de ${trip.dep} à ${trip.arr}`} />
        <span className="lp-cab-live"><i />Vue cabine</span>
      </div>
      <figcaption className="lp-cab-hud">
        <span className="trip">{trip.dep} → {trip.arr}</span>
        <span><b>{hud.kmh}</b> km/h</span>
        <span>Arrivée <b>{hud.left}</b></span>
        <span className="wx">{LABEL[trip.weather]}</span>
      </figcaption>
    </figure>
  );
}
