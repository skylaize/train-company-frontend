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
  };
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

  function drawStation(x, groundY, name, pal) {
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
