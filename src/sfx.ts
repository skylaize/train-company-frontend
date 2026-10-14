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

/* 2.1 : les sons de gare de la boutique. Le pack choisi remplace le
   carillon partout où il sonne (départ, arrivée en gare, rame neuve). */
export type SoundPack = "carillon" | "vapeur" | "trompe";
let pack: SoundPack | null = null;
export function setSoundPack(p: string | null) {
  pack = p === "carillon" || p === "vapeur" || p === "trompe" ? p : null;
}

/* une cloche : la fondamentale et trois partiels inharmoniques qui s'éteignent vite */
function bell(a: AudioContext, freq: number, start: number, gain = 0.05) {
  [[1, 1, 2.2], [2.76, 0.45, 1.2], [5.4, 0.2, 0.6], [0.5, 0.25, 2.6]].forEach(([k, g, d]) => tone(a, freq * k, start, d, gain * g));
}

/* le bruit blanc filtré du souffle de vapeur */
function hiss(a: AudioContext, start: number, dur: number, freq: number, gain: number) {
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.min(1, i / (a.sampleRate * 0.05)) * Math.pow(1 - i / len, 1.5);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = 1.2;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start(a.currentTime + start);
}

/* une note tenue qui monte d'un souffle (le sifflet) ou reste droite (la trompe) */
function held(a: AudioContext, freq: number, start: number, dur: number, gain: number, type: OscillatorType, bend = 0, vibrato = 0) {
  const o = a.createOscillator();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = type === "sawtooth" ? 1400 : 4000;
  o.type = type;
  const t0 = a.currentTime + start;
  o.frequency.setValueAtTime(freq * (1 - bend), t0);
  o.frequency.linearRampToValueAtTime(freq, t0 + 0.12);
  if (vibrato) {
    const lfo = a.createOscillator();
    const lg = a.createGain();
    lfo.frequency.value = 5.5;
    lg.gain.value = freq * vibrato;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.1);
  }
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.06);
  g.gain.setValueAtTime(gain, t0 + dur - 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(f).connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export function playPack(p: SoundPack) {
  const a = audio();
  if (!a) return;
  if (p === "carillon") {
    // le carillon des années 1930 : quatre cloches, descendantes puis la tonique
    [783.99, 659.25, 523.25, 392.0].forEach((f, i) => bell(a, f, i * 0.42, 0.05));
  } else if (p === "vapeur") {
    // le sifflet de la vapeur : deux tons à la tierce, un coup court puis un long, et le souffle
    held(a, 698.46, 0, 0.35, 0.035, "sine", 0.06, 0.004);
    held(a, 880.0, 0, 0.35, 0.03, "sine", 0.06, 0.004);
    held(a, 698.46, 0.5, 1.1, 0.04, "sine", 0.08, 0.006);
    held(a, 880.0, 0.5, 1.1, 0.035, "sine", 0.08, 0.006);
    hiss(a, 0, 0.4, 2400, 0.08);
    hiss(a, 0.5, 1.2, 2200, 0.1);
  } else {
    // la trompe d'une machine moderne : deux tons graves, brefs, en accord
    held(a, 369.99, 0, 0.45, 0.05, "sawtooth");
    held(a, 466.16, 0, 0.45, 0.04, "sawtooth");
    held(a, 369.99, 0.6, 0.75, 0.05, "sawtooth");
    held(a, 466.16, 0.6, 0.75, 0.04, "sawtooth");
  }
}

/* carillon de quai : trois notes montantes, ou le son de gare choisi en boutique */
export function playChime() {
  if (pack) return playPack(pack);
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
