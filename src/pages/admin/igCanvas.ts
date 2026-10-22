/* ============================================================
   Le visuel des annonces (2.2) : une image prête pour Instagram, et jointe
   au message Discord. Dessiné ici, dans les couleurs et les polices du jeu,
   avec la ligne de chemin de fer de la carte comme signature : un trait,
   des gares en losange, le même losange que dans le logo.

   Pas d'image inventée : le seul visuel « de jeu » qu'on y met est une
   vraie capture d'écran, fournie par l'admin.
   ============================================================ */

export type IgFormat = "post" | "story" | "carre";
export type IgStyle = "nuit" | "papier" | "ambre";
export type IgLayout = "annonce" | "cap" | "capture";

export const IG_FORMATS: Record<IgFormat, { label: string; hint: string; w: number; h: number }> = {
  post: { label: "Post", hint: "4:5, le format du fil", w: 1080, h: 1350 },
  story: { label: "Story", hint: "9:16, Reels et stories", w: 1080, h: 1920 },
  carre: { label: "Carré", hint: "1:1", w: 1080, h: 1080 },
};
export const IG_STYLES: Record<IgStyle, { label: string; bg: string; panel: string; ink: string; soft: string; accent: string; node: string; rule: string }> = {
  // les deux thèmes du jeu, et la tuile ambre du logo
  nuit: { label: "Nuit", bg: "#0b0f19", panel: "#111827", ink: "#f8fafc", soft: "#94a3b8", accent: "#f59e0b", node: "#f8fafc", rule: "#1e293b" },
  papier: { label: "Papier", bg: "#f2eee3", panel: "#e9e4d7", ink: "#1c1b17", soft: "#6b6656", accent: "#1f5c4d", node: "#a06a17", rule: "#c9c1ac" },
  ambre: { label: "Ambre", bg: "#f59e0b", panel: "#e8930a", ink: "#0b0f19", soft: "#3b2a07", accent: "#0b0f19", node: "#f8fafc", rule: "#c77f08" },
};
export const IG_LAYOUTS: Record<IgLayout, { label: string; hint: string }> = {
  annonce: { label: "Annonce", hint: "titre et texte" },
  cap: { label: "Cap franchi", hint: "un grand chiffre" },
  capture: { label: "Capture", hint: "une capture du jeu en grand" },
};

export interface IgData {
  title: string;
  body: string;
  figure: string; // « 200 », pour le gabarit « Cap franchi »
  shot: HTMLImageElement | null;
  site: string;
  handle: string;
}

const SERIF = "'Bitter', Georgia, serif";
const SANS = "'Work Sans', 'Helvetica Neue', sans-serif";
const MONO = "'Space Mono', Menlo, monospace";

export async function loadIgFonts() {
  try {
    await Promise.all([
      document.fonts.load(`700 80px ${SERIF}`),
      document.fonts.load(`600 80px ${SERIF}`),
      document.fonts.load(`400 40px ${SANS}`),
      document.fonts.load(`500 40px ${SANS}`),
      document.fonts.load(`400 30px ${MONO}`),
    ]);
  } catch {
    /* les polices de secours suffisent */
  }
}

/* Texte nettoyé du markdown de Discord : l'image n'en a que faire. */
export function plain(s: string) {
  return s
    .replace(/\*\*|__|~~|`/g, "")
    .replace(/(^|\s)[*_](\S)/g, "$1$2")
    .replace(/(\S)[*_](\s|$)/g, "$1$2")
    .replace(/^>\s?/gm, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[@#&!]?\d+>/g, "")
    // typographie française : la ponctuation haute ne part jamais seule à la ligne
    .replace(/ ([!?:;»])/g, "\u00a0$1")
    .replace(/« /g, "«\u00a0")
    .trim();
}

/* Coupe un texte en lignes qui tiennent dans `width`, paragraphes gardés. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const out: string[] = [];
  for (const para of text.split(/\n/)) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/[ \t]+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= width || !line) line = next;
      else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  while (out.length && !out[out.length - 1]) out.pop();
  return out;
}

/* La plus grande taille (≤ max) où le texte tient en `maxLines` lignes. */
function fitBlock(ctx: CanvasRenderingContext2D, text: string, font: (s: number) => string, max: number, min: number, width: number, maxLines: number) {
  for (let size = max; size >= min; size -= 2) {
    ctx.font = font(size);
    const lines = wrap(ctx, text, width);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = font(min);
  const lines = wrap(ctx, text, width);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
  }
  return { size: min, lines };
}

/* Le R-ligne, mêmes tracés que components/Logo.tsx (repère 100 × 100). */
function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, line: string, node: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.translate(-4.5, 1.5);
  ctx.strokeStyle = line;
  ctx.lineWidth = 10;
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
  ctx.stroke(new Path2D("M31 81 V20.5 H54 A15.5 15.5 0 0 1 54 51.5 H31"));
  ctx.fillStyle = line;
  ctx.fill(new Path2D("M54.944 48.427 L80.32 81 L67.65 81 L47.056 54.573 Z"));
  ctx.translate(51, 51.5);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = node;
  ctx.fillRect(-6, -6, 12, 12);
  ctx.restore();
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = fill;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 4;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
  }
  ctx.restore();
}

/* La ligne : un trait épais avec des gares, celle de droite pleine (on y arrive). */
function drawLine(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, s: (typeof IG_STYLES)[IgStyle], stops = 5) {
  ctx.fillStyle = s.accent;
  ctx.fillRect(x0, y - 5, x1 - x0, 10);
  for (let i = 0; i < stops; i++) {
    const x = x0 + ((x1 - x0) * i) / (stops - 1);
    const last = i === stops - 1;
    diamond(ctx, x, y, last ? 17 : 11, last ? s.node : s.bg, s.accent);
  }
}

function coverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const r = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / r;
  const sh = h / r;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

function frameShot(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, s: (typeof IG_STYLES)[IgStyle]) {
  ctx.fillStyle = s.panel;
  ctx.fillRect(x - 10, y - 10, w + 20, h + 20);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  coverImage(ctx, img, x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = s.rule;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 10, y - 10, w + 20, h + 20);
}

export function drawIg(ctx: CanvasRenderingContext2D, format: IgFormat, style: IgStyle, layout: IgLayout, d: IgData) {
  const { w: W, h: H } = IG_FORMATS[format];
  const s = IG_STYLES[style];
  const M = 84; // marge
  // en story, l'appli recouvre le haut et le bas : rien d'important dans ces bandes
  const top = format === "story" ? 250 : M;
  const bottom = H - (format === "story" ? 250 : M);
  const inner = W - M * 2;

  ctx.fillStyle = s.bg;
  ctx.fillRect(0, 0, W, H);

  // en-tête : le logo et le nom du jeu
  drawLogo(ctx, M - 6, top - 8, 92, s.accent, s.node);
  ctx.fillStyle = s.ink;
  ctx.font = `700 46px ${SERIF}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Réseau", M + 100, top + 54);

  // pied : la ligne, puis l'adresse et le compte
  const footY = bottom - 34;
  ctx.font = `400 28px ${MONO}`;
  ctx.fillStyle = s.ink;
  ctx.textAlign = "left";
  ctx.fillText(d.site, M, footY);
  ctx.textAlign = "right";
  ctx.fillStyle = s.soft;
  ctx.fillText(d.handle ? `@${d.handle.replace(/^@/, "")}` : "", W - M, footY);
  ctx.textAlign = "left";
  const lineY = footY - 78;
  drawLine(ctx, M + 11, W - M - 17, lineY, s, format === "carre" ? 4 : 5);

  // la zone de contenu, entre l'en-tête et la ligne
  const zoneTop = top + 150;
  const zoneBottom = lineY - 70;
  const title = plain(d.title);
  const body = plain(d.body);

  if (layout === "cap") {
    const fig = d.figure.trim() || "200";
    let size = format === "carre" ? 300 : format === "story" ? 460 : 380;
    ctx.font = `700 ${size}px ${SERIF}`;
    while (ctx.measureText(fig).width > inner && size > 80) {
      size -= 8;
      ctx.font = `700 ${size}px ${SERIF}`;
    }
    const titleBlock = fitBlock(ctx, title, (z) => `600 ${z}px ${SERIF}`, 64, 40, inner, 2);
    ctx.font = `400 34px ${SANS}`;
    const bodyLines = body ? fitBlock(ctx, body, (z) => `400 ${z}px ${SANS}`, 36, 26, inner, format === "carre" ? 2 : 4) : { size: 0, lines: [] as string[] };
    const blockH = size * 0.8 + 40 + titleBlock.lines.length * titleBlock.size * 1.15 + (bodyLines.lines.length ? 30 + bodyLines.lines.length * bodyLines.size * 1.45 : 0);
    let y = zoneTop + Math.max(0, (zoneBottom - zoneTop - blockH) / 2) + size * 0.8;
    ctx.fillStyle = s.accent;
    ctx.font = `700 ${size}px ${SERIF}`;
    ctx.fillText(fig, M - size * 0.04, y);
    y += 40;
    ctx.fillStyle = s.ink;
    ctx.font = `600 ${titleBlock.size}px ${SERIF}`;
    for (const l of titleBlock.lines) {
      y += titleBlock.size * 1.15;
      ctx.fillText(l, M, y - titleBlock.size * 0.25);
    }
    if (bodyLines.lines.length) {
      y += 30;
      ctx.fillStyle = s.soft;
      ctx.font = `400 ${bodyLines.size}px ${SANS}`;
      for (const l of bodyLines.lines) {
        y += bodyLines.size * 1.45;
        ctx.fillText(l, M, y - bodyLines.size * 0.4);
      }
    }
    return;
  }

  if (layout === "capture") {
    const titleBlock = fitBlock(ctx, title, (z) => `700 ${z}px ${SERIF}`, 70, 42, inner, 2);
    let y = zoneTop;
    ctx.fillStyle = s.ink;
    ctx.font = `700 ${titleBlock.size}px ${SERIF}`;
    for (const l of titleBlock.lines) {
      y += titleBlock.size * 1.12;
      ctx.fillText(l, M, y);
    }
    const shotTop = y + 46;
    const bodyLines = body ? fitBlock(ctx, body, (z) => `400 ${z}px ${SANS}`, 32, 26, inner, 2) : { size: 0, lines: [] as string[] };
    const bodyH = bodyLines.lines.length ? 36 + bodyLines.lines.length * bodyLines.size * 1.4 : 0;
    const shotH = Math.max(160, zoneBottom - shotTop - bodyH);
    if (d.shot) frameShot(ctx, d.shot, M + 10, shotTop + 10, inner - 20, shotH - 20, s);
    else {
      ctx.strokeStyle = s.rule;
      ctx.setLineDash([14, 10]);
      ctx.lineWidth = 3;
      ctx.strokeRect(M, shotTop, inner, shotH);
      ctx.setLineDash([]);
      ctx.fillStyle = s.soft;
      ctx.font = `400 30px ${SANS}`;
      ctx.textAlign = "center";
      ctx.fillText("Ajoute une capture du jeu", W / 2, shotTop + shotH / 2);
      ctx.textAlign = "left";
    }
    y = shotTop + shotH + 36;
    ctx.fillStyle = s.soft;
    ctx.font = `400 ${bodyLines.size}px ${SANS}`;
    for (const l of bodyLines.lines) {
      y += bodyLines.size * 1.4;
      ctx.fillText(l, M, y - bodyLines.size * 0.4);
    }
    return;
  }

  // « annonce » : le titre, le texte, et la capture en dessous s'il y en a une
  const maxTitle = format === "carre" ? 3 : 4;
  const titleBlock = fitBlock(ctx, title, (z) => `700 ${z}px ${SERIF}`, format === "story" ? 104 : 92, 50, inner, maxTitle);
  let y = zoneTop;
  ctx.fillStyle = s.ink;
  ctx.font = `700 ${titleBlock.size}px ${SERIF}`;
  for (const l of titleBlock.lines) {
    y += titleBlock.size * 1.1;
    ctx.fillText(l, M, y);
  }
  y += 44;
  const room = zoneBottom - y;
  const shotH = d.shot ? Math.min(Math.round(inner * 0.6), Math.max(0, room - 180)) : 0;
  const textRoom = room - (shotH ? shotH + 50 : 0);
  if (body && textRoom > 60) {
    const bodyLines = fitBlock(ctx, body, (z) => `400 ${z}px ${SANS}`, 40, 26, inner, Math.max(1, Math.floor(textRoom / 50)));
    ctx.fillStyle = s.soft;
    ctx.font = `400 ${bodyLines.size}px ${SANS}`;
    for (const l of bodyLines.lines) {
      y += bodyLines.size * 1.45;
      ctx.fillText(l, M, y - bodyLines.size * 0.4);
    }
    y += 24;
  }
  if (d.shot && shotH > 120) frameShot(ctx, d.shot, M + 10, zoneBottom - shotH + 10, inner - 20, shotH - 20, s);
}

/* ---------------- la légende Instagram ---------------- */

/* Des mots-clés dans une phrase, pas une rafale de hashtags : c'est ce que
   lit la recherche d'Instagram, et ça se lit comme du texte. */
export function igCaption(title: string, body: string, site: string) {
  const t = plain(title);
  const b = plain(body);
  return [
    t,
    "",
    b,
    "",
    `Réseau, c'est un jeu de gestion ferroviaire gratuit, sur navigateur et sur mobile : tu fondes ta compagnie de trains, tu ouvres des lignes, tu transportes voyageurs et fret, et tu grimpes au classement de la saison avec ton alliance.`,
    "",
    `Joue sur ${site} (lien en bio).`,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
