import { STATION_COORDS } from "../geo";
import { countryPath, FRANCE, fitFont, grain, labels, mapTransform, NEIGHBOURS, spaced } from "./PosterArt";
import { drawConsist } from "./trainArt";

/* ============================================================
   2.1.2 : les 200 pionniers.

   - Le billet : un billet cartonné à l'ancienne, numéroté, composté au nom de
     la compagnie. « Pionnier n° 037 / 200 ». 1600 × 900, pour un post ou un
     fond d'écran.
   - La grande carte : les réseaux des 200 superposés, chacun à sa livrée,
     sur une seule carte de France, et les 200 noms en dessous. La ligne et le
     nom du joueur ressortent. 1200 × 1700, comme l'affiche : imprimable en A3.
   ============================================================ */

export const TICKET_W = 1600;
export const TICKET_H = 900;
export const MAP_W = 1200;
export const MAP_H = 1700;

const SERIF = "'Bitter', Georgia, serif";
const SANS = "'Work Sans', 'Helvetica Neue', sans-serif";
const MONO = "'Space Mono', 'Menlo', monospace";
const INK = "#24402f";
const GOLD = "#b8862f";
const PAPER = "#efe3c6";

export interface PioneerTicketData {
  number: number;
  total: number;
  company: string;
  livery: string;
  foundedAt: string;
}

export interface PioneerMapData {
  total: number;
  companies: { n: number; name: string; livery: string; lines: string[][] }[];
  me?: number | null;
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function frDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/* ---------- le billet ---------- */

export function drawPioneerTicket(ctx: CanvasRenderingContext2D, t: PioneerTicketData) {
  const W = TICKET_W, H = TICKET_H;
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // le guichet, la nuit
  const bg = ctx.createRadialGradient(W / 2, H * 0.35, 80, W / 2, H / 2, W * 0.75);
  bg.addColorStop(0, "#1d2a3f");
  bg.addColorStop(1, "#0a0f1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // le billet, un peu de travers, posé sur le comptoir
  const cw = 1240, ch = 600;
  ctx.translate(W / 2, H / 2 + 6);
  ctx.rotate(-0.035);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.roundRect(0, 0, cw, ch, 18);
  ctx.fill();
  ctx.shadowColor = "transparent";

  // la souche, séparée par une ligne de perforations
  const stub = 290;
  ctx.fillStyle = "#e6d6b0";
  ctx.beginPath();
  ctx.roundRect(0, 0, stub, ch, [18, 0, 0, 18]);
  ctx.fill();
  ctx.fillStyle = "#0a0f1a";
  for (let y = 22; y < ch - 10; y += 26) {
    ctx.beginPath();
    ctx.arc(stub, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // la bande à la livrée de la compagnie
  ctx.fillStyle = t.livery;
  ctx.fillRect(stub + 6, 0, cw - stub - 6, 26);
  ctx.fillRect(stub + 6, ch - 26, cw - stub - 6, 26);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(stub + 6, 26, cw - stub - 6, 3);

  // souche : le numéro, à la verticale, comme un talon de carnet
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 22px ${MONO}`;
  spaced(ctx, "PIONNIER", stub / 2, 92, 6);
  fitFont(ctx, String(t.number).padStart(3, "0"), SERIF, 700, 104, stub - 70);
  ctx.textAlign = "center";
  ctx.fillText(String(t.number).padStart(3, "0"), stub / 2, 250);
  ctx.fillStyle = GOLD;
  ctx.fillRect(stub / 2 - 60, 282, 120, 4);
  ctx.fillStyle = INK;
  ctx.font = `400 26px ${SERIF}`;
  ctx.fillText(`sur ${t.total}`, stub / 2, 330);
  ctx.save();
  ctx.translate(stub / 2, ch - 110);
  ctx.font = `400 15px ${MONO}`;
  ctx.fillStyle = "rgba(36,64,47,0.65)";
  ctx.fillText("À CONSERVER", 0, 0);
  ctx.fillText("non cessible", 0, 24);
  ctx.restore();

  // le corps du billet
  const bx = stub + 60, bw = cw - stub - 120;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(36,64,47,0.7)";
  ctx.font = `700 20px ${MONO}`;
  spacedLeft(ctx, "RÉSEAU · CHEMINS DE FER", bx, 86, 4);
  ctx.textAlign = "right";
  ctx.fillText("1re CLASSE", bx + bw, 86);

  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `italic 400 30px ${SERIF}`;
  ctx.fillText("Billet de pionnier délivré à", bx, 150);
  fitFont(ctx, t.company, SERIF, 700, 76, bw);
  ctx.fillText(t.company, bx, 238);

  // le trajet : de sa fondation aux 200
  ctx.fillStyle = GOLD;
  ctx.fillRect(bx, 272, bw, 3);
  ctx.fillStyle = "rgba(36,64,47,0.7)";
  ctx.font = `500 18px ${SANS}`;
  ctx.fillText("DÉPART", bx, 318);
  ctx.textAlign = "right";
  ctx.fillText("ARRIVÉE", bx + bw, 318);
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `600 30px ${SERIF}`;
  ctx.fillText(`Fondée le ${frDate(t.foundedAt)}`, bx, 358);
  ctx.textAlign = "right";
  ctx.fillText(`${t.total} compagnies`, bx + bw, 358);
  // la voie entre les deux
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(bx, 392);
  ctx.lineTo(bx + bw, 392);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const x of [bx, bx + bw]) {
    ctx.fillStyle = PAPER;
    ctx.beginPath();
    ctx.arc(x, 392, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // la rame de la compagnie, en bas du billet
  drawConsist(ctx, { cx: bx + bw * 0.42, base: ch - 58, u: 0.95, maxWidth: bw * 0.78, model: "STANDARD", livery: t.livery, s: 0 });

  // le coup de composteur, en travers du coin
  ctx.save();
  ctx.translate(bx + bw - 84, ch - 104);
  ctx.rotate(0.22);
  ctx.strokeStyle = "rgba(168,72,58,0.85)";
  ctx.fillStyle = "rgba(168,72,58,0.85)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 70, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 59, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.font = `700 13px ${MONO}`;
  ctx.fillText("COMPOSTÉ", 0, -22);
  ctx.font = `700 34px ${MONO}`;
  ctx.fillText(String(t.total), 0, 13);
  ctx.font = `700 12px ${MONO}`;
  ctx.fillText(`OCT. ${new Date().getFullYear()}`, 0, 36);
  ctx.restore();

  ctx.restore();
  grain(ctx, W, H, 0.035, 11);
}

/* le texte espacé de PosterArt est centré ; ici on le veut aligné à gauche */
function spacedLeft(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  ctx.textAlign = "left";
  let cx = x;
  for (const c of [...text]) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + spacing;
  }
}

/* ---------- la grande carte ---------- */

export function drawPioneerMap(ctx: CanvasRenderingContext2D, data: PioneerMapData) {
  const W = MAP_W, H = MAP_H;
  const year = new Date().getFullYear();
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // papier et cadre, comme l'affiche Belle Époque
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(110,80,30,0.22)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 10;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 62, W - 124, H - 124);

  // titre
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `italic 400 30px ${SERIF}`;
  ctx.fillText("Réseau, le jeu", W / 2, 132);
  ctx.font = `700 84px ${SERIF}`;
  spaced(ctx, `LES ${data.total} PIONNIERS`, W / 2, 222, 5);
  ctx.fillStyle = GOLD;
  ctx.fillRect(W / 2 - 180, 248, 360, 4);
  const allLines = data.companies.flatMap((c) => c.lines).filter((l) => l.filter((s) => STATION_COORDS[s]).length >= 2);
  const stations = [...new Set(allLines.flat())].filter((s) => STATION_COORDS[s]);
  ctx.fillStyle = "#4a3a1e";
  ctx.textAlign = "center"; // spaced() laisse l'alignement à gauche
  ctx.font = `italic 400 27px ${SERIF}`;
  ctx.fillText(`${data.companies.length} compagnies, ${allLines.length} lignes, ${stations.length} gares · octobre ${year}`, W / 2, 296);

  // la carte : chaque réseau à sa livrée, en transparence, le sien par-dessus
  const box = { x: 100, y: 320, w: W - 200, h: 720 };
  const t = mapTransform(allLines, box);
  ctx.save();
  ctx.beginPath();
  ctx.rect(72, 312, W - 144, box.h + 20);
  ctx.clip();
  for (const c of NEIGHBOURS) countryPath(ctx, c.d, t)("#e3d5b2", "rgba(60,74,58,0.35)", 2);
  countryPath(ctx, FRANCE, t)("#f4ead2", "#3b4a3a", 3);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const stroke = (l: string[], width: number) => {
    const pts = l.map((s) => t.pt(s)).filter(Boolean) as { x: number; y: number }[];
    if (pts.length < 2) return;
    ctx.lineWidth = width;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  };
  ctx.globalAlpha = 0.5;
  for (const c of data.companies) {
    if (c.n === data.me) continue;
    ctx.strokeStyle = c.livery;
    for (const l of c.lines) stroke(l, 4);
  }
  ctx.globalAlpha = 1;
  const mine = data.companies.find((c) => c.n === data.me);
  if (mine) {
    for (const l of mine.lines) {
      ctx.strokeStyle = INK;
      stroke(l, 11);
      ctx.strokeStyle = mine.livery;
      stroke(l, 6);
    }
  }
  // les gares, les plus desservies nommées
  const served = new Map<string, number>();
  for (const l of allLines) for (const s of new Set(l)) served.set(s, (served.get(s) ?? 0) + 1);
  const sp = stations.map((s) => ({ name: s, ...t.pt(s)! }));
  for (const s of sp) {
    const r = 3 + Math.min(6, Math.sqrt(served.get(s.name) ?? 1));
    ctx.fillStyle = "#f4ead2";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  const top = [...sp].sort((a, b) => (served.get(b.name) ?? 0) - (served.get(a.name) ?? 0)).slice(0, 18);
  labels(ctx, top, `600 19px ${SERIF}`, INK, "#f4ead2", 9);
  ctx.restore();

  // les 200 noms, au fil du texte, comme une plaque commémorative
  const nx = 100, nw = W - 200, ny = box.y + box.h + 70, nBottom = H - 140;
  ctx.fillStyle = GOLD;
  ctx.fillRect(nx, ny - 34, nw, 3);
  // la plus grande taille qui tient : peu de noms, gros caractères
  let size = 24;
  let lay = layoutNames(ctx, data, nw, size);
  while (lay.length * size * 1.45 > nBottom - ny && size > 9) {
    size -= 0.5;
    lay = layoutNames(ctx, data, nw, size);
  }
  const lh = size * 1.45;
  lay.forEach((row, i) => {
    // chaque ligne justifiée, sauf la dernière
    const free = nw - row.width;
    const gaps = row.items.length - 1;
    const extra = i < lay.length - 1 && gaps > 0 ? free / gaps : 0;
    let x = nx;
    const y = ny + i * lh;
    for (const it of row.items) {
      const me = it.n === data.me;
      ctx.textAlign = "left";
      ctx.font = `700 ${size * 0.82}px ${MONO}`;
      ctx.fillStyle = GOLD;
      ctx.fillText(String(it.n), x, y);
      const nwidth = ctx.measureText(String(it.n)).width + size * 0.3;
      ctx.font = `${me ? 700 : 400} ${size}px ${SANS}`;
      if (me) {
        const w = ctx.measureText(it.name).width;
        ctx.fillStyle = "rgba(184,134,47,0.28)";
        ctx.fillRect(x + nwidth - 3, y - size * 0.85, w + 6, size * 1.15);
      }
      ctx.fillStyle = INK;
      ctx.fillText(it.name, x + nwidth, y);
      x += it.w + extra;
    }
  });

  // pied
  ctx.fillStyle = INK;
  ctx.fillRect(100, H - 112, W - 200, 3);
  ctx.font = `700 24px ${SERIF}`;
  ctx.textAlign = "center";
  spaced(ctx, `MERCI · ${data.total} COMPAGNIES SUR LE RÉSEAU · ${year}`, W / 2, H - 76, 4);
  grain(ctx, W, H, 0.045);
  ctx.restore();
}

function layoutNames(ctx: CanvasRenderingContext2D, data: PioneerMapData, width: number, size: number) {
  const gap = size * 1.1;
  const rows: { items: { n: number; name: string; w: number }[]; width: number }[] = [];
  let row: { items: { n: number; name: string; w: number }[]; width: number } = { items: [], width: 0 };
  for (const c of data.companies) {
    ctx.font = `700 ${size * 0.82}px ${MONO}`;
    const nw = ctx.measureText(String(c.n)).width + size * 0.3;
    ctx.font = `${c.n === data.me ? 700 : 400} ${size}px ${SANS}`;
    const w = nw + ctx.measureText(c.name).width;
    const add = (row.items.length ? gap : 0) + w;
    if (row.items.length && row.width + add > width) {
      rows.push(row);
      row = { items: [], width: 0 };
    }
    row.width += (row.items.length ? gap : 0) + w;
    row.items.push({ n: c.n, name: c.name, w: w + gap });
  }
  if (row.items.length) rows.push(row);
  return rows;
}
