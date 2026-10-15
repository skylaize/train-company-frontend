import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import { TrainPicture } from "./TrainPicture";
import { Emblem, EMBLEM_LABELS } from "./Emblem";
import { Plate, PLATE_LABELS } from "./Plate";
import { CAB_SKIN_LABELS } from "./ShopSection";
import { THEMES, applyTheme, type ThemeId } from "../theme";
import { playChime, playCouple, vibrate } from "../sfx";

/* ============================================================
   2.0 : le déballage. Après un achat (ou un cadeau reçu), l'objet arrive
   en gare : un trait de lumière balaie le quai, l'objet surgit dans un
   éclat, les confettis de composteur retombent. Le Premium a sa propre
   scène : le billet de première classe, composté devant vous.
   Le serveur garde la liste de ce qui reste à déballer : l'animation joue
   même si le paiement a été fait sur un autre appareil, ou par un ami.
   ============================================================ */

export interface RevealItem {
  id: string;
  kind: string;
  name: string;
  description?: string;
  liveries?: string[];
  emblems?: string[];
  titles?: string[];
  theme?: string;
  cabSkins?: string[];
  plates?: string[];
  dlc?: { tagline: string; models: { id: string; label: string }[] };
}
export type Reveal =
  | { type: "item"; purchaseId: string; giftFrom: string | null; item: RevealItem }
  | { type: "premium"; giftFrom: string | null };

export async function fetchReveals(): Promise<Reveal[]> {
  try {
    const { data } = await api.get("/shop/reveals");
    const out: Reveal[] = [];
    if (data?.premium) out.push({ type: "premium", giftFrom: data.premium.giftFrom ?? null });
    for (const r of data?.items ?? []) out.push({ type: "item", purchaseId: r.purchaseId, giftFrom: r.giftFrom ?? null, item: r.item });
    return out;
  } catch {
    return [];
  }
}

export function markSeen(r: Reveal) {
  void api
    .post("/shop/reveals/seen", r.type === "premium" ? { premium: true } : { purchaseIds: [r.purchaseId] })
    .catch(() => undefined);
}

const KIND_LINE: Record<string, [string, string]> = {
  LIVREES: ["Nouvelles livrées", "Nouvelle livrée"],
  EMBLEMES: ["Nouveaux emblèmes", "Nouvel emblème"],
  TITRES: ["Nouveaux titres", "Nouveau titre"],
  THEME: ["Nouvel habillage", "Nouvel habillage"],
  CABINE: ["Matériel de collection", "Matériel de collection"],
  SAISON: ["Édition limitée", "Édition limitée"],
  COFFRET: ["Coffret", "Coffret"],
  PLAQUE: ["Plaques d'honneur", "Plaque d'honneur"],
  DLC: ["Extension", "Extension"],
  PASS: ["Pass de saison", "Pass de saison"],
  SANS_PUB: ["Billet sans pub", "Billet sans pub"],
};

const GOLD = "#e0b44a";

function accentOf(item: RevealItem) {
  if (item.kind === "DLC") return item.id === "dlc-montagne" ? "#7fb2d9" : GOLD;
  if (item.kind === "PASS") return "#f59e0b";
  if (item.liveries?.length) return item.liveries[0];
  if (item.kind === "PLAQUE") return "#c98a4b";
  if (item.kind === "TITRES") return "#f4d06f";
  return "#5b8fd6";
}

/* la luminosité d'une couleur : une livrée trop sombre éteindrait l'éclat */
function brighten(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (l > 0.35) return hex;
  const k = 0.45;
  const mix = (c: number) => Math.round(c + (255 - c) * k);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function wearPatch(item: RevealItem): { patch: Record<string, string>; label: string } | null {
  if (item.kind === "DLC" || item.kind === "PASS" || item.kind === "SANS_PUB") return null;
  const patch: Record<string, string> = {};
  if (item.theme) patch.theme = item.theme;
  if (item.liveries?.[0]) patch.liveryColor = item.liveries[0];
  if (item.emblems?.[0]) patch.emblem = item.emblems[0];
  if (item.titles?.[0]) patch.title = item.titles[0];
  if (item.cabSkins?.[0]) patch.cabSkin = item.cabSkins[0];
  if (item.plates?.[0]) patch.plate = item.plates[0];
  if (!Object.keys(patch).length) return null;
  return { patch, label: item.kind === "THEME" ? "Appliquer l'habillage" : "Porter maintenant" };
}

/* ---------- ce qui surgit au centre ---------- */
function Hero({ item, companyName, liveryColor }: { item: RevealItem; companyName: string; liveryColor: string }) {
  if (item.kind === "DLC") {
    const legend = item.id !== "dlc-montagne";
    return (
      <div className="w-[min(720px,92vw)]">
        <TrainPicture model={legend ? "VAPEUR" : "CREMAILLERE"} livery={legend ? "#24493a" : liveryColor} lit height={156} track fit />
      </div>
    );
  }
  if (item.kind === "PASS" || item.kind === "SANS_PUB") {
    const pass = item.kind === "PASS";
    return (
      <div className="w-[min(340px,80vw)] bg-[#f3ecd9] text-[#1c1a17] shadow-[6px_6px_0_rgba(0,0,0,0.45)] relative">
        <div className="h-2" style={{ background: pass ? "#f59e0b" : "#2f7d5b" }} />
        <div className="px-5 py-4">
          <div className="font-mono2 text-[11px] text-[#6b6255]">Réseau · billet {pass ? "de saison" : "permanent"}</div>
          <div className="font-display text-[26px] leading-tight mt-1">{pass ? "Pass de saison" : "Sans publicité"}</div>
          <div className="font-body text-[13.5px] text-[#4a443b] mt-1">
            {pass ? "Trente paliers, une récompense à chaque étape." : "Plus une seule publicité, nulle part."}
          </div>
          <div className="mt-3 border-t border-dashed border-[#b9ad95] pt-2 flex justify-between font-mono2 text-[12px]">
            <span>{companyName}</span>
            <span>Valable {pass ? "toute la saison" : "toujours"}</span>
          </div>
        </div>
        <span className="pr-punch absolute right-5 top-5 w-4 h-4 rounded-full bg-navy-950" />
      </div>
    );
  }
  if (item.cabSkins?.length) {
    return (
      <div className="w-[min(720px,92vw)]">
        <TrainPicture model="STANDARD" skin={item.cabSkins[0]} livery={liveryColor} lit height={150} track fit />
      </div>
    );
  }
  if (item.liveries?.length) {
    return (
      <div className="w-[min(720px,92vw)]">
        <TrainPicture model="EXPRESS" livery={item.liveries[0]} cars={item.liveries.slice(1, 3)} lit height={150} track fit />
      </div>
    );
  }
  if (item.emblems?.length) {
    return (
      <span className="w-36 h-36 rounded-full inline-flex items-center justify-center bg-[#0b2a4a] border-[3px] border-white/85 text-white shadow-[0_0_0_8px_rgba(255,255,255,0.06)]">
        <Emblem id={item.emblems[0]} size={72} />
      </span>
    );
  }
  if (item.plates?.length) {
    return (
      <div className="scale-[2.2] origin-center my-6">
        <Plate plate={item.plates[0]} className="text-[13px] font-body whitespace-nowrap">
          {companyName}
        </Plate>
      </div>
    );
  }
  if (item.titles?.length) {
    return (
      <span className="bg-[#0b2a4a] border-2 border-[#e8edf5]/80 px-5 py-3 font-display text-[28px] leading-tight text-[#f4d06f] text-center max-w-[80vw]">
        {item.titles[0]}
      </span>
    );
  }
  if (item.theme) {
    const t = THEMES.find((x) => x.id === item.theme);
    return (
      <div className="flex shadow-[6px_6px_0_rgba(0,0,0,0.45)]">
        {(t?.swatch ?? ["#222", "#444", "#f59e0b"]).map((c, i) => (
          <span key={i} className="w-20 h-28" style={{ background: c }} />
        ))}
      </div>
    );
  }
  return null;
}

/* ce que contient l'objet, en petites pastilles qui tombent une à une */
function Contents({ item }: { item: RevealItem }) {
  const chips: React.ReactNode[] = [];
  if (item.kind === "DLC" && item.dlc) {
    for (const m of item.dlc.models) chips.push(<span className="pr-chip-txt">{m.label}</span>);
  }
  if ((item.liveries?.length ?? 0) > 1) for (const c of item.liveries!) chips.push(<span className="w-7 h-7 border border-white/60" style={{ background: c }} />);
  if ((item.emblems?.length ?? 0) > 1 || (item.emblems?.length && item.liveries?.length))
    for (const e of item.emblems!) chips.push(<span className="w-8 h-8 rounded-full inline-flex items-center justify-center bg-[#0b2a4a] border border-white/70 text-white" title={EMBLEM_LABELS[e]}><Emblem id={e} size={16} /></span>);
  if ((item.titles?.length ?? 0) > 1 || (item.titles?.length && (item.liveries?.length || item.emblems?.length)))
    for (const t of item.titles!) chips.push(<span className="pr-chip-txt text-[#f4d06f]">{t}</span>);
  if ((item.plates?.length ?? 0) > 1) for (const p of item.plates!) chips.push(<span className="pr-chip-txt">{PLATE_LABELS[p] ?? p}</span>);
  if ((item.cabSkins?.length ?? 0) > 1) for (const c of item.cabSkins!) chips.push(<span className="pr-chip-txt">{CAB_SKIN_LABELS[c] ?? c}</span>);
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap justify-center items-center gap-2 max-w-[560px] px-4">
      {chips.slice(0, 12).map((c, i) => (
        <span key={i} className="pr-chip inline-flex" style={{ animationDelay: `${1150 + i * 90}ms` }}>
          {c}
        </span>
      ))}
    </div>
  );
}

/* confettis de composteur : de petits ronds de carton qui retombent */
function Chads({ color }: { color: string }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const a = (i / 34) * Math.PI * 2 + (i % 3) * 0.2;
        const d = 140 + ((i * 53) % 170);
        return {
          x: Math.cos(a) * d,
          y: Math.sin(a) * d * 0.7 - 40,
          s: 5 + (i % 4) * 2,
          c: i % 3 === 0 ? color : i % 3 === 1 ? "#f3ecd9" : "#f59e0b",
          r: (i * 47) % 360,
          delay: (i % 6) * 18,
        };
      }),
    [color]
  );
  return (
    <div className="absolute left-1/2 top-1/2 pointer-events-none" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className="pr-chad absolute rounded-full"
          style={{ width: b.s, height: b.s, background: b.c, ["--x" as string]: `${b.x}px`, ["--y" as string]: `${b.y}px`, ["--r" as string]: `${b.r}deg`, animationDelay: `${520 + b.delay}ms` }}
        />
      ))}
    </div>
  );
}

const PERKS = [
  "L'extension « Trains de légende » : la vapeur et le grand luxe",
  "Revente de vos rames, avec la cote du jour et le meilleur jour pour vendre",
  "Horaires par rame et alertes à vos seuils",
  "Vue cabine sur chaque rame, de gare en gare",
  "Prix du billet automatique, recalé en continu",
  "Rentabilité de chaque ligne et de chaque rame",
  "Huit livrées réservées, vos gares à vos couleurs",
];

function PremiumScene({ giftFrom, companyName }: { giftFrom: string | null; companyName: string }) {
  const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return (
    <div className="relative flex flex-col items-center">
      <div className="pr-ticket text-left w-[min(380px,86vw)] bg-[#f3ecd9] text-[#1c1a17] shadow-[8px_8px_0_rgba(0,0,0,0.5)] relative">
        <div className="h-2.5" style={{ background: GOLD }} />
        <div className="px-5 pt-4 pb-1">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-body text-[13px] text-[#8a6a1c] font-semibold">Première classe</div>
              <div className="font-display text-[34px] leading-none mt-1">Premium</div>
            </div>
            <div className="font-display text-[46px] leading-none text-[#c9a227]">1</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-y-1 font-mono2 text-[12px] text-[#4a443b]">
            <span>Voyageur</span>
            <span className="text-right text-[#1c1a17] truncate">{companyName}</span>
            <span>Validité</span>
            <span className="text-right text-[#1c1a17]">Permanente</span>
            {giftFrom && (
              <>
                <span>Offert par</span>
                <span className="text-right text-[#1c1a17] truncate">{giftFrom}</span>
              </>
            )}
          </div>
          <div className="mt-4 border-t border-dashed border-[#b9ad95]" />
          <div className="relative h-12 flex items-center gap-2.5">
            <span className="pr-hole w-3.5 h-3.5 rounded-full bg-navy-950" />
            <span className="pr-hole w-3.5 h-3.5 rounded-full bg-navy-950" style={{ animationDelay: "1480ms" }} />
            <span className="font-mono2 text-[11px] text-[#6b6255] ml-1">Réseau · voiture 1</span>
            {/* le compostage */}
            <div className="pr-stamp absolute right-0 top-2 border-2 border-[#9b2d2d] text-[#9b2d2d] px-2 py-0.5 font-mono2 text-[11px] leading-tight text-center rotate-[-8deg] bg-[#f3ecd9]/60">
              COMPOSTÉ
              <br />
              {date}
            </div>
          </div>
        </div>
      </div>
      <ul className="mt-6 grid gap-1.5 w-[min(420px,88vw)] text-left">
        {PERKS.map((p, i) => (
          <li key={p} className="pr-perk flex gap-2 font-body text-[14px] text-offwhite" style={{ animationDelay: `${1750 + i * 110}ms` }}>
            <span className="text-[#e0b44a] shrink-0">✓</span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PurchaseReveal({
  queue,
  companyName,
  liveryColor,
  onDone,
  onWorn,
}: {
  queue: Reveal[];
  companyName: string;
  liveryColor: string;
  onDone: (r: Reveal) => void;
  onWorn?: () => void;
}) {
  const current = queue[0];
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const key = current ? (current.type === "premium" ? "premium" : current.purchaseId) : "";

  useEffect(() => {
    if (!current) return;
    setReady(false);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timers = [
      window.setTimeout(() => {
        playChime();
        vibrate([30, 40, 60]);
      }, reduce ? 0 : 480),
      window.setTimeout(() => setReady(true), reduce ? 0 : current.type === "premium" ? 2300 : 1500),
    ];
    if (current.type === "premium") timers.push(window.setTimeout(() => playCouple(), reduce ? 0 : 1350));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = prev;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null;
  const premium = current.type === "premium";
  const item = current.type === "item" ? current.item : null;
  const accent = premium ? GOLD : brighten(accentOf(item!));
  const many = (item?.liveries?.length ?? 0) + (item?.emblems?.length ?? 0) + (item?.titles?.length ?? 0) > 1;
  const kindLine = premium ? null : (KIND_LINE[item!.kind] ?? ["Nouvel objet", "Nouvel objet"])[many ? 0 : 1];
  const wear = item ? wearPatch(item) : null;
  const left = queue.length - 1;

  async function doWear() {
    if (!wear) return;
    setBusy(true);
    try {
      await api.patch("/company", wear.patch);
      if (wear.patch.theme) applyTheme(wear.patch.theme as ThemeId);
      onWorn?.();
    } catch {
      /* la boutique permettra de le porter plus tard */
    }
    setBusy(false);
    onDone(current);
  }

  return createPortal(
    <div
      key={key}
      className="pr-root fixed inset-0 z-[90] flex items-center justify-center overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={premium ? "Premium activé" : `${item!.name} débloqué`}
      onClick={() => setReady(true)}
      style={{ ["--pr" as string]: accent }}
    >
      <div className="pr-backdrop absolute inset-0" />
      <div className="pr-rays absolute left-1/2 top-[44%]" aria-hidden />
      <div className="pr-glow absolute left-1/2 top-[44%]" aria-hidden />
      <div className="pr-streak absolute left-0 right-0 top-[44%]" aria-hidden />
      <div className="pr-flash absolute inset-0" aria-hidden />
      <Chads color={accent} />

      <div className="relative flex flex-col items-center text-center px-4 max-h-full overflow-y-auto py-8">
        {premium ? (
          <>
            <div className="pr-line font-body text-[17px] font-semibold mb-4" style={{ color: GOLD }}>
              {current.giftFrom ? `${current.giftFrom} vous offre le voyage` : "Bienvenue à bord"}
            </div>
            <PremiumScene giftFrom={current.giftFrom} companyName={companyName} />
          </>
        ) : (
          <>
            <div className="pr-line font-body text-[17px] font-semibold mb-3" style={{ color: accent }}>
              {current.type === "item" && current.giftFrom ? `Cadeau de ${current.giftFrom}` : kindLine}
            </div>
            <div className="pr-hero flex items-center justify-center min-h-[150px]">
              <Hero item={item!} companyName={companyName} liveryColor={liveryColor} />
            </div>
            <h2 className="pr-name font-display text-[clamp(30px,6vw,52px)] leading-[1.05] text-offwhite mt-5 max-w-[16ch]">{item!.name}</h2>
            {current.type === "item" && current.giftFrom && <div className="pr-line2 font-body text-[14px] text-slate2 mt-1">{kindLine}</div>}
            <div className="mt-4">
              <Contents item={item!} />
            </div>
            {item!.kind === "DLC" && item!.dlc && <p className="pr-line2 font-body text-[14.5px] text-slate2 mt-3 max-w-[48ch]">{item!.dlc.tagline}</p>}
          </>
        )}

        <div className={`flex flex-wrap justify-center gap-3 mt-7 transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          {wear && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                void doWear();
              }}
              disabled={busy}
              className="bg-amber text-onaccent px-5 py-3 text-[15px] font-semibold font-body hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "Un instant…" : wear.label}
            </button>
          )}
          <button
            autoFocus
            onClick={(e) => {
              e.stopPropagation();
              onDone(current);
            }}
            className={`px-5 py-3 text-[15px] font-semibold font-body ${wear ? "border border-white/40 text-offwhite hover:bg-white/10" : "bg-amber text-onaccent hover:brightness-110"}`}
          >
            {left > 0 ? `Suivant (${left} autre${left > 1 ? "s" : ""})` : premium ? "Monter à bord" : "Continuer"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
