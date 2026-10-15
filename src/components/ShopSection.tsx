import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SplitFlap } from "./SplitFlap";
import { SeasonPass } from "./SeasonPass";
import { GiftButton } from "./Gift";
import { TrainPicture } from "./TrainPicture";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Emblem, EMBLEM_LABELS } from "./Emblem";
import { applyTheme, ThemeId, THEMES } from "../theme";
import { ShopShowroom, ShopTile, ShowroomCompany as PreviewCompany, ShowroomSpecial, PRESTIGE_KINDS } from "./ShopShowroom";
import { PrestigeThumb, SOUND_LABELS, STATION_SKIN_LABELS, PLATE_STYLE_LABELS, NamePlate } from "./PrestigeArt";
import { StaffFigure, UNIFORM_LABELS } from "./StaffFigure";
import { POSTER_LABELS } from "./PosterArt";
import { playPack, SoundPack } from "../sfx";
import { Plate, PLATE_LABELS } from "./Plate";

/* ============================================================
   Boutique.

   Deux gestes par objet, et la page les sépare nettement : l'ACHETER (une
   fois, par Stripe) puis le PORTER (autant de fois qu'on veut, gratuitement).
   Posséder un emblème ne l'impose pas — on choisit lequel on porte, ou aucun.
   ============================================================ */

interface ShopItem {
  id: string;
  kind: "DLC" | "LIVREES" | "EMBLEMES" | "TITRES" | "THEME" | "CABINE" | "SAISON" | "COFFRET" | "PLAQUE" | "AFFICHE" | "PLAQUE_RAME" | "SONS" | "GARE" | "MUSEE" | "TENUES" | "ALLIANCE";
  name: string;
  description: string;
  priceCents: number;
  liveries?: string[];
  emblems?: string[];
  titles?: string[];
  theme?: string;
  cabSkins?: string[];
  plates?: string[];
  // 2.1 : l'atelier de prestige
  posters?: string[];
  trainPlates?: string[];
  sounds?: string[];
  stationSkins?: string[];
  museum?: boolean;
  uniforms?: string[];
  allianceLiveries?: string[];
  isNew?: boolean;
  worthCents?: number;
  owned: boolean;
  // 1.5 : édition limitée de saison
  season?: string;
  seasonName?: string | null;
  availableUntil?: string | null;
  // 2.0 : extension de jeu
  dlc?: { tagline: string; premium: boolean; features: string[]; models: { id: string; label: string; blurb: string }[]; stations: string[] };
  includedInPremium?: boolean;
}

interface ShopData {
  enabled: boolean;
  items: ShopItem[];
  rotation?: { day: string; featured: string[]; daily: string[]; refreshAt: string };
  equipped: { emblem: string | null; title: string | null; theme: string; livery: string; cabSkin?: string | null; plate?: string | null; soundPack?: string | null; stationSkin?: string | null; uniform?: string | null };
  unlocked: {
    emblems: string[]; titles: string[]; themes: string[]; liveries: string[]; cabSkins?: string[]; plates?: string[];
    // 2.1
    posters?: string[]; trainPlates?: string[]; sounds?: string[]; stationSkins?: string[]; uniforms?: string[]; museum?: boolean; allianceLiveries?: string[];
  };
  nextSeason?: { name: string; itemName: string; startsAt: string } | null;
}

function daysUntil(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export const CAB_SKIN_LABELS: Record<string, string> = {
  vapeur: "Locomotive à vapeur",
  micheline: "Micheline",
  // 1.7
  pullman: "Voitures Pullman",
  duplex: "Rame à deux niveaux",
  "grande-vitesse": "Rame à grande vitesse",
};

/* Petite silhouette du matériel de collection, pour voir ce qu'on achète. */
function CabSkinPreview({ id }: { id: string }) {
  // 2.0 : la vraie rame, dessinée comme en vue cabine
  return (
    <span className="inline-block w-[120px]">
      <TrainPicture skin={id} livery="#4f7fa3" height={30} track={false} label={CAB_SKIN_LABELS[id] ?? id} />
    </span>
  );
}

// ancien dessin, gardé pour mémoire du gabarit des vignettes
export function LegacyCabSkinPreview({ id }: { id: string }) {
  if (id === "vapeur") {
    return (
      <svg width="64" height="28" viewBox="0 0 64 28" aria-label="Locomotive à vapeur" role="img">
        <circle cx="14" cy="6" r="3" fill="#9aa3ad" opacity="0.7" />
        <circle cx="9" cy="3.5" r="2.4" fill="#9aa3ad" opacity="0.45" />
        <rect x="12" y="8" width="5" height="6" fill="#1f2530" />
        <rect x="8" y="13" width="30" height="8" rx="3" fill="#1f2530" />
        <rect x="34" y="8" width="12" height="13" fill="#6b1f2a" />
        <rect x="36" y="10" width="6" height="4" fill="#f3d9a0" />
        <rect x="47" y="12" width="14" height="9" fill="#2a3040" />
        <circle cx="16" cy="22" r="3.4" fill="#c99a3e" /><circle cx="27" cy="22" r="3.4" fill="#c99a3e" />
        <circle cx="40" cy="23" r="2.4" fill="#c99a3e" /><circle cx="52" cy="23" r="2.2" fill="#555" /><circle cx="58" cy="23" r="2.2" fill="#555" />
      </svg>
    );
  }
  if (id === "pullman") {
    return (
      <svg width="64" height="28" viewBox="0 0 64 28" aria-label="Voitures Pullman" role="img">
        <path d="M3 8 Q32 2 61 8 V21 H3 Z" fill="#5b1e2d" />
        <rect x="5" y="9" width="54" height="6" fill="#e9dcc0" stroke="#d9a441" strokeWidth=".8" />
        {[8, 16, 24, 32, 40, 48].map((x) => <rect key={x} x={x} y="10" width="5" height="4" fill="#3b2f2a" />)}
        <path d="M5 18.5 H59" stroke="#d9a441" strokeWidth=".8" />
        <circle cx="13" cy="23" r="2.4" fill="#333" /><circle cx="51" cy="23" r="2.4" fill="#333" />
      </svg>
    );
  }
  if (id === "duplex") {
    return (
      <svg width="64" height="28" viewBox="0 0 64 28" aria-label="Rame à deux niveaux" role="img">
        <path d="M3 3 H44 Q60 6 61 22 H3 Z" fill="#e7eaee" />
        <rect x="3" y="12" width="56" height="2" fill="#4f7fa3" />
        <rect x="3" y="19" width="58" height="1.6" fill="#4f7fa3" />
        {[6, 13, 20, 27, 34].map((x) => <g key={x}><rect x={x} y="5" width="5" height="4" fill="#2b3a4f" /><rect x={x} y="15" width="5" height="3" fill="#2b3a4f" /></g>)}
        <circle cx="12" cy="24" r="2.4" fill="#333" /><circle cx="50" cy="24" r="2.4" fill="#333" />
      </svg>
    );
  }
  if (id === "grande-vitesse") {
    return (
      <svg width="64" height="28" viewBox="0 0 64 28" aria-label="Rame à grande vitesse" role="img">
        <path d="M2 11 H30 C48 11 58 15 62 21 H2 Z" fill="#d5dbe1" />
        <rect x="2" y="17" width="54" height="1.8" fill="#c0392b" />
        <rect x="5" y="13" width="18" height="2.6" fill="#2b3a4f" />
        <path d="M36 12.5 L44 13.5 L47 16 H36 Z" fill="#1b2638" />
        <circle cx="10" cy="23" r="2.2" fill="#333" /><circle cx="44" cy="23" r="2.2" fill="#333" />
      </svg>
    );
  }
  return (
    <svg width="64" height="28" viewBox="0 0 64 28" aria-label="Micheline" role="img">
      <path d="M4 20 Q4 9 16 8 H50 Q60 9 60 20 Z" fill="#b3261e" />
      <path d="M4 20 Q4 15 8 13 H56 Q60 15 60 20 Z" fill="#efe6cf" />
      {[14, 22, 30, 38, 46].map((x) => <rect key={x} x={x} y="10" width="5" height="4" fill="#2b3a4f" />)}
      <circle cx="14" cy="22" r="2.6" fill="#333" /><circle cx="21" cy="22" r="2.6" fill="#333" />
      <circle cx="44" cy="22" r="2.6" fill="#333" /><circle cx="51" cy="22" r="2.6" fill="#333" />
    </svg>
  );
}

function euros(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

export interface ThemeTrial {
  theme: string;
  itemId: string;
  itemName: string;
  priceCents: number;
  owned: boolean;
}

/* Bandeau de l'essai d'habillage : il vit au niveau de la console, pour que
   l'essai tienne quand on change de page. */
export function ThemeTrialBanner({ trial, onEnd }: { trial: ThemeTrial; onEnd: () => void }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  async function buy() {
    setBusy(true);
    try {
      const { data } = await api.post("/shop/checkout", { itemId: trial.itemId });
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Impossible d'ouvrir la page de paiement", "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-navy-900 border-t-[3px] border-amber px-4 py-2.5 flex flex-wrap items-center gap-3 shadow-[0_-8px_20px_rgba(0,0,0,0.35)]" style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom, 0px))" }}>
      <span className="font-mono2 text-[10.5px] uppercase tracking-[0.14em] text-amber">Aperçu de l'habillage</span>
      <span className="font-body text-sm flex-1 min-w-[160px]">{THEMES.find((t) => t.id === trial.theme)?.label ?? trial.theme} : parcourez la console pour le voir partout.</span>
      {!trial.owned && (
        <button onClick={buy} disabled={busy} className="px-3 py-1.5 bg-amber text-onaccent font-mono2 text-[11px] uppercase disabled:opacity-50">
          Acheter · {euros(trial.priceCents)}
        </button>
      )}
      <button onClick={onEnd} className="px-3 py-1.5 border border-line text-offwhite font-mono2 text-[11px] uppercase">
        Revenir à mon habillage
      </button>
    </div>
  );
}

export function ShopSection({
  onChange,
  company,
  grade,
  onTryTheme,
  initialItem,
  onOpenMuseum,
}: {
  onOpenMuseum?: () => void; // 2.1
  onChange: () => void;
  initialItem?: string | null;
  company?: PreviewCompany;
  grade?: string;
  onTryTheme?: (trial: ThemeTrial | null) => void;
}) {
  const [data, setData] = useState<ShopData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // 2.0 : l'aperçu s'ouvre seulement si l'on vient pour un objet précis (retour de paiement)
  const [selectedId, setSelectedId] = useState<string | null>(initialItem && !initialItem.startsWith("dlc-") && !initialItem.startsWith("pass-") ? initialItem : null);

  const { showToast } = useToast();

  async function load() {
    try {
      const { data } = await api.get("/shop");
      setData(data);
    } catch {
      setData(null);
    }
  }

  useEffect(() => {
    load();
  }, []);


  async function buy(item: ShopItem) {
    setBusy(item.id);
    try {
      const { data } = await api.post("/shop/checkout", { itemId: item.id });
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Impossible d'ouvrir la page de paiement", "error");
      setBusy(null);
    }
  }

  // 2.1 : le réseau du joueur, pour l'affiche
  const [myLines, setMyLines] = useState<string[][]>([]);
  useEffect(() => {
    api
      .get("/lines")
      .then(({ data }) => setMyLines((data as { departureStation: string; arrivalStation: string; stops?: string[] }[]).map((l) => [l.departureStation, ...(l.stops ?? []), l.arrivalStation])))
      .catch(() => setMyLines([]));
  }, []);

  /* 2.1 : ce qui se porte autrement qu'en changeant la compagnie */
  async function special(s: ShowroomSpecial) {
    try {
      if (s.type === "museum") return onOpenMuseum?.();
      if (s.type === "plates") {
        const { data } = await api.get("/trains");
        const trains = data as { id: string }[];
        for (const t of trains) await api.post("/trains/plate", { trainId: t.id, style: s.style }).catch(() => {});
        showToast(`Plaques ${PLATE_STYLE_LABELS[s.style]?.toLowerCase() ?? ""} posées sur ${trains.length} rame${trains.length > 1 ? "s" : ""}`);
      }
      if (s.type === "alliance") {
        await api.post("/alliance/livery", { livery: s.color });
        await api.patch("/company", { liveryColor: s.color });
        showToast("Livrée commune peinte : chaque membre peut la porter");
      }
      await load();
      onChange();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Impossible d'appliquer ce choix", "error");
    }
  }

  async function equip(patch: Record<string, string | null>, message: string) {
    try {
      await api.patch("/company", patch);
      if (typeof patch.theme === "string") {
        applyTheme(patch.theme as ThemeId);
        onTryTheme?.(null); // l'habillage est porté : l'essai n'a plus lieu d'être
      }
      showToast(message);
      await load();
      onChange();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Impossible d'appliquer ce choix", "error");
    }
  }

  if (!data) return <p className="text-sm text-slate2 font-body">Ouverture de la boutique…</p>;

  const owned = data.items.filter((i) => i.owned);
  const extensions = data.items.filter((i) => i.kind === "DLC");
  const byId = new Map(data.items.map((i) => [i.id, i]));
  /* 2.0 : la boutique du jour. Un serveur plus ancien n'envoie pas de
     rotation : on retombe alors sur l'ancien catalogue complet. */
  const rot = data.rotation;
  const rest = data.items.filter((i) => i.kind !== "DLC" && i.kind !== "SAISON");
  const featured = rot ? (rot.featured.map((id) => byId.get(id)).filter(Boolean) as ShopItem[]) : rest.slice(0, 2);
  const daily = rot ? (rot.daily.map((id) => byId.get(id)).filter(Boolean) as ShopItem[]) : rest.slice(2);
  const limited = data.items.filter((i) => i.kind === "SAISON" && (!i.owned || i.availableUntil));
  const preview = selectedId ? byId.get(selectedId) ?? null : null;
  const focusDlc = extensions.find((i) => i.id === initialItem)?.id ?? null;

  const me: PreviewCompany = company ?? { name: "Votre compagnie", liveryColor: data.equipped.livery, emblem: data.equipped.emblem, title: data.equipped.title };

  return (
    <div>
      {/* 2.0 : la boutique du jour */}
      <section className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-[26px] leading-tight">Boutique du jour</h2>
            <p className="text-[13.5px] text-slate2 font-body mt-1 max-w-[62ch]">
              Deux objets à la une, six du jour. Tout change chaque nuit à minuit, et ce qui part revient quelques jours plus tard.
            </p>
          </div>
          {rot && <RefreshCountdown at={rot.refreshAt} />}
        </div>

        <div className="grid gap-4 lg:grid-cols-2 mb-4">
          {featured.map((item) => (
            <FeaturedCard
              key={item.id}
              item={item}
              enabled={data.enabled}
              busy={busy !== null}
              onBuy={() => buy(item)}
              onPreview={() => setSelectedId(item.id)}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...limited, ...daily].map((item) => (
            <ShopTile key={item.id} item={item} selected={false} onSelect={() => setSelectedId(item.id)} cabPreview={(id) => <CabSkinPreview id={id} />} />
          ))}
        </div>
        {data.nextSeason && (
          <p className="mt-4 text-[13px] font-body text-slate2">
            Prochaine édition limitée : <span className="text-offwhite">{data.nextSeason.itemName}</span>, pendant {data.nextSeason.name.toLowerCase()}, à
            partir du {new Date(data.nextSeason.startsAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.
          </p>
        )}
      </section>

      {/* toujours en vente */}
      <section className="mb-10">
        <h2 className="font-display text-[22px] mb-1">Toujours en boutique</h2>
        <p className="text-sm text-slate2 font-body max-w-[66ch] mb-4">
          Le Pass de la saison et les extensions ne tournent pas : ils restent en vente tout le temps.
        </p>
        <div className="mb-4">
          <SeasonPass companyName={company?.name ?? "Votre compagnie"} compact onChange={onChange} />
        </div>
        {extensions.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {extensions.map((x) => (
              <ExtensionCard key={x.id} item={x} focused={focusDlc === x.id} enabled={data.enabled} busy={busy !== null} onBuy={() => buy(x)} />
            ))}
          </div>
        )}
        <p className="text-[13px] text-slate2 font-body max-w-[64ch] mt-4">
          Aucun objet ne rapporte une pièce, n'accélère un chantier ou ne change le classement : une compagnie gratuite peut toujours finir première.
        </p>
      </section>

      {/* l'aperçu d'un objet, par-dessus la page : on ne perd plus sa place dans la boutique */}
      {preview && (
        <PreviewModal onClose={() => setSelectedId(null)} title={preview.name}>
          <ShopShowroom
            key={preview.id}
            item={preview}
            onSpecial={special}
            company={{
              ...me,
              liveryColor: data.equipped.livery || me.liveryColor,
              emblem: data.equipped.emblem,
              title: data.equipped.title,
              cabSkin: data.equipped.cabSkin ?? null,
              theme: data.equipped.theme,
              plate: data.equipped.plate ?? null,
              stationSkin: data.equipped.stationSkin ?? null,
              soundPack: data.equipped.soundPack ?? null,
              uniform: data.equipped.uniform ?? null,
              lines: myLines,
            }}
            cabLabels={CAB_SKIN_LABELS}
            enabled={data.enabled}
            busy={busy !== null}
            onBuy={() => buy(preview)}
            onEquip={equip}
            onTryTheme={(theme) => onTryTheme?.({ theme, itemId: preview.id, itemName: preview.name, priceCents: preview.priceCents, owned: preview.owned })}
          />
        </PreviewModal>
      )}

      {/* titres de carrière ou de parrainage : à porter même sans rien avoir acheté */}
      {(owned.length > 0 || data.unlocked.titles.length > 0 || (data.unlocked.plates?.length ?? 0) > 0) && (
        <section className="border-t border-line pt-6">
          <h2 className="font-display text-xl mb-1">Ce que vous portez</h2>
          <p className="text-[12.5px] text-slate2 font-body mb-5">
            Changer d'emblème ou de titre est gratuit et se fait autant de fois que vous voulez.
          </p>

          {data.unlocked.emblems.length > 0 && (
            <div className="mb-6">
              <h3 className="font-mono2 text-[11px] text-slate2 uppercase tracking-[0.14em] mb-2">Emblème</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => equip({ emblem: null }, "Emblème retiré")}
                  className={`px-3 py-2 border font-mono2 text-[11px] uppercase ${
                    data.equipped.emblem === null ? "border-cobalt text-cobalt" : "border-line text-slate2"
                  }`}
                >
                  Aucun
                </button>
                {data.unlocked.emblems.map((e) => (
                  <button
                    key={e}
                    onClick={() => equip({ emblem: e }, `${EMBLEM_LABELS[e] ?? e} porté`)}
                    title={EMBLEM_LABELS[e] ?? e}
                    className={`px-3 py-2 border flex items-center gap-2 font-body text-[12.5px] ${
                      data.equipped.emblem === e ? "border-cobalt text-cobalt" : "border-line hover:border-slate2"
                    }`}
                  >
                    <Emblem id={e} size={15} />
                    {EMBLEM_LABELS[e] ?? e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {data.unlocked.titles.length > 0 && (
            <div className="mb-6">
              <h3 className="font-mono2 text-[11px] text-slate2 uppercase tracking-[0.14em] mb-2">Titre au classement</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => equip({ title: null }, "Titre retiré")}
                  className={`px-3 py-2 border font-mono2 text-[11px] uppercase ${
                    data.equipped.title === null ? "border-cobalt text-cobalt" : "border-line text-slate2"
                  }`}
                >
                  Aucun
                </button>
                {data.unlocked.titles.map((t) => (
                  <button
                    key={t}
                    onClick={() => equip({ title: t }, `Titre « ${t} » affiché`)}
                    className={`px-3 py-2 border font-body text-[12.5px] ${
                      data.equipped.title === t ? "border-cobalt text-cobalt" : "border-line hover:border-slate2"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(data.unlocked.cabSkins?.length ?? 0) > 0 && (
            <div className="mb-6">
              <h3 className="font-mono2 text-[11px] text-slate2 uppercase tracking-[0.14em] mb-2">Matériel en vue cabine</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => equip({ cabSkin: null }, "Vos rames reprennent leur allure")}
                  className={`px-3 py-2 border font-mono2 text-[11px] uppercase ${
                    !data.equipped.cabSkin ? "border-cobalt text-cobalt" : "border-line text-slate2"
                  }`}
                >
                  Vos rames
                </button>
                {data.unlocked.cabSkins!.map((c) => (
                  <button
                    key={c}
                    onClick={() => equip({ cabSkin: c }, `${CAB_SKIN_LABELS[c] ?? c} en vue cabine`)}
                    className={`px-3 py-1.5 border flex items-center gap-2 font-body text-[12.5px] ${
                      data.equipped.cabSkin === c ? "border-cobalt text-cobalt" : "border-line hover:border-slate2"
                    }`}
                  >
                    <CabSkinPreview id={c} />
                    {CAB_SKIN_LABELS[c] ?? c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(data.unlocked.plates?.length ?? 0) > 0 && (
            <div className="mb-6">
              <h3 className="font-mono2 text-[11px] text-slate2 uppercase tracking-[0.14em] mb-2">Plaque au classement</h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => equip({ plate: null }, "Plaque retirée")}
                  className={`px-3 py-2 border font-mono2 text-[11px] uppercase ${!data.equipped.plate ? "border-cobalt text-cobalt" : "border-line text-slate2"}`}
                >
                  Aucune
                </button>
                {data.unlocked.plates!.map((p) => (
                  <button
                    key={p}
                    onClick={() => equip({ plate: p }, `Plaque ${PLATE_LABELS[p]?.toLowerCase() ?? p} posée`)}
                    className={`px-2.5 py-1.5 border ${data.equipped.plate === p ? "border-cobalt" : "border-line hover:border-slate2"}`}
                  >
                    <Plate plate={p}>
                      <span className="font-body text-[12.5px]">{me.name}</span>
                    </Plate>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2.1 : l'atelier de prestige */}
          {(data.unlocked.stationSkins?.length ?? 0) > 0 && (
            <WearRow
              title="Gares en vue cabine"
              none="Gares d'origine"
              current={data.equipped.stationSkin ?? null}
              list={data.unlocked.stationSkins!}
              labels={STATION_SKIN_LABELS}
              onPick={(v) => equip({ stationSkin: v }, v ? `Gares ${STATION_SKIN_LABELS[v]?.toLowerCase()} en vue cabine` : "Gares d'origine")}
            />
          )}
          {(data.unlocked.sounds?.length ?? 0) > 0 && (
            <WearRow
              title="Son d'arrivée en gare"
              none="Carillon d'origine"
              current={data.equipped.soundPack ?? null}
              list={data.unlocked.sounds!}
              labels={SOUND_LABELS}
              onPick={(v) => {
                if (v) playPack(v as SoundPack);
                void equip({ soundPack: v }, v ? `${SOUND_LABELS[v]} à l'arrivée en gare` : "Carillon d'origine");
              }}
            />
          )}
          {(data.unlocked.uniforms?.length ?? 0) > 0 && (
            <WearRow
              title="Tenue du personnel"
              none="Tenue de base"
              current={data.equipped.uniform ?? null}
              list={data.unlocked.uniforms!}
              labels={UNIFORM_LABELS}
              render={(v) => <StaffFigure uniform={v} seed="Odette Morel" size={30} />}
              onPick={(v) => equip({ uniform: v }, v ? `Tenues ${UNIFORM_LABELS[v]?.toLowerCase()} pour tout le personnel` : "Tenue de base")}
            />
          )}
          {(data.unlocked.trainPlates?.length ?? 0) > 0 && (
            <div className="mb-6">
              <h3 className="font-mono2 text-[11px] text-slate2 uppercase tracking-[0.14em] mb-2">Plaques de rame</h3>
              <div className="flex flex-wrap items-center gap-2">
                {data.unlocked.trainPlates!.map((p) => (
                  <button key={p} onClick={() => special({ type: "plates", style: p })} className="px-2 py-1.5 border border-line hover:border-slate2" title="Poser sur toutes mes rames">
                    <NamePlate style={p} className="text-[11px]">
                      {PLATE_STYLE_LABELS[p]}
                    </NamePlate>
                  </button>
                ))}
                <span className="text-[12px] font-body text-slate2">Un clic pose la plaque sur toutes vos rames ; chaque rame se règle aussi dans son atelier.</span>
              </div>
            </div>
          )}
          {((data.unlocked.posters?.length ?? 0) > 0 || data.unlocked.museum) && (
            <div className="mb-6 flex flex-wrap gap-2">
              {(data.unlocked.posters?.length ?? 0) > 0 && (
                <button onClick={() => setSelectedId("affiche-reseau")} className="px-3 py-2 border border-line hover:border-slate2 font-body text-[13px]">
                  Télécharger mon affiche ({data.unlocked.posters!.map((p) => POSTER_LABELS[p as keyof typeof POSTER_LABELS] ?? p).join(", ")})
                </button>
              )}
              {data.unlocked.museum && onOpenMuseum && (
                <button onClick={onOpenMuseum} className="px-3 py-2 border border-line hover:border-slate2 font-body text-[13px]">
                  Ouvrir mon musée
                </button>
              )}
            </div>
          )}

          {data.unlocked.liveries.length > 0 && (
            <div className="mb-6">
              <h3 className="font-mono2 text-[11px] text-slate2 uppercase tracking-[0.14em] mb-2">Livrées débloquées</h3>
              <div className="flex flex-wrap gap-2">
                {data.unlocked.liveries.map((c) => (
                  <button
                    key={c}
                    onClick={() => equip({ liveryColor: c }, "Livrée appliquée")}
                    title={c}
                    className={`w-9 h-9 border-2 ${
                      data.equipped.livery.toLowerCase() === c ? "border-offwhite" : "border-line hover:border-slate2"
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* 2.0 : une extension, présentée comme une affiche de ligne : ce qu'elle
   ajoute au jeu, le matériel, les gares, et le prix. */
function ExtensionCard({ item, focused, enabled, busy, onBuy }: { item: ShopItem; focused: boolean; enabled: boolean; busy: boolean; onBuy: () => void }) {
  const d = item.dlc!;
  const mountain = item.id === "dlc-montagne";
  const price = (item.priceCents / 100).toFixed(2).replace(".", ",");
  return (
    <article className={`border ${focused ? "border-amber" : "border-line"} bg-navy-900/60 flex flex-col`} id={`ext-${item.id}`}>
      <div className="relative h-[150px] overflow-hidden border-b border-line" aria-hidden="true">
        {mountain ? <MountainArt /> : <LegendArt />}
        <div className="absolute inset-x-0 bottom-0">
          <TrainPicture model={mountain ? "CREMAILLERE" : "VAPEUR"} livery="#d4a017" height={mountain ? 100 : 104} fit={false} align={mountain ? "center" : "right"} label={item.name} />
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-[21px] leading-tight">{item.name}</h3>
          <span className="text-[13px] font-body text-slate2">{d.tagline}</span>
        </div>
        <p className="text-[13.5px] text-slate2 font-body mt-2">{item.description}</p>
        <ul className="mt-3 space-y-1.5">
          {d.models.map((m) => (
            <li key={m.id} className="text-[13.5px] font-body">
              <span className="text-offwhite font-semibold">Rame {m.label}.</span> <span className="text-slate2">{m.blurb}</span>
            </li>
          ))}
          {d.stations.length > 0 && (
            <li className="text-[13.5px] font-body">
              <span className="text-offwhite font-semibold">Gares.</span> <span className="text-slate2">{d.stations.join(", ")}.</span>
            </li>
          )}
          {d.features
            .filter((f) => !/rames? exclusives?|Rame à crémaillère|gares d'altitude/i.test(f))
            .map((f) => (
              <li key={f} className="text-[13.5px] font-body text-slate2">{f}</li>
            ))}
        </ul>
        <div className="mt-auto pt-4 flex flex-wrap items-center gap-3">
          {item.owned ? (
            <span className="text-[14px] font-body text-rail-green">Dans votre compagnie</span>
          ) : item.includedInPremium ? (
            <span className="text-[14px] font-body text-rail-green">Incluse dans votre Premium</span>
          ) : (
            <>
              <button
                onClick={onBuy}
                disabled={!enabled || busy}
                className="text-[14.5px] font-semibold font-body bg-amber text-onaccent px-4 py-2.5 hover:brightness-110 disabled:opacity-50"
              >
                Ajouter l'extension, {price} €
              </button>
              {d.premium && <span className="text-[13px] font-body text-slate2">ou incluse dans le Premium</span>}
              <GiftButton itemName={`l'extension « ${item.name} »`} priceLabel={price} itemId={item.id} className="ml-auto" />
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function LegendArt() {
  return (
    <svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
      <defs>
        <linearGradient id="lg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3c98b" />
          <stop offset="1" stopColor="#f8e6c4" />
        </linearGradient>
      </defs>
      <rect width="400" height="120" fill="url(#lg-sky)" />
      <circle cx="90" cy="44" r="20" fill="#fff4dc" opacity="0.9" />
      <path d="M0 86 C70 70 130 88 210 78 S330 66 400 80 V120 H0 Z" fill="#c9a26b" opacity="0.7" />
      <path d="M0 98 C90 90 170 102 260 94 S360 90 400 96 V120 H0 Z" fill="#8f7a52" opacity="0.8" />
    </svg>
  );
}

function MountainArt() {
  return (
    <svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
      <defs>
        <linearGradient id="mt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fb0d8" />
          <stop offset="1" stopColor="#d9e8f2" />
        </linearGradient>
      </defs>
      <rect width="400" height="120" fill="url(#mt-sky)" />
      <path d="M0 96 L60 42 L96 66 L160 10 L222 70 L276 30 L336 78 L400 46 V120 H0 Z" fill="#8aa1b8" />
      <path d="M140 28 L160 10 L180 28 L170 26 L162 34 L152 26 Z M264 40 L276 30 L289 42 L280 40 Z M50 50 L60 42 L70 52 L62 50 Z" fill="#f8fafc" />
      <path d="M0 104 C80 92 150 106 240 96 S350 92 400 98 V120 H0 Z" fill="#5f8f69" />
    </svg>
  );
}

/* ---------- 2.0 : la boutique du jour ---------- */

function RefreshCountdown({ at }: { at: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(id);
  }, []);
  const ms = Math.max(0, new Date(at).getTime() - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return (
    <div className="flex items-center gap-3" aria-label={`Nouvelle boutique dans ${h} h ${m} min`}>
      <span className="text-[13px] font-body text-slate2 text-right leading-tight">Nouvelle boutique<br />dans</span>
      <SplitFlap value={`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`} size="md-compact" />
    </div>
  );
}

const KIND_NAME: Record<string, string> = {
  LIVREES: "Livrées",
  EMBLEMES: "Emblèmes",
  TITRES: "Titres",
  THEME: "Habillage de la console",
  CABINE: "Matériel en vue cabine",
  SAISON: "Édition limitée",
  COFFRET: "Coffret",
  PLAQUE: "Plaques d'honneur",
  // 2.1
  AFFICHE: "Affiche de votre réseau",
  PLAQUE_RAME: "Plaques de rame",
  SONS: "Sons de gare",
  GARE: "Habillage de gare",
  MUSEE: "Musée de la compagnie",
  TENUES: "Tenues du personnel",
  ALLIANCE: "Coffret d'alliance",
};

function FeaturedCard({ item, enabled, busy, onBuy, onPreview }: { item: ShopItem; enabled: boolean; busy: boolean; onBuy: () => void; onPreview: () => void }) {
  const tint = item.liveries?.[0] ?? (item.kind === "THEME" ? "#2a4a7a" : item.kind === "PLAQUE" ? "#8a6a1e" : "#24324a");
  const price = euros(item.priceCents);
  const hasTrain = (item.liveries?.length ?? 0) > 0 || (item.cabSkins?.length ?? 0) > 0;
  const theme = item.theme ? THEMES.find((t) => t.id === item.theme) : null;
  return (
    <article className="border border-line bg-navy-900/60 flex flex-col overflow-hidden">
      <button onClick={onPreview} className="relative h-[190px] overflow-hidden text-left group" aria-label={`Voir ${item.name} en vitrine`}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 70% 110%, ${tint}99, transparent 65%), linear-gradient(180deg, #0f1726, #0b0f19)` }} />
        {/* 2.1 : l'atelier de prestige */}
        {PRESTIGE_KINDS.has(item.kind) && <PrestigeThumb item={item} big />}
        <span className="absolute z-10 top-3 left-3 text-[12px] font-body text-amber">À la une</span>
        {item.owned && <span className="absolute z-10 top-3 right-3 text-[12px] font-body text-rail-green">Possédé</span>}
        {hasTrain && (
          <div className="absolute inset-x-0 bottom-0">
            <TrainPicture
              livery={item.liveries?.[0] ?? "#4f7fa3"}
              skin={item.cabSkins?.[0] ?? null}
              model={item.kind === "COFFRET" && !item.cabSkins?.length ? "EXPRESS" : undefined}
              height={128}
              fit={false}
              align="right"
              label={item.name}
            />
          </div>
        )}
        {!hasTrain && item.emblems && !PRESTIGE_KINDS.has(item.kind) && (
          <div className="absolute inset-0 flex items-center justify-center gap-4 text-offwhite">
            {item.emblems.slice(0, 6).map((e) => (
              <span key={e} className="w-14 h-14 rounded-full bg-[#0b2a4a] border border-white/70 inline-flex items-center justify-center">
                <Emblem id={e} size={28} />
              </span>
            ))}
          </div>
        )}
        {!hasTrain && !item.emblems && item.titles && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {item.titles.slice(0, 3).map((t) => (
              <span key={t} className="bg-[#0b2a4a] border-2 border-[#e8edf5] px-3 py-1 font-mono2 text-[12px] uppercase tracking-wide text-[#f4d06f]">{t}</span>
            ))}
          </div>
        )}
        {theme && (
          <div className="absolute inset-0 flex items-center justify-center">
            {theme.swatch.map((c) => <span key={c} className="w-16 h-24 border border-white/20 -ml-px" style={{ background: c }} />)}
          </div>
        )}
        {item.plates && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {item.plates.map((p) => (
              <Plate key={p} plate={p} className="text-[15px] font-body">
                Votre compagnie
              </Plate>
            ))}
          </div>
        )}
        {item.emblems && hasTrain && (
          <div className="absolute top-9 left-3 flex gap-1.5 text-offwhite">
            {item.emblems.map((e) => (
              <span key={e} className="w-8 h-8 rounded-full bg-[#0b2a4a] border border-white/70 inline-flex items-center justify-center"><Emblem id={e} size={16} /></span>
            ))}
          </div>
        )}
      </button>
      <div className="p-4 flex flex-col gap-2 flex-1 border-t border-line">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12.5px] font-body text-slate2">{KIND_NAME[item.kind] ?? item.kind}</div>
            <h3 className="font-display text-[22px] leading-tight">{item.name}</h3>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono2 text-[18px] text-amber">{item.owned ? "Possédé" : price}</div>
            {!item.owned && item.worthCents && item.worthCents > item.priceCents && <div className="font-mono2 text-[11.5px] text-slate2 line-through">{euros(item.worthCents)}</div>}
          </div>
        </div>
        <p className="text-[13.5px] text-slate2 font-body line-clamp-2">{item.description}</p>
        <div className="mt-auto pt-2 flex flex-wrap items-center gap-3">
          <button onClick={onPreview} className="text-[14px] font-body text-cobalt border border-cobalt/40 px-3 py-2 hover:bg-cobalt/10">
            {item.owned ? "Porter" : "Essayer en vitrine"}
          </button>
          {!item.owned && enabled && <GiftButton itemName={item.name} priceLabel={price} itemId={item.id} />}
          {!item.owned && (
            <button onClick={onBuy} disabled={!enabled || busy} className="ml-auto bg-amber text-onaccent px-4 py-2 text-[14.5px] font-semibold font-body hover:brightness-110 disabled:opacity-50">
              {!enabled ? "Bientôt" : busy ? "Ouverture…" : `Acheter, ${price}`}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function PreviewModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // la page derrière ne défile pas pendant l'aperçu
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return createPortal(
    <div data-modal className="fixed inset-0 z-[70] bg-black/70 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div className="modal-free w-full max-w-5xl relative" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Aperçu : ${title}`}>
        <button onClick={onClose} className="absolute -top-1 right-0 sm:-right-2 z-10 text-white/80 hover:text-white text-[28px] leading-none px-2" aria-label="Fermer l'aperçu">
          ×
        </button>
        <div className="pt-8 sm:pt-0">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/* 2.1 : une rangée « ce que vous portez » pour l'atelier de prestige */
function WearRow({ title, none, current, list, labels, onPick, render }: { title: string; none: string; current: string | null; list: string[]; labels: Record<string, string>; onPick: (v: string | null) => void; render?: (v: string) => React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="font-mono2 text-[11px] text-slate2 uppercase tracking-[0.14em] mb-2">{title}</h3>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onPick(null)} className={`px-3 py-2 border font-mono2 text-[11px] uppercase ${!current ? "border-cobalt text-cobalt" : "border-line text-slate2"}`}>
          {none}
        </button>
        {list.map((v) => (
          <button key={v} onClick={() => onPick(v)} className={`px-3 py-1.5 border flex items-center gap-2 font-body text-[12.5px] ${current === v ? "border-cobalt text-cobalt" : "border-line hover:border-slate2"}`}>
            {render?.(v)}
            {labels[v] ?? v}
          </button>
        ))}
      </div>
    </div>
  );
}
