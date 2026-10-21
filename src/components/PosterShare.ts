import qrcode from "qrcode-generator";
import { drawPoster, PosterData, PosterStyle, POSTER_H, POSTER_W } from "./PosterArt";

/* ============================================================
   2.1.x : l'affiche à partager (suggestion de FredoDeThors).

   La même affiche, en trois déclinaisons :
   - A3 : à imprimer et punaiser, 1200 × 1700 ;
   - Story : 1080 × 1920, pour Instagram, TikTok, WhatsApp. Rien d'important
     dans les 220 px du haut et du bas, que l'appli recouvre ;
   - Carré : 1080 × 1080, pour un post.
   Avec, si le joueur le veut, un QR code qui mène au jeu avec son code de
   parrainage déjà rempli, et le code écrit en clair pour qui recopie.
   ============================================================ */

export type PosterFormat = "a3" | "story" | "carre";
export const POSTER_FORMATS: Record<PosterFormat, { label: string; hint: string; w: number; h: number }> = {
  // chiffres en dur : PosterArt importe ce fichier, ses constantes ne sont pas encore prêtes ici
  a3: { label: "A3", hint: "à imprimer", w: 1200, h: 1700 },
  story: { label: "Story", hint: "Instagram, TikTok", w: 1080, h: 1920 },
  carre: { label: "Carré", hint: "post", w: 1080, h: 1080 },
};

export interface PosterShare {
  code: string;
  url: string;
}

const SERIF = "'Bitter', Georgia, serif";
const SANS = "'Work Sans', 'Helvetica Neue', sans-serif";
const MONO = "'Space Mono', 'Menlo', monospace";

/* les couleurs de chaque style, pour que le cadre prolonge l'affiche */
function palette(style: PosterStyle, livery: string) {
  if (style === "belle-epoque") return { bg: "#efe3c6", ink: "#24402f", soft: "#4a3a1e", accent: "#b8862f", qrDark: "#24402f", qrLight: "#f7efdc" };
  if (style === "art-deco") return { bg: "#0e1a2c", ink: "#e9dcc0", soft: "#b9ad93", accent: "#d6aa50", qrDark: "#0e1a2c", qrLight: "#e9dcc0" };
  return { bg: "#f7f6f2", ink: "#16181c", soft: "#5a5e66", accent: livery, qrDark: "#16181c", qrLight: "#ffffff" };
}

/* l'affiche seule, dessinée une fois en pleine définition */
function posterImage(style: PosterStyle, data: PosterData) {
  const c = document.createElement("canvas");
  c.width = POSTER_W;
  c.height = POSTER_H;
  const ctx = c.getContext("2d");
  if (ctx) drawPoster(ctx, style, data);
  return c;
}

function fit(ctx: CanvasRenderingContext2D, text: string, family: string, weight: number, max: number, width: number) {
  let size = max;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > width && size > 14) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${family}`;
  }
}

/* le QR code sur sa carte claire : un QR se lit mal en clair sur foncé */
export function drawQr(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, size: number, dark: string, light: string) {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 3;
  const cell = size / (n + quiet * 2);
  ctx.save();
  ctx.fillStyle = light;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = dark;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) {
        // un léger débord évite les filets clairs entre deux modules voisins
        ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, cell + 0.6, cell + 0.6);
      }
    }
  }
  ctx.restore();
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function framedPoster(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, w: number, accent: string) {
  const h = (w * POSTER_H) / POSTER_W;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = accent;
  ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  ctx.restore();
  ctx.drawImage(img, x, y, w, h);
  return h;
}

/* le bloc « rejoignez-moi » : QR à gauche, texte à droite */
function inviteBlock(
  ctx: CanvasRenderingContext2D,
  p: ReturnType<typeof palette>,
  data: PosterData,
  share: PosterShare,
  x: number,
  y: number,
  qrSize: number,
  textW: number,
  scale: number,
) {
  drawQr(ctx, share.url, x, y, qrSize, p.qrDark, p.qrLight);
  const tx = x + qrSize + 32 * scale;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = p.soft;
  ctx.font = `500 ${Math.round(24 * scale)}px ${SANS}`;
  ctx.fillText("Montez à bord de", tx, y + 34 * scale);
  ctx.fillStyle = p.ink;
  fit(ctx, data.company, SERIF, 700, Math.round(46 * scale), textW);
  ctx.fillText(data.company, tx, y + 86 * scale);
  ctx.fillStyle = p.soft;
  ctx.font = `500 ${Math.round(22 * scale)}px ${SANS}`;
  ctx.fillText("Code de parrainage", tx, y + qrSize - 76 * scale);
  ctx.fillStyle = p.accent;
  fit(ctx, share.code, MONO, 700, Math.round(44 * scale), textW);
  ctx.fillText(share.code, tx, y + qrSize - 30 * scale);
  ctx.fillStyle = p.soft;
  ctx.font = `400 ${Math.round(20 * scale)}px ${SANS}`;
  ctx.fillText(`${hostOf(share.url)} · +100 pi. à l'inscription`, tx, y + qrSize + 2 * scale);
}

export function drawPosterVariant(ctx: CanvasRenderingContext2D, format: PosterFormat, style: PosterStyle, data: PosterData, share: PosterShare | null) {
  const { w: W, h: H } = POSTER_FORMATS[format];
  const p = palette(style, data.livery);
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // l'A3 sans QR : l'affiche telle quelle
  if (format === "a3" && !share) {
    drawPoster(ctx, style, data);
    ctx.restore();
    return;
  }

  const img = posterImage(style, data);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);

  if (format === "a3") {
    // l'affiche réduite, et une bande d'invitation en pied, toujours au format A3
    const pw = 980;
    const ph = framedPoster(ctx, img, (W - pw) / 2, 44, pw, p.accent);
    const by = 44 + ph + 38;
    ctx.fillStyle = p.accent;
    ctx.fillRect((W - pw) / 2, by - 14, pw, 3);
    inviteBlock(ctx, p, data, share!, (W - pw) / 2, by + 8, H - by - 44, pw - 260, 0.92);
  } else if (format === "story") {
    const pw = share ? 660 : 820;
    const top = share ? 230 : (H - (pw * POSTER_H) / POSTER_W) / 2;
    const ph = framedPoster(ctx, img, (W - pw) / 2, top, pw, p.accent);
    if (share) {
      const by = top + ph + 64;
      ctx.textAlign = "center";
      ctx.fillStyle = p.ink;
      ctx.font = `700 40px ${SERIF}`;
      ctx.fillText("Rejoins mon réseau", W / 2, by + 12);
      inviteBlock(ctx, p, data, share, 110, by + 48, 280, W - 110 * 2 - 280 - 32, 1);
    }
  } else {
    // carré
    if (share) {
      const ph = 960;
      const pw = (ph * POSTER_W) / POSTER_H;
      framedPoster(ctx, img, 60, 60, pw, p.accent);
      const cx = 60 + pw + 40, cw = W - cx - 44;
      ctx.textAlign = "left";
      ctx.fillStyle = p.soft;
      ctx.font = `500 22px ${SANS}`;
      ctx.fillText("Montez à bord de", cx, 150);
      ctx.fillStyle = p.ink;
      fit(ctx, data.company, SERIF, 700, 40, cw);
      ctx.fillText(data.company, cx, 200);
      ctx.fillStyle = p.accent;
      ctx.fillRect(cx, 232, 60, 4);
      ctx.fillStyle = p.soft;
      ctx.font = `400 21px ${SANS}`;
      ["Un jeu de compagnie", "ferroviaire, dans le", "navigateur."].forEach((t, i) => ctx.fillText(t, cx, 290 + i * 30));
      const q = Math.min(cw, 230);
      drawQr(ctx, share.url, cx, 520, q, p.qrDark, p.qrLight);
      ctx.fillStyle = p.soft;
      ctx.font = `500 20px ${SANS}`;
      ctx.fillText("Code de parrainage", cx, 520 + q + 48);
      ctx.fillStyle = p.accent;
      fit(ctx, share.code, MONO, 700, 38, cw);
      ctx.fillText(share.code, cx, 520 + q + 92);
      ctx.fillStyle = p.soft;
      fit(ctx, hostOf(share.url), SANS, 400, 19, cw);
      ctx.fillText(hostOf(share.url), cx, 520 + q + 130);
    } else {
      const ph = 960;
      const pw = (ph * POSTER_W) / POSTER_H;
      framedPoster(ctx, img, (W - pw) / 2, 60, pw, p.accent);
    }
  }
  ctx.restore();
}

export function posterFileName(company: string, style: PosterStyle, format: PosterFormat) {
  const slug = company.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `affiche-${slug || "reseau"}-${style}${format === "a3" ? "" : `-${format}`}.png`;
}
