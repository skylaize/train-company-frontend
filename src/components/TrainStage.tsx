import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { modelLabel } from "../models";
import { SplitFlap } from "./SplitFlap";
import { playCouple, playChime } from "../sfx";
import { drawConsist, drawTrack } from "./trainArt";
import { WAGON_TYPES, isFreightLoco } from "../freight";

/* ============================================================
   Le quai (2.0) : la rame de profil, en gare, comme dans le reel.

   Deux moments :
   - TrainStage, dans la fenêtre Composition : la voiture qu'on attelle
     arrive en queue de rame, s'accroche (la rame encaisse le choc), son
     étiquette monte au-dessus d'elle et le compteur de places bascule.
   - TrainArrival, juste après l'achat : la rame neuve entre en gare,
     freine et s'arrête devant le panneau.

   La rame est dessinée par trainArt, comme en vue cabine et en boutique.
   ============================================================ */

export type CarKind = "SECONDE" | "PREMIERE" | "BAR";
type Model = "STANDARD" | "EXPRESS" | "FRET_LOURD" | "COUCHETTES" | "NUIT_EUROPE" | "VAPEUR" | "LUXE" | "CREMAILLERE" | "LOCOTRACTEUR" | "FRET_RAPIDE" | "FRET_ELECTRIQUE";

const MODEL_SEATS: Record<string, number> = { STANDARD: 400, EXPRESS: 400, FRET_LOURD: 200, COUCHETTES: 250, NUIT_EUROPE: 200, VAPEUR: 300, LUXE: 120, CREMAILLERE: 220 };
const CAR_SEATS: Record<string, number> = { SECONDE: 100, PREMIERE: 60, BAR: 0 };
export const CAR_TAG: Record<string, string> = {
  SECONDE: "+100 places · 2de classe",
  PREMIERE: "+60 places · 1re classe",
  BAR: "+8 % de recette · voiture-bar",
};
// 2.1 : l'étiquette d'un wagon de fret qui vient s'atteler
for (const w of WAGON_TYPES) CAR_TAG[w.id] = `${w.label} · ${w.cargos.join(", ").toLowerCase()}`;
const TAG_COLOR: Record<string, string> = { SECONDE: "#e2e8f0", PREMIERE: "#f5c869", BAR: "#6ee7b7" };

const COUPLE_MS = 950; // durée de l'approche, jusqu'au choc d'attelage
const TAG_MS = 2200;
const ENTER_MS = 2300;

export function seatsTotal(model: string, cars: string[]) {
  return (MODEL_SEATS[model] ?? 400) + cars.reduce((n, c) => n + (CAR_SEATS[c] ?? 0), 0);
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

/* ---------- le décor du quai ---------- */

function drawQuai(ctx: CanvasRenderingContext2D, W: number, H: number, station: string, base: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, base);
  sky.addColorStop(0, "#86b3d6");
  sky.addColorStop(1, "#cfe2ee");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // collines
  ctx.fillStyle = "#7fa58a";
  ctx.beginPath();
  ctx.moveTo(0, base);
  for (let x = 0; x <= W; x += 10) ctx.lineTo(x, base - H * 0.42 + Math.sin(x * 0.012) * H * 0.06 + Math.sin(x * 0.031 + 1) * H * 0.03);
  ctx.lineTo(W, base);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#5f8f69";
  ctx.beginPath();
  ctx.moveTo(0, base);
  for (let x = 0; x <= W; x += 10) ctx.lineTo(x, base - H * 0.26 + Math.sin(x * 0.02 + 2) * H * 0.04);
  ctx.lineTo(W, base);
  ctx.closePath();
  ctx.fill();
  // caténaire
  ctx.strokeStyle = "#5a6270";
  ctx.lineWidth = 2.5;
  for (const f of [0.08, 0.5, 0.92]) {
    ctx.beginPath();
    ctx.moveTo(W * f, base);
    ctx.lineTo(W * f, base - H * 0.8);
    ctx.lineTo(W * f + 18, base - H * 0.8);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, base - H * 0.76);
  ctx.lineTo(W, base - H * 0.76);
  ctx.stroke();
  // marquise du quai
  ctx.fillStyle = "#334155";
  ctx.fillRect(W * 0.16, base - H * 0.6, W * 0.68, 7);
  for (const f of [0.22, 0.5, 0.78]) ctx.fillRect(W * f - 1.5, base - H * 0.6 + 7, 3, H * 0.6 - 7);
  // panneau de gare
  ctx.font = "700 12px 'Space Mono', monospace";
  const label = station.toUpperCase();
  const half = Math.max(44, ctx.measureText(label).width / 2 + 14);
  const sy = base - H * 0.6 - 30;
  ctx.fillStyle = "#0f2a4a";
  ctx.fillRect(W / 2 - half, sy, half * 2, 22);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.4;
  ctx.strokeRect(W / 2 - half + 2.5, sy + 2.5, half * 2 - 5, 17);
  ctx.fillStyle = "#f1f5f9";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, W / 2, sy + 11.5);
  ctx.fillRect(W / 2 - 1, sy + 22, 2, 8);
  // quai et sol
  ctx.fillStyle = "#4a5a3a";
  ctx.fillRect(0, base, W, H - base);
}

function useCanvas(draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const paint = () => {
      const r = cv.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(r.width * dpr)) {
        cv.width = Math.round(r.width * dpr);
        cv.height = Math.round(r.height * dpr);
      }
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawRef.current(ctx, r.width, r.height);
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(cv);
    (cv as unknown as { __paint: () => void }).__paint = paint;
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/* ---------- la composition, avec l'attelage animé ---------- */

export function TrainStage({
  model,
  cars,
  maxCars,
  livery,
  station,
}: {
  model: Model;
  cars: string[];
  maxCars?: number;
  livery: string;
  station: string;
}) {
  const freight = isFreightLoco(model);
  const prev = useRef(cars);
  const [shown, setShown] = useState(cars); // ce que disent le compteur et l'étiquette « Prête »
  const [forming, setForming] = useState(false);
  const anim = useRef<{ start: number; kind: string } | null>(null);
  const raf = useRef(0);

  const ref = useCanvas(
    (ctx, W, H) => {
      const base = H - 22;
      drawQuai(ctx, W, H, station, base);
      drawTrack(ctx, 0, W, base, 1);
      const now = performance.now();
      const a = anim.current;
      const el = a ? now - a.start : Infinity;
      // la voiture arrive par la gauche, dépasse à peine et s'accroche
      const k = Math.min(1, el / COUPLE_MS);
      const tail = a && el < COUPLE_MS ? -(1 - easeOut(k)) * W * 0.7 : 0;
      // le choc : toute la rame recule d'un souffle, puis revient
      const j = a && el >= COUPLE_MS && el < COUPLE_MS + 360 ? Math.sin(((el - COUPLE_MS) / 360) * Math.PI) * -4 : 0;
      const box = drawConsist(ctx, {
        cx: W / 2 + j,
        base,
        u: 1,
        maxWidth: W - 24,
        model,
        livery,
        cars,
        tailShift: tail,
        s: 30,
      });
      // l'étiquette de la voiture qui vient d'arriver
      if (a && el >= COUPLE_MS && el < COUPLE_MS + TAG_MS && box.pieces[0]) {
        const p = box.pieces[0];
        const t = (el - COUPLE_MS) / TAG_MS;
        const alpha = t < 0.12 ? t / 0.12 : t > 0.8 ? (1 - t) / 0.2 : 1;
        const rise = t < 0.12 ? (1 - t / 0.12) * 8 : t > 0.8 ? -((t - 0.8) / 0.2) * 6 : 0;
        const text = CAR_TAG[a.kind] ?? "";
        ctx.font = "11px 'Space Mono', monospace";
        const w = ctx.measureText(text).width + 16;
        const x = Math.max(4, Math.min(W - w - 4, p.x + p.w / 2 - w / 2));
        const y = box.top - 6 + rise;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = "rgba(11,15,25,0.92)";
        ctx.fillRect(x, y - 11, w, 20);
        ctx.fillStyle = TAG_COLOR[a.kind] ?? "#e2e8f0";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + 8, y - 0.5);
        ctx.globalAlpha = 1;
      }
    },
    [model, livery, station, cars.join(",")]
  );

  useEffect(() => {
    const before = prev.current;
    prev.current = cars;
    if (cars.length > before.length && !reducedMotion()) {
      anim.current = { start: performance.now(), kind: cars[cars.length - 1] };
      setForming(true);
      let coupled = false;
      cancelAnimationFrame(raf.current);
      const loop = () => {
        const el = performance.now() - (anim.current?.start ?? 0);
        if (!coupled && el >= COUPLE_MS) {
          coupled = true;
          setShown(cars);
          setForming(false);
          playCouple();
        }
        (ref.current as unknown as { __paint?: () => void })?.__paint?.();
        if (el < COUPLE_MS + TAG_MS) raf.current = requestAnimationFrame(loop);
        else anim.current = null;
      };
      raf.current = requestAnimationFrame(loop);
    } else {
      setShown(cars);
      setForming(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cars.join(",")]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const seats = seatsTotal(model, shown);

  return (
    <div className="bg-navy-950">
      <canvas
        ref={ref}
        className="block w-full h-[190px]"
        role="img"
        aria-label={freight ? `Composition : ${cars.length} wagon${cars.length > 1 ? "s" : ""} sur ${maxCars ?? cars.length}` : `Composition : ${cars.length} voiture${cars.length > 1 ? "s" : ""} ajoutée${cars.length > 1 ? "s" : ""}, ${seatsTotal(model, cars)} places`}
      />

      {/* le tableau à palettes, sous le quai */}
      <div className="flex items-end justify-between gap-4 px-4 py-3 border-t border-line">
        <div>
          <div className="text-[12px] text-slate2 font-body mb-1.5">{station} · composition</div>
          {freight ? (
            <>
              <SplitFlap value={`${shown.length}/${maxCars ?? shown.length}`} size="md-compact" />
              <div className="text-[12px] text-slate2 font-body mt-1">wagons attelés</div>
            </>
          ) : (
            <>
              <SplitFlap value={String(seats).padStart(3, " ")} size="md-compact" />
              <div className="text-[12px] text-slate2 font-body mt-1">places</div>
            </>
          )}
        </div>
        <div className="text-right">
          <div className={`text-[12px] font-body mb-1.5 flex items-center justify-end gap-1.5 ${forming ? "text-cobalt" : "text-rail-green"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${forming ? "bg-cobalt animate-pulse" : "bg-rail-green"}`} />
            {forming ? "En formation" : "Prête"}
          </div>
          {!freight && (
            <>
              <SplitFlap value={String(shown.length)} size="md-compact" />
              <div className="text-[12px] text-slate2 font-body mt-1">voiture{shown.length > 1 ? "s" : ""} ajoutée{shown.length > 1 ? "s" : ""}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- l'arrivée d'une rame neuve ---------- */

export function TrainArrival({
  name,
  model,
  livery,
  station,
  onCompose,
  onClose,
  skin,
  subtitle,
  kicker,
}: {
  name: string;
  model: Model;
  livery: string;
  station: string;
  skin?: string | null; // 2.0 : rame de collection
  subtitle?: string;
  kicker?: string;
  onCompose?: () => void;
  onClose: () => void;
}) {
  const reduce = reducedMotion();
  const [arrived, setArrived] = useState(reduce);
  const start = useRef(performance.now());
  const smoke = useRef<{ x: number; y: number; r: number; a: number }[]>([]);

  const ref = useCanvas(
    (ctx, W, H) => {
      const base = H - 22;
      drawQuai(ctx, W, H, station, base);
      const el = reduce ? ENTER_MS : performance.now() - start.current;
      const k = Math.min(1, el / ENTER_MS);
      // elle arrive par la gauche, freine, et s'arrête sous le panneau
      const off = -(1 - easeOut(k)) * W * 1.3;
      const travelled = easeOut(k) * W * 1.3;
      drawTrack(ctx, 0, W, base, 1);
      drawConsist(ctx, { cx: W / 2 + off, base, u: 1, maxWidth: W - 24, model, skin, livery, s: travelled, v: (1 - k) * 300, t: el / 1000, smoke: smoke.current });
    },
    [model, livery, station, skin]
  );

  useEffect(() => {
    if (reduce) return;
    let id = 0;
    const loop = () => {
      (ref.current as unknown as { __paint?: () => void })?.__paint?.();
      const el = performance.now() - start.current;
      if (el < ENTER_MS + 1500) id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    const t = window.setTimeout(() => {
      setArrived(true);
      playChime();
    }, ENTER_MS);
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const modelName = modelLabel(model);

  return createPortal(
    <div data-modal className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-navy-900 border border-line overflow-hidden" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${name} entre en gare`}>
        <canvas ref={ref} className="block w-full h-[200px]" />
        <div className="flex items-end justify-between gap-4 px-5 py-4 border-t border-line">
          <div className="min-w-0">
            <div className={`text-[12px] font-body flex items-center gap-1.5 ${arrived ? "text-rail-green" : "text-cobalt"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${arrived ? "bg-rail-green" : "bg-cobalt animate-pulse"}`} />
              {kicker && arrived ? kicker : arrived ? "À quai, prête à partir" : `Entre en gare de ${station}`}
            </div>
            <div className="font-display text-[22px] leading-tight mt-1 truncate">{name}</div>
            <div className="text-[13px] text-slate2 font-body">
              {subtitle ?? (isFreightLoco(model) ? `Locomotive de fret, ${modelName.toLowerCase()}` : `${modelName}, ${MODEL_SEATS[model] ?? 400} places`)}
            </div>
          </div>
          {!isFreightLoco(model) && <SplitFlap value={String(MODEL_SEATS[model] ?? 400)} size="md-compact" />}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          {onCompose && (
            <button onClick={onCompose} className="flex-1 border border-cobalt/50 text-cobalt px-3 py-2 text-[14px] font-body hover:bg-cobalt/10">
              {isFreightLoco(model) ? "Atteler des wagons" : "Ajouter des voitures"}
            </button>
          )}
          <button onClick={onClose} className="flex-1 bg-amber text-onaccent px-3 py-2 text-[14px] font-body font-semibold hover:brightness-110">
            Continuer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
