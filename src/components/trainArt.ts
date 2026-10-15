// @ts-nocheck — dessin sur canvas
/* ============================================================
   Le dessin des rames (2.0).

   Un seul dessinateur pour tout le jeu : la vue cabine, la vitrine de la
   boutique, ses vignettes, le quai de composition, le catalogue. Chaque
   modèle a sa silhouette — nez profilé de l'Express, locomotive et wagons
   porte-conteneurs du fret, voitures-lits bleu nuit, vapeur et son tender,
   Pullman, crémaillère, Micheline, deux niveaux — mais tous partagent la
   même facture : caisse ombrée, vitres sombres avec un reflet, portes,
   toit et équipements, bogies détaillés, pantographe, phares.

   La rame est dessinée de profil, la queue à gauche, la tête à droite.
   ============================================================ */

type RGB = [number, number, number];

function hex(c: string): RGB {
  let h = (c || "#888888").replace("#", "");
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb([r, g, b]: RGB, a = 1) {
  return a === 1 ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}
function mix(a: string, b: string, k: number) {
  const A = hex(a), B = hex(b);
  return rgb([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k]);
}
const light = (c: string, k: number) => mix(c, "#ffffff", k);
const dark = (c: string, k: number) => mix(c, "#000000", k);
function lum(c: string) {
  const [r, g, b] = hex(c);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export interface ConsistOptions {
  cx: number; // centre de la rame
  base: number; // haut du rail
  u: number; // échelle (1 = une voiture de 200 px)
  model?: string; // STANDARD, EXPRESS, FRET_LOURD, COUCHETTES, VAPEUR, LUXE, CREMAILLERE
  skin?: string | null; // matériel de collection : vapeur, micheline, pullman, duplex, grande-vitesse
  livery: string;
  cars?: string[]; // voitures ajoutées (SECONDE, PREMIERE, BAR)
  firstLivery?: boolean; // Premium : 1re classe à la livrée
  lit?: boolean; // de nuit : fenêtres éclairées
  night?: boolean; // de nuit : caisses moins claires
  t?: number; // temps (secondes), pour la fumée et les bielles
  s?: number; // distance parcourue, pour faire tourner les roues
  v?: number; // vitesse, pour la fumée
  maxWidth?: number; // largeur disponible : la rame est réduite pour y tenir
  smoke?: { x: number; y: number; r: number; a: number }[]; // bouffées de vapeur, gardées par l'appelant
  tailShift?: number; // décalage de la dernière voiture ajoutée, pendant qu'elle vient s'atteler
  plate?: { style: string; text: string } | null; // 2.1 : plaque nominative sur la motrice (laiton, émail, bois)
}

export interface ConsistBox {
  left: number;
  right: number;
  top: number;
  // emplacement d'un emblème sur la motrice
  badge: { x: number; y: number; r: number };
  // phare avant, pour le faisceau de nuit
  lamp: { x: number; y: number };
  // chaque véhicule, de la queue à la tête
  pieces: { x: number; w: number; kind: string }[];
}

/* ---------- formes de base ---------- */

function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.lineTo(x + w - k, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + k);
  ctx.lineTo(x + w, y + h - k);
  ctx.quadraticCurveTo(x + w, y + h, x + w - k, y + h);
  ctx.lineTo(x + k, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - k);
  ctx.lineTo(x, y + k);
  ctx.quadraticCurveTo(x, y, x + k, y);
  ctx.closePath();
}

function bodyGradient(ctx, top, bottom, base: string) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, light(base, 0.35));
  g.addColorStop(0.18, light(base, 0.08));
  g.addColorStop(0.7, base);
  g.addColorStop(1, dark(base, 0.18));
  return g;
}

function glass(ctx, x, y, w, h, r, lit, u) {
  rr(ctx, x, y, w, h, r);
  if (lit) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "#ffe8b0");
    g.addColorStop(1, "#f0b45a");
    ctx.fillStyle = g;
    ctx.fill();
    return;
  }
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#3a4a5e");
  g.addColorStop(0.45, "#1d2836");
  g.addColorStop(1, "#121a25");
  ctx.fillStyle = g;
  ctx.fill();
  // reflet en biais
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.13)";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.15, y);
  ctx.lineTo(x + w * 0.15 + 7 * u, y);
  ctx.lineTo(x + w * 0.15 - 3 * u, y + h);
  ctx.lineTo(x + w * 0.15 - 10 * u, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function wheel(ctx, x, y, r, spin, rimColor = "#5d6672") {
  ctx.fillStyle = "#0d1219";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = Math.max(1, r * 0.22);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#8b95a1";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  // un repère qui tourne
  ctx.strokeStyle = "rgba(139,149,161,0.7)";
  ctx.lineWidth = Math.max(0.8, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(spin) * r * 0.7, y + Math.sin(spin) * r * 0.7);
  ctx.stroke();
}

function bogie(ctx, x, base, u, spin) {
  const r = 6.5 * u;
  // châssis du bogie
  ctx.fillStyle = "#1b222c";
  rr(ctx, x - 19 * u, base - 15 * u, 38 * u, 8 * u, 2 * u);
  ctx.fill();
  ctx.fillStyle = "#2a333f";
  ctx.fillRect(x - 4 * u, base - 18 * u, 8 * u, 5 * u); // pivot
  // ressorts
  ctx.fillStyle = "#3a4452";
  ctx.fillRect(x - 15 * u, base - 13 * u, 4 * u, 4 * u);
  ctx.fillRect(x + 11 * u, base - 13 * u, 4 * u, 4 * u);
  wheel(ctx, x - 11 * u, base - r, r, spin);
  wheel(ctx, x + 11 * u, base - r, r, spin + 1);
}

function underframe(ctx, x, w, bottom, u) {
  ctx.fillStyle = "#222a35";
  ctx.fillRect(x + 4 * u, bottom, w - 8 * u, 4 * u);
  // coffres d'équipement entre les bogies
  ctx.fillStyle = "#2c3541";
  rr(ctx, x + w * 0.32, bottom + 2 * u, w * 0.36, 6 * u, 1.5 * u);
  ctx.fill();
}

/* pantographe à un bras : socle et isolateurs, bras inférieur, genou, bras
   supérieur, et l'archet qui frotte la caténaire */
function pantograph(ctx, x, roof, u, up = true) {
  const y0 = roof - 3 * u;
  ctx.fillStyle = "#3a4250";
  rr(ctx, x - 10 * u, y0, 20 * u, 3 * u, 1 * u);
  ctx.fill();
  ctx.fillStyle = "#8a6b3a";
  ctx.fillRect(x - 8 * u, y0 - 1.5 * u, 2.5 * u, 1.5 * u);
  ctx.fillRect(x + 5.5 * u, y0 - 1.5 * u, 2.5 * u, 1.5 * u);
  const h = up ? 20 * u : 4 * u;
  const knee = [x + 8 * u, y0 - h * 0.45];
  const head = [x - 1 * u, y0 - h];
  ctx.strokeStyle = "#4a5361";
  ctx.lineCap = "round";
  ctx.lineWidth = 1.8 * u;
  ctx.beginPath();
  ctx.moveTo(x - 6 * u, y0 - 1 * u);
  ctx.lineTo(knee[0], knee[1]);
  ctx.lineTo(head[0], head[1]);
  ctx.stroke();
  ctx.lineWidth = 1 * u;
  ctx.beginPath();
  ctx.moveTo(x - 3 * u, y0 - 1 * u);
  ctx.lineTo(knee[0] - 1 * u, knee[1] + 1 * u);
  ctx.stroke();
  // archet
  ctx.lineWidth = 1.6 * u;
  ctx.beginPath();
  ctx.moveTo(head[0] - 8 * u, head[1] + 1 * u);
  ctx.lineTo(head[0] - 6 * u, head[1]);
  ctx.lineTo(head[0] + 6 * u, head[1]);
  ctx.lineTo(head[0] + 8 * u, head[1] + 1 * u);
  ctx.stroke();
  ctx.lineCap = "butt";
}

function gangway(ctx, x, top, bottom, u) {
  ctx.fillStyle = "#1a2029";
  ctx.fillRect(x, top + 6 * u, 6 * u, bottom - top - 10 * u);
  ctx.strokeStyle = "#323b47";
  ctx.lineWidth = 0.8 * u;
  for (let k = 1.5; k < 6; k += 1.5) {
    ctx.beginPath();
    ctx.moveTo(x + k * u, top + 7 * u);
    ctx.lineTo(x + k * u, bottom - 5 * u);
    ctx.stroke();
  }
}

function door(ctx, x, top, bottom, u, color, lit) {
  const w = 13 * u;
  ctx.fillStyle = color;
  rr(ctx, x, top + 6 * u, w, bottom - top - 8 * u, 1.5 * u);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 0.8 * u;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, top + 7 * u);
  ctx.lineTo(x + w / 2, bottom - 3 * u);
  ctx.stroke();
  glass(ctx, x + 2.5 * u, top + 10 * u, w - 5 * u, 13 * u, 1.5 * u, lit, u * 0.5);
}

/* ---------- voitures et motrices ---------- */

interface Ctx {
  ctx: CanvasRenderingContext2D;
  u: number;
  base: number;
  livery: string;
  lit: boolean;
  night: boolean;
  spin: number;
  t: number;
}

const CAR_H = 46;
const LIFT = 17; // hauteur des bogies sous la caisse

function white(c: Ctx) {
  return c.night ? "#bcc3cc" : "#eef1f4";
}

/* voiture voyageurs : 2de, 1re (liseré doré, moins de fenêtres), bar */
function coach(c: Ctx, x: number, w: number, kind = "SECONDE", opts: { first?: boolean; paint?: string; sleeper?: boolean; deck2?: boolean } = {}) {
  const { ctx, u, base, livery, lit } = c;
  const h = (opts.deck2 ? 64 : CAR_H) * u;
  const bottom = base - LIFT * u;
  const top = bottom - h;
  const bodyCol = opts.paint ?? (opts.sleeper ? (c.night ? "#18294a" : "#203862") : white(c));
  underframe(ctx, x, w, bottom - 1 * u, u);
  // caisse
  rr(ctx, x, top, w, h, 7 * u);
  ctx.fillStyle = bodyGradient(ctx, top, bottom, bodyCol);
  ctx.fill();
  ctx.save();
  rr(ctx, x, top, w, h, 7 * u);
  ctx.clip();
  // toit
  ctx.fillStyle = dark(bodyCol === white(c) ? "#9aa4b0" : bodyCol, 0.15);
  ctx.fillRect(x, top, w, 5 * u);
  // bandes de livrée
  const stripe = opts.sleeper ? "#c9d2dc" : livery;
  ctx.fillStyle = stripe;
  ctx.fillRect(x, bottom - 12 * u, w, 6 * u);
  ctx.fillStyle = light(stripe, 0.25);
  ctx.fillRect(x, bottom - 14.5 * u, w, 1.2 * u);
  if (opts.first || kind === "PREMIERE") {
    ctx.fillStyle = "#d9a441";
    ctx.fillRect(x, top + 6.5 * u, w, 2 * u);
  }
  // jupe
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x, bottom - 3 * u, w, 3 * u);
  ctx.restore();
  // contour fin
  rr(ctx, x, top, w, h, 7 * u);
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 0.8 * u;
  ctx.stroke();

  // portes (à la livrée) aux deux bouts
  const doorCol = opts.sleeper ? dark(bodyCol, 0.15) : opts.paint ? dark(opts.paint, 0.12) : livery;
  door(ctx, x + 8 * u, top + (opts.deck2 ? 18 * u : 0), bottom, u, doorCol, lit);
  door(ctx, x + w - 21 * u, top + (opts.deck2 ? 18 * u : 0), bottom, u, doorCol, lit);

  // fenêtres
  const left = x + 27 * u, right = x + w - 27 * u;
  const rows = opts.deck2 ? [top + 9 * u, top + 33 * u] : [top + 11 * u];
  for (const wy of rows) {
    if (kind === "BAR") {
      // grandes baies du bar, et son enseigne
      const n = 3, gap = 5 * u, ww = (right - left - gap * (n - 1)) / n;
      for (let k = 0; k < n; k++) glass(ctx, left + k * (ww + gap), wy, ww, 16 * u, 2.5 * u, lit, u);
      ctx.fillStyle = "#1b2638";
      ctx.font = `700 ${7 * u}px 'Work Sans', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("BAR", x + w / 2, bottom - 18.5 * u);
      continue;
    }
    const n = opts.sleeper ? 6 : opts.first || kind === "PREMIERE" ? 6 : 8;
    const gap = 4 * u, ww = (right - left - gap * (n - 1)) / n;
    for (let k = 0; k < n; k++) {
      const wx = left + k * (ww + gap);
      glass(ctx, wx, wy, ww, (opts.sleeper ? 11 : 15) * u, 2 * u, lit, u);
      if (opts.sleeper) {
        // rideaux à moitié tirés
        ctx.fillStyle = lit ? "#7a4b2a" : "#3d5a80";
        ctx.fillRect(wx, wy, ww, 4 * u);
      }
    }
  }
  bogie(ctx, x + w * 0.17, base, u, c.spin);
  bogie(ctx, x + w * 0.83, base, u, c.spin);
}

/* motrice régionale : nez arrondi, grand pare-brise incliné */
function regionalHead(c: Ctx, x: number, w: number, express = false, silver = false): ConsistBox["badge"] & { lamp: { x: number; y: number } } {
  const { ctx, u, base, livery, lit } = c;
  const h = CAR_H * u;
  const bottom = base - LIFT * u;
  const top = bottom - h;
  const body = silver ? (c.night ? "#a9b2bc" : "#d9dfe5") : white(c);
  const nose = express ? 70 * u : 34 * u;
  const tip = x + w + (express ? 18 * u : 6 * u);
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(x + 7 * u, top);
    ctx.lineTo(x + w - nose, top);
    if (express) {
      ctx.bezierCurveTo(x + w - nose * 0.25, top + 1 * u, tip - 6 * u, top + h * 0.48, tip, bottom - 4 * u);
    } else {
      ctx.bezierCurveTo(x + w - nose * 0.2, top, tip, top + h * 0.3, tip, top + h * 0.62);
    }
    ctx.lineTo(tip - 1 * u, bottom);
    ctx.lineTo(x + 7 * u, bottom);
    ctx.quadraticCurveTo(x, bottom, x, bottom - 7 * u);
    ctx.lineTo(x, top + 7 * u);
    ctx.quadraticCurveTo(x, top, x + 7 * u, top);
    ctx.closePath();
  };
  underframe(ctx, x, w, bottom - 1 * u, u);
  shape();
  ctx.fillStyle = bodyGradient(ctx, top, bottom, body);
  ctx.fill();
  ctx.save();
  shape();
  ctx.clip();
  ctx.fillStyle = dark("#9aa4b0", 0.15);
  ctx.fillRect(x, top, w - nose * 0.6, 5 * u);
  // livrée : bande basse, et le nez peint
  ctx.fillStyle = livery;
  ctx.fillRect(x, bottom - 12 * u, tip - x, 6 * u);
  ctx.fillStyle = light(livery, 0.25);
  ctx.fillRect(x, bottom - 14.5 * u, tip - x, 1.2 * u);
  ctx.beginPath();
  ctx.moveTo(x + w - nose * (express ? 0.9 : 0.6), bottom);
  ctx.quadraticCurveTo(x + w - nose * 0.2, bottom - h * (express ? 0.45 : 0.5), tip + 4 * u, top + h * (express ? 0.42 : 0.3));
  ctx.lineTo(tip + 10 * u, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x, bottom - 3 * u, tip - x + 10 * u, 3 * u);
  ctx.restore();
  shape();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 0.8 * u;
  ctx.stroke();

  // pare-brise
  ctx.fillStyle = lit ? "#1a2230" : "#172231";
  ctx.beginPath();
  if (express) {
    ctx.moveTo(x + w - nose * 0.62, top + 4 * u);
    ctx.quadraticCurveTo(x + w - nose * 0.15, top + 6 * u, x + w + 2 * u, top + h * 0.36);
    ctx.lineTo(x + w - nose * 0.62, top + h * 0.36);
  } else {
    ctx.moveTo(x + w - nose * 0.75, top + 6 * u);
    ctx.quadraticCurveTo(x + w - 2 * u, top + 7 * u, tip - 3 * u, top + h * 0.48);
    ctx.lineTo(x + w - nose * 0.75, top + h * 0.48);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  const wx = x + w - nose * (express ? 0.45 : 0.55);
  ctx.moveTo(wx, top + 7 * u);
  ctx.lineTo(wx + 6 * u, top + 7 * u);
  ctx.lineTo(wx - 2 * u, top + h * 0.36);
  ctx.lineTo(wx - 8 * u, top + h * 0.36);
  ctx.closePath();
  ctx.fill();
  // fenêtres de la salle, et la porte du conducteur
  const left = x + 10 * u, right = x + w - nose * 0.95;
  const n = express ? 3 : 2, gap = 4 * u, ww = (right - left - gap * (n - 1) - 18 * u) / n;
  for (let k = 0; k < n; k++) glass(ctx, left + k * (ww + gap), top + 11 * u, ww, 15 * u, 2 * u, lit, u);
  door(ctx, right - 14 * u, top, bottom, u, livery, lit);
  // phares
  const lampX = tip - (express ? 6 : 5) * u, lampY = bottom - 7 * u;
  ctx.fillStyle = lit ? "#fff6d8" : "#f4f1e4";
  ctx.beginPath();
  ctx.ellipse(lampX, lampY, 3 * u, 1.6 * u, -0.3, 0, Math.PI * 2);
  ctx.fill();
  pantograph(ctx, x + w * 0.3, top, u, true);
  // coffre de toit
  ctx.fillStyle = "#5a6372";
  rr(ctx, x + w * 0.42, top - 3 * u, w * 0.18, 3 * u, 1 * u);
  ctx.fill();
  bogie(ctx, x + w * 0.2, base, u, c.spin);
  bogie(ctx, x + w * 0.8, base, u, c.spin);
  return { x: x + w * 0.55, y: bottom - 9 * u, r: 9 * u, lamp: { x: lampX, y: lampY } };
}

/* locomotive électrique à cabine (couchettes, fret, grand luxe) */
function boxLoco(c: Ctx, x: number, w: number, paint: string, opts: { stripe?: string; grilles?: boolean } = {}) {
  const { ctx, u, base, lit } = c;
  const h = (CAR_H + 2) * u;
  const bottom = base - LIFT * u;
  const top = bottom - h;
  underframe(ctx, x, w, bottom - 1 * u, u);
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(x + 8 * u, top);
    ctx.lineTo(x + w - 16 * u, top);
    ctx.quadraticCurveTo(x + w - 2 * u, top + 2 * u, x + w + 2 * u, top + h * 0.45);
    ctx.lineTo(x + w + 3 * u, bottom);
    ctx.lineTo(x - 3 * u, bottom);
    ctx.lineTo(x - 2 * u, top + h * 0.45);
    ctx.quadraticCurveTo(x + 2 * u, top + 2 * u, x + 8 * u, top);
    ctx.closePath();
  };
  shape();
  ctx.fillStyle = bodyGradient(ctx, top, bottom, paint);
  ctx.fill();
  ctx.save();
  shape();
  ctx.clip();
  ctx.fillStyle = dark(paint, 0.3);
  ctx.fillRect(x - 4 * u, top, w + 8 * u, 4 * u);
  if (opts.stripe) {
    ctx.fillStyle = opts.stripe;
    ctx.fillRect(x - 4 * u, bottom - 13 * u, w + 8 * u, 3 * u);
  }
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(x - 4 * u, bottom - 3 * u, w + 8 * u, 3 * u);
  ctx.restore();
  shape();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 0.8 * u;
  ctx.stroke();
  // pare-brise aux deux bouts
  glass(ctx, x + w - 15 * u, top + 8 * u, 13 * u, 14 * u, 2 * u, false, u * 0.6);
  glass(ctx, x + 1 * u, top + 8 * u, 11 * u, 14 * u, 2 * u, false, u * 0.6);
  // grilles d'aération
  if (opts.grilles !== false) {
    ctx.fillStyle = dark(paint, 0.35);
    for (let k = 0; k < 5; k++) rr(ctx, x + 26 * u + k * ((w - 60 * u) / 5), top + 10 * u, (w - 70 * u) / 5, 13 * u, 1 * u), ctx.fill();
    ctx.strokeStyle = dark(paint, 0.15);
    ctx.lineWidth = 0.6 * u;
    for (let gx = x + 27 * u; gx < x + w - 30 * u; gx += 2.4 * u) {
      ctx.beginPath();
      ctx.moveTo(gx, top + 11 * u);
      ctx.lineTo(gx, top + 22 * u);
      ctx.stroke();
    }
  }
  const lampX = x + w + 1 * u, lampY = bottom - 8 * u;
  ctx.fillStyle = lit ? "#fff6d8" : "#f4f1e4";
  ctx.beginPath();
  ctx.ellipse(lampX - 3 * u, lampY, 2.6 * u, 1.6 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  pantograph(ctx, x + w * 0.28, top, u, true);
  pantograph(ctx, x + w * 0.72, top, u, false);
  bogie(ctx, x + w * 0.22, base, u, c.spin);
  bogie(ctx, x + w * 0.78, base, u, c.spin);
  return { x: x + w * 0.5, y: bottom - 22 * u, r: 9 * u, lamp: { x: lampX, y: lampY } };
}

/* wagon plat et son conteneur */
const BOX_COLORS = ["#b4532a", "#2f6f9e", "#3f7d4a", "#8a6b3a", "#6b3f7a", "#a83a3a"];
function flatWagon(c: Ctx, x: number, w: number, seed: number) {
  const { ctx, u, base } = c;
  const bottom = base - LIFT * u;
  ctx.fillStyle = "#2a313b";
  ctx.fillRect(x, bottom - 5 * u, w, 5 * u);
  ctx.fillStyle = "#3a4250";
  ctx.fillRect(x, bottom - 6 * u, w, 1.5 * u);
  const n = seed % 3 === 0 ? 1 : 2;
  const gap = 4 * u, bw = (w - 8 * u - gap * (n - 1)) / n;
  for (let k = 0; k < n; k++) {
    const col = BOX_COLORS[(seed * 3 + k * 5) % BOX_COLORS.length];
    const bx = x + 4 * u + k * (bw + gap), by = bottom - 6 * u - 34 * u;
    ctx.fillStyle = bodyGradient(ctx, by, by + 34 * u, col);
    ctx.fillRect(bx, by, bw, 34 * u);
    ctx.strokeStyle = dark(col, 0.25);
    ctx.lineWidth = 0.7 * u;
    for (let gx = bx + 3 * u; gx < bx + bw - 1 * u; gx += 3.2 * u) {
      ctx.beginPath();
      ctx.moveTo(gx, by + 2 * u);
      ctx.lineTo(gx, by + 32 * u);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.strokeRect(bx, by, bw, 34 * u);
  }
  bogie(ctx, x + w * 0.15, base, u, c.spin);
  bogie(ctx, x + w * 0.85, base, u, c.spin);
}

/* voiture Pullman ou de grand luxe */
function pullman(c: Ctx, x: number, w: number, paint: string, label: string) {
  const { ctx, u, base, lit } = c;
  const h = (CAR_H + 2) * u;
  const bottom = base - LIFT * u;
  const top = bottom - h;
  underframe(ctx, x, w, bottom - 1 * u, u);
  // toit bombé
  ctx.fillStyle = "#2a2226";
  ctx.beginPath();
  ctx.moveTo(x, top + 7 * u);
  ctx.quadraticCurveTo(x + w / 2, top - 7 * u, x + w, top + 7 * u);
  ctx.lineTo(x + w, top + 9 * u);
  ctx.lineTo(x, top + 9 * u);
  ctx.closePath();
  ctx.fill();
  rr(ctx, x, top + 7 * u, w, h - 7 * u, 3 * u);
  ctx.fillStyle = bodyGradient(ctx, top + 7 * u, bottom, paint);
  ctx.fill();
  // bandeau crème des fenêtres, filets dorés
  ctx.fillStyle = c.night ? "#cbbf9f" : "#ece0c2";
  ctx.fillRect(x + 4 * u, top + 12 * u, w - 8 * u, 19 * u);
  ctx.strokeStyle = "#d9a441";
  ctx.lineWidth = 1 * u;
  ctx.strokeRect(x + 3 * u, top + 11 * u, w - 6 * u, 21 * u);
  ctx.beginPath();
  ctx.moveTo(x + 3 * u, bottom - 9 * u);
  ctx.lineTo(x + w - 3 * u, bottom - 9 * u);
  ctx.stroke();
  const n = 8, gap = 5 * u, ww = (w - 24 * u - gap * (n - 1)) / n;
  for (let k = 0; k < n; k++) {
    const wx = x + 12 * u + k * (ww + gap);
    rr(ctx, wx, top + 14 * u, ww, 14 * u, 3 * u);
    ctx.fillStyle = lit ? "#ffd892" : "#3b2f2a";
    ctx.fill();
    // petite lampe de table
    ctx.fillStyle = lit ? "#fff4d0" : "#d9a441";
    ctx.beginPath();
    ctx.arc(wx + ww / 2, top + 24 * u, 1.4 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#d9a441";
  ctx.font = `600 ${7 * u}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, bottom - 4.5 * u);
  bogie(ctx, x + w * 0.17, base, u, c.spin);
  bogie(ctx, x + w * 0.83, base, u, c.spin);
}

/* locomotive à vapeur, son tender, et les voitures d'époque */
function steamLoco(c: Ctx, x: number, w: number, smoke, v: number) {
  const { ctx, u, base, lit, livery } = c;
  const black = c.night ? "#14181f" : "#1e232b";
  const bottom = base - 9 * u;
  // châssis rouge
  ctx.fillStyle = "#7a1f1f";
  ctx.fillRect(x + 4 * u, bottom - 6 * u, w - 4 * u, 5 * u);
  // chaudière
  const bTop = bottom - 36 * u, bH = 26 * u;
  const g = ctx.createLinearGradient(0, bTop, 0, bTop + bH);
  g.addColorStop(0, "#4a5260");
  g.addColorStop(0.35, black);
  g.addColorStop(1, "#0b0e13");
  rr(ctx, x + 44 * u, bTop, w - 54 * u, bH, 12 * u);
  ctx.fillStyle = g;
  ctx.fill();
  // cerclages en laiton
  ctx.fillStyle = "#c99a3e";
  for (let k = 0; k < 4; k++) ctx.fillRect(x + 58 * u + k * ((w - 80 * u) / 4), bTop + 1 * u, 2 * u, bH - 2 * u);
  // boîte à fumée et porte
  ctx.fillStyle = "#0b0e13";
  rr(ctx, x + w - 16 * u, bTop - 1 * u, 12 * u, bH + 2 * u, 4 * u);
  ctx.fill();
  // cheminée, dôme, sablière
  ctx.fillStyle = black;
  ctx.fillRect(x + w - 18 * u, bTop - 16 * u, 9 * u, 16 * u);
  ctx.fillRect(x + w - 20 * u, bTop - 18 * u, 13 * u, 3 * u);
  ctx.fillStyle = "#c99a3e";
  ctx.beginPath();
  ctx.ellipse(x + w * 0.58, bTop, 7 * u, 6 * u, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = black;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.42, bTop, 6 * u, 5 * u, 0, Math.PI, 0);
  ctx.fill();
  // cabine
  const cabTop = bottom - 50 * u;
  ctx.fillStyle = black;
  ctx.fillRect(x + 6 * u, cabTop, 40 * u, 44 * u);
  ctx.fillStyle = "#0b0e13";
  ctx.fillRect(x + 2 * u, cabTop - 4 * u, 48 * u, 6 * u);
  glass(ctx, x + 14 * u, cabTop + 8 * u, 18 * u, 15 * u, 2 * u, lit, u * 0.6);
  ctx.fillStyle = livery;
  ctx.fillRect(x + 6 * u, cabTop + 30 * u, 40 * u, 3 * u);
  // grandes roues motrices et bielles
  const spin = c.spin;
  const drivers = [x + 58 * u, x + 86 * u, x + 114 * u];
  for (const dx of drivers) {
    wheel(ctx, dx, base - 12 * u, 12 * u, spin, "#a32626");
    ctx.strokeStyle = "#a32626";
    ctx.lineWidth = 1 * u;
    for (let k = 0; k < 8; k++) {
      const a = spin + (k * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(dx, base - 12 * u);
      ctx.lineTo(dx + Math.cos(a) * 9 * u, base - 12 * u + Math.sin(a) * 9 * u);
      ctx.stroke();
    }
  }
  wheel(ctx, x + w - 12 * u, base - 7 * u, 7 * u, spin, "#a32626");
  const crank = (dx: number) => [dx + Math.cos(spin) * 6 * u, base - 12 * u + Math.sin(spin) * 6 * u];
  const [a1, b1] = crank(drivers[0]);
  const [a3, b3] = crank(drivers[2]);
  ctx.strokeStyle = "#b8c0ca";
  ctx.lineWidth = 2.4 * u;
  ctx.beginPath();
  ctx.moveTo(a1, b1);
  ctx.lineTo(a3, b3);
  ctx.stroke();
  // cylindre
  ctx.fillStyle = black;
  rr(ctx, x + w - 34 * u, bottom - 14 * u, 20 * u, 10 * u, 2 * u);
  ctx.fill();
  // lanterne
  ctx.fillStyle = lit ? "#fff1c0" : "#e9e2c8";
  ctx.fillRect(x + w - 6 * u, bottom - 20 * u, 4 * u, 4 * u);
  // fumée
  if (smoke) {
    const cx = x + w - 13.5 * u, cy = bTop - 18 * u;
    if (Math.random() < 0.22 + v / 2500) smoke.push({ x: cx, y: cy, r: 4 * u, a: 0.75 });
    for (const p of smoke) {
      p.x -= v * 0.016 + 0.4;
      p.y -= 0.6;
      p.r += 0.3;
      p.a -= 0.014;
      ctx.fillStyle = c.night ? `rgba(160,170,185,${Math.max(0, p.a)})` : `rgba(235,238,242,${Math.max(0, p.a)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    while (smoke.length && smoke[0].a <= 0) smoke.shift();
    if (smoke.length > 140) smoke.splice(0, smoke.length - 140);
  } else {
    // image fixe : un panache figé
    ctx.fillStyle = c.night ? "rgba(160,170,185,0.45)" : "rgba(235,238,242,0.75)";
    const sx = x + w - 13.5 * u, sy = bTop - 22 * u;
    for (const [dx, dy, r] of [[0, 0, 6], [-10, -6, 8], [-24, -10, 10], [-40, -12, 9], [-54, -11, 7]]) {
      ctx.beginPath();
      ctx.arc(sx + dx * u, sy + dy * u, r * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return { x: x + 26 * u, y: cabTop + 38 * u, r: 7 * u, lamp: { x: x + w - 2 * u, y: bottom - 18 * u } };
}

function tender(c: Ctx, x: number, w: number) {
  const { ctx, u, base } = c;
  const black = c.night ? "#14181f" : "#1e232b";
  const bottom = base - 13 * u;
  ctx.fillStyle = black;
  rr(ctx, x, bottom - 30 * u, w, 30 * u, 3 * u);
  ctx.fill();
  ctx.fillStyle = "#0b0d11";
  ctx.beginPath();
  ctx.moveTo(x + 4 * u, bottom - 30 * u);
  ctx.quadraticCurveTo(x + w / 2, bottom - 40 * u, x + w - 4 * u, bottom - 30 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c99a3e";
  ctx.fillRect(x + 4 * u, bottom - 26 * u, w - 8 * u, 1.5 * u);
  for (const wx of [x + w * 0.25, x + w * 0.75]) wheel(ctx, wx, base - 7 * u, 7 * u, c.spin);
}

function heritageCoach(c: Ctx, x: number, w: number) {
  const { ctx, u, base, lit } = c;
  const paint = c.night ? "#1b3529" : "#24493a";
  const bottom = base - LIFT * u;
  const top = bottom - 42 * u;
  underframe(ctx, x, w, bottom - 1 * u, u);
  // toit à lanterneau
  ctx.fillStyle = "#2b2420";
  ctx.beginPath();
  ctx.moveTo(x - 2 * u, top + 2 * u);
  ctx.quadraticCurveTo(x + w / 2, top - 10 * u, x + w + 2 * u, top + 2 * u);
  ctx.closePath();
  ctx.fill();
  // lanterneau posé sur le toit
  rr(ctx, x + w * 0.2, top - 7 * u, w * 0.6, 4 * u, 1 * u);
  ctx.fill();
  rr(ctx, x, top, w, bottom - top, 2 * u);
  ctx.fillStyle = bodyGradient(ctx, top, bottom, paint);
  ctx.fill();
  // panneaux moulurés
  ctx.strokeStyle = "#c99a3e";
  ctx.lineWidth = 0.8 * u;
  const n = 7, pw = (w - 12 * u) / n;
  for (let k = 0; k < n; k++) {
    const px = x + 6 * u + k * pw;
    ctx.strokeRect(px + 1 * u, top + 6 * u, pw - 2 * u, 17 * u);
    ctx.strokeRect(px + 1 * u, top + 26 * u, pw - 2 * u, 10 * u);
    glass(ctx, px + 3 * u, top + 8 * u, pw - 6 * u, 13 * u, 3 * u, lit, u * 0.5);
  }
  for (const wx of [x + w * 0.18, x + w * 0.82]) bogie(ctx, wx, base, u, c.spin);
}

/* autorail Micheline : caisse arrondie rouge et crème, roues à pneus */
function micheline(c: Ctx, x: number, w: number) {
  const { ctx, u, base, lit } = c;
  const bottom = base - 12 * u, top = bottom - 44 * u;
  const red = c.night ? "#8a1d17" : "#b3261e";
  ctx.beginPath();
  ctx.moveTo(x, bottom);
  ctx.quadraticCurveTo(x, top, x + 40 * u, top);
  ctx.lineTo(x + w - 40 * u, top);
  ctx.quadraticCurveTo(x + w, top, x + w, bottom);
  ctx.closePath();
  ctx.fillStyle = bodyGradient(ctx, top, bottom, red);
  ctx.fill();
  ctx.fillStyle = c.night ? "#c9c0aa" : "#efe6cf";
  ctx.beginPath();
  ctx.moveTo(x + 2 * u, bottom);
  ctx.quadraticCurveTo(x + 4 * u, bottom - 20 * u, x + 30 * u, bottom - 20 * u);
  ctx.lineTo(x + w - 30 * u, bottom - 20 * u);
  ctx.quadraticCurveTo(x + w - 4 * u, bottom - 20 * u, x + w - 2 * u, bottom);
  ctx.closePath();
  ctx.fill();
  const n = 9, gap = 6 * u, ww = (w - 80 * u - gap * (n - 1)) / n;
  for (let k = 0; k < n; k++) glass(ctx, x + 40 * u + k * (ww + gap), top + 8 * u, ww, 13 * u, 3 * u, lit, u * 0.6);
  glass(ctx, x + w - 30 * u, top + 10 * u, 16 * u, 11 * u, 4 * u, false, u * 0.5);
  for (const bx of [x + w * 0.2, x + w * 0.8]) {
    ctx.fillStyle = "#1b222c";
    rr(ctx, bx - 16 * u, bottom - 1 * u, 32 * u, 5 * u, 2 * u);
    ctx.fill();
    for (const k of [-10, 0, 10]) {
      ctx.fillStyle = "#11151b";
      ctx.beginPath();
      ctx.arc(bx + k * u, base - 5 * u, 5 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6b7480";
      ctx.beginPath();
      ctx.arc(bx + k * u, base - 5 * u, 1.6 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return { x: x + w * 0.5, y: bottom - 10 * u, r: 8 * u, lamp: { x: x + w - 3 * u, y: bottom - 10 * u } };
}

/* autorail à crémaillère : caisse anguleuse rouge, larges vitres panoramiques */
function rackCar(c: Ctx, x: number, w: number, head: boolean) {
  const { ctx, u, base, lit, livery } = c;
  const paint = c.night ? "#7d2a14" : "#b4532a";
  const bottom = base - LIFT * u, top = bottom - 44 * u;
  underframe(ctx, x, w, bottom - 1 * u, u);
  ctx.beginPath();
  ctx.moveTo(x + (head ? 0 : 10 * u), top);
  ctx.lineTo(x + w - (head ? 12 * u : 0), top);
  ctx.lineTo(x + w + (head ? 2 * u : 0), top + 20 * u);
  ctx.lineTo(x + w, bottom);
  ctx.lineTo(x, bottom);
  ctx.lineTo(x - (head ? 0 : 2 * u), top + 20 * u);
  ctx.closePath();
  ctx.fillStyle = bodyGradient(ctx, top, bottom, paint);
  ctx.fill();
  ctx.fillStyle = c.night ? "#bcc3cc" : "#f1ede4";
  ctx.fillRect(x + 2 * u, bottom - 13 * u, w - 4 * u, 5 * u);
  ctx.fillStyle = livery;
  ctx.fillRect(x + 2 * u, bottom - 8 * u, w - 4 * u, 2 * u);
  const n = 4, gap = 5 * u, ww = (w - 30 * u - gap * (n - 1)) / n;
  for (let k = 0; k < n; k++) glass(ctx, x + 14 * u + k * (ww + gap), top + 6 * u, ww, 22 * u, 2 * u, lit, u);
  // roue dentée de crémaillère sous le châssis
  ctx.fillStyle = "#3a4250";
  ctx.beginPath();
  ctx.arc(x + w / 2, base - 6 * u, 6 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5d6672";
  ctx.lineWidth = 1.2 * u;
  for (let k = 0; k < 10; k++) {
    const a = c.spin + (k * Math.PI) / 5;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 + Math.cos(a) * 5 * u, base - 6 * u + Math.sin(a) * 5 * u);
    ctx.lineTo(x + w / 2 + Math.cos(a) * 7.5 * u, base - 6 * u + Math.sin(a) * 7.5 * u);
    ctx.stroke();
  }
  pantograph(ctx, x + w * 0.5, top, u, head);
  bogie(ctx, x + w * 0.18, base, u, c.spin);
  bogie(ctx, x + w * 0.82, base, u, c.spin);
  return { x: x + w * 0.3, y: bottom - 10 * u, r: 7 * u, lamp: { x: x + w + 1 * u, y: bottom - 8 * u } };
}

/* motrice à deux niveaux */
function duplexHead(c: Ctx, x: number, w: number) {
  const { ctx, u, base, livery, lit } = c;
  const h = 64 * u;
  const bottom = base - LIFT * u, top = bottom - h;
  const body = white(c);
  underframe(ctx, x, w, bottom - 1 * u, u);
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(x + 7 * u, top);
    ctx.lineTo(x + w - 46 * u, top);
    ctx.quadraticCurveTo(x + w + 4 * u, top + 6 * u, x + w + 6 * u, bottom);
    ctx.lineTo(x, bottom);
    ctx.lineTo(x, top + 7 * u);
    ctx.quadraticCurveTo(x, top, x + 7 * u, top);
    ctx.closePath();
  };
  shape();
  ctx.fillStyle = bodyGradient(ctx, top, bottom, body);
  ctx.fill();
  ctx.save();
  shape();
  ctx.clip();
  ctx.fillStyle = livery;
  ctx.fillRect(x, bottom - 12 * u, w + 10 * u, 6 * u);
  ctx.fillRect(x, top + 28 * u, w + 10 * u, 3 * u);
  ctx.restore();
  shape();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 0.8 * u;
  ctx.stroke();
  ctx.fillStyle = "#172231";
  ctx.beginPath();
  ctx.moveTo(x + w - 40 * u, top + 6 * u);
  ctx.quadraticCurveTo(x + w - 6 * u, top + 9 * u, x + w + 1 * u, top + 26 * u);
  ctx.lineTo(x + w - 40 * u, top + 26 * u);
  ctx.closePath();
  ctx.fill();
  for (const wy of [top + 9 * u, top + 35 * u]) for (let k = 0; k < 3; k++) glass(ctx, x + 10 * u + k * 30 * u, wy, 25 * u, 14 * u, 2 * u, lit, u);
  pantograph(ctx, x + w * 0.35, top, u, true);
  bogie(ctx, x + w * 0.2, base, u, c.spin);
  bogie(ctx, x + w * 0.8, base, u, c.spin);
  return { x: x + w * 0.55, y: bottom - 20 * u, r: 9 * u, lamp: { x: x + w + 3 * u, y: bottom - 8 * u } };
}

/* ============================================================
   2.1 : le fret. Quatre locomotives et sept wagons, dessinés à la main
   comme le reste du matériel. Chaque wagon montre sa marchandise : on
   reconnaît une rame de céréales d'une rame d'automobiles au premier coup
   d'œil, sur la carte comme en vue cabine.
   ============================================================ */

/* châssis, tampons et bogies communs aux wagons */
function wagonFrame(c: Ctx, x: number, w: number, deckH = 6) {
  const { ctx, u, base } = c;
  const bottom = base - LIFT * u;
  // longeron
  ctx.fillStyle = "#232a33";
  ctx.fillRect(x + 2 * u, bottom - deckH * u, w - 4 * u, deckH * u);
  ctx.fillStyle = "#323a46";
  ctx.fillRect(x + 2 * u, bottom - deckH * u, w - 4 * u, 1.4 * u);
  // tampons aux deux bouts
  ctx.fillStyle = "#1a2028";
  ctx.fillRect(x - 2 * u, bottom - 5 * u, 4 * u, 3 * u);
  ctx.fillRect(x + w - 2 * u, bottom - 5 * u, 4 * u, 3 * u);
  ctx.fillStyle = "#6b7480";
  ctx.fillRect(x - 3 * u, bottom - 5.5 * u, 1.4 * u, 4 * u);
  ctx.fillRect(x + w + 1.6 * u, bottom - 5.5 * u, 1.4 * u, 4 * u);
  bogie(ctx, x + w * 0.17, base, u, c.spin);
  bogie(ctx, x + w * 0.83, base, u, c.spin + 0.7);
  return bottom - deckH * u; // haut du plancher
}

/* petite plaque d'identification, un détail qui fait « vrai » */
function plate(ctx, x: number, y: number, u: number, text: string, bg = "#f2efe6", fg = "#1c1b17") {
  ctx.font = `600 ${5.2 * u}px "Space Mono", monospace`;
  const tw = ctx.measureText(text).width + 4 * u;
  ctx.fillStyle = bg;
  rr(ctx, x - tw / 2, y - 4 * u, tw, 7 * u, 1 * u);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y - 0.4 * u);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

/* wagon-trémie à céréales : flancs nervurés, trémies en V sous la caisse, trappes sur le toit */
function hopperWagon(c: Ctx, x: number, w: number) {
  const { ctx, u } = c;
  const deck = wagonFrame(c, x, w, 4);
  const paint = c.night ? "#6f6a60" : "#a39a88";
  const top = deck - 40 * u;
  const sideBottom = deck - 12 * u;
  // trémies
  ctx.fillStyle = dark(paint, 0.28);
  for (const [a, b] of [[0.24, 0.46], [0.54, 0.76]]) {
    ctx.beginPath();
    ctx.moveTo(x + w * a - 6 * u, sideBottom);
    ctx.lineTo(x + w * b + 6 * u, sideBottom);
    ctx.lineTo(x + w * (b - 0.05), deck + 2 * u);
    ctx.lineTo(x + w * (a + 0.05), deck + 2 * u);
    ctx.closePath();
    ctx.fill();
  }
  // caisse, toit légèrement bombé
  ctx.beginPath();
  ctx.moveTo(x + 3 * u, sideBottom);
  ctx.lineTo(x + 3 * u, top + 4 * u);
  ctx.quadraticCurveTo(x + w / 2, top - 4 * u, x + w - 3 * u, top + 4 * u);
  ctx.lineTo(x + w - 3 * u, sideBottom);
  ctx.closePath();
  ctx.fillStyle = bodyGradient(ctx, top, sideBottom, paint);
  ctx.fill();
  // nervures verticales
  ctx.strokeStyle = dark(paint, 0.22);
  ctx.lineWidth = 1.1 * u;
  for (let gx = x + 9 * u; gx < x + w - 6 * u; gx += 9 * u) {
    ctx.beginPath();
    ctx.moveTo(gx, top + 4 * u);
    ctx.lineTo(gx, sideBottom - 1 * u);
    ctx.stroke();
  }
  ctx.strokeStyle = light(paint, 0.3);
  ctx.lineWidth = 0.6 * u;
  for (let gx = x + 10 * u; gx < x + w - 6 * u; gx += 9 * u) {
    ctx.beginPath();
    ctx.moveTo(gx, top + 5 * u);
    ctx.lineTo(gx, sideBottom - 1 * u);
    ctx.stroke();
  }
  // trappes de chargement sur le toit
  ctx.fillStyle = dark(paint, 0.35);
  for (let k = 0; k < 4; k++) rr(ctx, x + w * (0.14 + k * 0.21), top - 1.5 * u, w * 0.1, 3 * u, 1 * u), ctx.fill();
  // un peu de grain qui dépasse d'une trappe
  ctx.fillStyle = "#e3c06a";
  ctx.beginPath();
  ctx.ellipse(x + w * 0.4, top - 1.5 * u, w * 0.04, 1.6 * u, 0, Math.PI, 0);
  ctx.fill();
  plate(ctx, x + w * 0.5, sideBottom - 7 * u, u, "CÉRÉALES");
}

/* wagon plat : bobines d'acier sur berceaux, ou grumes sanglées entre les ranchers */
function plateWagon(c: Ctx, x: number, w: number, seed: number) {
  const { ctx, u } = c;
  const deck = wagonFrame(c, x, w, 6);
  if (seed % 2 === 0) {
    // bobines d'acier, vues de profil : leur œil fait face
    const n = 3;
    const r = Math.min(13 * u, (w - 20 * u) / (n * 2.3));
    for (let k = 0; k < n; k++) {
      const cx = x + w * (0.2 + k * 0.3), cy = deck - r - 2 * u;
      ctx.fillStyle = "#2b323c";
      ctx.fillRect(cx - r * 0.9, deck - 3 * u, r * 1.8, 3 * u); // berceau
      const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
      g.addColorStop(0, c.night ? "#b9c0c8" : "#e7ecf1");
      g.addColorStop(0.55, c.night ? "#7f8892" : "#a9b3bd");
      g.addColorStop(1, c.night ? "#4c545e" : "#6c7682");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      // spires
      ctx.strokeStyle = "rgba(40,48,58,0.35)";
      ctx.lineWidth = 0.6 * u;
      for (let rr2 = r * 0.5; rr2 < r; rr2 += 2.2 * u) {
        ctx.beginPath();
        ctx.arc(cx, cy, rr2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#1b222c";
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // grumes empilées, tranches claires, sangles orange
    const top = deck - 30 * u;
    ctx.fillStyle = "#3b4049";
    for (const f of [0.04, 0.33, 0.66, 0.95]) ctx.fillRect(x + w * f - 1.2 * u, top - 4 * u, 2.4 * u, 34 * u); // ranchers
    const rows = 3, logR = 5 * u;
    for (let row = 0; row < rows; row++) {
      const y = deck - logR - row * logR * 1.75;
      const g = ctx.createLinearGradient(0, y - logR, 0, y + logR);
      g.addColorStop(0, "#9b6a3f");
      g.addColorStop(0.5, "#7a4f2c");
      g.addColorStop(1, "#5a3a20");
      ctx.fillStyle = g;
      rr(ctx, x + 5 * u + (row % 2) * 3 * u, y - logR, w - 12 * u - (row % 2) * 4 * u, logR * 2, logR);
      ctx.fill();
      // tranches visibles au bout
      ctx.fillStyle = "#d9b48a";
      ctx.beginPath();
      ctx.ellipse(x + w - 7 * u - (row % 2) * 1 * u, y, logR * 0.45, logR * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#a07850";
      ctx.lineWidth = 0.5 * u;
      ctx.beginPath();
      ctx.ellipse(x + w - 7 * u - (row % 2) * 1 * u, y, logR * 0.25, logR * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#e07a2c";
    for (const f of [0.25, 0.75]) ctx.fillRect(x + w * f - 1 * u, deck - logR * 2 - 2 * logR * 1.75, 2 * u, logR * 2 + 2 * logR * 1.75);
  }
}

/* porte-conteneurs : deux conteneurs de 20 pieds, ondulés */
function containerWagon(c: Ctx, x: number, w: number, seed: number) {
  const { ctx, u } = c;
  const deck = wagonFrame(c, x, w, 5);
  const n = 2, gap = 3 * u, bw = (w - 8 * u - gap) / n, bh = 34 * u;
  for (let k = 0; k < n; k++) {
    const col = BOX_COLORS[(seed * 3 + k * 5) % BOX_COLORS.length];
    const paint = c.night ? dark(col, 0.25) : col;
    const bx = x + 4 * u + k * (bw + gap), by = deck - bh;
    ctx.fillStyle = bodyGradient(ctx, by, by + bh, paint);
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = dark(paint, 0.28);
    ctx.lineWidth = 0.8 * u;
    for (let gx = bx + 3 * u; gx < bx + bw - 1 * u; gx += 3 * u) {
      ctx.beginPath();
      ctx.moveTo(gx, by + 3 * u);
      ctx.lineTo(gx, by + bh - 3 * u);
      ctx.stroke();
    }
    // cadre et coins de levage
    ctx.strokeStyle = dark(paint, 0.45);
    ctx.lineWidth = 1.2 * u;
    ctx.strokeRect(bx + 0.6 * u, by + 0.6 * u, bw - 1.2 * u, bh - 1.2 * u);
    ctx.fillStyle = "#1c2128";
    for (const [cx, cy] of [[bx, by], [bx + bw - 3 * u, by], [bx, by + bh - 3 * u], [bx + bw - 3 * u, by + bh - 3 * u]]) ctx.fillRect(cx, cy, 3 * u, 3 * u);
    // marquage
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `700 ${5 * u}px "Work Sans", sans-serif`;
    ctx.fillText(["RÉSEAU", "MISTRAL", "CARGO", "NORD"][(seed + k) % 4], bx + 5 * u, by + 9 * u);
  }
}

/* porte-autos à deux étages : châssis ajouré, voitures de toutes les couleurs */
const AUTO_COLORS = ["#c0392b", "#ecf0f1", "#2c3e50", "#2980b9", "#f1c40f", "#7f8c8d", "#27ae60", "#8e44ad"];
function car(ctx, x: number, y: number, len: number, u: number, col: string) {
  const h = len * 0.32;
  ctx.fillStyle = col;
  rr(ctx, x, y - h * 0.62, len, h * 0.62, h * 0.25);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + len * 0.22, y - h * 0.6);
  ctx.lineTo(x + len * 0.34, y - h);
  ctx.lineTo(x + len * 0.7, y - h);
  ctx.lineTo(x + len * 0.84, y - h * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(30,44,60,0.85)";
  ctx.beginPath();
  ctx.moveTo(x + len * 0.28, y - h * 0.62);
  ctx.lineTo(x + len * 0.37, y - h * 0.92);
  ctx.lineTo(x + len * 0.68, y - h * 0.92);
  ctx.lineTo(x + len * 0.78, y - h * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#111";
  for (const f of [0.22, 0.78]) {
    ctx.beginPath();
    ctx.arc(x + len * f, y - 0.6 * u, h * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}
function autoWagon(c: Ctx, x: number, w: number, seed: number) {
  const { ctx, u } = c;
  const deck = wagonFrame(c, x, w, 4);
  const frame = c.night ? "#4a525c" : "#7b8591";
  const top = deck - 44 * u, mid = deck - 22 * u;
  // voitures, en bas puis en haut
  const len = (w - 16 * u) / 3;
  for (let lvl = 0; lvl < 2; lvl++) {
    const y = lvl === 0 ? deck - 1 * u : mid - 1 * u;
    for (let k = 0; k < 3; k++) car(ctx, x + 6 * u + k * (len + 2 * u), y, len, u, AUTO_COLORS[(seed * 5 + lvl * 3 + k) % AUTO_COLORS.length]);
  }
  // plateaux et montants
  ctx.fillStyle = frame;
  ctx.fillRect(x + 2 * u, mid, w - 4 * u, 2.4 * u);
  ctx.fillRect(x + 2 * u, top, w - 4 * u, 2.6 * u);
  for (let k = 0; k <= 8; k++) ctx.fillRect(x + 2 * u + k * ((w - 6 * u) / 8), top, 2 * u, deck - top);
  // grillage latéral, très léger
  ctx.strokeStyle = "rgba(160,170,182,0.28)";
  ctx.lineWidth = 0.5 * u;
  for (let gx = x + 4 * u; gx < x + w - 4 * u; gx += 4 * u) {
    ctx.beginPath();
    ctx.moveTo(gx, top + 3 * u);
    ctx.lineTo(gx + 4 * u, mid);
    ctx.moveTo(gx, mid + 3 * u);
    ctx.lineTo(gx + 4 * u, deck);
    ctx.stroke();
  }
}

/* wagon-citerne : réservoir blanc, passerelle, dôme, plaque orange de danger */
function tankWagon(c: Ctx, x: number, w: number) {
  const { ctx, u } = c;
  const deck = wagonFrame(c, x, w, 4);
  const r = 17 * u, cy = deck - r - 4 * u;
  // berceaux
  ctx.fillStyle = "#2b323c";
  for (const f of [0.2, 0.8]) ctx.fillRect(x + w * f - 6 * u, cy + r * 0.4, 12 * u, deck - cy - r * 0.4);
  // réservoir
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  const tank = c.night ? "#a7adb4" : "#e9ecef";
  g.addColorStop(0, light(tank, 0.4));
  g.addColorStop(0.3, tank);
  g.addColorStop(0.8, dark(tank, 0.18));
  g.addColorStop(1, dark(tank, 0.35));
  ctx.fillStyle = g;
  rr(ctx, x + 4 * u, cy - r, w - 8 * u, r * 2, r);
  ctx.fill();
  // cerclages
  ctx.strokeStyle = "rgba(60,68,78,0.35)";
  ctx.lineWidth = 0.8 * u;
  for (const f of [0.25, 0.5, 0.75]) {
    ctx.beginPath();
    ctx.moveTo(x + w * f, cy - r + 1 * u);
    ctx.lineTo(x + w * f, cy + r - 1 * u);
    ctx.stroke();
  }
  // bande de sécurité
  ctx.fillStyle = "#d35400";
  ctx.fillRect(x + 6 * u, cy + 1 * u, w - 12 * u, 2.2 * u);
  // dôme et passerelle
  ctx.fillStyle = dark(tank, 0.2);
  rr(ctx, x + w / 2 - 7 * u, cy - r - 4 * u, 14 * u, 6 * u, 2 * u);
  ctx.fill();
  ctx.strokeStyle = "#59616c";
  ctx.lineWidth = 0.9 * u;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.3, cy - r - 1 * u);
  ctx.lineTo(x + w * 0.7, cy - r - 1 * u);
  ctx.moveTo(x + w * 0.3, cy - r - 6 * u);
  ctx.lineTo(x + w * 0.7, cy - r - 6 * u);
  for (let k = 0; k <= 4; k++) {
    ctx.moveTo(x + w * (0.3 + k * 0.1), cy - r - 6 * u);
    ctx.lineTo(x + w * (0.3 + k * 0.1), cy - r - 1 * u);
  }
  ctx.stroke();
  // échelle
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5 - 2 * u, cy - r);
  ctx.lineTo(x + w * 0.5 - 2 * u, deck);
  ctx.moveTo(x + w * 0.5 + 2 * u, cy - r);
  ctx.lineTo(x + w * 0.5 + 2 * u, deck);
  for (let yy = cy - r + 3 * u; yy < deck; yy += 3.5 * u) {
    ctx.moveTo(x + w * 0.5 - 2 * u, yy);
    ctx.lineTo(x + w * 0.5 + 2 * u, yy);
  }
  ctx.stroke();
  // plaque orange de danger
  ctx.fillStyle = "#f39c12";
  rr(ctx, x + w * 0.72, cy - 8 * u, 14 * u, 10 * u, 1 * u);
  ctx.fill();
  ctx.strokeStyle = "#1c1b17";
  ctx.lineWidth = 0.6 * u;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.72, cy - 3 * u);
  ctx.lineTo(x + w * 0.72 + 14 * u, cy - 3 * u);
  ctx.stroke();
  ctx.fillStyle = "#1c1b17";
  ctx.font = `700 ${3.6 * u}px "Space Mono", monospace`;
  ctx.textAlign = "center";
  ctx.fillText("33", x + w * 0.72 + 7 * u, cy - 4 * u);
  ctx.fillText("1203", x + w * 0.72 + 7 * u, cy + 1 * u);
  ctx.textAlign = "start";
}

/* wagon couvert capitonné : planches rouge-brun, porte coulissante, toit cintré */
function boxcarWagon(c: Ctx, x: number, w: number) {
  const { ctx, u } = c;
  const deck = wagonFrame(c, x, w, 4);
  const paint = c.night ? "#4e2a22" : "#7d3a2b";
  const top = deck - 42 * u;
  ctx.fillStyle = bodyGradient(ctx, top, deck, paint);
  ctx.fillRect(x + 3 * u, top + 4 * u, w - 6 * u, deck - top - 4 * u);
  // toit cintré
  ctx.fillStyle = c.night ? "#5b636d" : "#8c949e";
  ctx.beginPath();
  ctx.moveTo(x + 1 * u, top + 5 * u);
  ctx.quadraticCurveTo(x + w / 2, top - 4 * u, x + w - 1 * u, top + 5 * u);
  ctx.closePath();
  ctx.fill();
  // planches
  ctx.strokeStyle = dark(paint, 0.3);
  ctx.lineWidth = 0.6 * u;
  for (let gx = x + 7 * u; gx < x + w - 4 * u; gx += 4.5 * u) {
    ctx.beginPath();
    ctx.moveTo(gx, top + 5 * u);
    ctx.lineTo(gx, deck);
    ctx.stroke();
  }
  // ferrures en croix aux extrémités
  ctx.strokeStyle = dark(paint, 0.45);
  ctx.lineWidth = 0.8 * u;
  for (const [a, b] of [[x + 4 * u, x + w * 0.3], [x + w * 0.7, x + w - 4 * u]]) {
    ctx.beginPath();
    ctx.moveTo(a, top + 6 * u);
    ctx.lineTo(b, deck - 1 * u);
    ctx.moveTo(b, top + 6 * u);
    ctx.lineTo(a, deck - 1 * u);
    ctx.stroke();
  }
  // porte coulissante et son rail
  const dw = w * 0.26, dx = x + w / 2 - dw / 2;
  ctx.fillStyle = dark(paint, 0.12);
  ctx.fillRect(dx, top + 7 * u, dw, deck - top - 8 * u);
  ctx.strokeStyle = "#1c1210";
  ctx.lineWidth = 1 * u;
  ctx.strokeRect(dx, top + 7 * u, dw, deck - top - 8 * u);
  ctx.fillStyle = "#2a2f36";
  ctx.fillRect(dx - 6 * u, top + 6 * u, dw + 12 * u, 1.6 * u);
  ctx.fillRect(dx + dw - 4 * u, (top + deck) / 2, 2 * u, 6 * u); // poignée
  plate(ctx, dx + dw / 2, top + 15 * u, u, "FRAGILE", "#f4d06f");
}

/* wagon frigorifique : caisse blanche isolée, bande bleue, groupe froid au bout */
function reeferWagon(c: Ctx, x: number, w: number) {
  const { ctx, u } = c;
  const deck = wagonFrame(c, x, w, 4);
  const paint = c.night ? "#b9c0c8" : "#f1f4f7";
  const top = deck - 42 * u;
  rr(ctx, x + 3 * u, top, w - 6 * u, deck - top, 3 * u);
  ctx.fillStyle = bodyGradient(ctx, top, deck, paint);
  ctx.fill();
  // nervures horizontales de la caisse isolée
  ctx.strokeStyle = "rgba(90,104,120,0.18)";
  ctx.lineWidth = 0.6 * u;
  for (let yy = top + 6 * u; yy < deck - 2 * u; yy += 5 * u) {
    ctx.beginPath();
    ctx.moveTo(x + 5 * u, yy);
    ctx.lineTo(x + w - 5 * u, yy);
    ctx.stroke();
  }
  ctx.fillStyle = "#2f6f9e";
  ctx.fillRect(x + 3 * u, deck - 15 * u, w - 6 * u, 5 * u);
  ctx.fillStyle = "#7fb3d9";
  ctx.fillRect(x + 3 * u, deck - 10 * u, w - 6 * u, 1.2 * u);
  // groupe froid, grille et ventilateur
  const gx = x + w - 30 * u, gy = top + 6 * u;
  ctx.fillStyle = "#3a4452";
  rr(ctx, gx, gy, 22 * u, 20 * u, 2 * u);
  ctx.fill();
  ctx.strokeStyle = "#596474";
  ctx.lineWidth = 0.6 * u;
  for (let yy = gy + 3 * u; yy < gy + 18 * u; yy += 2.2 * u) {
    ctx.beginPath();
    ctx.moveTo(gx + 2 * u, yy);
    ctx.lineTo(gx + 20 * u, yy);
    ctx.stroke();
  }
  ctx.strokeStyle = "#8fa0b3";
  ctx.lineWidth = 0.9 * u;
  ctx.beginPath();
  ctx.arc(gx + 11 * u, gy + 10 * u, 6 * u, 0, Math.PI * 2);
  ctx.stroke();
  const a = c.t * 9;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    ctx.moveTo(gx + 11 * u, gy + 10 * u);
    ctx.lineTo(gx + 11 * u + Math.cos(a + k * 2.1) * 5 * u, gy + 10 * u + Math.sin(a + k * 2.1) * 5 * u);
  }
  ctx.stroke();
  // flocon
  ctx.strokeStyle = "#2f6f9e";
  ctx.lineWidth = 1 * u;
  const fx = x + 18 * u, fy = top + 16 * u;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const an = (k * Math.PI) / 3;
    ctx.moveTo(fx - Math.cos(an) * 5 * u, fy - Math.sin(an) * 5 * u);
    ctx.lineTo(fx + Math.cos(an) * 5 * u, fy + Math.sin(an) * 5 * u);
  }
  ctx.stroke();
  ctx.fillStyle = "#2f6f9e";
  ctx.font = `700 ${5.5 * u}px "Work Sans", sans-serif`;
  ctx.fillText("FROID", x + 26 * u, top + 18 * u);
}

/* locotracteur : petite machine de manœuvre, cabine à un bout, capot bas, chevrons jaune et noir */
function shunter(c: Ctx, x: number, w: number, paint: string) {
  const { ctx, u, base, lit } = c;
  const bottom = base - 12 * u;
  // châssis bas et chevrons de sécurité
  ctx.fillStyle = "#1e252e";
  ctx.fillRect(x, bottom - 5 * u, w, 7 * u);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 1 * u, bottom - 5 * u, 10 * u, 7 * u);
  ctx.rect(x + w - 9 * u, bottom - 5 * u, 10 * u, 7 * u);
  ctx.clip();
  ctx.fillStyle = "#f1c40f";
  ctx.fillRect(x - 2 * u, bottom - 6 * u, w + 4 * u, 9 * u);
  ctx.fillStyle = "#1c1b17";
  for (let k = -20; k < w + 20; k += 5 * u) {
    ctx.beginPath();
    ctx.moveTo(x + k, bottom + 3 * u);
    ctx.lineTo(x + k + 2.5 * u, bottom + 3 * u);
    ctx.lineTo(x + k + 9.5 * u, bottom - 6 * u);
    ctx.lineTo(x + k + 7 * u, bottom - 6 * u);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // capot moteur
  const hoodTop = bottom - 26 * u;
  rr(ctx, x + 6 * u, hoodTop, w * 0.6, 21 * u, 3 * u);
  ctx.fillStyle = bodyGradient(ctx, hoodTop, bottom, paint);
  ctx.fill();
  ctx.strokeStyle = dark(paint, 0.3);
  ctx.lineWidth = 0.6 * u;
  for (let gx = x + 12 * u; gx < x + 6 * u + w * 0.6 - 6 * u; gx += 7 * u) {
    ctx.beginPath();
    ctx.moveTo(gx, hoodTop + 4 * u);
    ctx.lineTo(gx, bottom - 8 * u);
    ctx.stroke();
  }
  // pot d'échappement
  ctx.fillStyle = "#2a2f36";
  ctx.fillRect(x + 16 * u, hoodTop - 5 * u, 3.5 * u, 5 * u);
  // cabine
  const cx = x + 6 * u + w * 0.6 - 2 * u, cw = w - (cx - x) - 3 * u, cTop = bottom - 42 * u;
  rr(ctx, cx, cTop, cw, 37 * u, 2.5 * u);
  ctx.fillStyle = bodyGradient(ctx, cTop, bottom, paint);
  ctx.fill();
  ctx.fillStyle = dark(paint, 0.35);
  ctx.fillRect(cx - 1 * u, cTop - 2 * u, cw + 2 * u, 3 * u);
  glass(ctx, cx + 3 * u, cTop + 5 * u, cw - 6 * u, 13 * u, 1.5 * u, lit, u * 0.5);
  // deux essieux, sans bogie
  wheel(ctx, x + w * 0.25, base - 8 * u, 8 * u, c.spin);
  wheel(ctx, x + w * 0.72, base - 8 * u, 8 * u, c.spin + 1);
  ctx.strokeStyle = "#59616c";
  ctx.lineWidth = 1.6 * u;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, base - 8 * u);
  ctx.lineTo(x + w * 0.72, base - 8 * u);
  ctx.stroke();
  const lampX = x + w + 1 * u, lampY = bottom - 10 * u;
  ctx.fillStyle = lit ? "#fff6d8" : "#f4f1e4";
  ctx.beginPath();
  ctx.arc(lampX - 2 * u, lampY, 2 * u, 0, Math.PI * 2);
  ctx.fill();
  return { x: x + 6 * u + w * 0.3, y: hoodTop + 10 * u, r: 7 * u, lamp: { x: lampX, y: lampY } };
}

/* locomotive moderne à cabines inclinées : la Messagerie (une) et l'Électrique longue distance (deux pantographes) */
function modernLoco(c: Ctx, x: number, w: number, paint: string, stripe: string, twin: boolean) {
  const { ctx, u, base, lit } = c;
  const h = (CAR_H + 4) * u;
  const bottom = base - LIFT * u;
  const top = bottom - h;
  underframe(ctx, x, w, bottom - 1 * u, u);
  const nose = 22 * u;
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(x + nose * 0.55, top);
    ctx.lineTo(x + w - nose * 0.55, top);
    ctx.lineTo(x + w + 1 * u, top + h * 0.42);
    ctx.lineTo(x + w + 2 * u, bottom);
    ctx.lineTo(x - 2 * u, bottom);
    ctx.lineTo(x - 1 * u, top + h * 0.42);
    ctx.closePath();
  };
  shape();
  ctx.fillStyle = bodyGradient(ctx, top, bottom, paint);
  ctx.fill();
  ctx.save();
  shape();
  ctx.clip();
  // bas de caisse sombre et bande de couleur en biais
  ctx.fillStyle = dark(paint, 0.55);
  ctx.fillRect(x - 4 * u, bottom - 11 * u, w + 8 * u, 11 * u);
  ctx.fillStyle = stripe;
  ctx.beginPath();
  ctx.moveTo(x - 4 * u, bottom - 14 * u);
  ctx.lineTo(x + w * 0.62, bottom - 14 * u);
  ctx.lineTo(x + w * 0.7, bottom - 24 * u);
  ctx.lineTo(x + w + 4 * u, bottom - 24 * u);
  ctx.lineTo(x + w + 4 * u, bottom - 20 * u);
  ctx.lineTo(x + w * 0.72, bottom - 20 * u);
  ctx.lineTo(x + w * 0.64, bottom - 11 * u);
  ctx.lineTo(x - 4 * u, bottom - 11 * u);
  ctx.closePath();
  ctx.fill();
  // toit
  ctx.fillStyle = dark(paint, 0.25);
  ctx.fillRect(x - 4 * u, top, w + 8 * u, 3.5 * u);
  ctx.restore();
  shape();
  ctx.strokeStyle = "rgba(0,0,0,0.38)";
  ctx.lineWidth = 0.8 * u;
  ctx.stroke();
  // pare-brise inclinés
  for (const end of [0, 1]) {
    ctx.beginPath();
    if (end) {
      ctx.moveTo(x + w - nose * 0.5, top + 4 * u);
      ctx.lineTo(x + w - 3 * u, top + 4 * u);
      ctx.lineTo(x + w - 0.5 * u, top + h * 0.38);
      ctx.lineTo(x + w - nose * 0.75, top + h * 0.38);
    } else {
      ctx.moveTo(x + nose * 0.5, top + 4 * u);
      ctx.lineTo(x + 3 * u, top + 4 * u);
      ctx.lineTo(x + 0.5 * u, top + h * 0.38);
      ctx.lineTo(x + nose * 0.75, top + h * 0.38);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, top + h * 0.4);
    g.addColorStop(0, lit ? "#ffe8b0" : "#3a4a5e");
    g.addColorStop(1, lit ? "#f0b45a" : "#121a25");
    ctx.fillStyle = g;
    ctx.fill();
  }
  // grilles d'aération en bandeau
  ctx.fillStyle = dark(paint, 0.4);
  const gx0 = x + nose + 6 * u, gw = w - 2 * nose - 12 * u;
  rr(ctx, gx0, top + 8 * u, gw, 11 * u, 1.5 * u);
  ctx.fill();
  ctx.strokeStyle = dark(paint, 0.15);
  ctx.lineWidth = 0.6 * u;
  for (let gx = gx0 + 2 * u; gx < gx0 + gw - 1 * u; gx += 2.4 * u) {
    ctx.beginPath();
    ctx.moveTo(gx, top + 9 * u);
    ctx.lineTo(gx, top + 18 * u);
    ctx.stroke();
  }
  // porte de service
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.strokeRect(x + w * 0.5 - 4 * u, top + 22 * u, 8 * u, bottom - top - 26 * u);
  const lampX = x + w + 1 * u, lampY = bottom - 8 * u;
  ctx.fillStyle = lit ? "#fff6d8" : "#f4f1e4";
  ctx.beginPath();
  ctx.ellipse(lampX - 3 * u, lampY, 2.6 * u, 1.6 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  pantograph(ctx, x + w * 0.3, top, u, true);
  if (twin) pantograph(ctx, x + w * 0.7, top, u, false);
  bogie(ctx, x + w * 0.2, base, u, c.spin);
  bogie(ctx, x + w * 0.8, base, u, c.spin);
  return { x: x + w * 0.5, y: top + 30 * u, r: 9 * u, lamp: { x: lampX, y: lampY } };
}

/* le dessin d'un wagon, par son identifiant (W_TREMIE…) */
const WAGON_KIND: Record<string, string> = {
  W_TREMIE: "hopper",
  W_PLAT: "plate",
  W_CONTENEUR: "container",
  W_PORTE_AUTOS: "autos",
  W_CITERNE: "tank",
  W_CAPITONNE: "boxcar",
  W_FRIGO: "reefer",
};
export const FREIGHT_LOCOS = ["LOCOTRACTEUR", "FRET_LOURD", "FRET_RAPIDE", "FRET_ELECTRIQUE"];

/* 2.1 : plaque nominative gravée — laiton poli, émail bleu ou bois verni */
export function drawNameplate(ctx: CanvasRenderingContext2D, cx: number, cy: number, u: number, style: string, text: string) {
  const label = text.toUpperCase().slice(0, 22);
  const fs = 5.6 * u;
  ctx.save();
  ctx.font = `700 ${fs}px ${style === "email" ? "'Work Sans', sans-serif" : "'Bitter', serif"}`;
  const w = ctx.measureText(label).width + 10 * u, h = 9 * u;
  const x = cx - w / 2, y = cy - h / 2;
  const pal =
    style === "email"
      ? { a: "#2a5aa8", b: "#173a78", edge: "#f2f4f8", ink: "#f2f4f8" }
      : style === "bois"
      ? { a: "#8a5a32", b: "#5e3b1f", edge: "#c9a36b", ink: "#f3e3c3" }
      : { a: "#f3d98a", b: "#b98a2c", edge: "#7a5a1a", ink: "#3a2a0a" };
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, pal.a);
  g.addColorStop(1, pal.b);
  rr(ctx, x, y, w, h, 1.8 * u);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 0.8 * u;
  ctx.strokeStyle = pal.edge;
  ctx.stroke();
  // rivets
  ctx.fillStyle = pal.edge;
  for (const rx of [x + 2.2 * u, x + w - 2.2 * u]) {
    ctx.beginPath();
    ctx.arc(rx, cy, 0.8 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  if (style === "laiton") {
    // reflet du métal poli
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x + 2 * u, y + 1 * u, w - 4 * u, 1.2 * u);
  }
  ctx.fillStyle = pal.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy + 0.3 * u);
  ctx.restore();
}

/* ---------- la rame entière ---------- */

type Piece = { w: number; draw: (x: number) => any };

export function drawConsist(ctx: CanvasRenderingContext2D, o: ConsistOptions): ConsistBox {
  const kind = o.skin || o.model || "STANDARD";
  const extra = [...(o.cars ?? [])].reverse();
  // 2.1 : les wagons de fret, de la queue à la tête ; chacun garde sa graine pour varier les chargements
  const wagons = extra.filter((k) => WAGON_KIND[k]).map((k, i) => ({ w: k === "W_PORTE_AUTOS" ? 190 : 165, kind: WAGON_KIND[k], arg: i + 1 }));
  const L = 200; // longueur d'une voiture à l'échelle 1

  // la composition, de la queue à la tête, en unités d'échelle
  const plan: { w: number; kind: string; arg?: any }[] = (() => {
    switch (kind) {
      case "vapeur":
      case "VAPEUR":
        return [{ w: 170, kind: "heritage" }, { w: 170, kind: "heritage" }, { w: 66, kind: "tender" }, { w: 150, kind: "steam" }];
      case "micheline":
        return [{ w: 300, kind: "micheline" }];
      case "pullman":
        return [{ w: 190, kind: "pullman", arg: ["#5b1e2d", "PULLMAN"] }, { w: 190, kind: "pullman", arg: ["#5b1e2d", "PULLMAN"] }, { w: 150, kind: "box", arg: ["#2a1a1e", "#d9a441"] }];
      case "train-bleu": // 2.0 : épave restaurée, les voitures-lits bleu nuit
        return [{ w: 190, kind: "pullman", arg: ["#1d2f5c", "VOITURE-LITS"] }, { w: 190, kind: "pullman", arg: ["#1d2f5c", "VOITURE-LITS"] }, { w: 150, kind: "box", arg: ["#141c33", "#d9a441"] }];
      case "LUXE":
        return [...extra.map((k) => ({ w: L, kind: "coach", arg: k })), { w: 190, kind: "pullman", arg: ["#1c2a4a", "VOITURE-SALON"] }, { w: 190, kind: "pullman", arg: ["#1c2a4a", "VOITURE-SALON"] }, { w: 150, kind: "box", arg: ["#151d2e", "#d9a441"] }];
      case "duplex":
        return [{ w: L, kind: "deck2" }, { w: L, kind: "deck2" }, { w: 190, kind: "duplexHead" }];
      case "grande-vitesse":
        return [{ w: L, kind: "coachSilver" }, { w: L, kind: "coachSilver" }, { w: 230, kind: "express", arg: true }];
      case "EXPRESS":
        return [...extra.map((k) => ({ w: L, kind: "coach", arg: k })), { w: L, kind: "coach" }, { w: L, kind: "coach" }, { w: 230, kind: "express" }];
      // 2.1.1 : le train de nuit international — voitures-lits bleu nuit, voiture-restaurant, couchettes
      case "NUIT_EUROPE":
        return [
          ...extra.map((k) => ({ w: L, kind: "coach", arg: k })),
          { w: L, kind: "sleeper" },
          { w: 190, kind: "pullman", arg: ["#1d2f5c", "VOITURES-LITS"] },
          { w: 190, kind: "pullman", arg: ["#5b1e2d", "RESTAURANT"] },
          { w: 190, kind: "pullman", arg: ["#1d2f5c", "VOITURES-LITS"] },
          { w: 215, kind: "modern", arg: [o.livery, "#d9a441", false] },
        ];
      case "COUCHETTES":
        return [...extra.map((k) => ({ w: L, kind: "coach", arg: k })), { w: L, kind: "sleeper" }, { w: L, kind: "sleeper" }, { w: 150, kind: "box", arg: [o.livery, "#e8edf5"] }];
      // 2.1 : des wagons seuls (vignettes du catalogue et de la boutique)
      case "WAGONS":
        return wagons;
      // 2.1 : les locomotives de fret tirent leurs wagons ; sans wagon, la machine seule
      case "LOCOTRACTEUR":
        return [...wagons, { w: 120, kind: "shunter", arg: o.livery }];
      case "FRET_LOURD":
        return [...(wagons.length ? wagons : (o.cars ?? []).length ? [] : [{ w: 160, kind: "flat", arg: 1 }, { w: 160, kind: "flat", arg: 2 }]), { w: 160, kind: "box", arg: [o.livery, "#f4d06f"] }];
      case "FRET_RAPIDE":
        return [...wagons, { w: 175, kind: "modern", arg: [o.livery, "#e8edf5", false] }];
      case "FRET_ELECTRIQUE":
        return [...wagons, { w: 215, kind: "modern", arg: [o.livery, "#f4b13e", true] }];
      case "CREMAILLERE":
        return [...extra.map((k) => ({ w: 150, kind: "coach", arg: k })), { w: 150, kind: "rack", arg: false }, { w: 150, kind: "rack", arg: true }];
      default:
        return [...extra.map((k) => ({ w: L, kind: "coach", arg: k })), { w: L, kind: "coach" }, { w: L, kind: "coach" }, { w: 200, kind: "regional" }];
    }
  })();

  // la rame tient dans la largeur donnée
  const gapU = 6;
  const naturalU = plan.reduce((s, p) => s + p.w, 0) + gapU * (plan.length - 1) + (kind === "EXPRESS" || kind === "grande-vitesse" ? 20 : 8);
  const u = o.maxWidth ? Math.min(o.u, o.maxWidth / naturalU) : o.u;
  const total = naturalU * u;
  const c: Ctx = {
    ctx,
    u,
    base: o.base,
    livery: o.livery,
    lit: !!o.lit,
    night: !!o.night,
    spin: ((o.s ?? 0) / (6.5 * u || 1)) * 0.5,
    t: o.t ?? 0,
  };

  let x = o.cx - total / 2;
  let head: any = null;
  const pieces: { x: number; w: number; kind: string }[] = [];
  const shiftFirst = (o.cars?.length ?? 0) > 0 && o.tailShift ? o.tailShift : 0;
  ctx.save();
  ctx.lineJoin = "round";
  // ombre portée au sol
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(o.cx, o.base + 1 * u, total / 2, 3 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  plan.forEach((p, i) => {
    const w = p.w * u;
    const x0 = x;
    if (i === 0 && shiftFirst) x += shiftFirst;
    pieces.push({ x, w, kind: p.kind });
    // pas de soufflet d'intercirculation entre des wagons de fret, ni vers une locomotive de fret
    const WAGON_PIECES = ["flat", "hopper", "plate", "container", "autos", "tank", "boxcar", "reefer"];
    const freightJoin = WAGON_PIECES.includes(p.kind) || (i > 0 && WAGON_PIECES.includes(plan[i - 1].kind)) || ["shunter", "modern"].includes(p.kind);
    if (i > 0 && !["tender", "steam"].includes(p.kind) && !freightJoin) gangway(ctx, x - gapU * u, o.base - LIFT * u - CAR_H * u, o.base - LIFT * u, u);
    switch (p.kind) {
      case "coach": {
        const k = p.arg ?? "SECONDE";
        coach(c, x, w, k, { first: k === "PREMIERE", paint: o.firstLivery && k === "PREMIERE" ? o.livery : undefined });
        break;
      }
      case "coachSilver":
        coach(c, x, w, "SECONDE", { paint: c.night ? "#a9b2bc" : "#d9dfe5" });
        break;
      case "sleeper":
        coach(c, x, w, "SECONDE", { sleeper: true });
        break;
      case "deck2":
        coach(c, x, w, "SECONDE", { deck2: true });
        break;
      case "regional":
        head = regionalHead(c, x, w, false);
        break;
      case "express":
        head = regionalHead(c, x, w, true, !!p.arg);
        break;
      case "box":
        head = boxLoco(c, x, w, p.arg[0], { stripe: p.arg[1] });
        break;
      case "flat":
        flatWagon(c, x, w, p.arg);
        break;
      case "hopper":
        hopperWagon(c, x, w);
        break;
      case "plate":
        plateWagon(c, x, w, p.arg);
        break;
      case "container":
        containerWagon(c, x, w, p.arg);
        break;
      case "autos":
        autoWagon(c, x, w, p.arg);
        break;
      case "tank":
        tankWagon(c, x, w);
        break;
      case "boxcar":
        boxcarWagon(c, x, w);
        break;
      case "reefer":
        reeferWagon(c, x, w);
        break;
      case "shunter":
        head = shunter(c, x, w, p.arg);
        break;
      case "modern":
        head = modernLoco(c, x, w, p.arg[0], p.arg[1], p.arg[2]);
        break;
      case "pullman":
        pullman(c, x, w, p.arg[0], p.arg[1]);
        break;
      case "heritage":
        heritageCoach(c, x, w);
        break;
      case "tender":
        tender(c, x, w);
        break;
      case "steam":
        head = steamLoco(c, x, w, o.smoke, o.v ?? 0);
        break;
      case "micheline":
        head = micheline(c, x, w);
        break;
      case "rack":
        head = rackCar(c, x, w, !!p.arg) || head;
        break;
      case "duplexHead":
        head = duplexHead(c, x, w);
        break;
    }
    x = x0 + w + gapU * u;
  });
  // 2.1 : la plaque nominative, sous l'emblème de la motrice
  if (o.plate && head) drawNameplate(ctx, head.x, head.y + head.r + 6 * u, u, o.plate.style, o.plate.text);
  ctx.restore();
  const h = head ?? { x: o.cx, y: o.base - 30 * u, r: 8 * u, lamp: { x: o.cx + total / 2, y: o.base - 25 * u } };
  return {
    left: o.cx - total / 2,
    right: o.cx + total / 2,
    top: o.base - (LIFT + 70) * u,
    badge: { x: h.x, y: h.y, r: h.r },
    lamp: h.lamp,
    pieces,
  };
}

/* la voie sous une image fixe */
export function drawTrack(ctx: CanvasRenderingContext2D, x0: number, x1: number, base: number, u: number, night = false) {
  ctx.fillStyle = night ? "#2a2722" : "#57524a";
  ctx.fillRect(x0, base + 1 * u, x1 - x0, 6 * u);
  ctx.fillStyle = night ? "#211b15" : "#3a2f25";
  for (let x = x0; x < x1; x += 14 * u) ctx.fillRect(x, base + 2 * u, 7 * u, 4 * u);
  ctx.fillStyle = "#9aa3ad";
  ctx.fillRect(x0, base - 0.5 * u, x1 - x0, 2 * u);
}

export const isLight = (c: string) => lum(c) > 0.6;
