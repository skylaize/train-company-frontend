import { useCallback, useEffect, useRef, useState } from "react";

/* ============================================================
   La caméra de la carte (1.6).

   La carte était une image posée dans un cadre. Elle se manipule
   maintenant comme celle d'un jeu : on la fait glisser à la souris ou
   au doigt, on zoome à la molette, au pincement ou aux boutons, et le
   zoom se fait vers le point visé. Tout reste vectoriel : c'est la
   fenêtre (viewBox) qui bouge, pas une image qu'on agrandit.
   ============================================================ */

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;

export function useMapCamera(world: Bounds, home: { cx: number; cy: number; zoom: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [cam, setCam] = useState(home);
  const camRef = useRef(cam);
  camRef.current = cam;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth || 800, h: el.clientHeight || 600 }));
    ro.observe(el);
    setSize({ w: el.clientWidth || 800, h: el.clientHeight || 600 });
    return () => ro.disconnect();
  }, []);

  // pixels écran par unité de carte, zoom 1 = tout le monde visible
  const base = Math.min(size.w / world.w, size.h / world.h);
  const scale = base * cam.zoom;
  const vw = size.w / scale;
  const vh = size.h / scale;
  const viewBox = `${cam.cx - vw / 2} ${cam.cy - vh / 2} ${vw} ${vh}`;

  const clamp = useCallback(
    (c: { cx: number; cy: number; zoom: number }) => {
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom));
      const s = base * zoom;
      const halfW = size.w / s / 2;
      const halfH = size.h / s / 2;
      // le centre reste dans le monde ; à zoom faible, il est ramené au milieu
      const minX = world.x + Math.min(halfW, world.w / 2);
      const maxX = world.x + world.w - Math.min(halfW, world.w / 2);
      const minY = world.y + Math.min(halfH, world.h / 2);
      const maxY = world.y + world.h - Math.min(halfH, world.h / 2);
      return { zoom, cx: Math.min(maxX, Math.max(minX, c.cx)), cy: Math.min(maxY, Math.max(minY, c.cy)) };
    },
    [base, size.w, size.h, world.x, world.y, world.w, world.h]
  );

  /* Écran (px dans le cadre) → carte, et l'inverse, pour les fiches en HTML. */
  const toWorld = useCallback(
    (px: number, py: number, c = camRef.current) => {
      const s = base * c.zoom;
      return { x: c.cx + (px - size.w / 2) / s, y: c.cy + (py - size.h / 2) / s };
    },
    [base, size.w, size.h]
  );
  const toScreen = useCallback(
    (x: number, y: number) => ({ x: (x - cam.cx) * scale + size.w / 2, y: (y - cam.cy) * scale + size.h / 2 }),
    [cam.cx, cam.cy, scale, size.w, size.h]
  );

  /* Zoom vers un point de l'écran : le point visé reste sous le curseur. */
  const zoomAt = useCallback(
    (factor: number, px?: number, py?: number) => {
      setCam((c) => {
        const x = px ?? size.w / 2;
        const y = py ?? size.h / 2;
        const before = toWorld(x, y, c);
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom * factor));
        const s = base * zoom;
        return clamp({ zoom, cx: before.x - (x - size.w / 2) / s, cy: before.y - (y - size.h / 2) / s });
      });
    },
    [base, clamp, size.w, size.h, toWorld]
  );

  const flyTo = useCallback((x: number, y: number, zoom?: number) => setCam((c) => clamp({ cx: x, cy: y, zoom: zoom ?? c.zoom })), [clamp]);
  const reset = useCallback(() => setCam(clamp(home)), [clamp, home]);

  /* Glisser et pincer, souris et doigts confondus (Pointer Events). */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ moved: number; pinch: number | null }>({ moved: 0, pinch: null });
  const dragged = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const local = (e: PointerEvent | WheelEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      // trackpad (petits pas) comme molette (grands pas) : zoom progressif
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)), p.x, p.y);
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      pointers.current.set(e.pointerId, local(e));
      drag.current = { moved: 0, pinch: null };
      dragged.current = false;
    };
    const onMove = (e: PointerEvent) => {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      pointers.current.set(e.pointerId, p);
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (drag.current.pinch) zoomAt(dist / drag.current.pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
        drag.current.pinch = dist;
        dragged.current = true;
        return;
      }
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      drag.current.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.current.moved > 4) {
        if (!dragged.current) {
          dragged.current = true;
          try { el.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
        }
        setCam((c) => {
          const s = base * c.zoom;
          return clamp({ ...c, cx: c.cx - dx / s, cy: c.cy - dy / s });
        });
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) drag.current.pinch = null;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onUp);
    };
  }, [base, clamp, zoomAt]);

  // quand le cadre change de taille, la vue reste valide
  useEffect(() => setCam((c) => clamp(c)), [clamp]);

  return {
    ref,
    size,
    cam,
    viewBox,
    scale,
    /* Taille « écran » : multiplier une taille pensée au zoom 1 par ce facteur
       la garde à peu près constante à l'écran, comme les icônes d'une carte
       de jeu. Un léger grossissement reste, pour sentir qu'on s'approche. */
    k: Math.pow(cam.zoom, -0.82),
    zoomAt,
    flyTo,
    reset,
    toScreen,
    wasDrag: () => dragged.current,
  };
}
