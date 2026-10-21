import { useEffect, useRef, useState } from "react";
import { GiftButton } from "./Gift";
import { createCabScene } from "./cabScene";
import { Emblem, EMBLEM_LABELS } from "./Emblem";
import { THEMES } from "../theme";
import { Plate, PLATE_LABELS } from "./Plate";
import { TrainPicture } from "./TrainPicture";
import { PrestigeThumb, PRESTIGE_KINDS, NamePlate, MuseumHall, StationThumb, PLATE_STYLE_LABELS, SOUND_LABELS, STATION_SKIN_LABELS } from "./PrestigeArt";
import { canShareFiles, PosterCanvas, PosterHandle, PosterStyle, POSTER_LABELS } from "./PosterArt";
import { PosterFormat, PosterShare, POSTER_FORMATS } from "./PosterShare";
import { api } from "../api/client";
import { referralLink } from "../referral";
import { StaffFigure, UNIFORM_LABELS } from "./StaffFigure";
import { playPack, SoundPack } from "../sfx";

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
  plates?: string[];
  isNew?: boolean;
  worthCents?: number;
  owned: boolean;
  seasonName?: string | null;
  availableUntil?: string | null;
  // 2.1 : l'atelier de prestige
  posters?: string[];
  trainPlates?: string[];
  sounds?: string[];
  stationSkins?: string[];
  museum?: boolean;
  uniforms?: string[];
  allianceLiveries?: string[];
}

export interface ShowroomCompany {
  name: string;
  liveryColor: string;
  emblem?: string | null;
  title?: string | null;
  cabSkin?: string | null;
  theme?: string;
  plate?: string | null;
  // 2.1
  stationSkin?: string | null;
  soundPack?: string | null;
  uniform?: string | null;
  lines?: string[][]; // le réseau, pour l'affiche
  allianceLivery?: string | null;
}

/* 2.1 : ce que certains objets « portent » autrement qu'en changeant la compagnie */
export type ShowroomSpecial =
  | { type: "plates"; style: string }
  | { type: "alliance"; color: string }
  | { type: "museum" };

const KIND_LABEL: Record<string, string> = {
  LIVREES: "Livrées",
  EMBLEMES: "Emblèmes",
  TITRES: "Titres",
  THEME: "Habillage",
  CABINE: "Matériel de collection",
  SAISON: "Édition limitée",
  COFFRET: "Coffret",
  PLAQUE: "Plaques d'honneur",
  // 2.1
  AFFICHE: "Affiche",
  PLAQUE_RAME: "Plaques de rame",
  SONS: "Sons de gare",
  GARE: "Habillage de gare",
  MUSEE: "Musée",
  TENUES: "Tenues du personnel",
  ALLIANCE: "Coffret d'alliance",
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
  onSpecial,
}: {
  item: ShowroomItem;
  company: ShowroomCompany;
  cabLabels: Record<string, string>;
  enabled: boolean;
  busy: boolean;
  onBuy: () => void;
  onEquip: (patch: Record<string, string | null>, message: string) => void;
  onTryTheme: (theme: string) => void;
  onSpecial?: (s: ShowroomSpecial) => void;
}) {
  const allianceKit = item.kind === "ALLIANCE";
  const liveries = allianceKit ? item.allianceLiveries : item.liveries;
  const [livery, setLivery] = useState(liveries?.[0] ?? company.liveryColor);
  // 2.1 : les variantes de l'atelier de prestige
  const [stationSkin, setStationSkin] = useState<string | null>(item.stationSkins?.[0] ?? company.stationSkin ?? null);
  const [trainPlate, setTrainPlate] = useState<string | null>(item.trainPlates?.[0] ?? null);
  const [sound, setSound] = useState<string | null>(item.sounds?.[0] ?? null);
  const [uniform, setUniform] = useState<string | null>(item.uniforms?.[0] ?? null);
  const [poster, setPoster] = useState<PosterStyle>((item.posters?.[0] as PosterStyle) ?? "belle-epoque");
  const posterRef = useRef<PosterHandle>(null);
  // 2.1.x : l'affiche à partager — format, QR de parrainage
  const [posterFormat, setPosterFormat] = useState<PosterFormat>("a3");
  const [withQr, setWithQr] = useState(true);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [shareable] = useState(canShareFiles);
  useEffect(() => {
    if (item.kind !== "AFFICHE") return;
    let alive = true;
    api
      .get("/referral/mine")
      .then((r) => alive && setRefCode(r.data?.code ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [item.kind]);
  const posterShare: PosterShare | null = withQr && refCode ? { code: refCode, url: referralLink(refCode) } : null;
  const stage = item.kind === "AFFICHE" || item.kind === "SONS" || item.kind === "MUSEE" || item.kind === "TENUES";
  const [emblem, setEmblem] = useState<string | null>(company.emblem ?? null);
  const [title, setTitle] = useState<string | null>(company.title ?? null);
  const [cab, setCab] = useState<string | null>(null);
  const [plate, setPlate] = useState<string | null>(company.plate ?? null);

  // un nouvel article en vitrine : on montre sa première variante
  useEffect(() => {
    setLivery(liveries?.[0] ?? company.liveryColor);
    setEmblem(item.emblems?.[0] ?? company.emblem ?? null);
    setTitle(item.titles?.[0] ?? company.title ?? null);
    setCab(item.cabSkins?.[0] ?? null);
    setPlate(item.plates?.[0] ?? company.plate ?? null);
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- la scène ---------- */
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ livery, cab, name: company.name, stationSkin, trainPlate });
  stateRef.current = { livery, cab, name: company.name, stationSkin, trainPlate };
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [badge, setBadge] = useState<{ x: number; y: number; r: number } | null>(null);
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
    let last: { x: number; y: number; r: number } | null = null;
    drawRef.current = () => loop(performance.now());
    const loop = (now: number) => {
      // 2.0 : l'emblème suit la motrice telle que trainArt l'a dessinée
      const b = sc.box?.badge;
      if (b && (!last || Math.abs(b.x - last.x) > 0.5 || Math.abs(b.y - last.y) > 0.5 || Math.abs(b.r - last.r) > 0.5)) {
        last = { x: b.x, y: b.y, r: b.r };
        setBadge(last);
      }
      const st = stateRef.current;
      sc.weather = "nuit";
      sc.livery = st.livery;
      sc.skin = st.cab;
      sc.stationSkin = st.stationSkin;
      sc.plate = st.trainPlate ? { style: st.trainPlate, text: "Étoile du Nord" } : null;
      sc.express = allianceKit;
      if (allianceKit) sc.model = "EXPRESS";
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
  }, [livery, cab, box.w, stationSkin, trainPlate]);

  /* Emplacement de l'emblème : la scène le donne à chaque image (badge). */
  const locoX = badge?.x ?? 0;
  const locoY = badge?.y ?? 0;
  const carH = (badge?.r ?? 9) * 4;

  const themeInfo = item.theme ? THEMES.find((t) => t.id === item.theme) : null;
  /* « déjà porté » seulement si TOUT ce que l'article change est déjà en place :
     un coffret livrée + emblème n'est pas porté parce que l'emblème l'est */
  const parts: boolean[] = [];
  if (item.kind === "THEME" && item.theme) parts.push(item.theme === company.theme);
  if (allianceKit) parts.push(livery === company.allianceLivery);
  if (item.liveries?.length) parts.push(livery === company.liveryColor);
  if (item.stationSkins?.length) parts.push(stationSkin === company.stationSkin);
  if (item.sounds?.length) parts.push(sound === company.soundPack);
  if (item.uniforms?.length) parts.push(uniform === company.uniform);
  if (item.emblems?.length) parts.push(emblem === company.emblem);
  if (item.titles?.length) parts.push(title === company.title);
  if (item.cabSkins?.length) parts.push(cab === company.cabSkin);
  if (item.plates?.length) parts.push(plate === company.plate);
  const isCurrent = parts.length > 0 && parts.every(Boolean);

  function equipCurrent() {
    // 2.1 : l'atelier de prestige
    if (item.kind === "GARE" && stationSkin) return onEquip({ stationSkin }, `Gares ${STATION_SKIN_LABELS[stationSkin]?.toLowerCase() ?? ""} en vue cabine`);
    if (item.kind === "SONS" && sound) return onEquip({ soundPack: sound }, `${SOUND_LABELS[sound] ?? sound} à l'arrivée en gare`);
    if (item.kind === "TENUES" && uniform) return onEquip({ uniform }, `Tenues ${UNIFORM_LABELS[uniform]?.toLowerCase() ?? ""} pour tout le personnel`);
    if (item.kind === "PLAQUE_RAME" && trainPlate) return onSpecial?.({ type: "plates", style: trainPlate });
    if (allianceKit) return onSpecial?.({ type: "alliance", color: livery });
    if (item.kind === "MUSEE") return onSpecial?.({ type: "museum" });
    if (item.kind === "AFFICHE") return posterRef.current?.download();
    if (item.kind === "THEME" && item.theme) return onEquip({ theme: item.theme }, `Habillage ${themeInfo?.label ?? ""} appliqué`);
    // un matériel seul : on le dit ; un coffret : tout ce qu'il contient se porte d'un coup
    if (item.cabSkins && cab && item.kind === "CABINE") return onEquip({ cabSkin: cab }, `${cabLabels[cab] ?? cab} en vue cabine`);
    if (item.plates && plate && item.kind === "PLAQUE") return onEquip({ plate }, `Plaque ${PLATE_LABELS[plate]?.toLowerCase() ?? plate} posée`);
    const patch: Record<string, string | null> = {};
    if (item.cabSkins?.length && cab) patch.cabSkin = cab;
    if (item.liveries?.length) patch.liveryColor = livery;
    if (item.emblems?.length && emblem) patch.emblem = emblem;
    if (item.titles?.length && title) patch.title = title;
    onEquip(patch, "C'est porté");
  }

  return (
    <section className="mb-8">
      <div ref={wrapRef} className="relative border border-line bg-black overflow-hidden">
        {stage ? (
          <PrestigeStage
            item={item}
            company={company}
            poster={poster}
            posterRef={posterRef}
            posterFormat={posterFormat}
            posterShare={posterShare}
            sound={sound}
            uniform={uniform}
            onPlay={(s) => {
              setSound(s);
              playPack(s as SoundPack);
            }}
          />
        ) : (
          <canvas ref={canvasRef} className="block w-full aspect-[16/7] max-md:aspect-[4/3]" aria-label={`Votre rame en vitrine avec ${item.name}`} />
        )}

        {/* halo de projecteur, pour l'effet vitrine */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 46% 70%, rgba(255,226,160,.16), transparent 55%)" }} />

        {/* emblème peint sur la motrice */}
        {!stage && emblem && !cab && box.w > 0 && badge && (
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
        {item.kind === "PLAQUE_RAME" && trainPlate && box.w > 0 ? (
          /* 2.1 : la plaque, en grand sous la rame, telle qu'on la lira au quai */
          <div className="absolute pointer-events-none" style={{ left: box.w * 0.46, top: box.h * 0.74 + 18, transform: "translateX(-50%)" }}>
            <NamePlate style={trainPlate} className="text-[15px] shadow-lg">Étoile du Nord</NamePlate>
          </div>
        ) : stage || item.kind === "GARE" || allianceKit ? null : box.w > 0 && item.plates?.length ? (
          /* 1.7 : plaque d'honneur, telle qu'on la verra au classement */
          <div className="absolute pointer-events-none" style={{ left: box.w * 0.46, top: box.h * 0.74 + 18, transform: "translateX(-50%)" }}>
            <Plate plate={plate} className="text-[14px] font-body shadow-lg">
              {company.emblem && <Emblem id={company.emblem} size={13} />}
              <span className="whitespace-nowrap">{company.name}</span>
            </Plate>
          </div>
        ) : box.w > 0 && title ? (
          <div
            className="absolute pointer-events-none"
            style={{ left: box.w * 0.46, top: box.h * 0.74 + 20, transform: "translateX(-50%)" }}
          >
            <div className="bg-[#0b2a4a] border-2 border-[#e8edf5] px-3 py-1 text-center shadow-lg">
              <div className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-[#f4d06f] whitespace-nowrap">{title}</div>
            </div>
          </div>
        ) : null}

        {/* titre de l'article */}
        <div className="absolute top-3 left-4 right-4 flex items-start justify-between gap-3 pointer-events-none">
          <div>
            <div className="font-mono2 text-[10.5px] uppercase tracking-[0.16em] text-amber">
              {KIND_LABEL[item.kind] ?? item.kind}
              {item.isNew && !item.owned && " · Nouveau"}
              {item.seasonName && ` · ${item.seasonName}`}
              {item.availableUntil && !item.owned && ` · plus que ${daysLeft(item.availableUntil)} j`}
            </div>
            <h2 className="font-display text-2xl md:text-3xl leading-tight text-white drop-shadow">{item.name}</h2>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono2 text-lg text-amber drop-shadow">{item.owned ? "Possédé" : euros(item.priceCents)}</div>
            {!item.owned && item.worthCents && item.worthCents > item.priceCents && (
              <div className="font-mono2 text-[11px] text-white/70 drop-shadow">
                <span className="line-through">{euros(item.worthCents)}</span> séparément
              </div>
            )}
          </div>
        </div>
      </div>

      {/* variantes et actions, sous la scène */}
      <div className="border border-t-0 border-line bg-navy-900 px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-3">
        <p className="text-[12.5px] text-slate2 font-body basis-full md:basis-auto md:flex-1 min-w-[220px]">{item.description}</p>

        {liveries && liveries.length > 0 && (
          <div className="flex items-center gap-1.5" role="group" aria-label="Livrées">
            {liveries.map((c) => (
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
        {item.plates && item.plates.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Plaques">
            {item.plates.map((p) => (
              <button
                key={p}
                onClick={() => setPlate(p)}
                aria-pressed={plate === p}
                className={`px-2.5 py-1.5 border font-mono2 text-[10.5px] uppercase ${plate === p ? "border-white text-white" : "border-line text-slate2"}`}
              >
                {PLATE_LABELS[p] ?? p}
              </button>
            ))}
          </div>
        )}
        {/* 2.1 : les variantes de l'atelier de prestige */}
        <Variants list={item.stationSkins} value={stationSkin} labels={STATION_SKIN_LABELS} onPick={setStationSkin} label="Habillages de gare" />
        <Variants list={item.trainPlates} value={trainPlate} labels={PLATE_STYLE_LABELS} onPick={setTrainPlate} label="Plaques" />
        <Variants list={item.uniforms} value={uniform} labels={UNIFORM_LABELS} onPick={setUniform} label="Tenues" />
        <Variants list={item.posters} value={poster} labels={POSTER_LABELS} onPick={(p) => setPoster(p as PosterStyle)} label="Affiches" />
        {item.kind === "AFFICHE" && (
          <>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Format de l'affiche">
              {(Object.keys(POSTER_FORMATS) as PosterFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setPosterFormat(f)}
                  aria-pressed={posterFormat === f}
                  className={`px-2.5 py-1.5 border font-body text-[12.5px] ${posterFormat === f ? "border-white text-white" : "border-line text-slate2"}`}
                >
                  {POSTER_FORMATS[f].label} <span className="opacity-60">· {POSTER_FORMATS[f].hint}</span>
                </button>
              ))}
            </div>
            {refCode && (
              <label className="flex items-center gap-2 font-body text-[12.5px] text-slate2 cursor-pointer select-none">
                <input type="checkbox" checked={withQr} onChange={(e) => setWithQr(e.target.checked)} className="accent-amber" />
                QR code et code de parrainage <span className="font-mono2 text-amber">{refCode}</span>
              </label>
            )}
          </>
        )}
        {item.sounds && item.sounds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sons">
            {item.sounds.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSound(s);
                  playPack(s as SoundPack);
                }}
                aria-pressed={sound === s}
                className={`px-2.5 py-1.5 border font-body text-[12.5px] ${sound === s ? "border-white text-white" : "border-line text-slate2"}`}
              >
                ▶ {SOUND_LABELS[s] ?? s}
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
          {item.owned && item.kind === "AFFICHE" && shareable && (
            <button
              onClick={() => void posterRef.current?.share()}
              className="px-4 py-2 border border-cobalt text-cobalt font-mono2 text-[11px] uppercase tracking-wide"
            >
              Partager
            </button>
          )}
          {item.owned ? (
            <button
              onClick={equipCurrent}
              disabled={Boolean(isCurrent) && !["AFFICHE", "MUSEE", "PLAQUE_RAME"].includes(item.kind) && !allianceKit}
              className="px-4 py-2 bg-cobalt text-onaccent font-mono2 text-[11px] uppercase tracking-wide disabled:opacity-40"
            >
              {item.kind === "AFFICHE"
                ? "Télécharger l'affiche"
                : item.kind === "MUSEE"
                ? "Ouvrir le musée"
                : item.kind === "PLAQUE_RAME"
                ? "Poser sur toutes mes rames"
                : allianceKit
                ? "Peindre l'alliance"
                : isCurrent
                ? "Déjà porté"
                : "Porter"}
            </button>
          ) : (
            <>
            {enabled && <GiftButton itemName={item.name} priceLabel={euros(item.priceCents)} itemId={item.id} />}
            <button
              onClick={onBuy}
              disabled={!enabled || busy}
              className="px-5 py-2.5 bg-amber text-onaccent font-mono2 text-[12px] uppercase tracking-wide disabled:opacity-50"
            >
              {!enabled ? "Bientôt disponible" : busy ? "Ouverture…" : `Acheter · ${euros(item.priceCents)}`}
            </button>
            </>
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
      <div className="h-32 bg-gradient-to-b from-navy-950 to-[#121a28] border-b border-line flex items-center justify-center gap-2 px-3 relative overflow-hidden">
        {/* 2.1 : l'atelier de prestige a ses propres visuels */}
        {PRESTIGE_KINDS.has(item.kind) && <PrestigeThumb item={item} />}
        {item.kind === "SAISON" && (
          <span className="absolute z-10 top-1.5 left-1.5 font-mono2 text-[9px] uppercase tracking-wide bg-amber text-onaccent px-1.5 py-0.5">
            Limité{item.availableUntil ? ` · ${daysLeft(item.availableUntil)} j` : ""}
          </span>
        )}
        {item.isNew && !item.owned && item.kind !== "SAISON" && (
          <span className="absolute z-10 top-1.5 left-1.5 font-mono2 text-[9px] uppercase tracking-wide bg-cobalt text-onaccent px-1.5 py-0.5">Nouveau</span>
        )}
        {item.worthCents && item.worthCents > item.priceCents && !item.owned && (
          <span className="absolute z-10 bottom-1.5 right-1.5 font-mono2 text-[9px] uppercase tracking-wide text-amber border border-amber/50 px-1.5 py-0.5">
            −{Math.round((1 - item.priceCents / item.worthCents) * 100)} %
          </span>
        )}
        {item.plates && (
          <div className="flex flex-col items-center gap-1">
            {item.plates.map((p) => (
              <Plate key={p} plate={p} className="text-[10.5px] font-body">
                Votre compagnie
              </Plate>
            ))}
          </div>
        )}
        {item.owned && (
          <span className="absolute z-10 top-1.5 right-1.5 font-mono2 text-[9px] uppercase tracking-wide text-rail-green border border-rail-green/50 px-1.5 py-0.5">Possédé</span>
        )}
        {/* 2.0 : la vraie rame, dessinée comme en vue cabine, à la livrée ou au matériel de l'article */}
        {(item.liveries?.length || item.cabSkins?.length) ? (
          <div className="absolute inset-x-0 bottom-0 top-5 flex flex-col justify-end">
            <TrainPicture
              livery={item.liveries?.[0] ?? "#4f7fa3"}
              skin={item.cabSkins?.[0] ?? null}
              height={78}
              fit={false}
              align="right"
              label={item.name}
            />
            {((item.liveries?.length ?? 0) > 1 || (item.emblems?.length ?? 0) > 0) && (
              <div className="absolute top-0 right-2 flex items-center gap-1">
                {(item.liveries?.length ?? 0) > 1 && item.liveries!.map((c) => <span key={c} className="w-3 h-3 border border-white/30" style={{ background: c }} />)}
                {item.emblems?.map((e) => (
                  <span key={e} className="text-offwhite"><Emblem id={e} size={14} /></span>
                ))}
              </div>
            )}
          </div>
        ) : null}
        {!PRESTIGE_KINDS.has(item.kind) && !item.liveries && !item.cabSkins && item.emblems?.slice(0, 6).map((e) => (
          <span key={e} className="text-offwhite"><Emblem id={e} size={20} /></span>
        ))}
        {item.titles && item.kind !== "COFFRET" && (
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
      </div>
      <div className="px-3 py-2.5 flex items-baseline justify-between gap-2">
        <span className="font-display text-[15px] leading-tight">{item.name}</span>
        <span className="font-mono2 text-[12px] text-amber shrink-0">{item.owned ? "✓" : euros(item.priceCents)}</span>
      </div>
    </button>
  );
}

/* 2.1 : une rangée de variantes à essayer */
function Variants({ list, value, labels, onPick, label }: { list?: string[]; value: string | null; labels: Record<string, string>; onPick: (v: string) => void; label: string }) {
  if (!list?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {list.map((v) => (
        <button
          key={v}
          onClick={() => onPick(v)}
          aria-pressed={value === v}
          className={`px-2.5 py-1.5 border font-body text-[12.5px] ${value === v ? "border-white text-white" : "border-line text-slate2"}`}
        >
          {labels[v] ?? v}
        </button>
      ))}
    </div>
  );
}

/* 2.1 : la scène des objets qui ne se portent pas sur la rame */
function PrestigeStage({
  item,
  company,
  poster,
  posterRef,
  posterFormat,
  posterShare,
  sound,
  uniform,
  onPlay,
}: {
  item: ShowroomItem;
  company: ShowroomCompany;
  poster: PosterStyle;
  posterRef: React.RefObject<PosterHandle>;
  posterFormat: PosterFormat;
  posterShare: PosterShare | null;
  sound: string | null;
  uniform: string | null;
  onPlay: (s: string) => void;
}) {
  const box = "relative w-full aspect-[16/7] max-md:aspect-[4/3] overflow-hidden";
  if (item.kind === "AFFICHE") {
    const lines = company.lines?.length ? company.lines : [["Paris", "Lyon", "Marseille"], ["Paris", "Lille"], ["Bordeaux", "Toulouse"]];
    return (
      <div className={box} style={{ background: "radial-gradient(ellipse at 50% 20%, #3b3326 0%, #1a1712 55%, #0c0b09 100%)" }}>
        {/* le mur carrelé du hall, et le cadre de l'affiche */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "34px 18px" }} />
        <div className="absolute left-1/2 top-[6%] bottom-[6%] -translate-x-1/2 p-[6px] bg-[#2a2219] shadow-[0_18px_40px_rgba(0,0,0,0.7)]" style={{ aspectRatio: `${POSTER_FORMATS[posterFormat].w}/${POSTER_FORMATS[posterFormat].h}` }}>
          <PosterCanvas ref={posterRef} style={poster} format={posterFormat} share={posterShare} data={{ company: company.name, livery: company.liveryColor, lines }} watermark={!item.owned} />
        </div>
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,226,160,.18), transparent 60%)" }} />
        <p className="absolute bottom-3 right-4 max-w-[30%] text-right text-[12px] font-body text-white/70 max-md:hidden">
          Votre réseau, vos lignes et votre nom. En A3 à imprimer, en story ou en carré pour les réseaux, avec votre QR code de parrainage.
        </p>
      </div>
    );
  }
  if (item.kind === "MUSEE") {
    return (
      <div className={box}>
        <MuseumHall />
      </div>
    );
  }
  if (item.kind === "SONS") {
    return (
      <div className={box}>
        <StationThumb skin={company.stationSkin ?? null} livery={company.liveryColor} name={company.name} />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(520px,88%)] bg-[#0b1220] border border-[#2b3443] px-4 py-3 shadow-2xl">
          <div className="font-mono2 text-[11px] text-[#ffd36b] mb-2">ANNONCES EN GARE</div>
          {(item.sounds ?? []).map((s) => (
            <button key={s} onClick={() => onPlay(s)} className="w-full flex items-center gap-3 py-2 border-t border-[#1d2636] first:border-t-0 text-left group">
              <span className={`w-8 h-8 rounded-full border inline-flex items-center justify-center text-[11px] ${sound === s ? "border-[#ffd36b] text-[#ffd36b]" : "border-white/30 text-white/80 group-hover:border-white"}`}>▶</span>
              <span className="flex-1 font-body text-[14px] text-[#e8edf5]">{SOUND_LABELS[s] ?? s}</span>
              <span className="flex items-end gap-[2px] h-5" aria-hidden="true">
                {Array.from({ length: 14 }).map((_, k) => (
                  <span key={k} className={`w-[3px] ${sound === s ? "bg-[#ffd36b]" : "bg-white/25"}`} style={{ height: `${25 + Math.abs(Math.sin((k + s.length) * 1.3)) * 75}%` }} />
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  // TENUES
  const crew = [
    { seed: "Odette Morel", role: "Cheffe de gare" },
    { seed: "Louis Garnier", role: "Conducteur" },
    { seed: "Amina Diallo", role: "Contrôleuse" },
  ];
  return (
    <div className={box}>
      <StationThumb skin={company.stationSkin ?? null} livery={company.liveryColor} name={company.name} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-[4%] pb-3">
        {crew.map((c) => (
          <figure key={c.seed} className="flex flex-col items-center">
            <StaffFigure uniform={uniform} seed={c.seed} size={118} accent={company.liveryColor} />
            <figcaption className="mt-1 text-center">
              <span className="block text-[13px] font-body text-white">{c.seed.split(" ")[0]}</span>
              <span className="block text-[11px] font-body text-white/60">{c.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export { PRESTIGE_KINDS };
