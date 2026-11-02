import { useEffect, useState } from "react";
import { TrainPicture } from "./TrainPicture";
import { GiftButton } from "./Gift";
import { SkinPartThumb } from "./SkinPartThumb";

/* ============================================================
   2.5.1 : la vitrine d'un créateur (Série Créateurs).

   Une grande scène où la rame du créateur roule à vos couleurs : on passe du
   jour à la nuit, on essaie d'autres livrées, on voit chaque véhicule. Puis
   qui l'a dessinée, ce qu'on achète, et le bouton. Un objet de créateur se
   vend sur son dessin : il lui faut plus de place qu'une tuile.
   ============================================================ */

type Item = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  owned?: boolean;
  cabSkins?: string[];
  creator?: { name: string; company?: string; note?: string };
};

const euros = (c: number) => `${(c / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const TRY_LIVERIES = ["#e36a12", "#1e3a8a", "#2f9e6a", "#7c2d12", "#4c1d95", "#c9a227"];
// les véhicules de la rame, pour la fiche « ce qui est inclus »
const PARTS: { label: string; part: string }[] = [
  { label: "Motrice", part: "HEAD" },
  { label: "Voiture de 2de", part: "SECONDE" },
  { label: "Voiture de 1re", part: "PREMIERE" },
  { label: "Voiture-restaurant", part: "BAR" },
];

export function CreatorSpotlight({
  item,
  index,
  livery,
  enabled,
  busy,
  onBuy,
  onPreview,
}: {
  item: Item;
  index: number;
  livery: string;
  enabled: boolean;
  busy: boolean;
  onBuy: () => void;
  onPreview: () => void;
}) {
  const [night, setNight] = useState(false);
  const [color, setColor] = useState(livery);
  // sur téléphone, la rame entière tient en largeur : une scène moins haute évite un ciel vide
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 640);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const skin = item.cabSkins?.[0] ?? null;
  const who = item.creator!;
  const price = euros(item.priceCents);
  const palette = [livery, ...TRY_LIVERIES.filter((c) => c.toLowerCase() !== livery.toLowerCase())].slice(0, 6);

  return (
    <article className="border border-amber/40 rounded-card overflow-hidden bg-navy-900/60">
      {/* la scène */}
      <div
        className="relative px-4 pt-12 pb-3 transition-colors duration-500"
        style={{
          background: night
            ? "radial-gradient(ellipse at 80% 0%, rgba(120,140,200,0.18), transparent 55%), linear-gradient(180deg, #0a1020 0%, #121a2c 70%, #1a2232 100%)"
            : "radial-gradient(ellipse at 85% 0%, rgba(255,236,190,0.55), transparent 50%), linear-gradient(180deg, #9fc3e3 0%, #cfe2f1 65%, #dfe7df 100%)",
        }}
      >
        <div className="absolute top-3 left-4 flex items-center gap-2">
          <span className="text-[11.5px] font-body font-semibold tracking-[0.12em] uppercase px-2 py-1 rounded-control bg-amber text-onaccent">Série Créateurs · n° {index}</span>
          {item.owned && <span className="text-[12px] font-body text-rail-green bg-navy-950/70 px-2 py-1 rounded-control">Possédé</span>}
        </div>
        <div className="absolute top-3 right-4 flex items-center gap-1 bg-navy-950/70 border border-white/10 p-1 rounded-control" role="group" aria-label="Éclairage">
          {(["Jour", "Nuit"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setNight(l === "Nuit")}
              aria-pressed={(l === "Nuit") === night}
              className={`text-[12px] font-body px-2.5 py-1 rounded-[calc(var(--r-control)-3px)] ${(l === "Nuit") === night ? "bg-white/15 text-offwhite" : "text-slate2 hover:text-offwhite"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <TrainPicture skin={skin} livery={color} lit={night} cars={[]} height={narrow ? 80 : 150} track fit label={`${item.name}, ${who.name}`} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`text-[12px] font-body ${night ? "text-slate2" : "text-[#3b4757]"}`}>Essayez une livrée :</span>
          {palette.map((c, i) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={i === 0 ? "Votre livrée" : `Livrée ${c}`}
              title={i === 0 ? "Votre livrée" : undefined}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? "border-white scale-110" : "border-white/40 hover:scale-105"}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      {/* le créateur, l'objet, l'achat */}
      <div className="grid md:grid-cols-5 gap-x-8 gap-y-4 p-5 border-t border-amber/30">
        <div className="min-w-0 md:col-span-3">
          <div className="font-body text-[12.5px] text-slate2">Habillage en vue cabine</div>
          <h3 className="font-display text-[30px] leading-none mt-0.5">{item.name}</h3>
          <div className="font-body text-[14px] mt-2">
            Dessiné par <span className="text-amber font-semibold">{who.name}</span>
            {who.company && <span className="text-slate2"> · {who.company}</span>}
          </div>
          {who.note && <p className="font-display italic text-[16px] text-offwhite/90 mt-3 border-l-2 border-amber pl-3">« {who.note} »</p>}
          <p className="font-body text-[13.5px] text-slate2 mt-3 max-w-[60ch]">{item.description}</p>
        </div>
        <div className="flex flex-col gap-3 md:col-span-2">
          <div className="grid grid-cols-2 gap-2">
            {PARTS.map((p) => (
              <div key={p.label} className="border border-line rounded-control bg-navy-950/50 px-2 pt-2 pb-1.5">
                {skin && <SkinPartThumb skin={skin} part={p.part} livery={color} height={38} />}
                <div className="font-body text-[11.5px] text-slate2 text-center">{p.label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap mt-auto">
            <span className="font-mono2 text-[22px] text-amber">{item.owned ? "Possédé" : price}</span>
            <button onClick={onPreview} className="text-[14px] font-body text-cobalt border border-cobalt/40 px-3 py-2 hover:bg-cobalt/10 rounded-control">
              {item.owned ? "Porter" : "Essayer en vitrine"}
            </button>
            {!item.owned && enabled && <GiftButton itemName={item.name} priceLabel={price} itemId={item.id} />}
            {!item.owned && (
              <button onClick={onBuy} disabled={!enabled || busy} className="ml-auto bg-amber text-onaccent px-4 py-2 text-[14.5px] font-semibold font-body hover:brightness-110 disabled:opacity-50 rounded-control">
                {!enabled ? "Bientôt" : busy ? "Ouverture…" : `Acheter, ${price}`}
              </button>
            )}
          </div>
          <p className="font-body text-[12px] text-slate2">Une part de chaque achat revient à {who.name}.</p>
        </div>
      </div>
    </article>
  );
}
