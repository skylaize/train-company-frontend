import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Emblem, EMBLEM_LABELS } from "./Emblem";
import { applyTheme, ThemeId, THEMES } from "../theme";
import { ShopShowroom, ShopTile, ShowroomCompany as PreviewCompany } from "./ShopShowroom";

/* ============================================================
   Boutique.

   Deux gestes par objet, et la page les sépare nettement : l'ACHETER (une
   fois, par Stripe) puis le PORTER (autant de fois qu'on veut, gratuitement).
   Posséder un emblème ne l'impose pas — on choisit lequel on porte, ou aucun.
   ============================================================ */

interface ShopItem {
  id: string;
  kind: "LIVREES" | "EMBLEMES" | "TITRES" | "THEME" | "CABINE" | "SAISON";
  name: string;
  description: string;
  priceCents: number;
  liveries?: string[];
  emblems?: string[];
  titles?: string[];
  theme?: string;
  cabSkins?: string[];
  owned: boolean;
  // 1.5 : édition limitée de saison
  season?: string;
  seasonName?: string | null;
  availableUntil?: string | null;
}

interface ShopData {
  enabled: boolean;
  items: ShopItem[];
  equipped: { emblem: string | null; title: string | null; theme: string; livery: string; cabSkin?: string | null };
  unlocked: { emblems: string[]; titles: string[]; themes: string[]; liveries: string[]; cabSkins?: string[] };
  nextSeason?: { name: string; itemName: string; startsAt: string } | null;
}

function daysUntil(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export const CAB_SKIN_LABELS: Record<string, string> = {
  vapeur: "Locomotive à vapeur",
  micheline: "Micheline",
};

/* Petite silhouette du matériel de collection, pour voir ce qu'on achète. */
function CabSkinPreview({ id }: { id: string }) {
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
}: {
  onChange: () => void;
  initialItem?: string | null;
  company?: PreviewCompany;
  grade?: string;
  onTryTheme?: (trial: ThemeTrial | null) => void;
}) {
  const [data, setData] = useState<ShopData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialItem ?? null);

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
  // éditions limitées d'abord, puis ce qu'on n'a pas encore, puis le reste
  const sorted = [...data.items].sort(
    (a, b) =>
      Number(b.kind === "SAISON" && !b.owned) - Number(a.kind === "SAISON" && !a.owned) || Number(a.owned) - Number(b.owned)
  );
  const showcased = sorted.find((i) => i.id === selectedId) ?? sorted[0] ?? null;

  const me: PreviewCompany = company ?? { name: "Votre compagnie", liveryColor: data.equipped.livery, emblem: data.equipped.emblem, title: data.equipped.title };

  return (
    <div>
      <p className="text-sm text-slate2 font-body max-w-[64ch] mb-5">
        Chaque objet s'achète une fois et reste à votre compagnie. Aucun ne rapporte une pièce, n'accélère un
        chantier ou ne change le classement : une compagnie gratuite peut toujours finir première.
      </p>

      {data.nextSeason && (
        <p className="border border-line px-4 py-2.5 mb-4 text-[12.5px] font-body text-slate2">
          Prochaine édition limitée : <span className="text-offwhite">{data.nextSeason.itemName}</span>, pendant {data.nextSeason.name.toLowerCase()}, à
          partir du {new Date(data.nextSeason.startsAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.
        </p>
      )}

      {/* vitrine : la rame du joueur, avec l'article choisi dessus */}
      {showcased && (
        <ShopShowroom
          item={showcased}
          company={{ ...me, liveryColor: data.equipped.livery || me.liveryColor, emblem: data.equipped.emblem, title: data.equipped.title, cabSkin: data.equipped.cabSkin ?? null, theme: data.equipped.theme }}
          cabLabels={CAB_SKIN_LABELS}
          enabled={data.enabled}
          busy={busy !== null}
          onBuy={() => buy(showcased)}
          onEquip={equip}
          onTryTheme={(theme) =>
            onTryTheme?.({ theme, itemId: showcased.id, itemName: showcased.name, priceCents: showcased.priceCents, owned: showcased.owned })
          }
        />
      )}

      <h2 className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-slate2 mb-3">Articles · cliquez pour mettre en vitrine</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-10">
        {sorted.map((item) => (
          <ShopTile
            key={item.id}
            item={item}
            selected={showcased?.id === item.id}
            onSelect={() => { setSelectedId(item.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            cabPreview={(id) => <CabSkinPreview id={id} />}
          />
        ))}
      </div>

      {/* titres de carrière ou de parrainage : à porter même sans rien avoir acheté */}
      {(owned.length > 0 || data.unlocked.titles.length > 0) && (
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
