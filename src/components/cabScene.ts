// @ts-nocheck — dessin sur canvas, repris tel quel de la démo « Vue cabine »
/* ============================================================
   Scène de la vue cabine : ciel, collines, voie, caténaire, gares et rame.
   Tout est dessiné à chaque image à partir d'un petit objet « sc » que le
   composant met à jour : météo, livrée, vitesse, distances aux deux gares.
   ============================================================ */

export function createCabScene(ctx) {
  const sc = {
    W: 0, H: 0, dpr: 1, cv: ctx.canvas,
    weather: "clair", livery: "#4f7fa3", express: false,
    v: 0, s: 0, dep: "", arr: "", depDist: 1e9, arrDist: 1e9,
    skin: null as string | null, // matériel de collection (boutique) : "vapeur" | "micheline" | null
  };
  const puffs = []; // fumée de la locomotive à vapeur
  const hill = (x, seed, amp, freq) =>
    Math.sin(x * freq + seed) * amp * 0.6 + Math.sin(x * freq * 2.3 + seed * 1.7) * amp * 0.3 + Math.sin(x * freq * 5.1 + seed * 0.3) * amp * 0.1;

  const PALETTES = {
    clair:      { skyTop: "#6fa8dc", skyBot: "#cfe3f2", far: "#8fb1c9", mid: "#5d8a6a", near: "#3e6b4a", ground: "#4a5a3a", light: 0 },
    nuit:       { skyTop: "#050914", skyBot: "#1a2540", far: "#1b2436", mid: "#141c2b", near: "#0f1622", ground: "#10151e", light: 1 },
    brouillard: { skyTop: "#9aa5ae", skyBot: "#c9cfd3", far: "#aeb6bc", mid: "#8e999c", near: "#6e7b76", ground: "#5d6659", light: 0 },
    neige:      { skyTop: "#8ea3b8", skyBot: "#dde5ec", far: "#c4d0db", mid: "#e9eef2", near: "#f4f7f9", ground: "#e6ecf0", light: 0 },
    canicule:   { skyTop: "#e8964a", skyBot: "#f6d9a0", far: "#d9a86f", mid: "#b98b4e", near: "#9a7a3e", ground: "#8a6b3a", light: 0 },
  };

  // flocons et étoiles
  const flakes = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, s: 0.4 + Math.random() }));
  const stars = Array.from({ length: 80 }, () => ({ x: Math.random(), y: Math.random() * 0.55, r: Math.random() * 1.2 + 0.2 }));

  function drawStation(x, groundY, name, pal) {
    const W = sc.W, H = sc.H;
    // quai, abri et panneau — le nom est celui de la vraie gare
    ctx.fillStyle = sc.weather === "neige" ? "#cfd8df" : "#8a8f96";
    ctx.fillRect(x - 260, groundY - 6, 520, 8);
    ctx.fillStyle = pal.light ? "#1d2536" : "#3a4150";
    ctx.fillRect(x - 200, groundY - 70, 400, 10);
    for (let i = -180; i <= 180; i += 90) ctx.fillRect(x + i - 2, groundY - 60, 4, 54);
    // panneau
    ctx.fillStyle = "#0b2a4a";
    ctx.fillRect(x - 70, groundY - 104, 140, 26);
    ctx.strokeStyle = "#e8edf5"; ctx.lineWidth = 1.5; ctx.strokeRect(x - 67, groundY - 101, 134, 20);
    ctx.fillStyle = "#e8edf5";
    ctx.font = "700 13px 'Space Mono', monospace";
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

  /* ---- matériel de collection ---- */

  function drawSteam(x, y, t, pal) {
    const W = sc.W;
    const u = Math.min(1.25, W / 900); // échelle
    const bob = Math.sin(t * 9) * 0.6 * Math.min(1, sc.v / 200);
    const base = y - 10 + bob;
    const locoW = 150 * u, tenderW = 70 * u, coachW = 140 * u, gap = 6 * u;
    const total = locoW + tenderW + coachW * 2 + gap * 3;
    let cx = x - total / 2;
    const dark = "#1f2530";
    // deux voitures anciennes, à la couleur de la livrée
    for (let i = 0; i < 2; i++) {
      const top = base - 42 * u;
      ctx.fillStyle = sc.livery; ctx.fillRect(cx, top, coachW, 34 * u);
      ctx.fillStyle = "#2b2016"; ctx.fillRect(cx - 2, top - 5 * u, coachW + 4, 6 * u);
      ctx.fillStyle = pal.light ? "#ffd892" : "#f1e6c8";
      for (let k = 0; k < 6; k++) ctx.fillRect(cx + 10 * u + k * 21 * u, top + 8 * u, 13 * u, 12 * u);
      ctx.fillStyle = dark;
      for (const bx of [cx + coachW * 0.2, cx + coachW * 0.8]) { ctx.beginPath(); ctx.arc(bx, base, 6 * u, 0, Math.PI * 2); ctx.fill(); }
      cx += coachW + gap;
    }
    // tender
    ctx.fillStyle = dark; ctx.fillRect(cx, base - 34 * u, tenderW, 28 * u);
    ctx.fillStyle = "#0e1117"; ctx.fillRect(cx + 4 * u, base - 40 * u, tenderW - 8 * u, 8 * u);
    for (const bx of [cx + tenderW * 0.28, cx + tenderW * 0.72]) { ctx.beginPath(); ctx.arc(bx, base, 6.5 * u, 0, Math.PI * 2); ctx.fill(); }
    cx += tenderW + gap;
    // locomotive : cabine, chaudière, cheminée, grandes roues motrices
    ctx.fillStyle = dark; ctx.fillRect(cx, base - 50 * u, 36 * u, 44 * u);
    ctx.fillStyle = pal.light ? "#ffcf7a" : "#f1e6c8"; ctx.fillRect(cx + 8 * u, base - 44 * u, 16 * u, 14 * u);
    ctx.fillStyle = "#0e1117"; ctx.fillRect(cx - 3 * u, base - 54 * u, 42 * u, 6 * u);
    ctx.fillStyle = dark; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cx + 34 * u, base - 36 * u, locoW - 40 * u, 26 * u, 12 * u); else ctx.rect(cx + 34 * u, base - 36 * u, locoW - 40 * u, 26 * u);
    ctx.fill();
    ctx.fillStyle = sc.livery; ctx.fillRect(cx + 40 * u, base - 30 * u, locoW - 60 * u, 3 * u);
    const chimneyX = cx + locoW - 26 * u;
    ctx.fillStyle = "#0e1117"; ctx.fillRect(chimneyX, base - 50 * u, 10 * u, 16 * u); ctx.fillRect(chimneyX - 2 * u, base - 52 * u, 14 * u, 4 * u);
    ctx.fillStyle = "#c99a3e"; ctx.beginPath(); ctx.arc(cx + locoW - 48 * u, base - 38 * u, 5 * u, 0, Math.PI * 2); ctx.fill(); // dôme en laiton
    const spin = sc.s * 0.05;
    for (const [wx, r] of [[cx + 46 * u, 11], [cx + 74 * u, 11], [cx + 102 * u, 11], [cx + locoW - 14 * u, 6]]) {
      ctx.fillStyle = "#c99a3e"; ctx.beginPath(); ctx.arc(wx, base - (r - 6) * u, r * u, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1.4; ctx.beginPath();
      ctx.moveTo(wx, base - (r - 6) * u); ctx.lineTo(wx + Math.cos(spin) * r * u, base - (r - 6) * u + Math.sin(spin) * r * u); ctx.stroke();
    }
    // bielle
    ctx.strokeStyle = "#9aa3ad"; ctx.lineWidth = 2.2; ctx.beginPath();
    ctx.moveTo(cx + 46 * u + Math.cos(spin) * 6 * u, base - 5 * u + Math.sin(spin) * 6 * u);
    ctx.lineTo(cx + 102 * u + Math.cos(spin) * 6 * u, base - 5 * u + Math.sin(spin) * 6 * u); ctx.stroke();
    // panache : des bouffées qui montent et partent en arrière avec la vitesse
    if (Math.random() < 0.22 + sc.v / 2500) puffs.push({ x: chimneyX + 5 * u, y: base - 54 * u, r: 4 * u, a: 0.75 });
    for (const p of puffs) {
      p.x -= (sc.v * 0.016 + 0.4); p.y -= 0.6; p.r += 0.3; p.a -= 0.014;
      ctx.fillStyle = pal.light ? `rgba(160,170,185,${Math.max(0, p.a)})` : `rgba(235,238,242,${Math.max(0, p.a)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    while (puffs.length && puffs[0].a <= 0) puffs.shift();
    if (puffs.length > 140) puffs.splice(0, puffs.length - 140);
  }

  function drawMicheline(x, y, t, pal) {
    const W = sc.W;
    const u = Math.min(1.3, W / 850);
    const bob = Math.sin(t * 11) * 0.5 * Math.min(1, sc.v / 200);
    const len = 300 * u, h = 44 * u;
    const left = x - len / 2, base = y - 12 + bob, top = base - h;
    // caisse arrondie rouge et crème
    ctx.fillStyle = "#b3261e"; ctx.beginPath();
    ctx.moveTo(left, base); ctx.quadraticCurveTo(left, top, left + 40 * u, top); ctx.lineTo(left + len - 40 * u, top);
    ctx.quadraticCurveTo(left + len, top, left + len, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#efe6cf"; ctx.beginPath();
    ctx.moveTo(left + 2, base); ctx.quadraticCurveTo(left + 4 * u, base - h * 0.45, left + 30 * u, base - h * 0.45);
    ctx.lineTo(left + len - 30 * u, base - h * 0.45); ctx.quadraticCurveTo(left + len - 4 * u, base - h * 0.45, left + len - 2, base); ctx.closePath(); ctx.fill();
    // fenêtres
    ctx.fillStyle = pal.light ? "#ffd892" : "#2b3a4f";
    for (let k = 0; k < 9; k++) ctx.fillRect(left + 36 * u + k * 26 * u, top + 8 * u, 18 * u, 12 * u);
    // bogies à pneus
    ctx.fillStyle = "#1a1f28";
    for (const bx of [left + 50 * u, left + len - 50 * u]) {
      for (const w of [-10, 10]) { ctx.beginPath(); ctx.arc(bx + w * u, base + 2, 5 * u, 0, Math.PI * 2); ctx.fill(); }
    }
    if (pal.light) {
      const g = ctx.createRadialGradient(left + len, base - h * 0.3, 1, left + len, base - h * 0.3, 140);
      g.addColorStop(0, "rgba(255,240,200,.7)"); g.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(left + len, base - h * 0.3);
      ctx.lineTo(left + len + 220, base - h * 0.3 - 40); ctx.lineTo(left + len + 220, base - h * 0.3 + 30); ctx.closePath(); ctx.fill();
    }
  }

  function drawTrain(x, y, t, pal) {
    if (sc.skin === "vapeur") return drawSteam(x, y, t, pal);
    if (sc.skin === "micheline") return drawMicheline(x, y, t, pal);
    const W = sc.W, H = sc.H;
    const bob = Math.sin(t * 9) * 0.6 * Math.min(1, sc.v / 200);
    const col = sc.livery;
    const cars = sc.express ? 3 : 3;
    const carW = Math.min(240, W * 0.22), carH = carW * 0.28, gap = 6;
    const total = carW * cars + gap * (cars - 1);
    let cx = x - total / 2;
    for (let i = 0; i < cars; i++) {
      const isLoco = i === cars - 1; // la motrice mène, vers la droite
      const top = y - carH - 10 + bob;
      // caisse
      ctx.fillStyle = pal.light ? "#c9ced6" : "#e7eaee";
      ctx.beginPath();
      if (isLoco) {
        const nose = sc.express ? carH * 1.2 : carH * 0.55;
        ctx.moveTo(cx, top + 4);
        ctx.lineTo(cx + carW - nose, top);
        ctx.quadraticCurveTo(cx + carW, top + carH * 0.2, cx + carW + (sc.express ? 6 : 0), top + carH);
        ctx.lineTo(cx, top + carH);
      } else {
        ctx.roundRect ? ctx.roundRect(cx, top, carW, carH, 5) : ctx.rect(cx, top, carW, carH);
      }
      ctx.closePath(); ctx.fill();
      // bande de livrée
      ctx.fillStyle = col;
      ctx.fillRect(cx, top + carH * 0.62, isLoco ? carW - 4 : carW, carH * 0.18);
      // fenêtres
      const lit = pal.light;
      ctx.fillStyle = lit ? "#ffd892" : "#2b3a4f";
      const n = isLoco ? 2 : 6;
      const ww = (carW - 24) / (isLoco ? 4 : n) - 4;
      for (let k = 0; k < n; k++) ctx.fillRect(cx + 10 + k * (ww + 4), top + carH * 0.22, ww, carH * 0.26);
      if (isLoco) { ctx.fillStyle = "#1b2638"; ctx.fillRect(cx + carW - (sc.express ? carH * 1.05 : carH * 0.5), top + carH * 0.2, carH * 0.4, carH * 0.25); }
      // pantographe
      if (isLoco || i === 0) {
        ctx.strokeStyle = "#3a4250"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx + carW * 0.3, top); ctx.lineTo(cx + carW * 0.42, top - 16); ctx.lineTo(cx + carW * 0.54, top); ctx.stroke();
      }
      // bogies
      ctx.fillStyle = "#1a1f28";
      for (const bx of [cx + carW * 0.18, cx + carW * 0.82]) {
        ctx.fillRect(bx - 16, top + carH, 32, 7);
        for (const w of [-9, 9]) { ctx.beginPath(); ctx.arc(bx + w, top + carH + 8, 4.5, 0, Math.PI * 2); ctx.fill(); }
      }
      // phare
      if (isLoco && pal.light) {
        const g = ctx.createRadialGradient(cx + carW + 4, top + carH * 0.8, 1, cx + carW + 4, top + carH * 0.8, 140);
        g.addColorStop(0, "rgba(255,240,200,.75)"); g.addColorStop(1, "rgba(255,240,200,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx + carW, top + carH * 0.8);
        ctx.lineTo(cx + carW + 220, top + carH * 0.8 - 40); ctx.lineTo(cx + carW + 220, top + carH * 0.8 + 30); ctx.closePath(); ctx.fill();
      }
      cx += carW + gap;
    }
  }

  function frame(t) {
    const W = sc.W, H = sc.H, dpr = sc.dpr, cv = sc.cv;
    const pal = PALETTES[sc.weather];
    const groundY = H * 0.74;
    const s = sc.s;

    // ciel
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, pal.skyTop); sky.addColorStop(1, pal.skyBot);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    if (sc.weather === "nuit") {
      ctx.fillStyle = "#e8edf5";
      for (const st of stars) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + st.x * 40); ctx.fillRect(st.x * W, st.y * H, st.r, st.r); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#f3efe0"; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.2, 16, 0, Math.PI * 2); ctx.fill();
    } else if (sc.weather === "clair" || sc.weather === "canicule") {
      ctx.fillStyle = sc.weather === "canicule" ? "#fff1c9" : "#fff8e1";
      ctx.beginPath(); ctx.arc(W * 0.8, H * 0.2, sc.weather === "canicule" ? 26 : 20, 0, Math.PI * 2); ctx.fill();
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
    // arbres et maisons du plan proche
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
        if (pal.light) { ctx.fillStyle = "#ffd892"; ctx.fillRect(wx + 8, groundY - 24, 6, 6); }
      } else { // arbre
        ctx.beginPath(); ctx.arc(wx + 8, groundY - 24 - r * 10, 10 + r * 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(wx + 6, groundY - 18, 4, 12);
      }
    }

    // sol et ballast
    ctx.fillStyle = pal.ground; ctx.fillRect(0, groundY - 8, W, H - groundY + 8);
    ctx.fillStyle = sc.weather === "neige" ? "#b9c3cb" : "#5b5750";
    ctx.fillRect(0, groundY + 2, W, 12);
    // traverses
    ctx.fillStyle = "#3a2f25";
    const sl = 16, so = s % sl;
    for (let x = -so; x < W; x += sl) ctx.fillRect(x, groundY + 4, 8, 6);
    // rails
    ctx.fillStyle = "#9aa3ad"; ctx.fillRect(0, groundY + 2, W, 2.2);

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

    drawTrain(trainX, groundY, t, pal);

    // météo par-dessus
    if (sc.weather === "brouillard") {
      for (let i = 0; i < 3; i++) {
        const g = ctx.createLinearGradient(0, 0, W, 0);
        const shift = ((t * 20 + i * 200) % W) / W;
        g.addColorStop(0, "rgba(220,226,230,.35)"); g.addColorStop(shift, "rgba(220,226,230,.62)"); g.addColorStop(1, "rgba(220,226,230,.35)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
    }
    if (sc.weather === "neige") {
      ctx.fillStyle = "rgba(255,255,255,.9)";
      for (const f of flakes) {
        f.y += 0.0018 * f.s; f.x -= (0.0009 + sc.v / 900000) * f.s * 4;
        if (f.y > 1) f.y = 0; if (f.x < 0) f.x = 1;
        ctx.beginPath(); ctx.arc(f.x * W, f.y * H, f.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (sc.weather === "canicule") {
      ctx.fillStyle = "rgba(255,170,60,.10)"; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.18;
      for (let y = groundY - 30; y < groundY + 10; y += 4) {
        const dx = Math.sin(t * 6 + y * 0.4) * 2.5;
        ctx.drawImage(cv, 0, y * dpr, W * dpr, 4 * dpr, dx, y, W, 4);
      }
      ctx.globalAlpha = 1;
    }
  }


  return { sc, frame };
}
