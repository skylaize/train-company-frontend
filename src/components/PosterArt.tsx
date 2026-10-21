import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { STATION_COORDS, LINE_PALETTE } from "../geo";
import { COUNTRIES } from "./europeMap";
import { drawConsist } from "./trainArt";
import { drawPosterVariant, PosterFormat, PosterShare, POSTER_FORMATS, posterFileName } from "./PosterShare";

/* ============================================================
   2.1 : l'affiche du réseau.

   Le réseau du joueur, dessiné comme une affiche de chemin de fer, en trois
   styles :
   - Belle Époque : papier crème, cadre à filets, titre à empattements,
     la carte coloriée et la rame en bas, comme une réclame de 1900 ;
   - Art déco : bleu de nuit et or, soleil levant, titre étroit, la rame
     lancée dans ses lignes de vitesse ;
   - Moderne : papier blanc, lignes franches à la couleur de chaque ligne,
     une légende, comme un plan de réseau d'aujourd'hui.
   Dessinée à 1200 × 1700 : assez pour une impression en A3.
   ============================================================ */

export type PosterStyle = "belle-epoque" | "art-deco" | "moderne";
export const POSTER_LABELS: Record<PosterStyle, string> = { "belle-epoque": "Belle Époque", "art-deco": "Art déco", moderne: "Moderne" };
export const POSTER_W = 1200;
export const POSTER_H = 1700;

export interface PosterData {
  company: string;
  livery: string;
  lines: string[][]; // chaque ligne : ses gares dans l'ordre
}

export const FRANCE = COUNTRIES.find((c) => c.id === "France")?.d ?? "";
export const NEIGHBOURS = COUNTRIES.filter((c) => c.id !== "France");

export function mapTransform(lines: string[][], box: { x: number; y: number; w: number; h: number }) {
  // la France entière, un peu élargie si le réseau déborde (Londres, Milan)
  let minX = -45, maxX = 390, minY = -5, maxY = 425;
  for (const st of lines.flat()) {
    const p = STATION_COORDS[st];
    if (!p) continue;
    minX = Math.min(minX, p.x - 20); maxX = Math.max(maxX, p.x + 60); minY = Math.min(minY, p.y - 20); maxY = Math.max(maxY, p.y + 20);
  }
  const k = Math.min(box.w / (maxX - minX), box.h / (maxY - minY));
  const ox = box.x + (box.w - (maxX - minX) * k) / 2 - minX * k;
  const oy = box.y + (box.h - (maxY - minY) * k) / 2 - minY * k;
  return { k, ox, oy, pt: (s: string) => (STATION_COORDS[s] ? { x: ox + STATION_COORDS[s].x * k, y: oy + STATION_COORDS[s].y * k } : null) };
}

export function grain(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number, seed = 7) {
  let x = seed;
  const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  ctx.save();
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = rnd() > 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
    ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
  }
  ctx.restore();
}

export function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  const chars = [...text];
  const total = chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
  let cx = x - total / 2;
  ctx.textAlign = "left";
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + spacing;
  }
}

export function fitFont(ctx: CanvasRenderingContext2D, text: string, family: string, weight: number, max: number, width: number) {
  let size = max;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > width && size > 20) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/* noms de gares : à droite, sinon à gauche, sinon au-dessus ; rien ne se chevauche */
export function labels(ctx: CanvasRenderingContext2D, stations: { name: string; x: number; y: number }[], font: string, color: string, halo: string | null, off: number) {
  ctx.font = font;
  const boxes: { x1: number; y1: number; x2: number; y2: number }[] = stations.map((s) => ({ x1: s.x - off, y1: s.y - off, x2: s.x + off, y2: s.y + off }));
  const hit = (b: { x1: number; y1: number; x2: number; y2: number }) => boxes.some((o) => b.x1 < o.x2 && b.x2 > o.x1 && b.y1 < o.y2 && b.y2 > o.y1);
  const fs = parseFloat(font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? "20");
  for (const s of stations) {
    const w = ctx.measureText(s.name).width;
    const cands = [
      { x: s.x + off + 4, y: s.y + fs * 0.35, a: "left" as CanvasTextAlign, b: { x1: s.x + off, y1: s.y - fs * 0.7, x2: s.x + off + w + 8, y2: s.y + fs * 0.6 } },
      { x: s.x - off - 4, y: s.y + fs * 0.35, a: "right" as CanvasTextAlign, b: { x1: s.x - off - w - 8, y1: s.y - fs * 0.7, x2: s.x - off, y2: s.y + fs * 0.6 } },
      { x: s.x, y: s.y - off - 6, a: "center" as CanvasTextAlign, b: { x1: s.x - w / 2 - 4, y1: s.y - off - fs - 6, x2: s.x + w / 2 + 4, y2: s.y - off } },
      { x: s.x, y: s.y + off + fs, a: "center" as CanvasTextAlign, b: { x1: s.x - w / 2 - 4, y1: s.y + off, x2: s.x + w / 2 + 4, y2: s.y + off + fs + 4 } },
    ];
    const c = cands.find((k) => !hit(k.b)) ?? cands[0];
    boxes.push(c.b);
    ctx.textAlign = c.a;
    if (halo) {
      ctx.strokeStyle = halo;
      ctx.lineWidth = 6;
      ctx.lineJoin = "round";
      ctx.strokeText(s.name, c.x, c.y);
    }
    ctx.fillStyle = color;
    ctx.fillText(s.name, c.x, c.y);
  }
}

export function countryPath(ctx: CanvasRenderingContext2D, d: string, t: { k: number; ox: number; oy: number }) {
  const p = new Path2D(d);
  return (fill: string | null, stroke: string | null, lw: number) => {
    ctx.save();
    ctx.translate(t.ox, t.oy);
    ctx.scale(t.k, t.k);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill(p);
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw / t.k;
      ctx.lineJoin = "round";
      ctx.stroke(p);
    }
    ctx.restore();
  };
}

export function drawPoster(ctx: CanvasRenderingContext2D, style: PosterStyle, data: PosterData) {
  const W = POSTER_W, H = POSTER_H;
  const lines = data.lines.filter((l) => l.filter((s) => STATION_COORDS[s]).length >= 2);
  const stations = [...new Set(lines.flat())].filter((s) => STATION_COORDS[s]);
  const year = new Date().getFullYear();
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  if (style === "belle-epoque") {
    // papier, cadre à double filet, cartouche du titre
    ctx.fillStyle = "#efe3c6";
    ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(110,80,30,0.22)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#24402f";
    ctx.lineWidth = 10;
    ctx.strokeRect(40, 40, W - 80, H - 80);
    ctx.lineWidth = 2;
    ctx.strokeRect(62, 62, W - 124, H - 124);
    for (const [cx, cy] of [[62, 62], [W - 62, 62], [62, H - 62], [W - 62, H - 62]]) {
      ctx.fillStyle = "#b8862f";
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#24402f";
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#24402f";
    ctx.textBaseline = "alphabetic";
    ctx.font = "italic 400 34px 'Bitter', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Chemins de fer", W / 2, 150);
    fitFont(ctx, data.company.toUpperCase(), "'Bitter', Georgia, serif", 700, 92, W - 240 - 4 * data.company.length);
    spaced(ctx, data.company.toUpperCase(), W / 2, 250, 4);
    ctx.fillStyle = "#b8862f";
    ctx.fillRect(W / 2 - 180, 280, 360, 4);
    ctx.font = "italic 400 30px 'Bitter', Georgia, serif";
    ctx.fillStyle = "#4a3a1e";
    ctx.textAlign = "center";
    ctx.fillText(`${stations.length} gares, ${lines.length} ligne${lines.length > 1 ? "s" : ""}, à toute heure`, W / 2, 330);

    const t = mapTransform(lines, { x: 110, y: 380, w: W - 220, h: 900 });
    // la carte reste dans son cadre : les pays voisins ne débordent pas sur le titre
    ctx.save();
    ctx.beginPath();
    ctx.rect(72, 360, W - 144, H - 360 - 310);
    ctx.clip();
    for (const c of NEIGHBOURS) countryPath(ctx, c.d, t)("#e3d5b2", "rgba(60,74,58,0.35)", 2);
    countryPath(ctx, FRANCE, t)("#f4ead2", "#3b4a3a", 3.5);
    ctx.restore();
    lines.forEach((l) => {
      const pts = l.map((s) => t.pt(s)).filter(Boolean) as { x: number; y: number }[];
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#24402f";
      ctx.lineWidth = 13;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      ctx.strokeStyle = data.livery;
      ctx.lineWidth = 7;
      ctx.stroke();
    });
    const sp = stations.map((s) => ({ name: s, ...t.pt(s)! }));
    for (const s of sp) {
      ctx.fillStyle = "#f4ead2";
      ctx.strokeStyle = "#24402f";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    labels(ctx, sp, "600 26px 'Bitter', Georgia, serif", "#24402f", "#f4ead2", 12);

    // la rame, sur sa voie, dans le bandeau du bas
    ctx.fillStyle = "#24402f";
    ctx.fillRect(62, H - 300, W - 124, 238);
    drawConsist(ctx, { cx: W / 2, base: H - 150, u: 1.6, maxWidth: W - 240, model: "STANDARD", livery: data.livery, s: 0 });
    ctx.fillStyle = "#b8862f";
    ctx.fillRect(100, H - 145, W - 200, 4);
    ctx.fillStyle = "#efe3c6";
    ctx.font = "700 30px 'Bitter', Georgia, serif";
    ctx.textAlign = "center";
    spaced(ctx, `RÉSEAU · ${year}`, W / 2, H - 92, 8);
    grain(ctx, W, H, 0.05);
  } else if (style === "art-deco") {
    ctx.fillStyle = "#0e1a2c";
    ctx.fillRect(0, 0, W, H);
    // soleil levant : rayons d'or depuis l'horizon
    const sun = { x: W / 2, y: H - 360 };
    for (let i = 0; i < 36; i++) {
      const a0 = Math.PI + (i / 36) * Math.PI, a1 = a0 + Math.PI / 72;
      ctx.fillStyle = i % 2 ? "rgba(214,170,80,0.10)" : "rgba(214,170,80,0.04)";
      ctx.beginPath();
      ctx.moveTo(sun.x, sun.y);
      ctx.lineTo(sun.x + Math.cos(a0) * 1600, sun.y + Math.sin(a0) * 1600);
      ctx.lineTo(sun.x + Math.cos(a1) * 1600, sun.y + Math.sin(a1) * 1600);
      ctx.closePath();
      ctx.fill();
    }
    const sg = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, 220);
    sg.addColorStop(0, "rgba(240,200,110,0.55)");
    sg.addColorStop(1, "rgba(240,200,110,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(sun.x - 220, sun.y - 220, 440, 440);
    // cadre à angles en gradins
    ctx.strokeStyle = "#d6aa50";
    ctx.lineWidth = 4;
    ctx.beginPath();
    const m = 50, st = 26;
    ctx.moveTo(m + st, m); ctx.lineTo(W - m - st, m); ctx.lineTo(W - m - st, m + st); ctx.lineTo(W - m, m + st);
    ctx.lineTo(W - m, H - m - st); ctx.lineTo(W - m - st, H - m - st); ctx.lineTo(W - m - st, H - m); ctx.lineTo(m + st, H - m);
    ctx.lineTo(m + st, H - m - st); ctx.lineTo(m, H - m - st); ctx.lineTo(m, m + st); ctx.lineTo(m + st, m + st); ctx.closePath();
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeRect(m + 16, m + 16, W - 2 * m - 32, H - 2 * m - 32);
    // titre étroit
    ctx.fillStyle = "#d6aa50";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    fitFont(ctx, data.company.toUpperCase(), "'Barlow Condensed', 'Arial Narrow', sans-serif", 700, 120, W - 240 - 6 * data.company.length);
    spaced(ctx, data.company.toUpperCase(), W / 2, 220, 6);
    ctx.font = "500 30px 'Barlow Condensed', 'Arial Narrow', sans-serif";
    ctx.fillStyle = "#e9dcc0";
    spaced(ctx, "LE RÉSEAU · LES GRANDES LIGNES · LA VITESSE", W / 2, 278, 5);

    const t = mapTransform(lines, { x: 120, y: 330, w: W - 240, h: 860 });
    countryPath(ctx, FRANCE, t)("#132541", "#d6aa50", 2.5);
    lines.forEach((l, i) => {
      const pts = l.map((s) => t.pt(s)).filter(Boolean) as { x: number; y: number }[];
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      ctx.strokeStyle = i % 2 ? "#d6aa50" : data.livery;
      ctx.lineWidth = 8;
      ctx.beginPath();
      pts.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    });
    const sp = stations.map((s) => ({ name: s.toUpperCase(), ...t.pt(s)! }));
    for (const s of sp) {
      ctx.fillStyle = "#0e1a2c";
      ctx.strokeStyle = "#d6aa50";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 11); ctx.lineTo(s.x + 11, s.y); ctx.lineTo(s.x, s.y + 11); ctx.lineTo(s.x - 11, s.y); ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    labels(ctx, sp, "600 24px 'Barlow Condensed', 'Arial Narrow', sans-serif", "#e9dcc0", "#0e1a2c", 13);
    // la rame lancée, ses lignes de vitesse
    const base = H - 250;
    ctx.strokeStyle = "rgba(214,170,80,0.7)";
    for (let k = 0; k < 6; k++) {
      ctx.lineWidth = 3 - k * 0.3;
      ctx.beginPath();
      ctx.moveTo(90, base - 30 - k * 14);
      ctx.lineTo(380 - k * 40, base - 30 - k * 14);
      ctx.stroke();
    }
    drawConsist(ctx, { cx: W / 2 + 120, base, u: 1.5, maxWidth: W - 360, model: "EXPRESS", livery: data.livery, s: 0 });
    ctx.fillStyle = "#d6aa50";
    ctx.fillRect(m + 16, base + 12, W - 2 * m - 32, 3);
    ctx.font = "700 34px 'Barlow Condensed', 'Arial Narrow', sans-serif";
    spaced(ctx, `RÉSEAU  ${year}`, W / 2, H - 120, 14);
    grain(ctx, W, H, 0.03, 11);
  } else {
    // moderne : papier blanc, trame légère, lignes franches
    ctx.fillStyle = "#f7f6f2";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = data.livery;
    ctx.fillRect(80, 90, 16, 150);
    ctx.fillStyle = "#16181c";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    fitFont(ctx, data.company, "'Work Sans', 'Helvetica Neue', sans-serif", 700, 84, W - 220);
    ctx.fillText(data.company, 124, 170);
    ctx.font = "400 32px 'Work Sans', 'Helvetica Neue', sans-serif";
    ctx.fillStyle = "#5a5e66";
    ctx.fillText(`Plan du réseau, ${year}`, 126, 226);

    const t = mapTransform(lines, { x: 100, y: 290, w: W - 200, h: 920 });
    countryPath(ctx, FRANCE, t)("#ecebe5", "#c9c6bb", 2);
    lines.forEach((l, i) => {
      const pts = l.map((s) => t.pt(s)).filter(Boolean) as { x: number; y: number }[];
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = LINE_PALETTE[i % LINE_PALETTE.length];
      ctx.lineWidth = 12;
      ctx.beginPath();
      pts.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    });
    const sp = stations.map((s) => ({ name: s, ...t.pt(s)! }));
    for (const s of sp) {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#16181c";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    labels(ctx, sp, "600 25px 'Work Sans', 'Helvetica Neue', sans-serif", "#16181c", "#f7f6f2", 12);
    // légende des lignes
    let ly = H - 400;
    ctx.font = "600 26px 'Work Sans', 'Helvetica Neue', sans-serif";
    ctx.fillStyle = "#16181c";
    ctx.fillText("Lignes", 100, ly);
    ly += 18;
    lines.slice(0, 8).forEach((l, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 100 + col * 520, y = ly + 30 + row * 48;
      ctx.fillStyle = LINE_PALETTE[i % LINE_PALETTE.length];
      ctx.fillRect(x, y - 16, 54, 14);
      ctx.fillStyle = "#16181c";
      ctx.font = "400 24px 'Work Sans', 'Helvetica Neue', sans-serif";
      const txt = `${l[0]} – ${l[l.length - 1]}`;
      ctx.fillText(txt.length > 30 ? txt.slice(0, 29) + "…" : txt, x + 70, y);
    });
    if (lines.length > 8) {
      ctx.fillStyle = "#5a5e66";
      ctx.fillText(`et ${lines.length - 8} autres lignes`, 100, ly + 30 + 4 * 48);
    }
    ctx.fillStyle = "#16181c";
    ctx.fillRect(100, H - 110, W - 200, 3);
    ctx.font = "500 24px 'Work Sans', 'Helvetica Neue', sans-serif";
    ctx.fillStyle = "#5a5e66";
    ctx.fillText(`${stations.length} gares desservies`, 100, H - 70);
    ctx.textAlign = "right";
    ctx.fillText("Réseau, le jeu", W - 100, H - 70);
  }
  ctx.restore();
}

export interface PosterHandle {
  download: () => void;
  /* 2.1.x : la feuille de partage du téléphone (Instagram, WhatsApp…) ; faux si l'appareil ne sait pas partager un fichier */
  share: () => Promise<boolean>;
}

export function canShareFiles() {
  try {
    const probe = new File([new Blob()], "affiche.png", { type: "image/png" });
    return typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [probe] });
  } catch {
    return false;
  }
}

/* l'affiche dans la page : dessinée en pleine définition, réduite à l'écran */
export const PosterCanvas = forwardRef<
  PosterHandle,
  { style: PosterStyle; data: PosterData; className?: string; watermark?: boolean; format?: PosterFormat; share?: PosterShare | null }
>(function PosterCanvas({ style, data, className = "", watermark = false, format = "a3", share = null }, ref) {
  const cv = useRef<HTMLCanvasElement>(null);
  const { w, h } = POSTER_FORMATS[format];
  const key = `${style}|${format}|${share?.url ?? ""}|${data.company}|${data.livery}|${data.lines.map((l) => l.join(">")).join("|")}|${watermark}`;
  useEffect(() => {
    const c = cv.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const paint = () => {
      drawPosterVariant(ctx, format, style, data, share);
      if (watermark) {
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(-0.5);
        ctx.font = "700 90px 'Work Sans', sans-serif";
        ctx.fillStyle = "rgba(128,128,128,0.18)";
        ctx.textAlign = "center";
        ctx.fillText("APERÇU", 0, 0);
        ctx.restore();
      }
    };
    paint();
    // les polices arrivent parfois après le premier dessin
    document.fonts?.ready.then(paint).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const blob = () => new Promise<Blob | null>((res) => (cv.current ? cv.current.toBlob(res, "image/png") : res(null)));
  const fileName = posterFileName(data.company, style, format);

  useImperativeHandle(ref, () => ({
    download: () => {
      void blob().then((b) => {
        if (!b) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      });
    },
    share: async () => {
      const b = await blob();
      if (!b) return false;
      const file = new File([b], fileName, { type: "image/png" });
      if (!navigator.canShare?.({ files: [file] })) return false;
      try {
        await navigator.share({
          files: [file],
          title: `Le réseau de ${data.company}`,
          text: share ? `Rejoins ma compagnie sur Réseau avec le code ${share.code} : ${share.url}` : undefined,
        });
      } catch {
        // partage annulé : rien à faire
      }
      return true;
    },
  }));
  return (
    <canvas
      ref={cv}
      width={w}
      height={h}
      className={`block w-full h-auto ${className}`}
      role="img"
      aria-label={`Affiche du réseau de ${data.company}, style ${POSTER_LABELS[style]}, format ${POSTER_FORMATS[format].label}${share ? ", avec QR code de parrainage" : ""}`}
    />
  );
});
