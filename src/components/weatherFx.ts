// @ts-nocheck — dessin sur canvas, comme la scène de la vue cabine
/* ============================================================
   Effets météo du tableau de bord (1.4).

   Une toile posée au-dessus de l'interface, qui ne capte jamais la souris.
   Chaque météo dessine surtout sur les bords de l'écran : le centre, là où
   on lit les chiffres, reste lisible.

   - NEIGE      : flocons sur trois plans, vent qui tourne, neige qui
                  s'amasse en bas de l'écran et léger givre dans les coins.
   - BROUILLARD : deux nappes qui dérivent à des vitesses différentes,
                  plus épaisses sur les bords.
   - VERGLAS    : givre qui pousse depuis les bords, reflets de glace.
   - CANICULE   : lumière écrasante venue d'en haut, air qui ondule en bas,
                  poussière qui monte.

   `k` est l'intensité, de 0 à 1 : l'effet apparaît et disparaît en fondu.
   ============================================================ */

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// tuile raccordable : chaque tache est aussi dessinée de l'autre côté du bord
function blobTile(size, n, rgb, rmin, rmax, amin, amax, seed) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d"), r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * size, y = r() * size, rad = rmin + r() * (rmax - rmin), a = amin + r() * (amax - amin);
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
      gr.addColorStop(0, `rgba(${rgb},${a})`);
      gr.addColorStop(0.55, `rgba(${rgb},${a * 0.5})`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr;
      g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
    }
  }
  return c;
}

function flakeSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d"), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.35, "rgba(255,255,255,.8)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  return c;
}

// givre : cristaux ramifiés qui partent des quatre bords
function frostLayer(W, H, dpr, seed) {
  const c = document.createElement("canvas");
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const g = c.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const R = Math.hypot(W, H) / 2;
  const v = g.createRadialGradient(W / 2, H / 2, R * 0.6, W / 2, H / 2, R);
  v.addColorStop(0, "rgba(214,232,248,0)");
  v.addColorStop(1, "rgba(214,232,248,.55)");
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  const r = rng(seed);
  g.strokeStyle = "rgba(255,255,255,.5)"; g.lineCap = "round";
  const branch = (x, y, a, len, d) => {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    g.lineWidth = 0.35 + d * 0.3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    if (d > 0) {
      branch(x2, y2, a - 0.5 - r() * 0.35, len * 0.6, d - 1);
      branch(x2, y2, a + 0.5 + r() * 0.35, len * 0.6, d - 1);
      if (r() < 0.55) branch(x + (x2 - x) * 0.5, y + (y2 - y) * 0.5, a + (r() < 0.5 ? -1 : 1) * 1.15, len * 0.42, d - 1);
    }
  };
  const count = Math.round((W + H) / 34);
  for (let i = 0; i < count; i++) {
    const side = i % 4, t = r();
    const x = side === 0 ? t * W : side === 1 ? W : side === 2 ? t * W : 0;
    const y = side === 0 ? 0 : side === 1 ? t * H : side === 2 ? H : t * H;
    const a = Math.atan2(H / 2 - y, W / 2 - x) + (r() - 0.5) * 1.0;
    branch(x, y, a, 14 + r() * 38, 3);
  }
  return c;
}

export function createWeatherFx(ctx, kind) {
  let W = 0, H = 0, dpr = 1;
  let frost = null;
  const fog = kind === "BROUILLARD" ? ctx.createPattern(blobTile(900, 30, "226,228,224", 110, 280, 0.35, 0.85, 23), "repeat") : null;
  const flake = kind === "NEIGE" ? flakeSprite() : null;
  const r = Math.random;

  const depth = (i, n) => (i < n * 0.5 ? 0.3 + r() * 0.25 : i < n * 0.85 ? 0.55 + r() * 0.25 : 0.82 + r() * 0.18);
  let flakes = [], motes = [], glints = [];
  let drift = 0; // hauteur de la neige amassée en bas, de 0 à 1
  let wind = 0.2;

  function resize(w, h, ratio) {
    W = w; H = h; dpr = ratio;
    if (kind === "NEIGE") {
      const n = Math.min(320, Math.round((W * H) / 5200));
      flakes = Array.from({ length: n }, (_, i) => ({ x: r(), y: r(), z: depth(i, n), ph: r() * 6.3 }));
      frost = frostLayer(W, H, dpr, 7);
    }
    if (kind === "VERGLAS") {
      frost = frostLayer(W, H, dpr, 5);
      glints = Array.from({ length: 36 }, () => {
        const side = Math.floor(r() * 4), t = r(), m = 20 + r() * 70;
        return { x: side === 1 ? W - m : side === 3 ? m : t * W, y: side === 0 ? m : side === 2 ? H - m : t * H, ph: r() * 6.3 };
      });
    }
    if (kind === "CANICULE") {
      motes = Array.from({ length: 70 }, () => ({ x: r(), y: r(), s: 0.4 + r() * 0.8, ph: r() * 6.3 }));
    }
  }

  function snow(dt, t, k, light) {
    wind = 0.18 + Math.sin(t / 5.2) * 0.14 + Math.sin(t / 1.7) * 0.04;
    const path = new Path2D(), shade = new Path2D();
    for (const f of flakes) {
      f.y += ((14 + 50 * f.z) * dt) / H;
      f.x += ((wind * 40 * f.z + Math.sin(t * 1.25 + f.ph) * 12 * f.z) * dt) / W;
      if (f.y > 1.02) { f.y -= 1.04; f.x = r(); }
      f.x = ((f.x % 1) + 1) % 1;
      const px = f.x * W, py = f.y * H, rad = 0.6 + f.z * 2.2;
      if (f.z > 0.82) {
        ctx.globalAlpha = 0.85 * k;
        if (light) { ctx.globalAlpha = 0.55 * k; ctx.drawImage(flake, px - rad * 2.4 + 1, py - rad * 2.4 + 1, rad * 4.8, rad * 4.8); ctx.globalAlpha = 0.85 * k; }
        ctx.drawImage(flake, px - rad * 2.4, py - rad * 2.4, rad * 4.8, rad * 4.8);
        continue;
      }
      path.moveTo(px + rad, py); path.arc(px, py, rad, 0, Math.PI * 2);
      if (light) { shade.moveTo(px + rad + 0.8, py + 0.8); shade.arc(px + 0.8, py + 0.8, rad, 0, Math.PI * 2); }
    }
    ctx.globalAlpha = k;
    if (light) { ctx.fillStyle = "rgba(70,80,96,.5)"; ctx.fill(shade); }
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fill(path);

    // neige amassée en bas de l'écran : elle monte doucement tant qu'il neige
    drift = Math.min(1, drift + dt / 90);
    const hMax = 8 + 20 * drift;
    ctx.globalAlpha = k;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) {
      const y = H - hMax * (0.55 + 0.25 * Math.sin(x / 90 + 1.3) + 0.2 * Math.sin(x / 31));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.closePath();
    ctx.shadowColor = light ? "rgba(60,70,90,.35)" : "rgba(0,0,0,.4)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = -2;
    ctx.fillStyle = "#f4f7fa"; ctx.fill();
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    ctx.globalAlpha = 0.3 * k;
    ctx.drawImage(frost, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  function fogFx(t, k, light) {
    const tone = light ? 1 : 0.8;
    ctx.globalAlpha = 0.55 * k * tone;
    fog.setTransform(new DOMMatrix([1, 0, 0, 1, (t * 14) % 900, 0]));
    ctx.fillStyle = fog; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.4 * k * tone;
    fog.setTransform(new DOMMatrix([1.7, 0, 0, 1.7, -(t * 30) % 1530, 140]));
    ctx.fillStyle = fog; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    // le centre s'éclaircit : on lit toujours les chiffres à travers
    const R = Math.hypot(W, H) / 2;
    const m = ctx.createRadialGradient(W / 2, H / 2, R * 0.12, W / 2, H / 2, R * 0.85);
    m.addColorStop(0, "rgba(0,0,0,.8)");
    m.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = m; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
  }

  let grow = 0;
  function ice(dt, t, k) {
    grow = Math.min(1, grow + dt / 7);
    const g = 1 - Math.pow(1 - grow, 3);
    ctx.globalAlpha = k;
    ctx.drawImage(frost, 0, 0, W, H);
    // le givre gagne depuis les bords : on efface un centre qui rétrécit
    const R = Math.hypot(W, H) / 2, inner = R * (1.2 - 0.38 * g);
    const m = ctx.createRadialGradient(W / 2, H / 2, inner * 0.7, W / 2, H / 2, inner);
    m.addColorStop(0, "rgba(0,0,0,1)");
    m.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = m; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    for (const gl of glints) {
      const s = Math.pow(Math.max(0, Math.sin(t * 1.6 + gl.ph * 3)), 14) * k * g;
      if (s < 0.05) continue;
      const rad = 2 + s * 6;
      ctx.globalAlpha = s;
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(gl.x - rad, gl.y); ctx.lineTo(gl.x + rad, gl.y);
      ctx.moveTo(gl.x, gl.y - rad); ctx.lineTo(gl.x, gl.y + rad);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function heat(dt, t, k) {
    const pulse = 0.85 + 0.15 * Math.sin(t * 0.9);
    const gl = ctx.createRadialGradient(W * 0.82, -H * 0.12, 10, W * 0.82, -H * 0.12, Math.max(W, H) * 0.75);
    gl.addColorStop(0, `rgba(255,214,140,${0.4 * k * pulse})`);
    gl.addColorStop(1, "rgba(255,214,140,0)");
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    const low = ctx.createLinearGradient(0, H, 0, H * 0.6);
    low.addColorStop(0, `rgba(196,92,50,${0.16 * k})`);
    low.addColorStop(1, "rgba(196,92,50,0)");
    ctx.fillStyle = low; ctx.fillRect(0, H * 0.6, W, H * 0.4);
    // air qui ondule au ras du bas de l'écran
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const base = H - ((t * 22 + i * 38) % 230);
      const a = Math.max(0, 1 - (H - base) / 230) * 0.12 * k;
      ctx.strokeStyle = `rgba(255,236,200,${a})`;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12) {
        const y = base + Math.sin(x / 38 + t * 2.4 + i) * 3;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    // poussière dans la lumière
    for (const m of motes) {
      m.y -= (dt * 0.012 * m.s);
      m.x += Math.sin(t * 0.8 + m.ph) * dt * 0.004;
      if (m.y < -0.02) { m.y = 1.02; m.x = r(); }
      ctx.globalAlpha = 0.35 * k * (0.5 + 0.5 * Math.sin(t * 2 + m.ph));
      ctx.fillStyle = "rgba(255,226,170,1)";
      ctx.beginPath(); ctx.arc(m.x * W, m.y * H, 0.8 + m.s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(dt, t, k, light) {
    ctx.clearRect(0, 0, W, H);
    if (k <= 0.001) return;
    if (kind === "NEIGE") snow(dt, t, k, light);
    else if (kind === "BROUILLARD") fogFx(t, k, light);
    else if (kind === "VERGLAS") ice(dt, t, k);
    else if (kind === "CANICULE") heat(dt, t, k);
  }

  return { resize, frame };
}
