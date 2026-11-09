import { useEffect, useRef, useState } from "react";
import { modelLabel, modelSpeed } from "../models";
import { createPortal } from "react-dom";
import { createCabScene } from "./cabScene";
import { companySkinFor } from "./svgSkins";
import { weatherAt, SCENE_KIND } from "../stationWeather";
import { PremiumCTA, PremiumInfo } from "./PremiumCTA";
import { api } from "../api/client";
import { routeStations, routeTimeline, FOREIGN_COUNTRY, CORSICA_STATIONS } from "../geo";
import { useHauntedStation } from "./Halloween";

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
  model: "STANDARD" | "EXPRESS" | "FRET_LOURD" | "COUCHETTES" | "NUIT_EUROPE" | "VAPEUR" | "LUXE" | "CREMAILLERE" | "AUTORAIL_CORSE" | "LOCOTRACTEUR" | "FRET_RAPIDE" | "FRET_ELECTRIQUE" | "TGV";
  status: "IDLE" | "EN_ROUTE" | "MAINTENANCE";
  progress: number;
  wear: number;
  departedAt?: string | null;
  line?: { departureStation: string; arrivalStation: string; durationMinutes?: number; stops?: string[]; electrified?: boolean; doubleTrack?: boolean; id?: string } | null;
  // 1.7
  direction?: number;
  cars?: string[];
  plateStyle?: string | null; // 2.1
}

/* 2.7 : une rame d'une autre compagnie qui partage un tronçon de la ligne */
export interface Rival extends CabTrain {
  companyId: string;
  company: { name: string; liveryColor: string };
}

/* 1.7 : l'itinéraire dans le sens de marche, découpé en tronçons et arrêts,
   à l'échelle de la durée réelle du trajet (modèle, voitures, électrification). */
function tripPlan(t: CabTrain) {
  const duration =
    (t.line?.durationMinutes ?? 10) * 60 * modelSpeed(t.model, (t.line ?? null) as { highSpeedAt?: string | null } | null) * (1 + 0.03 * (t.cars?.length ?? 0)) * (t.line?.electrified ? 0.9 : 1) * (t.line?.doubleTrack ? 0.93 : 1);
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

const CRUISE: Record<string, number> = { STANDARD: 430, EXPRESS: 560, FRET_LOURD: 380, COUCHETTES: 400, NUIT_EUROPE: 470, VAPEUR: 330, LUXE: 400, CREMAILLERE: 300, AUTORAIL_CORSE: 320, LOCOTRACTEUR: 300, FRET_RAPIDE: 470, FRET_ELECTRIQUE: 420, TGV: 720 }; // px/s à l'écran
const KMH: Record<string, number> = { STANDARD: 220, EXPRESS: 300, FRET_LOURD: 160, COUCHETTES: 200, NUIT_EUROPE: 230, VAPEUR: 110, LUXE: 180, CREMAILLERE: 60, AUTORAIL_CORSE: 90, LOCOTRACTEUR: 80, FRET_RAPIDE: 200, FRET_ELECTRIQUE: 160, TGV: 320 };
/* 2.1 : à l'échelle réelle, deux rames qui se croisent passent en une seconde ;
   on ralentit le croisement à l'écran (le moment où les têtes se croisent ne bouge pas) */
const CROSS_SLOW = 0.4;
const RAMP_S = 5; // secondes d'accélération au départ et de freinage à l'arrivée
const FREE_PREVIEW_S = 12;

/* 2.0 : la météo du réseau, telle que la scène la dessine. L'heure est
   à part (parisHour) : il peut neiger de nuit, le brouillard se lever à l'aube. */
function sceneWeather(type: string | undefined) {
  if (type === "BROUILLARD") return "brouillard";
  if (type === "NEIGE") return "neige";
  if (type === "VERGLAS") return "verglas";
  if (type === "CANICULE") return "canicule";
  return "clair";
}

// l'heure de Paris, en heures décimales (14,5 = 14 h 30)
let hourCache = { at: 0, h: 12 };
function parisHour(d = new Date()) {
  if (Math.abs(d.getTime() - hourCache.at) < 20_000) return hourCache.h;
  const p = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const h = Number(p.find((x) => x.type === "hour")?.value ?? 12);
  const m = Number(p.find((x) => x.type === "minute")?.value ?? 0);
  hourCache = { at: d.getTime(), h: h + m / 60 };
  return hourCache.h;
}

function dayPart(h: number) {
  if (h >= 21.6 || h < 5.5) return "Nuit";
  if (h < 7.5) return "Aube";
  if (h >= 19 && h < 21.6) return "Crépuscule";
  return "Jour";
}

// ce que la météo change pour les rames (aligné sur le serveur)
const WEATHER_INFO: Record<string, { label: string; effect: string | null; tone: string }> = {
  clair: { label: "Temps clair", effect: null, tone: "text-offwhite" },
  nuageux: { label: "Nuageux", effect: null, tone: "text-offwhite" },
  pluie: { label: "Pluie", effect: "retards un peu plus fréquents", tone: "text-cobalt" },
  orage: { label: "Orage", effect: "trains ralentis, retards fréquents", tone: "text-amber" },
  neige: { label: "Neige", effect: "trains ralentis, retards plus fréquents", tone: "text-cobalt" },
  verglas: { label: "Verglas", effect: "risque de retard doublé", tone: "text-cobalt" },
  brouillard: { label: "Brouillard", effect: "trains ralentis", tone: "text-slate2" },
  canicule: { label: "Canicule", effect: "usure du matériel ×1,5", tone: "text-amber" },
};
const WEATHER_LABEL: Record<string, string> = Object.fromEntries(Object.entries(WEATHER_INFO).map(([k, v]) => [k, v.label]));

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
  freightSkin = null,
  stationSkin = null,
  others = [],
  yards = [],
  company,
  onClose,
  preview = false,
  companyName,
}: {
  companyName?: string; // 2.7 : pour la légende du mode photo
  stationSkin?: string | null;
  others?: CabTrain[]; // 2.1 : les autres rames de la compagnie, pour les croisements sur double voie
  yards?: string[]; // 2.1 : gares de triage
  train: CabTrain;
  weatherType?: string;
  livery: string;
  skin?: string | null;
  freightSkin?: string | null; // 2.7 : habillage des locomotives de fret
  company: PremiumInfo;
  onClose: () => void;
  preview?: boolean; // aperçu de boutique : ne compte pas pour le succès « En cabine »
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [locked, setLocked] = useState(false);
  const opened = useRef(Date.now());
  /* 2.7 : les rames des autres compagnies sur la ligne, relues toutes les minutes */
  const [rivals, setRivals] = useState<Rival[]>([]);
  useEffect(() => {
    if (preview || !train.line) return;
    let alive = true;
    const load = () =>
      api
        .get(`/trains/${train.id}/rivals`)
        .then(({ data }) => alive && setRivals(data.rivals ?? []))
        .catch(() => undefined);
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [train.id, train.line, preview]);
  const hud = useCabScene(canvasRef, train, { weatherType, livery, skin, freightSkin, premium: company.isPremium, stationSkin, others, yards, rivals }, () => {
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

  /* 2.7 : le mode photo. L'image de la scène, avec une légende en bas (la
     rame, la ligne, la compagnie, l'adresse du jeu), à partager ou à garder. */
  const [shot, setShot] = useState<string | null>(null);
  async function photo() {
    const cv = canvasRef.current;
    if (!cv) return;
    const out = document.createElement("canvas");
    out.width = cv.width;
    out.height = cv.height;
    const c = out.getContext("2d");
    if (!c) return;
    c.drawImage(cv, 0, 0);
    const k = cv.width / 1000;
    const band = 64 * k;
    const g = c.createLinearGradient(0, cv.height - band * 1.6, 0, cv.height);
    g.addColorStop(0, "rgba(11,15,25,0)");
    g.addColorStop(1, "rgba(11,15,25,.85)");
    c.fillStyle = g;
    c.fillRect(0, cv.height - band * 1.6, cv.width, band * 1.6);
    c.fillStyle = "#f3efe6";
    c.textBaseline = "alphabetic";
    c.font = `600 ${22 * k}px Bitter, Georgia, serif`;
    c.fillText(train.name, 24 * k, cv.height - 34 * k);
    c.font = `400 ${14 * k}px 'Work Sans', sans-serif`;
    c.fillStyle = "#c9ccd3";
    c.fillText(`${dep} → ${arr}${companyName ? ` · ${companyName}` : ""}`, 24 * k, cv.height - 14 * k);
    c.textAlign = "right";
    c.fillStyle = "#d39f18";
    c.font = `700 ${13 * k}px 'Space Mono', monospace`;
    c.fillText("RÉSEAU · compagnie.skhost.fr", cv.width - 24 * k, cv.height - 14 * k);
    const blob: Blob | null = await new Promise((r) => out.toBlob(r, "image/png"));
    if (!blob) return;
    const file = new File([blob], `${train.name.replace(/[^\w-]+/g, "-")}.png`, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      nav.share({ files: [file], title: train.name }).catch(() => undefined);
      return;
    }
    setShot(URL.createObjectURL(blob));
  }

  /* Rendue directement dans <body> : la page des trains est animée (transform),
     ce qui décalerait une fenêtre « fixed » placée à l'intérieur. */
  return createPortal(
    <div data-modal className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 px-4" role="dialog" aria-label={`Vue cabine de ${train.name}`}>
      <div className="w-full max-w-5xl bg-navy-900 border border-line border-t-[3px] border-t-cobalt tutorial-step-enter max-h-[94vh] overflow-y-auto rounded-card">
        <div className="px-5 py-3 border-b border-line flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-mono2 text-[10.5px] uppercase tracking-[0.16em] text-cobalt">Vue cabine</span>
          <span className="font-display text-lg leading-tight">{train.name}</span>
          <span className="font-mono2 text-[12px] text-slate2">
            {dep} → {arr}
          </span>
          <button
            onClick={photo}
            className="ml-auto font-mono2 text-[11px] uppercase border border-amber/50 px-2.5 py-1 text-amber hover:bg-amber/10 rounded-control"
            title="Une image de la scène, avec la rame et la ligne, à partager"
          >
            Photo
          </button>
          <button
            onClick={onClose}
            className="font-mono2 text-[11px] uppercase border border-line px-2.5 py-1 text-slate2 hover:text-offwhite rounded-control"
          >
            Fermer
          </button>
        </div>

        <div className="relative bg-black">
          <canvas ref={canvasRef} className="block w-full aspect-[16/7] max-md:aspect-[4/3]" aria-label="La rame en route, de profil" />
          <span className="absolute top-3 left-3 font-mono2 text-[10.5px] uppercase tracking-[0.14em] bg-navy-950/75 border border-line px-2 py-1 text-offwhite rounded-control">
            <span className="text-rail-red">●</span> En direct · {hud.phase}
          </span>
          {/* 2.0 : la météo du réseau n'est plus sur le tableau de bord, elle se vit ici */}
          {hud.wx && (() => {
            const w = WEATHER_INFO[hud.wx.kind] ?? WEATHER_INFO.clair;
            return (
              <span className="absolute top-3 right-3 max-w-[62%] text-right bg-navy-950/75 border border-line px-2.5 py-1.5 font-body rounded-control">
                <span className={`block text-[13px] font-semibold ${w.tone}`}>
                  {w.label} à {hud.wx.place}
                  {hud.wx.temp !== null && <span className="text-offwhite font-normal"> · {hud.wx.temp} °C</span>}
                </span>
                <span className="block text-[11.5px] text-slate2 leading-tight">
                  {dayPart(parisHour())}
                  {w.effect ? ` · ${w.effect}` : ""}
                </span>
                {hud.wx.temp !== null && <span className="block text-[10px] text-slate2/70 leading-tight mt-0.5">Météo réelle : MET Norway</span>}
              </span>
            );
          })()}

          {shot && (
            <div className="absolute inset-0 bg-navy-950/85 flex flex-col items-center justify-center gap-3 p-4">
              <img src={shot} alt="Photo de la vue cabine" className="max-h-[70%] max-w-full border border-line rounded-card" />
              <div className="flex gap-2">
                <a href={shot} download={`${train.name}.png`} className="font-body text-[13px] bg-amber text-onaccent px-3 py-1.5 font-semibold rounded-control">
                  Enregistrer l'image
                </a>
                <button onClick={() => setShot(null)} className="font-body text-[13px] border border-line px-3 py-1.5 text-slate2 hover:text-offwhite rounded-control">
                  Revenir à la vue
                </button>
              </div>
            </div>
          )}
          {/* 2.7 : les rames d'autres compagnies sur le tronçon */}
          {hud.crossing > 0 && !shot && (
            <span className="absolute bottom-3 left-3 font-body text-[11.5px] bg-navy-950/75 border border-line px-2 py-1 text-slate2 rounded-control">
              {hud.crossing} rame{hud.crossing > 1 ? "s" : ""} d'autres compagnies en face sur ce tronçon
            </span>
          )}
          {locked && (
            <div className="absolute inset-0 backdrop-blur-sm bg-navy-950/60 flex items-center justify-center p-4">
              <div className="bg-navy-900 border border-line border-t-[3px] border-t-amber max-w-sm p-5 rounded-card">
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
                className={`absolute top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 border-2 rounded-control ${m.pct <= hud.pct ? "bg-cobalt border-cobalt" : "bg-navy-900 border-slate2"}`}
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

        {/* 2.7 : le tableau de bord — vitesse, prochain arrêt et son heure, terminus, voyageurs, usure */}
        <div className={`grid grid-cols-2 ${hud.next && hud.next !== arr ? "md:grid-cols-5" : "md:grid-cols-4"} gap-px bg-line border-t border-line mt-3`}>
          {(() => {
            const seats = (train as { lastSeats?: number | null }).lastSeats ?? null;
            const pax = (train as { lastPassengers?: number | null }).lastPassengers ?? null;
            const stopsLeft = hud.marks.filter((m) => m.pct > hud.pct).length;
            return [
              { v: String(hud.kmh), l: "km/h", s: modelLabel(train.model), c: "text-offwhite" },
              // le prochain arrêt, seulement s'il y en a un avant le terminus
              ...(hud.next && hud.next !== arr ? [{ v: hud.nextIn, l: `Prochain arrêt : ${hud.next}`, s: hud.nextAt ? `à ${hud.nextAt}` : "", c: "text-offwhite" }] : []),
              {
                v: hud.endAt || hud.left,
                l: `Arrivée à ${arr}`,
                s: `${hud.left === "à quai" ? "à quai" : `dans ${hud.left}`}${stopsLeft ? ` · ${stopsLeft} arrêt${stopsLeft > 1 ? "s" : ""} avant` : ""}`,
                c: "text-offwhite",
              },
              { v: seats ? `${pax ?? 0}` : "—", l: "Voyageurs à bord", s: seats ? `sur ${seats} places` : "après le premier trajet", c: "text-offwhite" },
              { v: `${train.wear} %`, l: "Usure", s: train.wear >= 80 ? "révision conseillée" : "", c: train.wear >= 80 ? "text-rail-red" : train.wear >= 50 ? "text-amber" : "text-rail-green" },
            ].map((c) => (
              <div key={c.l} className="bg-navy-900 px-4 py-3 min-w-0">
                <div className={`font-mono2 text-xl tabular-nums ${c.c}`}>{c.v}</div>
                <div className="text-[10.5px] text-slate2 font-body uppercase tracking-[0.1em] mt-0.5 truncate">{c.l}</div>
                {c.s && <div className="text-[11px] text-slate2/80 font-body mt-0.5 truncate">{c.s}</div>}
              </div>
            ));
          })()}
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
  {
    weatherType,
    livery,
    skin,
    freightSkin = null,
    premium = false,
    stationSkin = null,
    others = [],
    yards = [],
    rivals = [],
  }: { weatherType?: string; livery: string; skin?: string | null; freightSkin?: string | null; premium?: boolean; stationSkin?: string | null; others?: CabTrain[]; yards?: string[]; rivals?: Rival[] },
  onTick?: () => void
) {
  const rivalsRef = useRef(rivals);
  rivalsRef.current = rivals;
  const trainRef = useRef(train);
  trainRef.current = train;
  const othersRef = useRef(others);
  othersRef.current = others;
  const yardsRef = useRef(yards);
  yardsRef.current = yards;
  // 2.2 : Halloween, la gare hantée par le Train fantôme
  const haunted = useHauntedStation();
  const hauntRef = useRef(haunted);
  hauntRef.current = haunted;
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const [hud, setHud] = useState({ kmh: 0, left: "—", phase: "En route", pct: 0, next: "", nextIn: "—", nextAt: "", endAt: "", crossing: 0, marks: [] as { name: string; pct: number }[], wx: null as null | { place: string; kind: string; temp: number | null } });

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

      /* 2.0 : la vraie météo de la ville la plus proche — la gare quittée
         pendant la première moitié du tronçon, la suivante ensuite */
      const segTotal = segElapsed + segLeft;
      const place = dwelling || segTotal <= 0 || segElapsed / segTotal < 0.5 ? ph.from : ph.to;
      const real = weatherAt(place);
      sc.weather = real ? SCENE_KIND[real.kind] ?? "clair" : sceneWeather(weatherType);
      sc.hour = parisHour();
      // 2.0 : une rame de collection garde sa livrée et son allure d'époque
      const her = (t as { heritage?: { skin?: string; livery?: string } | null }).heritage;
      sc.livery = her?.livery ?? livery;
      sc.skin = her?.skin ?? companySkinFor(t.model, skin, freightSkin);
      sc.express = t.model === "EXPRESS";
      sc.sleeper = t.model === "COUCHETTES" || t.model === "NUIT_EUROPE";
      sc.model = t.model;
      sc.cars = t.cars ?? [];
      sc.firstLivery = premium;
      // 2.1 : habillage des gares et plaque nominative (boutique)
      sc.stationSkin = stationSkin;
      const ps = (t as { plateStyle?: string | null }).plateStyle;
      sc.plate = ps ? { style: ps, text: t.name } : null;
      /* 2.1 : double voie — les autres rames de la ligne, en sens inverse, à
         leur vraie position : on calcule l'écart entre les deux têtes, à
         l'échelle de la scène, et on les voit passer sur la voie du fond */
      sc.doubleTrack = !!t.line?.doubleTrack;
      sc.yards = yardsRef.current;
      sc.halloween = hauntRef.current.active;
      sc.haunted = hauntRef.current.station;
      const f = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 0;
      sc.oncoming = sc.doubleTrack
        ? othersRef.current
            .filter((o) => o.id !== t.id && o.status === "EN_ROUTE" && o.line?.id && o.line.id === t.line?.id && (o.direction ?? 0) !== (t.direction ?? 0))
            .map((o) => {
              const p = tripPlan(o);
              const eo = o.departedAt ? (Date.now() - new Date(o.departedAt).getTime()) / 1000 : (o.progress / 100) * p.duration;
              const fo = p.duration > 0 ? Math.min(1, Math.max(0, eo / p.duration)) : 0;
              const oh = (o as { heritage?: { skin?: string; livery?: string } | null }).heritage;
              return { id: o.id, gap: (1 - fo - f) * cruise * duration * CROSS_SLOW, model: o.model, livery: oh?.livery ?? livery, skin: oh?.skin ?? companySkinFor(o.model, skin, freightSkin), cars: o.cars ?? [], v: CRUISE[o.model] ?? 430 };
            })
        : [];
      /* 2.7 : les rames des autres compagnies qui roulent en sens inverse sur
         le même tronçon, croisées sur la voie du fond, avec leur nom. Leur
         position dans le tronçon vient de leur propre horaire. */
      if (!dwelling) {
        const segS = Math.max(1, ph.end - ph.start);
        const fs = Math.min(1, Math.max(0, segElapsed / segS));
        for (const r of rivalsRef.current) {
          if (r.status !== "EN_ROUTE" || !r.line) continue;
          const p = tripPlan(r);
          const er = r.departedAt ? (Date.now() - new Date(r.departedAt).getTime()) / 1000 : (r.progress / 100) * p.duration;
          const rp = p.phases.find((q) => q.kind !== "dwell" && q.from === ph.to && q.to === ph.from && er >= q.start && er < q.end);
          if (!rp) continue;
          const fo = (er - rp.start) / Math.max(1, rp.end - rp.start);
          const rh = (r as { heritage?: { skin?: string; livery?: string } | null }).heritage;
          sc.oncoming.push({
            id: r.id,
            gap: (1 - fo - fs) * cruise * segS * CROSS_SLOW,
            model: r.model,
            livery: rh?.livery ?? r.company.liveryColor,
            skin: rh?.skin ?? null,
            cars: r.cars ?? [],
            v: CRUISE[r.model] ?? 430,
            label: r.company.name,
          });
          if (sc.oncoming.length > 6) break;
        }
      }
      /* 2.1.1 : un tronçon qui passe une frontière a son poste-frontière, à mi-chemin */
      const fFrom = FOREIGN_COUNTRY[ph.from], fTo = FOREIGN_COUNTRY[ph.to];
      if (!dwelling && (fFrom?.code ?? "FR") !== (fTo?.code ?? "FR")) {
        const d0 = rampDistance(segElapsed, cruise), d1 = rampDistance(segLeft, cruise);
        sc.border = { dx: (d0 + d1) / 2 - d0, to: fTo ?? { code: "FR", name: "FRANCE" }, from: fFrom ?? { code: "FR", name: "FRANCE" } };
      } else sc.border = null;
      sc.dep = dwelling ? "" : ph.from;
      sc.arr = ph.to;
      // 2.3 : sur l'île, la mer à l'horizon et le viaduc du Vecchio
      sc.corsica = CORSICA_STATIONS.includes(ph.from) || CORSICA_STATIONS.includes(ph.to);
      sc.depDist = dwelling ? 1e9 : rampDistance(segElapsed, cruise);
      sc.arrDist = rampDistance(segLeft, cruise);
      // vitesse : rampe au départ, freinage à l'arrivée, zéro à quai et en panne
      let v = cruise;
      if (segElapsed < RAMP_S) v = (cruise * segElapsed) / RAMP_S;
      if (segLeft < RAMP_S) v = Math.min(v, (cruise * segLeft) / RAMP_S);
      if (broken || dwelling) v = 0;
      if (sc.weather === "brouillard" || sc.weather === "neige" || sc.weather === "orage") v *= 0.85;
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
        // 2.7 : le prochain arrêt, dans combien de temps et à quelle heure ; l'heure d'arrivée au terminus
        const clock = (sec: number) => new Date(Date.now() + sec * 1000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ");
        const nextSec = dwelling ? Math.max(0, ph.end - elapsed) : segLeft;
        const nextIn = broken ? "—" : nextSec >= 60 ? `${Math.ceil(nextSec / 60)} min` : `${Math.ceil(nextSec)} s`;
        setHud({
          kmh: Math.round((v / cruise) * (KMH[t.model] ?? 220)),
          left,
          phase,
          pct,
          next: dwelling ? ph.from : ph.to,
          nextIn,
          nextAt: broken ? "" : clock(nextSec),
          endAt: broken || leftS <= 0 ? "" : clock(leftS),
          crossing: sc.oncoming.filter((o) => o.label).length,
          marks,
          wx: { place, kind: sc.weather, temp: real ? real.temp : null },
        });
        onTickRef.current?.();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef, weatherType, livery, skin, freightSkin, premium]);

  return hud;
}

export { sceneWeather, WEATHER_LABEL, WEATHER_INFO, parisHour, dayPart };
