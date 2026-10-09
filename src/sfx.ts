/* ============================================================
   Petits sons (2.0), synthétisés à la volée : aucun fichier à charger.
   Un clac d'attelage, un carillon de départ à trois notes (original, pas
   celui d'une compagnie réelle) et un signal grave pour une panne.
   Coupés par défaut si le joueur l'a demandé dans Paramètres, et jamais
   joués avant un premier geste de l'utilisateur (règle des navigateurs).
   ============================================================ */

const KEY = "reseau.sons";
let ctx: AudioContext | null = null;

export function soundsOn() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}
export function setSoundsOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* navigation privée : le réglage vaut pour la session */
  }
}

function audio() {
  if (!soundsOn()) return null;
  const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = ctx ?? new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(a: AudioContext, freq: number, start: number, dur: number, gain = 0.08, type: OscillatorType = "sine") {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
}

/* le choc métallique de l'attelage : un bruit bref, filtré, et une résonance */
export function playCouple() {
  const a = audio();
  if (!a) return;
  const len = Math.floor(a.sampleRate * 0.12);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1800;
  f.Q.value = 3;
  const g = a.createGain();
  g.gain.value = 0.35;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
  tone(a, 320, 0.01, 0.25, 0.05, "triangle");
}

/* carillon de quai : trois notes montantes */
export function playChime() {
  const a = audio();
  if (!a) return;
  [523.25, 659.25, 783.99].forEach((f, i) => tone(a, f, i * 0.16, 0.7, 0.06));
}

/* signal de panne : deux notes graves */
export function playAlert() {
  const a = audio();
  if (!a) return;
  tone(a, 220, 0, 0.35, 0.07, "square");
  tone(a, 175, 0.3, 0.45, 0.07, "square");
}

export function vibrate(pattern: number | number[]) {
  try {
    if (soundsOn()) navigator.vibrate?.(pattern);
  } catch {
    /* pas de vibreur */
  }
}
