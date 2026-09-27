import { useEffect, useRef, useState } from "react";
import { createCabScene } from "./cabScene";
import { Emblem, EMBLEM_LABELS } from "./Emblem";
import { THEMES } from "../theme";

/* ============================================================
   Vitrine de la boutique.

   Comme dans un jeu : la rame du joueur est exposée en gare, de nuit, sous les
   lampadaires, et l'article choisi s'applique dessus en direct — la livrée
   sur la caisse, l'emblème peint sur la motrice, le titre sur la plaque du
   quai, la locomotive de collection à la place de la rame. On essaie chaque
   variante avant d'acheter, et si l'article est déjà à soi, on le porte d'un
   clic.
   ============================================================ */

export interface ShowroomItem {
  id: string;
  kind: string;
  name: string;
  description: string;
  priceCents: number;
  liveries?: string[];
  emblems?: string[];
  titles?: string[];
  theme?: string;
  cabSkins?: string[];
  owned: boolean;
  seasonName?: string | null;
  availableUntil?: string | null;
}

export interface ShowroomCompany {
  name: string;
  liveryColor: string;
  emblem?: string | null;
  title?: string | null;
  cabSkin?: string | null;
  theme?: string;
}

const KIND_LABEL: Record<string, string> = {
  LIVREES: "Livrées",
  EMBLEMES: "Emblèmes",
  TITRES: "Titres",
  THEME: "Habillage",
  CABINE: "Matériel de collection",
  SAISON: "Édition limitée",
};

export const euros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",") + " €";
const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

export function ShopShowroom({
  item,
  company,
  cabLabels,
  enabled,
  busy,
  onBuy,
  onEquip,
  onTryTheme,
}: {
  item: ShowroomItem;
  company: ShowroomCompany;
  cabLabels: Record<string, string>;
  enabled: boolean;
  busy: boolean;
  onBuy: () => void;
  onEquip: (patch: Record<string, string | null>, message: string) => void;
  onTryTheme: (theme: string) => void;
}) {
  const [livery, setLivery] = useState(company.liveryColor);
  const [emblem, setEmblem] = useState<string | null>(company.emblem ?? null);
  const [title, setTitle] = useState<string | null>(company.title ?? null);
  const [cab, setCab] = useState<string | null>(null);

  // un nouvel article en vitrine : on montre sa première variante
  useEffect(() => {
    setLivery(item.liveries?.[0] ?? company.liveryColor);
    setEmblem(item.emblems?.[0] ?? company.emblem ?? null);
    setTitle(item.titles?.[0] ?? company.title ?? null);
    setCab(item.cabSkins?.[0] ?? null);
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- la scène ---------- */
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ livery, cab, name: company.name });
  stateRef.current = { livery, cab, name: company.name };
  const [box, setBox] = useState({ w: 0, h: 0 });
  const drawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const { sc, frame } = createCabScene(ctx);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = cv.getBoundingClientRect();
      sc.W = r.width; sc.H = r.height; sc.dpr = dpr;
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setBox({ w: r.width, h: r.height });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    let raf = 0;
    drawRef.current = () => loop(performance.now());
    const loop = (now: number) => {
      const st = stateRef.current;
      sc.weather = "nuit";
      sc.livery = st.livery;
      sc.skin = st.cab;
      sc.express = false;
      sc.v = 0;
      sc.dep = st.name;
      sc.arr = "";
      sc.depDist = 0; // la rame est à quai, sous le panneau à son nom
      sc.arrDist = 1e9;
      frame(now / 1000);
      if (!reduce) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  // mouvement réduit : la scène ne tourne pas en boucle, on la redessine à chaque essai
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) drawRef.current?.();
  }, [livery, cab, box.w]);

  /* Emplacement de la motrice, calculé comme dans la scène : c'est là qu'on
     peint l'emblème. */
  const carW = Math.min(240, box.w * 0.22);
  const carH = carW * 0.28;
  const total = carW * 3 + 12;
  // sur la bande de livrée, sous les vitres de la motrice
  const locoX = box.w * 0.46 + total / 2 - carW / 2 - carW * 0.18;
  const locoY = box.h * 0.74 - carH - 10 + carH * 0.71;

  const themeInfo = item.theme ? THEMES.find((t) => t.id === item.theme) : null;
  /* « déjà porté » seulement si TOUT ce que l'article change est déjà en place :
     un coffret livrée + emblème n'est pas porté parce que l'emblème l'est */
  const parts: boolean[] = [];
  if (item.kind === "THEME" && item.theme) parts.push(item.theme === company.theme);
  if (item.liveries?.length) parts.push(livery === company.liveryColor);
  if (item.emblems?.length) parts.push(emblem === company.emblem);
  if (item.titles?.length) parts.push(title === company.title);
  if (item.cabSkins?.length) parts.push(cab === company.cabSkin);
  const isCurrent = parts.length > 0 && parts.every(Boolean);

  function equipCurrent() {
    if (item.kind === "THEME" && item.theme) return onEquip({ theme: item.theme }, `Habillage ${themeInfo?.label ?? ""} appliqué`);
    if (item.cabSkins && cab) return onEquip({ cabSkin: cab }, `${cabLabels[cab] ?? cab} en vue cabine`);
    const patch: Record<string, string | null> = {};
    if (item.liveries?.length) patch.liveryColor = livery;
    if (item.emblems?.length && emblem) patch.emblem = emblem;
    if (item.titles?.length && title) patch.title = title;
    onEquip(patch, "C'est porté");
  }

  return (
    <section className="mb-8">
      <div ref={wrapRef} className="relative border border-line bg-black overflow-hidden">
        <canvas ref={canvasRef} className="block w-full aspect-[16/7] max-md:aspect-[4/3]" aria-label={`Votre rame en vitrine avec ${item.name}`} />

        {/* halo de projecteur, pour l'effet vitrine */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 46% 70%, rgba(255,226,160,.16), transparent 55%)" }} />

        {/* emblème peint sur la motrice */}
        {emblem && !cab && box.w > 0 && (
          <span
            aria-hidden="true"
            className="absolute pointer-events-none text-white transition-opacity duration-300"
            style={{ left: locoX, top: locoY, transform: "translate(-50%, -50%)", filter: "drop-shadow(0 1px 1px rgba(0,0,0,.6))" }}
          >
            <span className="inline-flex items-center justify-center rounded-full bg-[#0b2a4a] border border-white/80" style={{ width: Math.max(18, Math.round(carH * 0.46)), height: Math.max(18, Math.round(carH * 0.46)) }}>
              <Emblem id={emblem} size={Math.max(12, Math.round(carH * 0.3))} />
            </span>
          </span>
        )}

        {/* plaque du quai : le titre de la compagnie (son nom est déjà sur le panneau de gare) */}
        {box.w > 0 && title && (
          <div
            className="absolute pointer-events-none"
            style={{ left: box.w * 0.46, top: box.h * 0.74 + 20, transform: "translateX(-50%)" }}
          >
            <div className="bg-[#0b2a4a] border-2 border-[#e8edf5] px-3 py-1 text-center shadow-lg">
              <div className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-[#f4d06f] whitespace-nowrap">{title}</div>
            </div>
          </div>
        )}

        {/* titre de l'article */}
        <div className="absolute top-3 left-4 right-4 flex items-start justify-between gap-3 pointer-events-none">
          <div>
            <div className="font-mono2 text-[10.5px] uppercase tracking-[0.16em] text-amber">
              {KIND_LABEL[item.kind] ?? item.kind}
              {item.seasonName && ` · ${item.seasonName}`}
              {item.availableUntil && !item.owned && ` · plus que ${daysLeft(item.availableUntil)} j`}
            </div>
            <h2 className="font-display text-2xl md:text-3xl leading-tight text-white drop-shadow">{item.name}</h2>
          </div>
          <div className="font-mono2 text-lg text-amber drop-shadow shrink-0">{item.owned ? "Possédé" : euros(item.priceCents)}</div>
        </div>
      </div>

      {/* variantes et actions, sous la scène */}
      <div className="border border-t-0 border-line bg-navy-900 px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-3">
        <p className="text-[12.5px] text-slate2 font-body basis-full md:basis-auto md:flex-1 min-w-[220px]">{item.description}</p>

        {item.liveries && item.liveries.length > 0 && (
          <div className="flex items-center gap-1.5" role="group" aria-label="Livrées">
            {item.liveries.map((c) => (
              <button
                key={c}
                onClick={() => setLivery(c)}
                aria-label={`Essayer la livrée ${c}`}
                aria-pressed={livery === c}
                className={`w-8 h-8 border-2 transition-transform ${livery === c ? "border-white scale-110" : "border-line"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        )}
        {item.emblems && item.emblems.length > 0 && (
          <div className="flex items-center gap-1.5" role="group" aria-label="Emblèmes">
            {item.emblems.map((e) => (
              <button
                key={e}
                onClick={() => setEmblem(e)}
                title={EMBLEM_LABELS[e] ?? e}
                aria-pressed={emblem === e}
                className={`w-9 h-9 border flex items-center justify-center ${emblem === e ? "border-white text-white bg-navy-800" : "border-line text-slate2"}`}
              >
                <Emblem id={e} size={17} />
              </button>
            ))}
          </div>
        )}
        {item.titles && item.titles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Titres">
            {item.titles.map((t) => (
              <button
                key={t}
                onClick={() => setTitle(t)}
                aria-pressed={title === t}
                className={`px-2 py-1.5 border font-mono2 text-[10px] uppercase tracking-wide ${title === t ? "border-amber text-amber" : "border-line text-slate2"}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {item.cabSkins && item.cabSkins.length > 0 && (
          <div className="flex items-center gap-1.5" role="group" aria-label="Matériel">
            {item.cabSkins.map((c) => (
              <button
                key={c}
                onClick={() => setCab(c)}
                aria-pressed={cab === c}
                className={`px-2.5 py-1.5 border font-mono2 text-[10.5px] uppercase ${cab === c ? "border-white text-white" : "border-line text-slate2"}`}
              >
                {cabLabels[c] ?? c}
              </button>
            ))}
          </div>
        )}
        {themeInfo && (
          <div className="flex items-center gap-2">
            <span className="flex">
              {themeInfo.swatch.map((c) => <span key={c} className="w-7 h-7 border border-line -ml-px first:ml-0" style={{ background: c }} />)}
            </span>
            <button onClick={() => onTryTheme(item.theme!)} className="px-3 py-2 border border-cobalt text-cobalt font-mono2 text-[11px] uppercase">
              Essayer sur la console
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {item.owned ? (
            <button
              onClick={equipCurrent}
              disabled={Boolean(isCurrent)}
              className="px-4 py-2 bg-cobalt text-onaccent font-mono2 text-[11px] uppercase tracking-wide disabled:opacity-40"
            >
              {isCurrent ? "Déjà porté" : "Porter"}
            </button>
          ) : (
            <button
              onClick={onBuy}
              disabled={!enabled || busy}
              className="px-5 py-2.5 bg-amber text-onaccent font-mono2 text-[12px] uppercase tracking-wide disabled:opacity-50"
            >
              {!enabled ? "Bientôt disponible" : busy ? "Ouverture…" : `Acheter · ${euros(item.priceCents)}`}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* Vignette d'un article dans la grille, avec un vrai visuel. */
export function ShopTile({
  item,
  selected,
  onSelect,
  cabPreview,
}: {
  item: ShowroomItem;
  selected: boolean;
  onSelect: () => void;
  cabPreview: (id: string) => React.ReactNode;
}) {
  const theme = item.theme ? THEMES.find((t) => t.id === item.theme) : null;
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`text-left border bg-navy-900/40 flex flex-col transition-colors ${
        selected ? "border-amber ring-1 ring-amber" : item.kind === "SAISON" ? "border-amber/50 hover:border-amber" : "border-line hover:border-slate2"
      }`}
    >
      <div className="h-24 bg-navy-950 border-b border-line flex items-center justify-center gap-2 px-3 relative overflow-hidden">
        {item.kind === "SAISON" && (
          <span className="absolute top-1.5 left-1.5 font-mono2 text-[9px] uppercase tracking-wide bg-amber text-onaccent px-1.5 py-0.5">
            Limité{item.availableUntil ? ` · ${daysLeft(item.availableUntil)} j` : ""}
          </span>
        )}
        {item.owned && (
          <span className="absolute top-1.5 right-1.5 font-mono2 text-[9px] uppercase tracking-wide text-rail-green border border-rail-green/50 px-1.5 py-0.5">Possédé</span>
        )}
        {item.liveries?.map((c) => <MiniTrain key={c} color={c} />)}
        {!item.liveries && item.emblems?.slice(0, 6).map((e) => (
          <span key={e} className="text-offwhite"><Emblem id={e} size={20} /></span>
        ))}
        {item.liveries && item.emblems?.map((e) => (
          <span key={e} className="text-offwhite"><Emblem id={e} size={22} /></span>
        ))}
        {item.titles && (
          <div className="flex flex-col items-center gap-1">
            {item.titles.slice(0, 2).map((t) => (
              <span key={t} className="bg-[#0b2a4a] border border-[#e8edf5] px-2 py-0.5 font-mono2 text-[9.5px] uppercase tracking-wide text-[#f4d06f] whitespace-nowrap">{t}</span>
            ))}
            {item.titles.length > 2 && <span className="font-mono2 text-[10px] text-slate2">+ {item.titles.length - 2}</span>}
          </div>
        )}
        {theme && (
          <span className="flex">
            {theme.swatch.map((c) => <span key={c} className="w-9 h-12 border border-line -ml-px first:ml-0" style={{ background: c }} />)}
          </span>
        )}
        {item.cabSkins?.map((c) => <span key={c}>{cabPreview(c)}</span>)}
      </div>
      <div className="px-3 py-2.5 flex items-baseline justify-between gap-2">
        <span className="font-display text-[15px] leading-tight">{item.name}</span>
        <span className="font-mono2 text-[12px] text-amber shrink-0">{item.owned ? "✓" : euros(item.priceCents)}</span>
      </div>
    </button>
  );
}

function MiniTrain({ color }: { color: string }) {
  return (
    <svg width="46" height="20" viewBox="0 0 46 20" aria-hidden="true">
      <path d="M2 4h30q10 0 12 9v2H2Z" fill="#e7eaee" />
      <rect x="2" y="11" width="42" height="3" fill={color} />
      <path d="M2 4h30q10 0 12 9H2Z" fill="none" stroke={color} strokeWidth="1" opacity=".5" />
      {[5, 12, 19, 26].map((x) => <rect key={x} x={x} y="6" width="5" height="3" fill="#2b3a4f" />)}
      <circle cx="9" cy="17" r="2" fill="#333" /><circle cx="36" cy="17" r="2" fill="#333" />
    </svg>
  );
}
