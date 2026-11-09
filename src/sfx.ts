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

/* ============================================================
   2.7 : l'éruption solaire. Pas de musique de bande-annonce : les bruits
   d'un poste électrique qui lâche.
   - le ronflement du 50 Hz (le réseau en vie) ;
   - à l'éruption, un coup sourd et le grésillement des arcs ;
   - le ronflement qui retombe comme un transformateur qu'on coupe, et un
     relais qui claque pour chaque région ;
   - le disjoncteur général, puis le bip d'alarme du poste de régulation.
   Calé sur l'animation de l'alerte (éruption à 1,85 s, panne à 2,4 s,
   bandeau à 3,6 s). Renvoie de quoi tout couper si le joueur passe.
   ============================================================ */

function noiseBuffer(a: AudioContext, seconds: number, shape: (t: number) => number) {
  const len = Math.floor(a.sampleRate * seconds);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * shape(i / len);
  return buf;
}

function click(a: AudioContext, out: AudioNode, at: number, freq: number, gain: number) {
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, 0.03, (t) => Math.pow(1 - t, 4));
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = 4;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(out);
  src.start(a.currentTime + at);
}

/* le claquement sec d'un relais, pour la carte qui s'éteint région par région */
export function playRelay() {
  const a = audio();
  if (!a) return;
  click(a, a.destination, 0, 2000 + Math.random() * 600, 0.18);
}

export function playEruption(): () => void {
  const a = audio();
  if (!a) return () => undefined;
  const t0 = a.currentTime + 0.05;
  const master = a.createGain();
  master.gain.value = 0.55;
  const comp = a.createDynamicsCompressor();
  master.connect(comp).connect(a.destination);

  // 1. le ronflement du réseau : 50 Hz et ses harmoniques, filtrés
  const humLp = a.createBiquadFilter();
  humLp.type = "lowpass";
  humLp.frequency.value = 420;
  const hum = a.createGain();
  hum.gain.setValueAtTime(0, t0);
  hum.gain.linearRampToValueAtTime(0.5, t0 + 0.8);
  hum.gain.setValueAtTime(0.5, t0 + 2.4);
  hum.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.5);
  humLp.connect(hum).connect(master);
  const oscs = ([[50, 0.09, "sine"], [100, 0.05, "sine"], [150, 0.025, "triangle"], [200, 0.012, "sawtooth"]] as [number, number, OscillatorType][]).map(([f, g, type]) => {
    const o = a.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    // la retombée du transformateur : la fréquence et le volume s'effondrent ensemble
    o.frequency.setValueAtTime(f, t0 + 2.4);
    o.frequency.exponentialRampToValueAtTime(f * 0.35, t0 + 3.5);
    const og = a.createGain();
    og.gain.value = g;
    o.connect(og).connect(humLp);
    o.start(t0);
    o.stop(t0 + 3.6);
    return o;
  });
  // un léger battement, comme un vrai poste
  const lfo = a.createOscillator();
  const lfoG = a.createGain();
  lfo.frequency.value = 6.5;
  lfoG.gain.value = 0.06;
  lfo.connect(lfoG).connect(hum.gain);
  lfo.start(t0);
  lfo.stop(t0 + 3.6);

  // 2. l'éruption : un coup sourd qui descend, et un grondement
  const boom = a.createOscillator();
  const boomG = a.createGain();
  boom.frequency.setValueAtTime(95, t0 + 1.85);
  boom.frequency.exponentialRampToValueAtTime(30, t0 + 2.6);
  boomG.gain.setValueAtTime(0, t0 + 1.85);
  boomG.gain.linearRampToValueAtTime(0.7, t0 + 1.88);
  boomG.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
  boom.connect(boomG).connect(master);
  boom.start(t0 + 1.85);
  boom.stop(t0 + 3.3);
  const rumble = a.createBufferSource();
  rumble.buffer = noiseBuffer(a, 1.8, (t) => Math.pow(1 - t, 2));
  const rumbleF = a.createBiquadFilter();
  rumbleF.type = "lowpass";
  rumbleF.frequency.setValueAtTime(900, t0 + 1.85);
  rumbleF.frequency.exponentialRampToValueAtTime(140, t0 + 3.4);
  const rumbleG = a.createGain();
  rumbleG.gain.value = 0.35;
  rumble.connect(rumbleF).connect(rumbleG).connect(master);
  rumble.start(t0 + 1.85);
  // le grésillement des arcs électriques : des impulsions éparses, aiguës
  const arcs = a.createBufferSource();
  arcs.buffer = noiseBuffer(a, 0.9, (t) => (Math.random() < 0.035 ? 1 : 0.04) * (1 - t));
  const arcsF = a.createBiquadFilter();
  arcsF.type = "highpass";
  arcsF.frequency.value = 2500;
  const arcsG = a.createGain();
  arcsG.gain.value = 0.25;
  arcs.connect(arcsF).connect(arcsG).connect(master);
  arcs.start(t0 + 1.9);

  // 3. un relais qui claque pour chaque région qui tombe
  for (let i = 0; i < 12; i++) click(a, master, 2.4 + i * 0.07 + Math.random() * 0.02, 1700 + Math.random() * 900, 0.22);

  // 4. le disjoncteur général : un choc grave, bref
  const brk = a.createBufferSource();
  brk.buffer = noiseBuffer(a, 0.18, (t) => Math.pow(1 - t, 3));
  const brkF = a.createBiquadFilter();
  brkF.type = "bandpass";
  brkF.frequency.value = 220;
  brkF.Q.value = 1.2;
  const brkG = a.createGain();
  brkG.gain.value = 0.9;
  brk.connect(brkF).connect(brkG).connect(master);
  brk.start(t0 + 3.3);
  tone(a, 62, t0 - a.currentTime + 3.3, 0.35, 0.12, "sine");

  // 5. l'alarme du poste de régulation : trois doubles bips, secs
  const beepLp = a.createBiquadFilter();
  beepLp.type = "lowpass";
  beepLp.frequency.value = 2400;
  beepLp.connect(master);
  [3.65, 3.95, 4.25].forEach((s) => {
    [0, 0.12].forEach((d) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "square";
      o.frequency.value = 988;
      g.gain.setValueAtTime(0, t0 + s + d);
      g.gain.linearRampToValueAtTime(0.045, t0 + s + d + 0.008);
      g.gain.setValueAtTime(0.045, t0 + s + d + 0.07);
      g.gain.linearRampToValueAtTime(0, t0 + s + d + 0.085);
      o.connect(g).connect(beepLp);
      o.start(t0 + s + d);
      o.stop(t0 + s + d + 0.1);
    });
  });

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const now = a.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.25);
    setTimeout(() => {
      try {
        oscs.forEach((o) => o.stop());
        master.disconnect();
      } catch {
        /* déjà arrêtés */
      }
    }, 400);
  };
}

/* 2.7 : les sons d'un poste électrique, un par changement d'état.
   - courant faible : le ronflement du 50 Hz qui fléchit ;
   - coupure : un relais qui claque et un choc sourd ;
   - réparation : le transformateur qui remonte en régime, et le contacteur
     qui se ferme ;
   - un don de points : un cliquet bref.
   Tout est planifié d'un coup (temps en secondes depuis maintenant), pour
   tomber pile avec l'animation. */
export type GridSound = { t: number; kind: "faible" | "coupure" | "reparee" | "grondement" };

function sag(a: AudioContext, out: AudioNode, at: number) {
  const t = a.currentTime + at;
  const g = a.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.32, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 380;
  lp.connect(g).connect(out);
  ([[100, 0.09, "sawtooth"], [150, 0.05, "triangle"]] as [number, number, OscillatorType][]).forEach(([f, v, type]) => {
    const o = a.createOscillator();
    const og = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.78, t + 0.7);
    og.gain.value = v;
    o.connect(og).connect(lp);
    o.start(t);
    o.stop(t + 0.8);
  });
}

function cut(a: AudioContext, out: AudioNode, at: number) {
  click(a, out, at, 1800 + Math.random() * 700, 0.26);
  const t = a.currentTime + at + 0.02;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, 0.16, (x) => Math.pow(1 - x, 3));
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 200;
  f.Q.value = 1.2;
  const g = a.createGain();
  g.gain.value = 0.55;
  src.connect(f).connect(g).connect(out);
  src.start(t);
}

function powerUp(a: AudioContext, out: AudioNode, at: number) {
  const t = a.currentTime + at;
  // le contacteur se ferme
  click(a, out, at, 1300, 0.3);
  // le transformateur remonte en régime : grave, puis le 50 Hz et ses harmoniques
  const g = a.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.4, t + 0.35);
  g.gain.setValueAtTime(0.4, t + 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(200, t);
  lp.frequency.linearRampToValueAtTime(700, t + 0.6);
  lp.connect(g).connect(out);
  ([[50, 0.1, "sine"], [100, 0.06, "sawtooth"], [150, 0.03, "triangle"]] as [number, number, OscillatorType][]).forEach(([f, v, type]) => {
    const o = a.createOscillator();
    const og = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f * 0.35, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.55);
    og.gain.value = v;
    o.connect(og).connect(lp);
    o.start(t);
    o.stop(t + 1.6);
  });
}

function rumbleAt(a: AudioContext, out: AudioNode, at: number) {
  const t = a.currentTime + at;
  const rumble = a.createBufferSource();
  rumble.buffer = noiseBuffer(a, 1.4, (x) => Math.pow(1 - x, 2) * Math.min(1, x * 8));
  const f = a.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(600, t);
  f.frequency.exponentialRampToValueAtTime(120, t + 1.4);
  const g = a.createGain();
  g.gain.value = 0.4;
  rumble.connect(f).connect(g).connect(out);
  rumble.start(t);
  const thump = a.createOscillator();
  const tg = a.createGain();
  thump.frequency.setValueAtTime(80, t);
  thump.frequency.exponentialRampToValueAtTime(32, t + 0.7);
  tg.gain.setValueAtTime(0.5, t);
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  thump.connect(tg).connect(out);
  thump.start(t);
  thump.stop(t + 1);
}

export function playGrid(plan: GridSound[]): () => void {
  const a = audio();
  if (!a) return () => undefined;
  const master = a.createGain();
  master.gain.value = 0.5;
  master.connect(a.destination);
  for (const s of plan) {
    const at = s.t + 0.03;
    if (s.kind === "faible") sag(a, master, at);
    else if (s.kind === "coupure") cut(a, master, at);
    else if (s.kind === "reparee") powerUp(a, master, at);
    else rumbleAt(a, master, at);
  }
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const now = a.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.2);
    setTimeout(() => {
      try {
        master.disconnect();
      } catch {
        /* rien */
      }
    }, 300);
  };
}

/* Un don de points : un cliquet bref, trois dents. */
export function playDonate() {
  const a = audio();
  if (!a) return;
  [0, 0.05, 0.1].forEach((d, i) => click(a, a.destination, d, 2600 - i * 300, 0.16));
}

/* Le courant revient dans une région (réparation terminée). */
export function playPowerUp() {
  void playGrid([{ t: 0, kind: "reparee" }]);
}
