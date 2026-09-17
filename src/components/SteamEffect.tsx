import { useEffect, useRef } from "react";

interface Puff {
  x: number;
  y: number;
  r: number;
  alpha: number;
  drift: number;
  speed: number;
}

export function SteamEffect({ size = 40 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let puffs: Puff[] = [];
    let frameId: number;
    let lastSpawn = 0;

    function spawn(time: number) {
      if (time - lastSpawn > 900) {
        lastSpawn = time;
        puffs.push({
          x: size / 2 + (Math.random() - 0.5) * 4,
          y: size - 4,
          r: 2 + Math.random() * 1.5,
          alpha: 0.35,
          drift: (Math.random() - 0.5) * 0.4,
          speed: 0.25 + Math.random() * 0.15,
        });
      }
    }

    function tick(time: number) {
      ctx!.clearRect(0, 0, size, size);
      spawn(time);

      puffs = puffs.filter((p) => p.alpha > 0.01);
      for (const p of puffs) {
        p.y -= p.speed;
        p.x += p.drift;
        p.r += 0.035;
        p.alpha *= 0.985;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(163, 148, 122, ${p.alpha})`;
        ctx!.fill();
      }

      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2"
      aria-hidden="true"
    />
  );
}
