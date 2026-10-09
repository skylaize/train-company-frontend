import { useEffect, useRef } from "react";
import { drawConsist, drawTrack } from "./trainArt";

/* ============================================================
   Une rame en image fixe, dessinée par le même dessinateur que la vue
   cabine (trainArt). Sert aux vignettes de la boutique, au catalogue, aux
   extensions : partout où l'on montre une rame sans la faire rouler.
   ============================================================ */

export function TrainPicture({
  model,
  skin,
  livery,
  cars,
  firstLivery,
  track = true,
  lit = false,
  className = "",
  height = 64,
  label,
  align = "center",
  fit = true,
  rust = 0,
  seed = 1,
}: {
  rust?: number; // 2.0 : 0 = rame propre, 1 = épave (rouille, couleurs passées, vitres crevées)
  seed?: number; // place des taches de rouille, stable pour une même épave
  fit?: boolean; // false : la rame garde son échelle et l'image cadre sur la tête (gros plan)
  model?: string;
  skin?: string | null;
  livery: string;
  cars?: string[];
  firstLivery?: boolean;
  track?: boolean;
  lit?: boolean;
  className?: string;
  height?: number;
  label?: string;
  align?: "center" | "right";
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = `${model}|${skin}|${livery}|${(cars ?? []).join(",")}|${firstLivery}|${track}|${lit}|${align}|${fit}|${rust.toFixed(2)}|${seed}`;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const draw = () => {
      const r = cv.getBoundingClientRect();
      if (r.width === 0) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, r.width, r.height);
      // l'échelle : la rame occupe la hauteur donnée, et tient dans la largeur
      const u = r.height / 95;
      const base = r.height - (track ? 6 * u : 2 * u);
      if (track) drawTrack(ctx, 0, r.width, base, u);
      const pad = 6;
      const box = drawConsist(ctx, {
        cx: -10000, base, u, model, skin, livery, cars, firstLivery, lit, s: 30, maxWidth: fit ? r.width - pad * 2 : undefined,
      });
      // premier passage hors champ pour mesurer, puis on centre (ou on cale à droite)
      const w = box.right - box.left;
      ctx.clearRect(0, 0, r.width, r.height);
      if (track) drawTrack(ctx, 0, r.width, base, u);
      const cx = align === "right" ? r.width - pad - w / 2 : r.width / 2;
      if (rust <= 0.01) {
        drawConsist(ctx, { cx, base, u, model, skin, livery, cars, firstLivery, lit, s: 30, maxWidth: fit ? r.width - pad * 2 : undefined });
        return;
      }
      /* l'épave : la rame est dessinée à part, rongée de rouille (uniquement
         là où il y a de la tôle), puis posée sur la voie, couleurs passées */
      const off = document.createElement("canvas");
      off.width = cv.width;
      off.height = cv.height;
      const o = off.getContext("2d");
      if (!o) return;
      o.setTransform(dpr, 0, 0, dpr, 0, 0);
      const b2 = drawConsist(o, { cx, base, u, model, skin, livery, cars, firstLivery, lit: false, s: 30, maxWidth: fit ? r.width - pad * 2 : undefined });
      o.globalCompositeOperation = "source-atop";
      let k = seed * 9301 + 49297;
      const rnd = () => ((k = (k * 9301 + 49297) % 233280) / 233280);
      const spanW = b2.right - b2.left;
      const top = b2.top;
      const hgt = base - top;
      // un voile brun sur toute la tôle
      o.fillStyle = `rgba(92, 52, 26, ${0.35 * rust})`;
      o.fillRect(b2.left, top, spanW, hgt);
      // des plaques de rouille
      const n = Math.round(14 + 40 * rust);
      for (let i = 0; i < n; i++) {
        const x = b2.left + rnd() * spanW;
        const y = top + (0.25 + rnd() * 0.75) * hgt;
        const rad = (4 + rnd() * 14) * u * (0.6 + rust * 0.6);
        const g = o.createRadialGradient(x, y, 0, x, y, rad);
        const tone = ["122, 59, 23", "160, 82, 45", "90, 46, 18", "138, 98, 52"][i % 4];
        g.addColorStop(0, `rgba(${tone}, ${0.9 * rust})`);
        g.addColorStop(0.55, `rgba(${tone}, ${0.75 * rust})`);
        g.addColorStop(1, `rgba(${tone}, 0)`);
        o.fillStyle = g;
        o.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      // coulures sous les fenêtres
      o.fillStyle = `rgba(70, 38, 16, ${0.45 * rust})`;
      for (let i = 0; i < n / 2; i++) {
        const x = b2.left + rnd() * spanW;
        o.fillRect(x, top + hgt * (0.35 + rnd() * 0.2), Math.max(1, 1.4 * u), hgt * (0.15 + rnd() * 0.3));
      }
      o.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.filter = `saturate(${1 - 0.7 * rust}) sepia(${0.35 * rust}) brightness(${1 - 0.22 * rust})`;
      ctx.drawImage(off, 0, 0, r.width, r.height);
      ctx.restore();
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={ref} className={`block w-full ${className}`} style={{ height }} role="img" aria-label={label ?? "Rame"} />;
}
