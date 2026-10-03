/* ============================================================
   Le décor de la carte (1.6) : fleuves, reliefs, quadrillage.

   La carte montrait des contours à plat, terre et mer presque du même
   ton. Un réseau ferré se lit mieux sur un vrai fond de carte : les
   fleuves que les lignes suivent, les massifs qu'elles contournent.
   Coordonnées en longitude / latitude, projetées comme les gares.
   ============================================================ */

export const project = (lon: number, lat: number) => ({ x: 190 + (lon - 3.06) * 29.58, y: 20 + (50.63 - lat) * 42.97 });

/* Courbe lissée (Catmull-Rom → Bézier) à travers les points du tracé. */
function smooth(points: [number, number][]) {
  const p = points.map(([lon, lat]) => project(lon, lat));
  if (p.length < 2) return "";
  let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

const RIVER_POINTS: { name: string; major: boolean; pts: [number, number][] }[] = [
  { name: "Seine", major: true, pts: [[4.72, 47.49], [4.55, 48.0], [4.07, 48.3], [3.5, 48.45], [2.95, 48.55], [2.66, 48.53], [2.35, 48.85], [2.1, 48.95], [1.72, 49.08], [1.4, 49.2], [1.09, 49.44], [0.75, 49.43], [0.35, 49.45], [0.1, 49.47]] },
  { name: "Loire", major: true, pts: [[4.22, 44.84], [4.1, 45.5], [4.07, 46.03], [3.95, 46.55], [3.16, 46.99], [3.0, 47.4], [2.85, 47.6], [2.1, 47.85], [1.9, 47.9], [1.33, 47.59], [0.69, 47.39], [0.1, 47.25], [-0.55, 47.4], [-1.2, 47.3], [-1.55, 47.22], [-2.2, 47.28]] },
  { name: "Rhône", major: true, pts: [[6.14, 46.2], [5.8, 46.0], [5.5, 45.75], [5.1, 45.8], [4.83, 45.76], [4.8, 45.3], [4.89, 44.93], [4.7, 44.5], [4.81, 43.95], [4.63, 43.68], [4.7, 43.4]] },
  { name: "Saône", major: false, pts: [[5.9, 47.9], [5.3, 47.5], [4.9, 47.0], [4.85, 46.3], [4.83, 45.76]] },
  { name: "Garonne", major: true, pts: [[0.7, 42.8], [1.1, 43.3], [1.44, 43.6], [1.1, 44.0], [0.62, 44.2], [0.2, 44.4], [-0.57, 44.84], [-0.75, 45.2], [-1.1, 45.55]] },
  { name: "Rhin", major: true, pts: [[7.59, 47.56], [7.55, 48.1], [7.75, 48.58], [8.2, 48.95], [8.45, 49.5], [8.27, 50.0], [7.9, 50.1], [7.6, 50.36], [7.2, 50.7], [6.96, 50.94], [6.7, 51.3]] },
  { name: "Moselle", major: false, pts: [[6.9, 47.9], [6.4, 48.4], [6.18, 48.7], [6.17, 49.12], [6.4, 49.5], [6.9, 49.9], [7.6, 50.36]] },
  { name: "Tamise", major: false, pts: [[-1.3, 51.7], [-0.8, 51.5], [-0.13, 51.5], [0.5, 51.5], [0.9, 51.47]] },
  { name: "Pô", major: false, pts: [[7.3, 44.7], [7.7, 45.07], [8.6, 45.05], [9.2, 45.15], [10.0, 45.05], [11.0, 45.0], [12.3, 44.95]] },
  { name: "Èbre", major: false, pts: [[-3.9, 43.0], [-2.5, 42.5], [-1.6, 42.0], [-0.9, 41.65], [0.5, 40.9], [0.87, 40.72]] },
  { name: "Dordogne", major: false, pts: [[2.8, 45.5], [2.2, 45.2], [1.5, 44.9], [0.7, 44.85], [0.0, 44.9], [-0.55, 45.05]] },
];

export const RIVERS = RIVER_POINTS.map((r) => ({ name: r.name, major: r.major, d: smooth(r.pts) }));

/* Les massifs : des taches floues, pas des courbes de niveau — juste assez
   pour que l'œil sache où sont les montagnes. */
const RELIEF_RAW: { lon: number; lat: number; rx: number; ry: number; rot?: number; strength: number }[] = [
  { lon: 6.6, lat: 45.3, rx: 0.95, ry: 1.2, strength: 1 },
  { lon: 7.6, lat: 46.2, rx: 1.6, ry: 0.55, rot: -8, strength: 1 },
  { lon: 9.6, lat: 46.4, rx: 1.7, ry: 0.5, strength: 0.9 },
  { lon: 6.4, lat: 44.3, rx: 0.7, ry: 0.55, strength: 0.8 },
  { lon: 0.9, lat: 42.75, rx: 2.4, ry: 0.3, rot: 6, strength: 1 },
  { lon: 3.0, lat: 45.3, rx: 1.0, ry: 0.9, strength: 0.65 },
  { lon: 5.95, lat: 46.75, rx: 0.55, ry: 0.28, rot: -42, strength: 0.6 },
  { lon: 7.05, lat: 48.2, rx: 0.3, ry: 0.6, strength: 0.6 },
];

export const RELIEF = RELIEF_RAW.map((r) => {
  const c = project(r.lon, r.lat);
  return { cx: c.x, cy: c.y, rx: r.rx * 29.58, ry: r.ry * 42.97, rot: r.rot ?? 0, strength: r.strength };
});

export const RELIEF_LABELS = [
  { name: "Alpes", ...project(6.95, 44.95) },
  { name: "Pyrénées", ...project(0.3, 42.5) },
  { name: "Massif central", ...project(2.85, 45.05) },
  { name: "Jura", ...project(5.55, 46.6) },
  { name: "Vosges", ...project(6.62, 48.05) },
];

/* Quadrillage tous les deux degrés, comme sur une carte d'état-major. */
export const GRATICULE = {
  meridians: [-8, -6, -4, -2, 0, 2, 4, 6, 8, 10, 12, 14].map((lon) => project(lon, 0).x),
  parallels: [42, 44, 46, 48, 50, 52].map((lat) => ({ lat, y: project(0, lat).y })),
};
