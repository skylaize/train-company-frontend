// @ts-nocheck — dessin sur canvas
/* ============================================================
   2.7 : la silhouette de la ville d'arrivée, dans la vue cabine.

   En approchant d'une gare, sa ville se lève à l'horizon : la tour Eiffel
   à Paris, Fourvière à Lyon, la Bonne Mère à Marseille… Les autres villes
   ont une silhouette ordinaire (immeubles, clocher), plus haute et plus
   large selon leur taille. Tout est en aplats d'une seule couleur, celle
   des collines lointaines, avec des fenêtres allumées la nuit.

   drawSkyline(ctx, ville, x, sol, échelle, couleur, nuit) : x est le centre
   de la silhouette, sol la ligne d'horizon où elle se pose.
   ============================================================ */

const SIZE = {
  Paris: 5, Londres: 5,
  Lyon: 4, Marseille: 4, Lille: 4, Toulouse: 4, Bordeaux: 4, Nice: 4, Nantes: 4, Strasbourg: 4,
  Bruxelles: 4, Francfort: 4, Milan: 4, Barcelone: 4, Turin: 4, Zurich: 4,
};

// petit générateur pseudo-aléatoire, stable pour une ville donnée
function rng(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/* des immeubles de part et d'autre du monument, et leurs fenêtres la nuit */
function blocks(ctx, name, x, y, k, width, maxH, night, lit) {
  const r = rng(name + "#b");
  const out = [];
  let bx = x - width / 2;
  while (bx < x + width / 2) {
    const w = (14 + r() * 26) * k;
    const centre = 1 - Math.abs(bx + w / 2 - x) / (width / 2); // plus haut vers le centre
    const h = (10 + r() * maxH * (0.45 + centre * 0.55)) * k;
    ctx.fillRect(bx, y - h, w - 1.5 * k, h);
    out.push([bx, y - h, w - 1.5 * k, h]);
    bx += w;
  }
  if (night) {
    const keep = ctx.fillStyle;
    ctx.fillStyle = lit;
    for (const [bx0, by0, bw, bh] of out) {
      for (let wy = by0 + 4 * k; wy < y - 4 * k; wy += 6 * k)
        for (let wx = bx0 + 3 * k; wx < bx0 + bw - 3 * k; wx += 5 * k) if (r() < 0.28) ctx.fillRect(wx, wy, 1.6 * k, 2 * k);
    }
    ctx.fillStyle = keep;
  }
}

function spire(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x, y - h);
  ctx.lineTo(x + w / 2, y);
  ctx.fill();
}

const LANDMARK = {
  // la tour Eiffel : quatre pieds, deux plateformes, l'antenne
  Paris(ctx, x, y, k) {
    const h = 150 * k, b = 46 * k;
    ctx.beginPath();
    ctx.moveTo(x - b / 2, y);
    ctx.quadraticCurveTo(x - b * 0.2, y - h * 0.32, x - b * 0.13, y - h * 0.62);
    ctx.lineTo(x - 2 * k, y - h * 0.94);
    ctx.lineTo(x + 2 * k, y - h * 0.94);
    ctx.lineTo(x + b * 0.13, y - h * 0.62);
    ctx.quadraticCurveTo(x + b * 0.2, y - h * 0.32, x + b / 2, y);
    ctx.lineTo(x + b * 0.26, y);
    ctx.quadraticCurveTo(x, y - h * 0.2, x - b * 0.26, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - b * 0.32, y - h * 0.3, b * 0.64, 3 * k);
    ctx.fillRect(x - b * 0.17, y - h * 0.6, b * 0.34, 2.5 * k);
    ctx.fillRect(x - 0.8 * k, y - h, 1.6 * k, h * 0.08);
  },
  // Fourvière sur sa colline, et la tour « crayon » de la Part-Dieu
  Lyon(ctx, x, y, k) {
    ctx.beginPath();
    ctx.moveTo(x - 110 * k, y);
    ctx.quadraticCurveTo(x - 60 * k, y - 46 * k, x, y - 48 * k);
    ctx.quadraticCurveTo(x + 50 * k, y - 46 * k, x + 80 * k, y);
    ctx.fill();
    const by = y - 47 * k;
    ctx.fillRect(x - 18 * k, by - 18 * k, 36 * k, 18 * k);
    for (const dx of [-18, -9, 9, 18]) ctx.fillRect(x + dx * k - 2.5 * k, by - 28 * k, 5 * k, 28 * k);
    ctx.fillRect(x - 2 * k, by - 32 * k, 4 * k, 6 * k);
    // le crayon : un fût et son toit en pointe
    const cx = x + 120 * k;
    ctx.fillRect(cx - 8 * k, y - 88 * k, 16 * k, 88 * k);
    spire(ctx, cx, y - 88 * k, 16 * k, 20 * k);
  },
  // Notre-Dame-de-la-Garde sur son rocher, le clocher et la Vierge dorée
  Marseille(ctx, x, y, k) {
    ctx.beginPath();
    ctx.moveTo(x - 80 * k, y);
    ctx.lineTo(x - 30 * k, y - 52 * k);
    ctx.lineTo(x + 26 * k, y - 56 * k);
    ctx.lineTo(x + 90 * k, y);
    ctx.fill();
    const by = y - 55 * k;
    ctx.fillRect(x - 22 * k, by - 16 * k, 34 * k, 16 * k);
    ctx.fillRect(x + 6 * k, by - 50 * k, 10 * k, 50 * k);
    ctx.beginPath(); ctx.arc(x - 8 * k, by - 16 * k, 8 * k, Math.PI, 0); ctx.fill();
    ctx.fillRect(x + 9 * k, by - 62 * k, 4 * k, 12 * k);
    ctx.beginPath(); ctx.arc(x + 11 * k, by - 64 * k, 2.4 * k, 0, Math.PI * 2); ctx.fill();
  },
  // la cathédrale et sa flèche unique, sur le côté
  Strasbourg(ctx, x, y, k) {
    ctx.fillRect(x - 34 * k, y - 60 * k, 52 * k, 60 * k);
    ctx.beginPath(); ctx.moveTo(x - 34 * k, y - 60 * k); ctx.lineTo(x - 8 * k, y - 74 * k); ctx.lineTo(x + 18 * k, y - 60 * k); ctx.fill();
    ctx.fillRect(x + 4 * k, y - 104 * k, 14 * k, 44 * k);
    spire(ctx, x + 11 * k, y - 104 * k, 14 * k, 46 * k);
  },
  // le beffroi de l'hôtel de ville
  Lille(ctx, x, y, k) {
    ctx.fillRect(x - 9 * k, y - 104 * k, 18 * k, 104 * k);
    ctx.fillRect(x - 12 * k, y - 108 * k, 24 * k, 6 * k);
    spire(ctx, x, y - 108 * k, 12 * k, 18 * k);
  },
  // la flèche Saint-Michel, et la courbe de la place de la Bourse
  Bordeaux(ctx, x, y, k) {
    ctx.fillRect(x - 7 * k, y - 84 * k, 14 * k, 84 * k);
    spire(ctx, x, y - 84 * k, 14 * k, 34 * k);
    ctx.fillRect(x + 30 * k, y - 26 * k, 90 * k, 26 * k);
    ctx.beginPath(); ctx.moveTo(x + 30 * k, y - 26 * k); ctx.lineTo(x + 75 * k, y - 34 * k); ctx.lineTo(x + 120 * k, y - 26 * k); ctx.fill();
  },
  // la basilique Saint-Sernin et son clocher octogonal à étages
  Toulouse(ctx, x, y, k) {
    ctx.fillRect(x - 40 * k, y - 34 * k, 80 * k, 34 * k);
    for (let i = 0; i < 5; i++) ctx.fillRect(x - (13 - i * 2) * k, y - (34 + i * 13) * k, (26 - i * 4) * k, 13 * k);
    spire(ctx, x, y - 99 * k, 8 * k, 22 * k);
  },
  // Big Ben et le Shard
  Londres(ctx, x, y, k) {
    ctx.fillRect(x - 8 * k, y - 96 * k, 16 * k, 96 * k);
    ctx.fillRect(x - 10 * k, y - 110 * k, 20 * k, 16 * k);
    spire(ctx, x, y - 110 * k, 20 * k, 26 * k);
    ctx.beginPath(); ctx.moveTo(x + 70 * k, y); ctx.lineTo(x + 92 * k, y - 150 * k); ctx.lineTo(x + 98 * k, y - 150 * k); ctx.lineTo(x + 112 * k, y); ctx.fill();
  },
  // l'Atomium : neuf boules reliées
  Bruxelles(ctx, x, y, k) {
    const s = 26 * k, cy = y - 64 * k;
    const pts = [[0, 0], [-s, -s * 0.6], [s, -s * 0.6], [-s, s * 0.6], [s, s * 0.6], [0, -s * 1.2], [0, s * 1.2], [-s * 0.5, 0], [s * 0.5, 0]];
    ctx.lineWidth = 3 * k;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath();
    for (const [px, py] of pts) { ctx.moveTo(x, cy); ctx.lineTo(x + px, cy + py); }
    ctx.moveTo(x, cy + s * 1.2); ctx.lineTo(x, y);
    ctx.stroke();
    for (const [px, py] of pts) { ctx.beginPath(); ctx.arc(x + px, cy + py, 6 * k, 0, Math.PI * 2); ctx.fill(); }
  },
  // le jet d'eau, au-dessus du lac
  Genève(ctx, x, y, k) {
    ctx.fillStyle = "rgba(236,242,248,.7)"; // de l'eau, pas de la pierre
    ctx.globalAlpha *= 0.8;
    ctx.beginPath();
    ctx.moveTo(x - 2 * k, y);
    ctx.quadraticCurveTo(x - 3 * k, y - 80 * k, x, y - 130 * k);
    ctx.quadraticCurveTo(x + 9 * k, y - 80 * k, x + 14 * k, y);
    ctx.fill();
    ctx.globalAlpha /= 0.8;
  },
  // le Duomo et ses flèches
  Milan(ctx, x, y, k) {
    ctx.fillRect(x - 40 * k, y - 40 * k, 80 * k, 40 * k);
    for (let i = -4; i <= 4; i++) { ctx.fillRect(x + i * 9 * k - 1.5 * k, y - (52 + (4 - Math.abs(i)) * 4) * k, 3 * k, 14 * k); }
    ctx.fillRect(x - 3 * k, y - 96 * k, 6 * k, 56 * k);
  },
  // la Mole Antonelliana
  Turin(ctx, x, y, k) {
    ctx.fillRect(x - 20 * k, y - 40 * k, 40 * k, 40 * k);
    ctx.beginPath(); ctx.moveTo(x - 20 * k, y - 40 * k); ctx.quadraticCurveTo(x, y - 80 * k, x + 20 * k, y - 40 * k); ctx.fill();
    ctx.fillRect(x - 4 * k, y - 100 * k, 8 * k, 30 * k);
    spire(ctx, x, y - 100 * k, 6 * k, 40 * k);
  },
  // les flèches de la Sagrada Família
  Barcelone(ctx, x, y, k) {
    ctx.fillRect(x - 36 * k, y - 34 * k, 72 * k, 34 * k);
    for (const [dx, h] of [[-26, 84], [-12, 100], [12, 100], [26, 84], [0, 120]]) {
      ctx.fillRect(x + dx * k - 4 * k, y - h * k * 0.7, 8 * k, h * k * 0.7);
      spire(ctx, x + dx * k, y - h * k * 0.7, 8 * k, h * k * 0.3);
    }
  },
  // les tours du quartier d'affaires
  Francfort(ctx, x, y, k) {
    for (const [dx, w, h] of [[-50, 20, 110], [-24, 18, 140], [0, 22, 128], [26, 16, 150], [48, 18, 100]]) {
      ctx.fillRect(x + dx * k, y - h * k, w * k, h * k);
    }
    spire(ctx, x + 34 * k, y - 150 * k, 6 * k, 18 * k);
  },
};

export function drawSkyline(ctx, city, x, y, k, color, night = false) {
  if (!city) return;
  const size = SIZE[city] ?? 2;
  const lit = "rgba(255,214,150,.75)";
  ctx.save();
  ctx.fillStyle = color;
  // les immeubles d'abord, le monument par-dessus
  blocks(ctx, city, x, y, k, (160 + size * 70) * k, 20 + size * 10, night, lit);
  ctx.fillStyle = color;
  const mark = LANDMARK[city];
  if (mark) mark(ctx, x, y, k);
  else {
    // une ville sans monument dessiné : son clocher, ou deux pour les plus grandes
    const r = rng(city + "#c");
    const off = (r() - 0.5) * 60 * k;
    ctx.fillRect(x + off - 6 * k, y - (46 + size * 8) * k, 12 * k, (46 + size * 8) * k);
    spire(ctx, x + off, y - (46 + size * 8) * k, 12 * k, (18 + size * 4) * k);
    if (size >= 3) {
      ctx.fillRect(x - off * 1.6 - 5 * k, y - 40 * k, 10 * k, 40 * k);
      spire(ctx, x - off * 1.6, y - 40 * k, 10 * k, 16 * k);
    }
  }
  // de nuit : un feu rouge en haut des plus hauts monuments
  if (night && (city === "Paris" || city === "Londres" || city === "Francfort")) {
    ctx.fillStyle = "rgba(255,90,80,.9)";
    ctx.beginPath(); ctx.arc(x + (city === "Londres" ? 95 * k : city === "Francfort" ? 34 * k : 0), y - (city === "Paris" ? 150 : 150) * k, 1.8 * k, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
