import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { STATION_COORDS } from "../geo";
import { COUNTRIES } from "./europeMap";
import { REGION_SHAPES } from "./regionsMap";

/* ============================================================
   La carte du réseau commun (2.3).

   La 2.0.3 dessinait tout, tout le temps : chaque ligne de chaque membre,
   chaque nom de gare et chaque bonus. À trente gares communes, plus rien ne
   se lisait. Désormais :
   - une couleur par membre, choisie pour être distincte (les livrées des
     joueurs se ressemblent souvent : trois bleus rendaient la carte muette) ;
   - les gares communes sont des points dorés, plus gros quand le bonus monte,
     avec le nombre de compagnies qui les desservent ;
   - seuls les noms qui comptent sont écrits, et un nom qui ne trouve pas de
     place libre n'est pas écrit du tout (avant, il se posait sur un autre) ;
   - le détail d'une gare vient au survol, ou au toucher sur téléphone ;
   - trois vues répondent à trois questions : tout le réseau, mes gares
     communes, et où mes alliés m'attendent.
   ============================================================ */

const FRANCE_D = COUNTRIES.find((c) => c.id === "France")?.d ?? "";
const NEIGHBOURS = COUNTRIES.filter((c) => c.id !== "France");

export type MapMode = "all" | "mine" | "conquer" | "regions";

/* 2.3 : une région vue par la carte : sa couleur (celle de l'alliance qui la
   tient, ou rien), et si c'est la nôtre. */
export type MapRegion = { id: string; name: string; color: string | null; mine: boolean; locked: boolean };

// l'emprise de la France métropolitaine, pour la vue des régions
const FRANCE_FRAME = (() => {
  const nums = REGION_SHAPES.flatMap((r) => (r.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number));
  const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
  return { minX: Math.min(...xs) - 10, maxX: Math.max(...xs) + 10, minY: Math.min(...ys) - 10, maxY: Math.max(...ys) + 10 };
})();
export type MapMember = { companyId: string; name: string; isMe: boolean; color: string };
type Line = { companyId: string; route: string[] };

export interface AllianceNetwork {
  served: Map<string, string[]>; // gare → membres qui la desservent, dans l'ordre des membres
  segs: { a: string; b: string; ids: string[] }[];
  stations: string[];
  lineCount: Map<string, number>;
}

export function bonusFor(n: number, step: number, maxAllies: number) {
  return Math.round(step * Math.min(maxAllies, Math.max(0, n - 1)) * 100);
}

export function buildNetwork(lines: Line[], members: MapMember[]): AllianceNetwork {
  const order = new Map(members.map((m, i) => [m.companyId, i]));
  const rank = (id: string) => order.get(id) ?? 99;
  const served = new Map<string, string[]>();
  const segMap = new Map<string, { a: string; b: string; ids: string[] }>();
  const lineCount = new Map<string, number>();
  for (const l of lines) {
    const route = l.route.filter((s) => STATION_COORDS[s]);
    if (route.length < 2) continue;
    lineCount.set(l.companyId, (lineCount.get(l.companyId) ?? 0) + 1);
    route.forEach((s, i) => {
      const who = served.get(s) ?? [];
      if (!who.includes(l.companyId)) who.push(l.companyId);
      served.set(s, who);
      if (i < route.length - 1) {
        const [a, b] = [s, route[i + 1]].sort();
        const key = `${a}|${b}`;
        const seg = segMap.get(key) ?? { a, b, ids: [] };
        if (!seg.ids.includes(l.companyId)) seg.ids.push(l.companyId);
        segMap.set(key, seg);
      }
    });
  }
  served.forEach((ids) => ids.sort((x, y) => rank(x) - rank(y)));
  const segs = [...segMap.values()];
  segs.forEach((s) => s.ids.sort((x, y) => rank(x) - rank(y)));
  return { served, segs, stations: [...served.keys()], lineCount };
}

type Box = { x1: number; y1: number; x2: number; y2: number };

// les noms courts des régions, pour la carte
const REGION_SHORT: Record<string, string> = {
  hdf: "Hauts-de-France", normandie: "Normandie", idf: "Île-de-France", "grand-est": "Grand Est", bretagne: "Bretagne",
  pdl: "Pays de la Loire", cvl: "Centre", bfc: "Bourgogne-F.-C.", "nouvelle-aquitaine": "Nouvelle-Aquitaine",
  occitanie: "Occitanie", ara: "Auvergne-Rhône-Alpes", paca: "PACA", corse: "Corse",
};

export function AllianceMap({
  net, members, mode, focus, hover, onHover, step, maxAllies, regions = [], hoverRegion = null, onHoverRegion,
}: {
  net: AllianceNetwork;
  members: MapMember[];
  mode: MapMode;
  focus: string | null;
  hover: string | null;
  onHover: (station: string | null) => void;
  step: number;
  maxAllies: number;
  regions?: MapRegion[];
  hoverRegion?: string | null;
  onHoverRegion?: (id: string | null) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 720, h: 480 });
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: Math.max(240, e.contentRect.width), h: Math.max(200, e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [net.stations.length === 0]);

  const me = members.find((m) => m.isMe)?.companyId ?? "";
  const colorOf = (id: string) => members.find((m) => m.companyId === id)?.color ?? "rgb(var(--c-slate2))";
  const meIn = (s: string) => (net.served.get(s) ?? []).includes(me);
  const count = (s: string) => net.served.get(s)?.length ?? 0;

  // cadrage : les gares de l'alliance, avec une marge ; la carte suit leur emprise
  const regionsMode = mode === "regions";
  const frame = useMemo(() => {
    const pts = net.stations.map((s) => STATION_COORDS[s]);
    const pad = 24;
    let minX = Math.min(...pts.map((p) => p.x)) - pad, maxX = Math.max(...pts.map((p) => p.x)) + pad;
    let minY = Math.min(...pts.map((p) => p.y)) - pad, maxY = Math.max(...pts.map((p) => p.y)) + pad;
    // 2.3 : la vue des régions montre toute la France, Corse comprise
    if (regionsMode) ({ minX, maxX, minY, maxY } = FRANCE_FRAME);
    // jamais plus serré que 200 × 170 : une alliance naissante reste lisible
    if (maxX - minX < 200) { const c = (minX + maxX) / 2; minX = c - 100; maxX = c + 100; }
    if (maxY - minY < 170) { const c = (minY + maxY) / 2; minY = c - 85; maxY = c + 85; }
    // même proportion que le cadre : la carte remplit sa place sans bandes vides
    let w = maxX - minX, h = maxY - minY;
    const ratio = box.w / box.h;
    if (w / h < ratio) { const nw = h * ratio; minX -= (nw - w) / 2; w = nw; } else { const nh = w / ratio; minY -= (nh - h) / 2; h = nh; }
    return { minX, minY, w, h };
  }, [net, box.w, box.h, regionsMode]);

  if (net.stations.length === 0) {
    return (
      <div ref={wrap} className="rounded-card border border-line bg-navy-950/60 h-[260px] flex items-center justify-center text-[13.5px] text-slate2 font-body px-6 text-center">
        Pas encore de ligne dans l'alliance. La carte se dessine dès la première.
      </div>
    );
  }

  const { minX, minY, w, h } = frame;
  const k = w / box.w; // une unité d'écran (px) en unités de carte

  /* ---- les tronçons, en voies parallèles quand plusieurs membres les partagent ---- */
  const muted = "rgb(var(--c-slate2) / 0.32)";
  const segs: { key: string; x1: number; y1: number; x2: number; y2: number; color: string; width: number; z: number; op: number }[] = [];
  for (const sg of net.segs) {
    const A = STATION_COORDS[sg.a], B = STATION_COORDS[sg.b];
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const n = sg.ids.length;
    sg.ids.forEach((id, i) => {
      const o = (i - (n - 1) / 2) * 3 * k;
      let look: { color: string; width: number; z: number; op: number };
      if (regionsMode) look = { color: colorOf(id), width: 1.1, z: id === me ? 1 : 0, op: 0.35 };
      else if (focus) look = id === focus ? { color: colorOf(id), width: 2.6, z: 2, op: 1 } : { color: muted, width: 1.5, z: 0, op: 1 };
      else if (mode === "mine") look = id === me ? { color: colorOf(id), width: 2.6, z: 2, op: 1 } : { color: muted, width: 1.5, z: 0, op: 1 };
      else if (mode === "conquer") look = id === me ? { color: colorOf(id), width: 2.2, z: 1, op: 0.9 } : { color: colorOf(id), width: 1.5, z: 0, op: 0.3 };
      else look = { color: colorOf(id), width: 1.9, z: id === me ? 1 : 0, op: 0.85 };
      segs.push({ key: `${sg.a}|${sg.b}|${id}`, x1: A.x + nx * o, y1: A.y + ny * o, x2: B.x + nx * o, y2: B.y + ny * o, ...look });
    });
  }
  segs.sort((a, b) => a.z - b.z);

  /* ---- les gares ---- */
  const boxes: Box[] = [];
  const dots = net.stations.map((s) => {
    const p = STATION_COORDS[s], n = count(s), mine = meIn(s);
    const target = mode === "conquer" && !mine;
    const shared = n >= 2;
    let r: number, kind: "target" | "shared" | "plain", op = 1;
    if (target) { r = (4.5 + n * 1.4) * k; kind = "target"; }
    else if (shared) {
      r = (6 + (n - 2) * 1.7) * k; kind = "shared";
      if ((mode === "mine" && !mine) || mode === "conquer") op = 0.28;
    } else {
      r = 2.7 * k; kind = "plain";
      if (mode !== "all") op = 0.45;
    }
    if (regionsMode) {
      // en vue régions, les gares s'effacent derrière les couleurs des régions
      r = Math.min(r, (shared ? 2.8 : 1.8) * k);
      op = Math.min(op, 0.5);
    }
    if (focus && !(net.served.get(s) ?? []).includes(focus)) op = Math.min(op, 0.28);
    if (hover === s) op = 1;
    boxes.push({ x1: p.x - r - k, y1: p.y - r - k, x2: p.x + r + k, y2: p.y + r + k });
    return { s, x: p.x, y: p.y, r, n, kind, op, weight: kind === "plain" ? 0 : kind === "target" ? 1 + n : n };
  });
  dots.sort((a, b) => a.weight - b.weight);

  /* ---- les noms : ceux qui comptent, jamais l'un sur l'autre ---- */
  let cand: string[];
  if (regionsMode) cand = [];
  else if (focus) cand = net.stations.filter((s) => (net.served.get(s) ?? []).includes(focus) && count(s) >= 2);
  else if (mode === "mine") cand = net.stations.filter((s) => meIn(s) && count(s) >= 2);
  else if (mode === "conquer") cand = net.stations.filter((s) => !meIn(s) && count(s) >= 2);
  // vue d'ensemble : d'abord les gares à trois compagnies et plus, puis les autres s'il reste de la place
  else cand = net.stations.filter((s) => count(s) >= 2);
  cand.sort((a, b) => count(b) - count(a) || a.localeCompare(b));
  // un nom doit tenir dans le cadre et ne rien chevaucher
  const inside = (b: Box) => b.x1 >= minX + 2 * k && b.x2 <= minX + w - 2 * k && b.y1 >= minY + 2 * k && b.y2 <= minY + h - 2 * k;
  const hit = (b: Box) => !inside(b) || boxes.some((o) => b.x1 < o.x2 && b.x2 > o.x1 && b.y1 < o.y2 && b.y2 > o.y1);
  const labels: { s: string; x: number; y: number; anchor: "start" | "end" | "middle"; text: string }[] = [];
  const fs = 11.5 * k;
  for (const s of cand) {
    if (s === hover) continue; // l'infobulle le dit déjà
    const p = STATION_COORDS[s], n = count(s);
    const text = mode === "conquer" ? `${s}  +${bonusFor(n + 1, step, maxAllies)} %` : s;
    const tw = text.length * fs * 0.56;
    const off = (n >= 2 ? 9 + (n - 2) * 1.7 : 6) * k;
    const opts: { x: number; y: number; anchor: "start" | "end" | "middle"; b: Box }[] = [
      { x: p.x + off, y: p.y + fs * 0.36, anchor: "start", b: { x1: p.x + off, y1: p.y - fs * 0.6, x2: p.x + off + tw, y2: p.y + fs * 0.5 } },
      { x: p.x - off, y: p.y + fs * 0.36, anchor: "end", b: { x1: p.x - off - tw, y1: p.y - fs * 0.6, x2: p.x - off, y2: p.y + fs * 0.5 } },
      { x: p.x, y: p.y - off - fs * 0.2, anchor: "middle", b: { x1: p.x - tw / 2, y1: p.y - off - fs, x2: p.x + tw / 2, y2: p.y - off } },
      { x: p.x, y: p.y + off + fs * 0.85, anchor: "middle", b: { x1: p.x - tw / 2, y1: p.y + off, x2: p.x + tw / 2, y2: p.y + off + fs } },
    ];
    const pick = opts.find((o) => !hit(o.b));
    if (!pick) continue; // pas de place : la gare reste lisible au survol et dans la liste
    boxes.push(pick.b);
    labels.push({ s, x: pick.x, y: pick.y, anchor: pick.anchor, text });
  }

  /* ---- l'infobulle ---- */
  let tip: null | { left: number; top: number; below: boolean; align: string; name: string; bonus: string; who: { name: string; color: string }[]; hint: string; invite: boolean } = null;
  if (hover && net.served.has(hover)) {
    const p = STATION_COORDS[hover], ids = net.served.get(hover)!, n = ids.length, mine = meIn(hover);
    const left = ((p.x - minX) / w) * 100, top = ((p.y - minY) / h) * 100;
    let hint: string, bonus: string, invite = false;
    if (!mine) {
      hint = `Si vous la desservez : +${bonusFor(n + 1, step, maxAllies)} % pour vous et ${n > 1 ? `vos ${n} alliés` : "votre allié"} sur place.`;
      bonus = n >= 2 ? `+${bonusFor(n, step, maxAllies)} %` : "—";
      invite = true;
    } else if (n === 1) {
      hint = "Aucun allié ici pour l'instant : proposez-leur d'y passer.";
      bonus = "—";
    } else {
      hint = n - 1 < maxAllies ? `Un allié de plus : +${bonusFor(n + 1, step, maxAllies)} % pour chacun.` : "Bonus au maximum.";
      bonus = `+${bonusFor(n, step, maxAllies)} %`;
    }
    tip = {
      left, top, below: top < 32, align: left < 22 ? "0%" : left > 78 ? "-100%" : "-50%",
      name: hover, bonus, hint, invite,
      who: ids.map((id) => {
        const m = members.find((x) => x.companyId === id);
        return { name: m?.isMe ? "Vous" : m?.name ?? "—", color: colorOf(id) };
      }),
    };
  }

  return (
    <div ref={wrap} className="relative rounded-card overflow-hidden border border-line bg-navy-950/70 h-[clamp(300px,58vh,560px)]" onMouseLeave={() => onHover(null)}>
      <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="absolute inset-0 block w-full h-full" role="img" aria-label="Les lignes de l'alliance sur la carte">
        <g aria-hidden="true">
          {NEIGHBOURS.map((c) => (
            <path key={c.id} d={c.d} fill="rgb(var(--c-navy-900))" fillOpacity="0.55" stroke="rgb(var(--c-slate2))" strokeOpacity="0.18" strokeWidth={0.8 * k} strokeLinejoin="round" />
          ))}
          <path d={FRANCE_D} fill="rgb(var(--c-navy-900))" stroke="rgb(var(--c-slate2))" strokeOpacity="0.35" strokeWidth={1.1 * k} strokeLinejoin="round" />
        </g>
        {/* 2.3 : les régions, à la couleur de l'alliance qui les tient */}
        {regionsMode && (
          <g>
            {REGION_SHAPES.map((rs) => {
              const info = regions.find((x) => x.id === rs.id);
              const on = hoverRegion === rs.id;
              return (
                <path
                  key={rs.id}
                  d={rs.d}
                  fill={info?.color ?? "rgb(var(--c-slate2))"}
                  fillOpacity={info?.color ? (on ? 0.55 : info.mine ? 0.42 : 0.28) : on ? 0.14 : 0.05}
                  stroke={info?.mine ? info.color ?? "rgb(var(--c-offwhite))" : "rgb(var(--c-navy-950))"}
                  strokeOpacity={info?.mine ? 0.9 : 0.8}
                  strokeWidth={(info?.mine ? 1.8 : 1.2) * k}
                  strokeLinejoin="round"
                  style={{ cursor: "pointer", transition: "fill-opacity 160ms" }}
                  onMouseEnter={() => onHoverRegion?.(rs.id)}
                  onMouseLeave={() => onHoverRegion?.(null)}
                  onClick={() => onHoverRegion?.(on ? null : rs.id)}
                />
              );
            })}
          </g>
        )}
        <g aria-hidden="true">
          {segs.map((sg) => (
            <line key={sg.key} x1={sg.x1} y1={sg.y1} x2={sg.x2} y2={sg.y2} stroke={sg.color} strokeOpacity={sg.op} strokeWidth={sg.width * k} strokeLinecap="round" style={{ transition: "stroke 160ms, stroke-opacity 160ms" }} />
          ))}
        </g>
        <g aria-hidden="true">
          {dots.map((d) => (
            <g key={d.s} opacity={d.op} style={{ transition: "opacity 160ms" }}>
              {hover === d.s && <circle cx={d.x} cy={d.y} r={d.r + 3 * k} fill="none" stroke="rgb(var(--c-offwhite))" strokeWidth={1.6 * k} />}
              {d.kind === "shared" && (
                <>
                  <circle cx={d.x} cy={d.y} r={d.r} fill="rgb(var(--c-amber))" stroke="rgb(var(--c-navy-950))" strokeWidth={1.5 * k} />
                  <text x={d.x} y={d.y + 3.1 * k} textAnchor="middle" fontSize={8.5 * k} fontWeight={700} fill="rgb(var(--c-onaccent))" fontFamily="var(--font-body), sans-serif">
                    {d.n}
                  </text>
                </>
              )}
              {d.kind === "target" && (
                <circle cx={d.x} cy={d.y} r={d.r} fill="rgb(var(--c-cobalt) / 0.18)" stroke="rgb(var(--c-cobalt))" strokeWidth={1.4 * k} strokeDasharray={`${2.5 * k} ${2 * k}`} />
              )}
              {d.kind === "plain" && <circle cx={d.x} cy={d.y} r={d.r} fill="rgb(var(--c-navy-950))" stroke="rgb(var(--c-slate2))" strokeWidth={1.2 * k} />}
            </g>
          ))}
        </g>
        <g aria-hidden="true" fontFamily="var(--font-body), sans-serif">
          {labels.map((l) => (
            <text
              key={l.s}
              x={l.x}
              y={l.y}
              textAnchor={l.anchor}
              fontSize={fs}
              fontWeight={600}
              fill={mode === "conquer" ? "rgb(var(--c-cobalt))" : "rgb(var(--c-offwhite))"}
              paintOrder="stroke"
              stroke="rgb(var(--c-navy-950))"
              strokeWidth={3.2 * k}
              strokeLinejoin="round"
            >
              {l.text}
            </text>
          ))}
        </g>
        {regionsMode && (
          <g aria-hidden="true" fontFamily="var(--font-body), sans-serif" pointerEvents="none">
            {REGION_SHAPES.map((rs) => {
              const info = regions.find((x) => x.id === rs.id);
              return (
                <text
                  key={rs.id}
                  x={rs.cx}
                  y={rs.cy}
                  textAnchor="middle"
                  fontSize={(hoverRegion === rs.id ? 12 : 10.5) * k}
                  fontWeight={info?.mine || hoverRegion === rs.id ? 700 : 600}
                  fill="rgb(var(--c-offwhite))"
                  fillOpacity={info?.color || hoverRegion === rs.id ? 0.95 : 0.6}
                  paintOrder="stroke"
                  stroke="rgb(var(--c-navy-950))"
                  strokeWidth={3 * k}
                  strokeLinejoin="round"
                >
                  {REGION_SHORT[rs.id] ?? rs.name}
                </text>
              );
            })}
          </g>
        )}
        {/* zones de survol, au-dessus de tout : une gare se vise sans viser le pixel */}
        <g style={{ pointerEvents: regionsMode ? "none" : undefined }}>
          {dots.map((d) => (
            <circle
              key={d.s}
              cx={d.x}
              cy={d.y}
              r={Math.max(d.r + 2 * k, 9 * k)}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => onHover(d.s)}
              onClick={() => onHover(hover === d.s ? null : d.s)}
            />
          ))}
        </g>
      </svg>

      {tip && (
        <div
          className="absolute z-10 w-[248px] max-w-[80%] rounded-card border border-line bg-navy-900/95 backdrop-blur px-3.5 py-3 shadow-[0_12px_32px_rgb(0_0_0/0.35)] pointer-events-none font-body"
          style={{ left: `${tip.left}%`, top: `${tip.top}%`, transform: `translate(${tip.align}, ${tip.below ? "18px" : "calc(-100% - 18px)"})` }}
          role="status"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[15px] font-semibold text-offwhite">{tip.name}</span>
            <span className="font-mono2 text-[13px] text-amber tabular-nums">{tip.bonus}</span>
          </div>
          <ul className="mt-2 flex flex-col gap-1">
            {tip.who.map((x) => (
              <li key={x.name} className="flex items-center gap-2 text-[12.5px] text-slate2">
                <span className="w-3.5 h-[3px] rounded-full shrink-0" style={{ background: x.color }} />
                {x.name}
              </li>
            ))}
          </ul>
          <p className={`mt-2 text-[12.5px] leading-snug ${tip.invite ? "text-cobalt" : "text-slate2"}`}>{tip.hint}</p>
        </div>
      )}
    </div>
  );
}
