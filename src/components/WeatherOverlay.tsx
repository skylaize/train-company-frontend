import { useEffect, useRef, useState } from "react";
import { createWeatherFx } from "./weatherFx";

/* Météo à l'écran : une toile animée au-dessus du tableau de bord (voir
   weatherFx). Chaque épisode apparaît en fondu, et disparaît en fondu avant
   que le suivant ne commence. */

const KINDS = ["NEIGE", "BROUILLARD", "VERGLAS", "CANICULE"] as const;
type Kind = (typeof KINDS)[number];
const valid = (t?: string): Kind | null => (KINDS as readonly string[]).includes(t ?? "") ? (t as Kind) : null;

const FADE_S = 2.5;

export function WeatherOverlay({ type }: { type?: string }) {
  const [kind, setKind] = useState<Kind | null>(valid(type));
  const wanted = useRef<Kind | null>(valid(type));
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // un changement de météo : l'effet en cours s'efface d'abord (la boucle s'en charge)
  useEffect(() => {
    wanted.current = valid(type);
    if (!kind && wanted.current) setKind(wanted.current);
  }, [type, kind]);

  useEffect(() => {
    if (!kind) return;
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const fx = createWeatherFx(ctx, kind);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const w = window.innerWidth, h = window.innerHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fx.resize(w, h, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = performance.now();
    let k = reduce ? 1 : 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = wanted.current === kind ? 1 : 0;
      k = reduce ? target : Math.max(0, Math.min(1, k + (target ? dt : -dt) / FADE_S));
      const light = document.documentElement.dataset.theme === "papier";
      fx.frame(reduce ? 0 : dt, now / 1000, k, light);
      if (target === 0 && k <= 0) {
        // effacé : on passe à la météo suivante, ou à rien
        setKind(wanted.current);
        return;
      }
      // mouvement réduit : une image fixe suffit, on ne relance que pour suivre un changement
      raf = reduce ? window.setTimeout(() => loop(performance.now()), 1000) as unknown as number : requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(raf);
      window.removeEventListener("resize", resize);
    };
  }, [kind]);

  if (!kind) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 z-40 pointer-events-none w-full h-full" aria-hidden="true" />;
}
