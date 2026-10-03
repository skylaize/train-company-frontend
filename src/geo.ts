/* ============================================================
   Géographie du réseau côté client : position des gares, distances,
   durées, et (1.7) itinéraires avec arrêts. Sorti du tableau de bord
   pour que la carte, la vue cabine et les formulaires partagent les
   mêmes calculs. Doit rester aligné sur geography.service et
   route.service côté serveur.
   ============================================================ */

type Pt = { x: number; y: number };

export const STATION_COORDS: Record<string, { x: number; y: number }> = {
  "Lille": { x: 190, y: 20 },
  "Le Havre": { x: 108.13, y: 71 },
  "Rouen": { x: 131.9, y: 71 },
  "Metz": { x: 282.44, y: 85 },
  "Paris": { x: 168.87, y: 96 },
  "Nancy": { x: 282.44, y: 103 },
  "Strasbourg": { x: 324.69, y: 109 },
  "Chartres": { x: 143.78, y: 114 },
  "Rennes": { x: 50.02, y: 128 },
  "Le Mans": { x: 105.49, y: 133 },
  "Mulhouse": { x: 316.77, y: 144 },
  "Dijon": { x: 248.1, y: 162 },
  "Nantes": { x: 53.98, y: 167 },
  "Lyon": { x: 242.82, y: 229 },
  "Grenoble": { x: 269.23, y: 254 },
  "Bordeaux": { x: 81.72, y: 269 },
  "Toulouse": { x: 142.46, y: 322 },
  "Marseille": { x: 258.67, y: 335 },
  // v1.3 — mêmes positions que côté serveur (geography.service), même projection
  "Brest": { x: -33.17, y: 116 },
  "Caen": { x: 88.32, y: 82 },
  "Amiens": { x: 167.55, y: 52 },
  "Reims": { x: 219.05, y: 79 },
  "Troyes": { x: 220.37, y: 120 },
  "Orléans": { x: 155.67, y: 137 },
  "Tours": { x: 120.01, y: 159 },
  "Angers": { x: 83.04, y: 156 },
  "Poitiers": { x: 109.45, y: 194 },
  "La Rochelle": { x: 65.87, y: 212 },
  "Limoges": { x: 137.18, y: 226 },
  "Clermont-Ferrand": { x: 190, y: 228 },
  "Saint-Étienne": { x: 229.62, y: 243 },
  "Besançon": { x: 277.16, y: 166 },
  "Avignon": { x: 241.5, y: 307 },
  "Montpellier": { x: 213.77, y: 322 },
  "Nice": { x: 314.13, y: 318 },
  "Perpignan": { x: 184.72, y: 361 },
  "Pau": { x: 88.32, y: 335 },
  "Bayonne": { x: 56.63, y: 327 },
  // v1.6 — l'étranger, même projection (voir international.service côté serveur)
  "Londres": { x: 96.24, y: -19 },
  "Bruxelles": { x: 228.3, y: 11 },
  "Francfort": { x: 356.39, y: 42 },
  "Genève": { x: 281.12, y: 210 },
  "Milan": { x: 372.23, y: 241 },
  "Barcelone": { x: 162.27, y: 418 },
};

/* Géométrie d'une ligne sur la carte : un léger arc (courbe de Bézier
   quadratique), alterné selon la parité pour que deux lignes qui se croisent ne
   se superposent pas. La même fonction sert à tracer la ligne ET à placer les
   trains dessus : sinon un train roule en ligne droite à côté de sa voie. */
export function lineCurve(index: number, from: { x: number; y: number }, to: { x: number; y: number }) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const bend = (index % 2 === 0 ? 1 : -1) * Math.min(dist * 0.12, 22);
  return { cx: mx - (dy / dist) * bend, cy: my + (dx / dist) * bend };
}

// point et direction sur la courbe, à la fraction t du trajet (0 → 1)
export function pointOnCurve(from: { x: number; y: number }, c: { cx: number; cy: number }, to: { x: number; y: number }, t: number) {
  const u = 1 - t;
  const x = u * u * from.x + 2 * u * t * c.cx + t * t * to.x;
  const y = u * u * from.y + 2 * u * t * c.cy + t * t * to.y;
  const tx = 2 * u * (c.cx - from.x) + 2 * t * (to.x - c.cx);
  const ty = 2 * u * (c.cy - from.y) + 2 * t * (to.y - c.cy);
  return { x, y, angle: (Math.atan2(ty, tx) * 180) / Math.PI };
}

export const LINE_PALETTE = ["#4f7fa3", "#c99a3e", "#5c8a68", "#a8483a", "#8a6ba3", "#c97a3e"];

/* Projection inverse de STATION_COORDS : on remonte aux degrés pour calculer une
   vraie distance. Les constantes sont celles qui ont servi à placer les gares. */
export function toLonLat(p: { x: number; y: number }) {
  // 1.6 : 29,58 px par degré de longitude (42,97 × cos 46,5°) : la carte n'est plus étirée en hauteur
  return { lon: 3.06 + (p.x - 190) / 29.58, lat: 50.63 - (p.y - 20) / 42.97 };
}

/* Distance à vol d'oiseau, en kilomètres. Équirectangulaire : sur l'emprise de
   la France l'écart avec une vraie orthodromie est de l'ordre du kilomètre. */
export function distanceKm(a: { x: number; y: number }, b: { x: number; y: number }) {
  const A = toLonLat(a), B = toLonLat(b);
  const midLat = ((A.lat + B.lat) / 2) * (Math.PI / 180);
  const dx = (B.lon - A.lon) * 111.32 * Math.cos(midLat);
  const dy = (B.lat - A.lat) * 110.57;
  return Math.round(Math.hypot(dx, dy));
}

/* Durée de trajet déduite de la distance. La recette valant 8 pi. par minute
   quelle que soit la longueur, ce calcul ne déplace pas l'équilibre : il rend
   seulement le réseau cohérent — Paris–Lille ne peut plus durer autant que
   Lille–Marseille. */
export function durationFromKm(km: number) {
  return Math.max(3, Math.min(20, Math.round(km / 55)));
}

/* Doit rester aligné sur lengthYield() dans simulation.job.ts. Un long-courrier
   rapporte plus à la minute qu'un omnibus : +0 % à 3 min, +25 % à 20 min. */
export function lengthYieldPct(durationMinutes: number) {
  const d = Math.max(3, Math.min(20, durationMinutes));
  return Math.round(25 * ((d - 3) / 17));
}


/* ---------------- 1.7 : itinéraires ---------------- */

export const DWELL_MIN = 1; // minute d'arrêt en gare intermédiaire
export const MAX_STOPS = 4;

export type RouteLine = { departureStation: string; arrivalStation: string; stops?: string[] | null };

export function routeStations(l: RouteLine) {
  return [l.departureStation, ...(l.stops ?? []), l.arrivalStation];
}

export function segmentMinutes(a: string, b: string) {
  const pa = STATION_COORDS[a];
  const pb = STATION_COORDS[b];
  return pa && pb ? durationFromKm(distanceKm(pa, pb)) : 3;
}

export function routeMinutes(route: string[]) {
  let t = 0;
  for (let i = 0; i < route.length - 1; i++) t += segmentMinutes(route[i], route[i + 1]);
  return t + DWELL_MIN * Math.max(0, route.length - 2);
}

export function routeKm(route: string[]) {
  let km = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = STATION_COORDS[route[i]];
    const b = STATION_COORDS[route[i + 1]];
    if (a && b) km += distanceKm(a, b);
  }
  return km;
}

/* Frise horaire d'un itinéraire : tronçons (avec leur courbe sur la carte) et
   arrêts, en minutes depuis le départ. Sert à placer une rame sur la carte et
   à dire, dans la vue cabine, entre quelles gares elle roule. */
export interface RoutePhase {
  kind: "run" | "dwell";
  from: string;
  to: string;
  start: number;
  end: number;
  a: Pt;
  b: Pt;
  curve: { cx: number; cy: number };
}

export function routeTimeline(route: string[], lineIndex: number): { phases: RoutePhase[]; total: number } {
  const phases: RoutePhase[] = [];
  let t = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = STATION_COORDS[route[i]];
    const b = STATION_COORDS[route[i + 1]];
    if (!a || !b) continue;
    const m = segmentMinutes(route[i], route[i + 1]);
    phases.push({ kind: "run", from: route[i], to: route[i + 1], start: t, end: t + m, a, b, curve: lineCurve(lineIndex + i, a, b) });
    t += m;
    if (i < route.length - 2) {
      phases.push({ kind: "dwell", from: route[i + 1], to: route[i + 1], start: t, end: t + DWELL_MIN, a: b, b, curve: { cx: b.x, cy: b.y } });
      t += DWELL_MIN;
    }
  }
  return { phases, total: t };
}

/* Où est la rame à la fraction `ratio` de son trajet, dans son sens de marche. */
export function positionOnRoute(route: string[], lineIndex: number, direction: number, ratio: number) {
  const { phases, total } = routeTimeline(route, lineIndex);
  if (phases.length === 0) return null;
  const t = Math.min(1, Math.max(0, ratio)) * total;
  const time = direction === 1 ? total - t : t; // au retour, on parcourt la frise à l'envers
  const ph = phases.find((p) => time >= p.start && time <= p.end) ?? phases[phases.length - 1];
  const local = ph.end > ph.start ? (time - ph.start) / (ph.end - ph.start) : 0;
  if (ph.kind === "dwell") {
    const prev = phases[phases.indexOf(ph) - 1];
    const ang = prev ? pointOnCurve(prev.a, prev.curve, prev.b, 1).angle : 0;
    return { x: ph.a.x, y: ph.a.y, angle: direction === 1 ? ang + 180 : ang, stoppedAt: ph.from, from: ph.from, to: ph.to };
  }
  const p = pointOnCurve(ph.a, ph.curve, ph.b, local);
  return {
    x: p.x,
    y: p.y,
    angle: direction === 1 ? p.angle + 180 : p.angle,
    stoppedAt: null as string | null,
    from: direction === 1 ? ph.to : ph.from,
    to: direction === 1 ? ph.from : ph.to,
  };
}

/* Chemin SVG d'un itinéraire : une suite d'arcs, un par tronçon. */
export function routePath(route: string[], lineIndex: number) {
  const { phases } = routeTimeline(route, lineIndex);
  const runs = phases.filter((p) => p.kind === "run");
  if (runs.length === 0) return "";
  return runs.map((p, i) => `${i === 0 ? `M ${p.a.x},${p.a.y} ` : ""}Q ${p.curve.cx},${p.curve.cy} ${p.b.x},${p.b.y}`).join(" ");
}
