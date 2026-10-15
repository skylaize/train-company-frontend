// @ts-nocheck — dessin sur canvas, repris tel quel de la démo « Vue cabine »
/* ============================================================
   Scène de la vue cabine : ciel, collines, voie, caténaire, gares et rame.
   Tout est dessiné à chaque image à partir d'un petit objet « sc » que le
   composant met à jour : météo, livrée, vitesse, distances aux deux gares.

   2.0 : la rame elle-même est dessinée par trainArt, le même dessinateur
   que la vitrine de la boutique, le catalogue et le quai.
   ============================================================ */

import { drawConsist } from "./trainArt";
import { createWeatherFx } from "./weatherFx";

export function createCabScene(ctx) {
  const sc = {
    W: 0, H: 0, dpr: 1, cv: ctx.canvas,
    weather: "clair", livery: "#4f7fa3", express: false,
    v: 0, s: 0, dep: "", arr: "", depDist: 1e9, arrDist: 1e9,
    skin: null as string | null, // matériel de collection (boutique) : "vapeur" | "micheline" | "pullman" | "duplex" | "grande-vitesse" | null
    sleeper: false, // 1.6 : rame couchettes
    cars: [] as string[], // 1.7 : voitures ajoutées (SECONDE, PREMIERE, BAR), en queue de rame
    firstLivery: false, // 1.7 — Premium : la voiture de 1re classe peinte à la livrée
    model: null as string | null, // 2.0 : le modèle de la rame (STANDARD, EXPRESS, FRET_LOURD…)
    box: null as any, // 2.0 : où la rame a été dessinée (emblème, phare)
    hour: null as number | null, // 2.0 : heure de Paris (décimale) ; nulle = plein jour, ou nuit si weather vaut « nuit »
    stationSkin: null as string | null, // 2.1 : habillage des gares (boutique) : "belle-epoque" | "beton" | "verriere" | null
    plate: null as { style: string; text: string } | null, // 2.1 : plaque nominative de la rame
    doubleTrack: false, // 2.1 : la ligne est à double voie : une deuxième voie, derrière
    // 2.1 : rames de la compagnie qui viennent en sens inverse sur l'autre voie ; gap = distance (px) entre les deux têtes
    oncoming: [] as { id: string; gap: number; model: string; livery: string; skin?: string | null; cars?: string[]; v: number }[],
    yards: null as string[] | null, // 2.1 : gares de triage de la compagnie
    // 2.1.1 : poste-frontière sur le tronçon en cours ; dx = distance (px) devant la rame
    border: null as { dx: number; to: { code: string; name: string }; from: { code: string; name: string } } | null,
  };
  const oncomingW = new Map(); // longueur de chaque rame croisée, mesurée à l'image précédente
  const puffs = []; // fumée de la locomotive à vapeur
  const hill = (x, seed, amp, freq) =>
    Math.sin(x * freq + seed) * amp * 0.6 + Math.sin(x * freq * 2.3 + seed * 1.7) * amp * 0.3 + Math.sin(x * freq * 5.1 + seed * 0.3) * amp * 0.1;

  /* ---- 2.0 : le temps qu'il fait ET l'heure qu'il est ----
     La météo (clair, neige, verglas, brouillard, canicule) et l'heure de
     Paris sont indépendantes : il peut neiger la nuit, le brouillard se
     lever à l'aube. Le ciel suit l'heure, le paysage suit la météo, et les
     effets de weatherFx (flocons sur trois plans, givre sur le pare-brise,
     nappes de brouillard, air qui ondule) sont posés par-dessus. */
  const LAND = {
    clair:      { far: "#8fb1c9", mid: "#5d8a6a", near: "#3e6b4a", ground: "#4a5a3a", ballast: "#5b5750" },
    nuageux:    { far: "#93a9ba", mid: "#587d63", near: "#3b6246", ground: "#465537", ballast: "#57534d" },
    pluie:      { far: "#7f93a3", mid: "#4b6b56", near: "#33553c", ground: "#3c4a31", ballast: "#4a4744" },
    orage:      { far: "#5d6b78", mid: "#3d5646", near: "#2b4532", ground: "#333f2b", ballast: "#403d3a" },
    neige:      { far: "#c4d0db", mid: "#e4eaef", near: "#f1f5f8", ground: "#e6ecf0", ballast: "#b9c3cb" },
    verglas:    { far: "#9fb4c6", mid: "#7d9a8c", near: "#6b8a7c", ground: "#a9bcc4", ballast: "#8e989e" },
    brouillard: { far: "#aeb6bc", mid: "#8e999c", near: "#6e7b76", ground: "#5d6659", ballast: "#6a6862" },
    canicule:   { far: "#d9b27a", mid: "#b99a58", near: "#9a8a46", ground: "#8a7440", ballast: "#7a6a58" },
  };
  // le ciel au fil de la journée : [heure, haut, bas, obscurité 0..1]
  const SKY = [
    [0, "#050914", "#1a2540", 1],
    [5.2, "#0b1124", "#2b3150", 0.92],
    [6.3, "#3a4f82", "#e8a273", 0.45],
    [7.6, "#6fa8dc", "#d8e6f0", 0.05],
    [17.6, "#6fa8dc", "#cfe3f2", 0],
    [19.3, "#41558c", "#f0955c", 0.3],
    [20.4, "#1d2650", "#6b4e70", 0.7],
    [21.6, "#050914", "#1a2540", 1],
    [24, "#050914", "#1a2540", 1],
  ];
  // ce que la météo fait au ciel de jour : [teinte, part]
  const SKY_TINT = { clair: null, nuageux: ["#aab4bf", 0.45], pluie: ["#7d8894", 0.72], orage: ["#454d5a", 0.85], neige: ["#a9b4bf", 0.75], verglas: ["#b8cfe3", 0.35], brouillard: ["#c6cbce", 0.8], canicule: ["#f3c27c", 0.45] };
  // brume de distance : les plans lointains se fondent dans le ciel
  const HAZE = { clair: [0.15, 0.05], nuageux: [0.2, 0.08], pluie: [0.42, 0.2], orage: [0.5, 0.25], neige: [0.45, 0.22], verglas: [0.12, 0.04], brouillard: [0.8, 0.55], canicule: [0.35, 0.12] };
  const FX_KIND = { neige: "NEIGE", verglas: "VERGLAS", brouillard: "BROUILLARD", canicule: "CANICULE" };

  const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join(""); };
  function skyAt(h) {
    let i = 0;
    while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
    const [h0, t0, b0, d0] = SKY[i], [h1, t1, b1, d1] = SKY[i + 1];
    const k = Math.max(0, Math.min(1, (h - h0) / (h1 - h0)));
    return { top: mix(t0, t1, k), bot: mix(b0, b1, k), dark: d0 + (d1 - d0) * k };
  }

  // étoiles, nuages, oiseaux
  const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.55, r: Math.random() * 1.2 + 0.2 }));
  const clouds = Array.from({ length: 9 }, (_, i) => ({ x: Math.random(), y: 0.06 + Math.random() * 0.28, w: 0.08 + Math.random() * 0.12, k: 0.015 + (i % 3) * 0.012 }));
  const birds = { x: -0.2, y: 0.22, on: false, next: 6 };
  let fx = null, fxKind = null, fxCv = null, fxSize = "", fxK = 0, lastT = 0;

  function overlay(t, kind, day) {
    const dt = lastT ? Math.min(0.05, t - lastT) : 0.016;
    lastT = t;
    if (!kind) { fxK = Math.max(0, fxK - dt / 1.5); if (fxK <= 0) return; }
    if (kind && kind !== fxKind) {
      fxKind = kind; fxK = 0; fxSize = "";
      fxCv = fxCv || document.createElement("canvas");
      fx = createWeatherFx(fxCv.getContext("2d"), kind);
    }
    if (!fx) return;
    const size = `${sc.W}x${sc.H}x${sc.dpr}`;
    if (size !== fxSize) {
      fxSize = size;
      fxCv.width = Math.round(sc.W * sc.dpr); fxCv.height = Math.round(sc.H * sc.dpr);
      fxCv.getContext("2d").setTransform(sc.dpr, 0, 0, sc.dpr, 0, 0);
      fx.resize(sc.W, sc.H, sc.dpr);
    }
    if (kind) fxK = Math.min(1, fxK + dt / 2);
    fx.frame(dt, t, fxK * (kind === "CANICULE" && !day ? 0.25 : 1), day);
    ctx.drawImage(fxCv, 0, 0, sc.W, sc.H);
  }

  /* 2.1 : le panneau du nom de gare, commun à tous les habillages */
  function stationSign(x, y, name, bg = "#0b2a4a", fg = "#e8edf5", font = "700 13px 'Space Mono', monospace") {
    ctx.font = font;
    const half = Math.max(70, ctx.measureText(name.toUpperCase()).width / 2 + 16);
    ctx.fillStyle = bg;
    ctx.fillRect(x - half, y, half * 2, 26);
    ctx.strokeStyle = fg; ctx.lineWidth = 1.5; ctx.strokeRect(x - half + 3, y + 3, half * 2 - 6, 20);
    ctx.fillStyle = fg;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(name.toUpperCase(), x, y + 13.5);
  }
  function glow(x, y, r, a = 0.55, col = "255,210,140") {
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function clockFace(x, y, r, roman, night) {
    ctx.fillStyle = night ? "#f6e7c4" : "#f4f1e8";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1c1b17"; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineWidth = 1;
    for (let k = 0; k < 12; k++) {
      const an = (k / 12) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r * 0.78, y + Math.sin(an) * r * 0.78); ctx.lineTo(x + Math.cos(an) * r * (roman ? 0.9 : 0.86), y + Math.sin(an) * r * (roman ? 0.9 : 0.86)); ctx.stroke();
    }
    const now = new Date();
    const h = (now.getHours() % 12) + now.getMinutes() / 60, m = now.getMinutes();
    ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin((h / 12) * Math.PI * 2) * r * 0.5, y - Math.cos((h / 12) * Math.PI * 2) * r * 0.5); ctx.stroke();
    ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin((m / 60) * Math.PI * 2) * r * 0.75, y - Math.cos((m / 60) * Math.PI * 2) * r * 0.75); ctx.stroke();
  }

  /* gare Belle Époque : marquise en fer forgé sur colonnes, verrière, horloge à chiffres romains, réverbères */
  function stationBelleEpoque(x, groundY, name, pal) {
    const snow = sc.weather === "neige";
    ctx.fillStyle = snow ? "#d7dee4" : "#9a8f80";
    ctx.fillRect(x - 280, groundY - 7, 560, 9);
    ctx.fillStyle = pal.light ? "#2a2f38" : "#c9bfae"; // bordure du quai en pierre
    ctx.fillRect(x - 280, groundY - 9, 560, 3);
    const roof = groundY - 112;
    // verrière bombée
    ctx.fillStyle = pal.light ? "rgba(255,214,150,0.18)" : "rgba(190,215,230,0.45)";
    ctx.beginPath(); ctx.moveTo(x - 240, roof + 18); ctx.quadraticCurveTo(x, roof - 34, x + 240, roof + 18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.light ? "#5b5f68" : "#2f3a33"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 240, roof + 18); ctx.quadraticCurveTo(x, roof - 34, x + 240, roof + 18); ctx.stroke();
    ctx.lineWidth = 1;
    for (let i = -220; i <= 220; i += 22) { ctx.beginPath(); ctx.moveTo(x + i, roof + 18); ctx.lineTo(x + i * 0.92, roof + 18 - 26 * (1 - (i / 240) ** 2)); ctx.stroke(); }
    // poutre et colonnes en fonte, chapiteaux et arcs de dentelle
    ctx.fillStyle = pal.light ? "#3d434d" : "#2f3a33";
    ctx.fillRect(x - 245, roof + 16, 490, 7);
    for (let i = -210; i <= 210; i += 105) {
      ctx.fillRect(x + i - 3, roof + 22, 6, groundY - roof - 28);
      ctx.fillRect(x + i - 7, roof + 22, 14, 5);
      ctx.fillRect(x + i - 6, groundY - 12, 12, 6);
      ctx.strokeStyle = pal.light ? "#3d434d" : "#2f3a33"; ctx.lineWidth = 2;
      if (i < 210) { ctx.beginPath(); ctx.arc(x + i + 52.5, roof + 23, 52, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); }
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + i + 52.5, roof + 23, 10 + k * 9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 0.6; if (i < 210) ctx.stroke(); }
    }
    // horloge au centre, sous la poutre
    clockFace(x, roof + 44, 15, true, pal.light);
    stationSign(x, groundY - 70, name, "#1d3b2c", "#f1e6c8", "700 13px 'Bitter', serif");
    // réverbères à globe
    for (const i of [-260, 260]) {
      ctx.fillStyle = "#2f3a33"; ctx.fillRect(x + i - 2, groundY - 86, 4, 80);
      ctx.fillStyle = pal.light ? "#ffe6b0" : "#e8e2d2";
      ctx.beginPath(); ctx.arc(x + i, groundY - 92, 7, 0, Math.PI * 2); ctx.fill();
      if (pal.light) glow(x + i, groundY - 92, 70, 0.6);
    }
    if (pal.light) glow(x, roof + 30, 160, 0.25);
  }

  /* gare des années 70 : béton brut, auvent en porte-à-faux, horloge à palettes, panneaux orange */
  function stationBeton(x, groundY, name, pal) {
    const snow = sc.weather === "neige";
    ctx.fillStyle = snow ? "#d4dade" : pal.light ? "#55585e" : "#a3a29c";
    ctx.fillRect(x - 270, groundY - 6, 540, 8);
    ctx.fillStyle = "#e7c43a"; ctx.fillRect(x - 270, groundY - 7, 540, 2); // bande de sécurité
    const top = groundY - 92;
    // pylônes en V et dalle épaisse
    ctx.fillStyle = pal.light ? "#4b4e55" : "#8f8d86";
    for (const i of [-150, 0, 150]) {
      ctx.beginPath(); ctx.moveTo(x + i - 4, groundY - 6); ctx.lineTo(x + i - 26, top + 14); ctx.lineTo(x + i - 18, top + 14); ctx.lineTo(x + i, groundY - 30); ctx.lineTo(x + i + 18, top + 14); ctx.lineTo(x + i + 26, top + 14); ctx.lineTo(x + i + 4, groundY - 6); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = pal.light ? "#5a5d64" : "#a8a69f";
    ctx.fillRect(x - 250, top, 500, 16);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    for (let i = -250; i < 250; i += 25) ctx.fillRect(x + i, top, 1, 16); // joints du coffrage
    // panneaux orange
    ctx.fillStyle = "#e2721b"; ctx.fillRect(x - 230, top + 22, 70, 18);
    ctx.fillStyle = "#fff"; ctx.font = "700 10px 'Work Sans', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("SORTIE →", x - 195, top + 31);
    // horloge à palettes
    ctx.fillStyle = "#1c1f24"; ctx.fillRect(x + 150, top + 20, 64, 24);
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    ctx.font = "700 14px 'Space Mono', monospace";
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = "#2c3038"; ctx.fillRect(x + 153 + k * 15, top + 23, 13, 18);
      ctx.fillStyle = "#f4f1e8"; ctx.fillText(hhmm[k], x + 159.5 + k * 15, top + 32.5);
      ctx.fillStyle = "#111"; ctx.fillRect(x + 153 + k * 15, top + 31.5, 13, 1);
    }
    stationSign(x, groundY - 62, name, "#1c1f24", "#f2a33a", "700 13px 'Work Sans', sans-serif");
    if (pal.light) for (const i of [-200, -66, 66, 200]) { ctx.fillStyle = "#fff2cc"; ctx.fillRect(x + i - 14, top + 15, 28, 2); glow(x + i, top + 20, 60, 0.45, "255,236,200"); }
  }

  /* gare de verre : grande verrière en arc, quai éclairé, écran d'affichage */
  function stationVerriere(x, groundY, name, pal) {
    const snow = sc.weather === "neige";
    ctx.fillStyle = snow ? "#dde3e8" : pal.light ? "#4c5560" : "#b7bcc2";
    ctx.fillRect(x - 300, groundY - 6, 600, 8);
    // nez de quai lumineux
    ctx.fillStyle = pal.light ? "#9fe3ff" : "#d9e6ee"; ctx.fillRect(x - 300, groundY - 7, 600, 1.5);
    if (pal.light) glow(x, groundY - 6, 300, 0.12, "160,220,255");
    const top = groundY - 150;
    // arc de verre
    const g = ctx.createLinearGradient(0, top, 0, groundY);
    g.addColorStop(0, pal.light ? "rgba(140,200,255,0.28)" : "rgba(210,232,245,0.55)");
    g.addColorStop(1, pal.light ? "rgba(140,200,255,0.05)" : "rgba(210,232,245,0.15)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - 290, groundY - 6); ctx.bezierCurveTo(x - 290, top - 10, x + 290, top - 10, x + 290, groundY - 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.light ? "#8fb0c8" : "#7c8a96"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x - 290, groundY - 6); ctx.bezierCurveTo(x - 290, top - 10, x + 290, top - 10, x + 290, groundY - 6); ctx.stroke();
    ctx.lineWidth = 0.8;
    for (let k = 1; k < 12; k++) {
      const t = k / 12;
      const px = x - 290 + 580 * t;
      const py = groundY - 6 - (groundY - 6 - top + 8) * 4 * t * (1 - t) * 0.98;
      ctx.beginPath(); ctx.moveTo(px, groundY - 6); ctx.lineTo(px, py); ctx.stroke();
    }
    // écran d'affichage
    ctx.fillStyle = "#0b1220"; ctx.fillRect(x - 70, groundY - 100, 140, 36);
    ctx.fillStyle = "#ffd36b"; ctx.font = "700 11px 'Space Mono', monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("DÉPART", x - 62, groundY - 91);
    ctx.fillStyle = "#e8edf5"; ctx.fillText(name.toUpperCase().slice(0, 14), x - 62, groundY - 75);
    ctx.fillStyle = "#4ade80"; ctx.textAlign = "right"; ctx.fillText("À L'HEURE", x + 64, groundY - 91);
    ctx.fillStyle = "#2b3443"; ctx.fillRect(x - 2, groundY - 64, 4, 58);
  }

  function drawStation(x, groundY, name, pal) {
    if (sc.stationSkin === "belle-epoque") return stationBelleEpoque(x, groundY, name, pal);
    if (sc.stationSkin === "beton") return stationBeton(x, groundY, name, pal);
    if (sc.stationSkin === "verriere") return stationVerriere(x, groundY, name, pal);
    // quai, abri et panneau — le nom est celui de la vraie gare
    ctx.fillStyle = sc.weather === "neige" ? "#cfd8df" : pal.light ? "#4a505a" : "#8a8f96";
    ctx.fillRect(x - 260, groundY - 6, 520, 8);
    ctx.fillStyle = pal.light ? "#1d2536" : "#3a4150";
    ctx.fillRect(x - 200, groundY - 70, 400, 10);
    for (let i = -180; i <= 180; i += 90) ctx.fillRect(x + i - 2, groundY - 60, 4, 54);
    // panneau
    // le panneau s'élargit pour les noms longs (« Clermont-Ferrand », ou le nom d'une compagnie en vitrine)
    ctx.font = "700 13px 'Space Mono', monospace";
    const half = Math.max(70, ctx.measureText(name.toUpperCase()).width / 2 + 16);
    ctx.fillStyle = "#0b2a4a";
    ctx.fillRect(x - half, groundY - 104, half * 2, 26);
    ctx.strokeStyle = "#e8edf5"; ctx.lineWidth = 1.5; ctx.strokeRect(x - half + 3, groundY - 101, half * 2 - 6, 20);
    ctx.fillStyle = "#e8edf5";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(name.toUpperCase(), x, groundY - 90.5);
    ctx.fillRect(x - 1.5, groundY - 78, 3, 16);
    // lampadaires la nuit
    if (pal.light) {
      for (let i = -150; i <= 150; i += 150) {
        const g = ctx.createRadialGradient(x + i, groundY - 60, 2, x + i, groundY - 60, 60);
        g.addColorStop(0, "rgba(255,210,140,.55)"); g.addColorStop(1, "rgba(255,210,140,0)");
        ctx.fillStyle = g; ctx.fillRect(x + i - 60, groundY - 120, 120, 120);
      }
    }
  }

  /* ---- 2.1 : la gare de triage, en arrière-plan : un faisceau de voies
     qui s'ouvre derrière le quai, des wagons garés, un mât d'éclairage ---- */
  const YARD_RAKES = [
    ["W_TREMIE", "W_TREMIE", "W_CITERNE"],
    ["W_CONTENEUR", "W_CONTENEUR", "W_PLAT", "W_CONTENEUR"],
    ["W_CAPITONNE", "W_FRIGO", "W_PORTE_AUTOS"],
    ["W_CITERNE", "W_PLAT", "W_TREMIE", "W_TREMIE"],
  ];
  function drawYard(x, groundY, pal) {
    /* le faisceau est en retrait, sur un terre-plein derrière la gare : on le
       voit au-dessus du toit de la rame, les rangées les plus lointaines plus
       petites. Il part de la droite du panneau de gare. */
    const k = Math.min(1, Math.max(0.6, sc.W / 1100));
    const rows = 5;
    const x0 = x + 110, x1 = x + 1100;
    // le terre-plein
    ctx.fillStyle = pal.light ? "rgba(12,16,24,0.55)" : "rgba(70,72,64,0.35)";
    ctx.fillRect(x0 - 40, groundY - 128 * k, x1 - x0 + 40, 58 * k);
    for (let i = 0; i < rows; i++) {
      const depth = i / (rows - 1); // 0 = le plus proche
      const y = groundY - (74 + i * 11) * k;
      const u = (0.36 - depth * 0.12) * k;
      ctx.strokeStyle = pal.light ? `rgba(150,160,175,${0.5 - depth * 0.25})` : `rgba(90,88,82,${0.8 - depth * 0.3})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x0 - 30 - i * 14, y); ctx.lineTo(x1, y); ctx.stroke();
      // des rames de wagons garées, à des places qui varient d'une rangée à l'autre
      const rake = YARD_RAKES[i % YARD_RAKES.length];
      ctx.save();
      ctx.globalAlpha = 1 - depth * 0.35;
      drawConsist(ctx, { cx: x0 + 140 + ((i * 211) % 420), base: y - 0.5, u, model: "WAGONS", cars: rake, livery: sc.livery, lit: false, night: !!pal.light, t: 0, s: 0, v: 0 });
      if (i % 2 === 0) drawConsist(ctx, { cx: x0 + 620 + ((i * 97) % 200), base: y - 0.5, u, model: "WAGONS", cars: YARD_RAKES[(i + 1) % YARD_RAKES.length], livery: sc.livery, lit: false, night: !!pal.light, t: 0, s: 0, v: 0 });
      ctx.restore();
    }
    // deux mâts d'éclairage : de nuit, de grandes nappes de lumière orangée
    for (const mx of [x0 + 300, x0 + 760]) {
      ctx.fillStyle = pal.light ? "#2a3345" : "#5a6270";
      ctx.fillRect(mx - 1.5, groundY - 190 * k, 3, 120 * k);
      ctx.fillRect(mx - 14, groundY - 192 * k, 28, 4);
      if (pal.light) {
        glow(mx, groundY - 186 * k, 150 * k, 0.32, "255,214,150");
        ctx.fillStyle = "#ffe2a8"; ctx.fillRect(mx - 12, groundY - 189 * k, 24, 2);
      }
    }
    // le poste d'aiguillage, au début du faisceau
    const px = x0 - 10, py = groundY - 74 * k;
    ctx.fillStyle = pal.light ? "#232a36" : "#7b6f62";
    ctx.fillRect(px - 26, py - 30 * k, 52, 30 * k);
    ctx.fillStyle = pal.light ? "#ffd892" : "#c9d6e2";
    ctx.fillRect(px - 20, py - 24 * k, 40, 8 * k);
    ctx.fillStyle = pal.light ? "#1a202b" : "#5a4e44";
    ctx.beginPath(); ctx.moveTo(px - 30, py - 30 * k); ctx.lineTo(px, py - 41 * k); ctx.lineTo(px + 30, py - 30 * k); ctx.fill();
  }

  /* ---- 2.1 : la deuxième voie, et les rames qui y passent en sens inverse ---- */
  function drawFarTrack(groundY, pal, land, night) {
    const y = groundY - 24;
    ctx.fillStyle = pal.ground; ctx.fillRect(0, y - 3, sc.W, 20);
    ctx.fillStyle = night(land.ballast); ctx.fillRect(0, y + 1, sc.W, 7);
    ctx.fillStyle = night("#3a2f25");
    const sl = 12, so = (sc.s * 0.92) % sl; // un peu plus loin : défile un peu moins vite
    for (let x = -so; x < sc.W; x += sl) ctx.fillRect(x, y + 2.5, 5.5, 3.5);
    // le rail accroche la lumière, même de nuit
    ctx.fillStyle = mix("#aeb7c1", "#0c1220", 0.45);
    ctx.fillRect(0, y + 1, sc.W, 1.6);
    return y;
  }
  function drawOncoming(trainFront, baseY, t, pal) {
    const u = Math.min(1.3, Math.max(0.55, sc.W / 900)) * 0.8;
    for (const o of sc.oncoming) {
      const front = trainFront + o.gap;
      const w = oncomingW.get(o.id) ?? sc.W * 0.6;
      if (front > sc.W + 40 || front + w < -40) continue;
      ctx.save();
      // la rame roule vers la gauche : on la dessine en miroir, tête à gauche
      ctx.translate(front, 0);
      ctx.scale(-1, 1);
      const box = drawConsist(ctx, {
        cx: -w / 2,
        base: baseY,
        u,
        maxWidth: sc.W * 0.74 * 0.8,
        model: o.model,
        skin: o.skin ?? null,
        livery: o.livery,
        cars: o.cars ?? [],
        lit: !!(pal.lamps ?? pal.light),
        night: !!pal.light,
        t,
        s: sc.s + t * o.v,
        v: o.v,
        smoke: [],
      });
      oncomingW.set(o.id, box.right - box.left);
      // son phare, de nuit, éclaire la voie devant elle
      if (pal.lamps ?? pal.light) {
        const lx = box.lamp.x, ly = box.lamp.y;
        const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, 130);
        g.addColorStop(0, "rgba(255,240,200,.55)");
        g.addColorStop(1, "rgba(255,240,200,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 190, ly - 30); ctx.lineTo(lx + 190, ly + 22); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ---- 2.1.1 : le poste-frontière ---- */
  function flag(x, y, w, h, code) {
    const H3 = (a, b, c) => { ctx.fillStyle = a; ctx.fillRect(x, y, w, h / 3); ctx.fillStyle = b; ctx.fillRect(x, y + h / 3, w, h / 3); ctx.fillStyle = c; ctx.fillRect(x, y + (2 * h) / 3, w, h / 3); };
    const V3 = (a, b, c) => { ctx.fillStyle = a; ctx.fillRect(x, y, w / 3, h); ctx.fillStyle = b; ctx.fillRect(x + w / 3, y, w / 3, h); ctx.fillStyle = c; ctx.fillRect(x + (2 * w) / 3, y, w / 3, h); };
    if (code === "FR") V3("#1f3f8f", "#f2f2f2", "#d4343a");
    else if (code === "BE") V3("#1a1a1a", "#f5d020", "#d4343a");
    else if (code === "IT") V3("#1d8a4a", "#f2f2f2", "#cf2b37");
    else if (code === "DE") H3("#1a1a1a", "#d4343a", "#f2c12e");
    else if (code === "ES") { ctx.fillStyle = "#c8202f"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#f6c200"; ctx.fillRect(x, y + h / 4, w, h / 2); }
    else if (code === "CH") { ctx.fillStyle = "#d52b1e"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#fff"; ctx.fillRect(x + w / 2 - h * 0.1, y + h * 0.2, h * 0.2, h * 0.6); ctx.fillRect(x + w / 2 - h * 0.3, y + h * 0.4, h * 0.6, h * 0.2); }
    else if (code === "GB") { ctx.fillStyle = "#1f3a7a"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#fff"; ctx.fillRect(x, y + h * 0.38, w, h * 0.24); ctx.fillRect(x + w * 0.42, y, w * 0.16, h); ctx.fillStyle = "#cf2b37"; ctx.fillRect(x, y + h * 0.44, w, h * 0.12); ctx.fillRect(x + w * 0.46, y, w * 0.08, h); }
  }
  function drawBorder(x, groundY, pal) {
    const b = sc.border;
    // la borne et le grand panneau bleu, comme sur les lignes européennes
    ctx.fillStyle = pal.light ? "#3a4150" : "#6b7280";
    ctx.fillRect(x - 2, groundY - 92, 4, 88);
    ctx.fillRect(x + 150, groundY - 92, 4, 88);
    ctx.font = "700 14px 'Work Sans', sans-serif";
    const name = b.to.name;
    const tw = Math.max(150, ctx.measureText(name).width + 70);
    const px = x + 76 - tw / 2;
    ctx.fillStyle = "#1f3f8f";
    ctx.fillRect(px, groundY - 118, tw, 40);
    ctx.strokeStyle = "#e8edf5"; ctx.lineWidth = 1.5; ctx.strokeRect(px + 3, groundY - 115, tw - 6, 34);
    // le cercle d'étoiles de l'Europe, sauf vers Londres et la Suisse
    if (b.to.code !== "GB" && b.to.code !== "CH" && b.from.code !== "GB" && b.from.code !== "CH") {
      ctx.fillStyle = "#f2c12e";
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.fillRect(px + 22 + Math.cos(a) * 10 - 1, groundY - 98 + Math.sin(a) * 10 - 1, 2.2, 2.2); }
    } else flag(px + 10, groundY - 108, 24, 16, b.to.code);
    ctx.fillStyle = "#f2f4f8"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(name, px + 44, groundY - 98);
    // le petit poste de douane, éteint ou allumé
    const hx = x - 120;
    ctx.fillStyle = pal.light ? "#232a36" : "#c9c2b4";
    ctx.fillRect(hx, groundY - 40, 46, 34);
    ctx.fillStyle = pal.light ? "#1a202b" : "#7a5a44";
    ctx.beginPath(); ctx.moveTo(hx - 5, groundY - 40); ctx.lineTo(hx + 23, groundY - 52); ctx.lineTo(hx + 51, groundY - 40); ctx.fill();
    ctx.fillStyle = pal.light ? "#ffd892" : "#9fb3c8";
    ctx.fillRect(hx + 8, groundY - 32, 14, 10);
    if (pal.light) glow(hx + 15, groundY - 27, 40, 0.35);
    // les deux drapeaux sur leur mât, de part et d'autre
    for (const [fx, code] of [[x - 40, b.from.code], [x + 196, b.to.code]]) {
      ctx.fillStyle = pal.light ? "#3a4150" : "#8a8f96";
      ctx.fillRect(fx, groundY - 78, 2, 74);
      const wave = Math.sin(sc.s * 0.002 + fx) * 1.5;
      flag(fx + 2, groundY - 77 + wave, 26, 17, code);
    }
  }

  /* ---- la rame : dessinée par trainArt (2.0) ---- */
  function drawTrain(x, y, t, pal) {
    const W = sc.W;
    const bob = Math.sin(t * 9) * 0.6 * Math.min(1, sc.v / 200);
    const model = sc.model || (sc.express ? "EXPRESS" : sc.sleeper ? "COUCHETTES" : "STANDARD");
    const box = drawConsist(ctx, {
      cx: x,
      base: y + 2 + bob,
      u: Math.min(1.3, Math.max(0.55, W / 900)),
      maxWidth: W * 0.74,
      model,
      skin: sc.skin,
      livery: sc.livery,
      cars: sc.cars,
      firstLivery: sc.firstLivery,
      lit: !!(pal.lamps ?? pal.light),
      night: !!pal.light,
      t,
      s: sc.s,
      v: sc.v,
      smoke: puffs,
      plate: sc.plate,
    });
    sc.box = box;
    // phare : la nuit, et par brouillard ou neige
    if (pal.lamps ?? pal.light) {
      const fx = box.lamp.x, fy = box.lamp.y;
      const g = ctx.createRadialGradient(fx, fy, 1, fx, fy, 160);
      g.addColorStop(0, "rgba(255,240,200,.7)");
      g.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + 240, fy - 40);
      ctx.lineTo(fx + 240, fy + 30);
      ctx.closePath();
      ctx.fill();
    }
  }

  function frame(t) {
    const W = sc.W, H = sc.H;
    // anciens appels : « nuit » voulait dire temps clair, de nuit
    const weather = sc.weather === "nuit" ? "clair" : LAND[sc.weather] ? sc.weather : "clair";
    const hour = sc.hour != null ? sc.hour : sc.weather === "nuit" ? 23 : 13;
    const sky = skyAt(hour);
    const dark = sky.dark;
    const overcast = weather === "neige" || weather === "brouillard" || weather === "pluie" || weather === "orage";
    const wet = weather === "pluie" || weather === "orage";
    const tint = SKY_TINT[weather];
    let top = sky.top, bot = sky.bot;
    if (tint) { const k = tint[1] * (1 - dark * 0.8); top = mix(top, tint[0], k); bot = mix(bot, tint[0], k); }
    const land = LAND[weather];
    const night = (c) => mix(c, "#0c1220", Math.min(0.88, dark * 0.9));
    const haze = HAZE[weather];
    const pal = {
      far: night(mix(land.far, bot, haze[0])),
      mid: night(mix(land.mid, bot, haze[1])),
      near: night(land.near),
      ground: night(land.ground),
      light: dark > 0.45 || (overcast && dark > 0.2) ? 1 : 0,
    };
    // par brouillard ou neige, les feux sont allumés même de jour
    const lamps = pal.light || overcast;
    const groundY = H * 0.74;
    const s = sc.s;

    // ciel
    const g = ctx.createLinearGradient(0, 0, 0, groundY);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // étoiles et lune, quand le ciel est dégagé
    if (dark > 0.5 && !overcast) {
      ctx.fillStyle = "#e8edf5";
      for (const st of stars) { ctx.globalAlpha = (dark - 0.5) * 2 * (0.5 + 0.5 * Math.sin(t * 2 + st.x * 40)); ctx.fillRect(st.x * W, st.y * H, st.r, st.r); }
      ctx.globalAlpha = 1;
      const mx = W * 0.82, my = H * 0.18;
      const halo = ctx.createRadialGradient(mx, my, 10, mx, my, 70);
      halo.addColorStop(0, "rgba(243,239,224,.25)"); halo.addColorStop(1, "rgba(243,239,224,0)");
      ctx.fillStyle = halo; ctx.fillRect(mx - 70, my - 70, 140, 140);
      ctx.fillStyle = "#f3efe0"; ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = top; ctx.beginPath(); ctx.arc(mx + 6, my - 4, 13, 0, Math.PI * 2); ctx.fill();
    }
    // le soleil suit sa course, de l'aube au crépuscule
    if (hour > 5.8 && hour < 20.6) {
      const p = (hour - 5.8) / 14.8;
      const sx = W * (0.08 + 0.84 * p), sy = groundY - Math.sin(Math.PI * p) * groundY * 0.82;
      const low = 1 - Math.sin(Math.PI * p); // bas sur l'horizon : plus orange, plus gros
      const col = weather === "canicule" ? "#fff1c9" : mix("#fff8e1", "#ffb36b", low * 0.8);
      const rad = (weather === "canicule" ? 26 : 19) + low * 6;
      const glow = ctx.createRadialGradient(sx, sy, rad * 0.6, sx, sy, rad * (overcast ? 7 : 4.5));
      glow.addColorStop(0, overcast ? "rgba(255,248,225,.35)" : `rgba(255,${Math.round(230 - low * 70)},170,.45)`);
      glow.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = glow; ctx.fillRect(sx - rad * 7, sy - rad * 7, rad * 14, rad * 14);
      if (!overcast) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(sx, sy, rad, 0, Math.PI * 2); ctx.fill(); }
    }

    // nuages : quelques-uns par beau temps, une couche épaisse quand il neige
    if (weather !== "canicule" && weather !== "verglas") {
      const cloudCol = mix(mix(weather === "orage" ? "#59616e" : wet ? "#9aa3ad" : "#ffffff", bot, 0.25), "#2a3350", dark * 0.8);
      const deck = weather === "neige" || wet;
      const n = deck || weather === "nuageux" ? clouds.length : weather === "brouillard" ? 0 : 5;
      ctx.fillStyle = cloudCol;
      for (let i = 0; i < n; i++) {
        const c = clouds[i];
        const x = ((((c.x * W - s * c.k - t * 4) % (W * 1.4)) + W * 1.4) % (W * 1.4)) - W * 0.2;
        const y = c.y * H * (deck ? 0.7 : 1), w = c.w * W * (deck ? 1.8 : weather === "nuageux" ? 1.3 : 1);
        ctx.globalAlpha = deck ? (weather === "orage" ? 0.85 : 0.6) : 0.8;
        ctx.beginPath();
        ctx.ellipse(x, y, w * 0.5, w * 0.16, 0, 0, Math.PI * 2);
        ctx.ellipse(x - w * 0.18, y - w * 0.07, w * 0.22, w * 0.15, 0, 0, Math.PI * 2);
        ctx.ellipse(x + w * 0.14, y - w * 0.1, w * 0.26, w * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // des oiseaux, de temps en temps, par beau temps de jour
    if (weather === "clair" && dark < 0.3) {
      if (!birds.on && t > birds.next) { birds.on = true; birds.x = 1.1; birds.y = 0.12 + Math.random() * 0.2; }
      if (birds.on) {
        birds.x -= 0.0016;
        if (birds.x < -0.15) { birds.on = false; birds.next = t + 14 + Math.random() * 20; }
        ctx.strokeStyle = "rgba(30,40,55,.7)"; ctx.lineWidth = 1.3;
        for (let i = 0; i < 5; i++) {
          const bx = (birds.x + (i % 2) * 0.02 + i * 0.018) * W, by = birds.y * H + (i % 2) * 8 + i * 2;
          const fl = Math.sin(t * 9 + i) * 3;
          ctx.beginPath(); ctx.moveTo(bx - 5, by - fl); ctx.lineTo(bx, by); ctx.lineTo(bx + 5, by - fl); ctx.stroke();
        }
      }
    }

    // plans successifs : plus ils sont loin, plus ils défilent lentement
    const layers = [
      { k: 0.06, base: groundY - H * 0.26, amp: H * 0.08, f: 0.004, seed: 1, c: pal.far },
      { k: 0.18, base: groundY - H * 0.12, amp: H * 0.06, f: 0.007, seed: 4, c: pal.mid },
    ];
    for (const L of layers) {
      ctx.fillStyle = L.c; ctx.beginPath(); ctx.moveTo(0, groundY);
      for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, L.base - Math.abs(hill(x + s * L.k, L.seed, L.amp, L.f)));
      ctx.lineTo(W, groundY); ctx.closePath(); ctx.fill();
    }
    // arbres et maisons du plan proche (enneigés quand il neige)
    const snowy = weather === "neige";
    const frosty = weather === "verglas";
    const nearK = 0.45, spacing = 70;
    const off = (s * nearK) % spacing;
    for (let i = -1; i < W / spacing + 2; i++) {
      const wx = i * spacing - off;
      const idx = Math.floor((s * nearK) / spacing) + i;
      const r = Math.abs(Math.sin(idx * 12.9898) * 43758.5453) % 1;
      if (r < 0.55) continue;
      ctx.fillStyle = pal.near;
      if (r > 0.9) { // maison
        ctx.fillRect(wx, groundY - 30, 26, 22);
        ctx.beginPath(); ctx.moveTo(wx - 3, groundY - 30); ctx.lineTo(wx + 13, groundY - 42); ctx.lineTo(wx + 29, groundY - 30); ctx.fill();
        if (snowy || frosty) {
          ctx.fillStyle = night(snowy ? "#ffffff" : "#e2edf5");
          ctx.beginPath(); ctx.moveTo(wx - 4, groundY - 29); ctx.lineTo(wx + 13, groundY - 43); ctx.lineTo(wx + 30, groundY - 29); ctx.lineTo(wx + 26, groundY - 28); ctx.lineTo(wx + 13, groundY - 39); ctx.lineTo(wx, groundY - 28); ctx.fill();
        }
        if (pal.light) {
          // une fenêtre allumée, avec son halo
          const wg = ctx.createRadialGradient(wx + 11, groundY - 21, 1, wx + 11, groundY - 21, 16);
          wg.addColorStop(0, "rgba(255,216,146,.45)"); wg.addColorStop(1, "rgba(255,216,146,0)");
          ctx.fillStyle = wg; ctx.fillRect(wx - 5, groundY - 37, 32, 32);
          ctx.fillStyle = "#ffd892"; ctx.fillRect(wx + 8, groundY - 24, 6, 6);
        }
      } else { // arbre
        const ty = groundY - 24 - r * 10, tr = 10 + r * 6;
        ctx.beginPath(); ctx.arc(wx + 8, ty, tr, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(wx + 6, groundY - 18, 4, 12);
        if (snowy || frosty) {
          ctx.fillStyle = night(snowy ? "#ffffff" : "#dfeaf2");
          ctx.beginPath(); ctx.arc(wx + 8, ty, tr, Math.PI * 1.08, Math.PI * 1.92); ctx.arc(wx + 8, ty + tr * 0.35, tr * 0.8, Math.PI * 1.85, Math.PI * 1.15, true); ctx.fill();
        }
      }
    }

    // 2.1 : la gare de triage, en retrait derrière la gare (sur la droite du panneau)
    if (sc.yards?.length) {
      const tx = W * 0.46, dx = tx - sc.depDist, ax = tx + sc.arrDist;
      if (dx > -1300 && dx < W + 200 && sc.yards.includes(sc.dep)) drawYard(dx, groundY, pal);
      if (ax > -1300 && ax < W + 200 && sc.yards.includes(sc.arr)) drawYard(ax, groundY, pal);
    }

    // sol et ballast
    ctx.fillStyle = pal.ground; ctx.fillRect(0, groundY - 8, W, H - groundY + 8);
    ctx.fillStyle = night(land.ballast);
    ctx.fillRect(0, groundY + 2, W, 12);
    // traverses
    ctx.fillStyle = night("#3a2f25");
    const sl = 16, so = s % sl;
    for (let x = -so; x < W; x += sl) ctx.fillRect(x, groundY + 4, 8, 6);
    // rails : un reflet de glace par verglas, de lune la nuit
    ctx.fillStyle = frosty ? "#d6e6f2" : night("#9aa3ad");
    ctx.fillRect(0, groundY + 2, W, 2.2);
    if (frosty) {
      for (let i = 0; i < 14; i++) {
        const gx = (((i * 97 - s * 1) % W) + W) % W, a = Math.pow(Math.max(0, Math.sin(t * 2 + i * 1.7)), 10);
        if (a < 0.1) continue;
        ctx.globalAlpha = a; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gx - 4, groundY + 3); ctx.lineTo(gx + 4, groundY + 3); ctx.moveTo(gx, groundY - 1); ctx.lineTo(gx, groundY + 7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // 2.1 : la double voie
    const farY = sc.doubleTrack ? drawFarTrack(groundY, pal, land, night) : null;

    // poteaux de caténaire, au même plan que la voie
    const pk = 1, pstep = 150, po = (s * pk) % pstep;
    ctx.strokeStyle = pal.light ? "#2a3345" : "#5a6270"; ctx.lineWidth = 3;
    for (let x = -po; x < W + pstep; x += pstep) {
      ctx.beginPath(); ctx.moveTo(x, groundY + 2); ctx.lineTo(x, groundY - H * 0.36); ctx.lineTo(x + 26, groundY - H * 0.36); ctx.stroke();
    }
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, groundY - H * 0.34); ctx.lineTo(W, groundY - H * 0.34); ctx.stroke();

    // gares de départ et d'arrivée, placées dans le monde
    const trainX = W * 0.46;
    const depX = trainX - sc.depDist, arrX = trainX + sc.arrDist;
    // 2.1.1 : le poste-frontière
    if (sc.border) {
      const bx = trainX + sc.border.dx;
      if (bx > -400 && bx < W + 300) drawBorder(bx, groundY, pal);
    }
    // 2.1 : les rames croisées passent sur la voie du fond, derrière les quais
    if (farY !== null && sc.oncoming.length) drawOncoming(sc.box ? sc.box.right : trainX + W * 0.3, farY + 1, t, { ...pal, lamps });
    if (depX > -400) drawStation(depX, groundY, sc.dep, pal);
    if (arrX < W + 400) drawStation(arrX, groundY, sc.arr, pal);

    drawTrain(trainX, groundY, t, { ...pal, lamps });

    // canicule : l'air ondule au ras de la voie
    if (weather === "canicule" && dark < 0.5) {
      ctx.globalAlpha = 0.18;
      for (let y = groundY - 30; y < groundY + 10; y += 4) {
        const dx = Math.sin(t * 6 + y * 0.4) * 2.5;
        ctx.drawImage(sc.cv, 0, y * sc.dpr, W * sc.dpr, 4 * sc.dpr, dx, y, W, 4);
      }
      ctx.globalAlpha = 1;
    }
    // brouillard : un voile uniforme en plus des nappes qui dérivent
    if (weather === "brouillard") {
      ctx.fillStyle = `rgba(${dark > 0.5 ? "60,68,80" : "214,220,224"},.28)`;
      ctx.fillRect(0, 0, W, H);
    }

    // pluie et orage : des traits obliques, plus couchés quand la rame file, et des éclaboussures sur le ballast
    if (wet) {
      const heavy = weather === "orage";
      const n = heavy ? 260 : 150;
      const slant = 0.25 + Math.min(1, sc.v / 500) * 0.9;
      ctx.strokeStyle = dark > 0.5 ? "rgba(170,185,205,.35)" : "rgba(225,232,240,.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const seed = Math.sin(i * 91.7) * 10000;
        const r1 = seed - Math.floor(seed), r2 = Math.abs(Math.sin(i * 17.3)) % 1;
        const speed = 700 + r2 * 500;
        const len = 10 + r2 * 14;
        const y = ((r1 * H + t * speed) % (H + 40)) - 20;
        const x = (((r2 * W * 1.3 - t * speed * slant - s * 0.6) % (W * 1.3)) + W * 1.3) % (W * 1.3) - W * 0.15;
        ctx.moveTo(x, y); ctx.lineTo(x - len * slant, y + len);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(220,228,236,.35)";
      for (let i = 0; i < (heavy ? 26 : 14); i++) {
        const ph = (t * 3 + i * 0.37) % 1;
        const x = ((i * 137 + Math.floor(t * 3 + i * 0.37) * 53) % W);
        ctx.globalAlpha = 1 - ph;
        ctx.beginPath(); ctx.ellipse(x, groundY + 6, 2 + ph * 5, 0.8 + ph, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // le ballast mouillé brille un peu
      ctx.fillStyle = "rgba(200,215,230,.08)";
      ctx.fillRect(0, groundY - 8, W, 22);
    }
    if (weather === "orage") {
      if (!sc._bolt || t > sc._bolt.until + sc._bolt.wait) {
        sc._bolt = { at: t, until: t + 0.45, wait: 5 + Math.random() * 9, x: W * (0.15 + Math.random() * 0.7), seed: Math.random() * 1000 };
      }
      const b = sc._bolt;
      if (t < b.until) {
        const k = 1 - (t - b.at) / (b.until - b.at);
        const flick = k * (0.6 + 0.4 * Math.abs(Math.sin((t - b.at) * 40)));
        ctx.fillStyle = `rgba(235,240,255,${0.35 * flick})`;
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = `rgba(255,255,255,${flick})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let x = b.x, y = 0;
        ctx.moveTo(x, y);
        for (let i = 1; i <= 9; i++) {
          x += Math.sin(b.seed + i * 3.1) * 18;
          y = (groundY - H * 0.2) * (i / 9);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // effets par-dessus : flocons, givre sur la vitre, nappes, chaleur
    overlay(t, FX_KIND[weather] ?? null, dark < 0.5);
  }

  return { sc, frame };
}
