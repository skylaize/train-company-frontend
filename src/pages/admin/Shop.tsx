import { useState } from "react";
import { Loading, PageHead, Pill, euros, nf, useAdminData } from "./ui";

type Item = {
  id: string; kind: string; name: string; description: string; priceCents: number; season: string | null; isNew: boolean; exclusive: boolean;
  sold: number; revenueCents: number; gifted: number;
};

const KIND_LABEL: Record<string, string> = {
  PASS: "Pass de saison", DLC: "Extensions", LIVREES: "Livrées", EMBLEMES: "Emblèmes", TITRES: "Titres", THEME: "Thèmes", CABINE: "Vue cabine",
  SAISON: "Éditions de saison", SANS_PUB: "Sans pub", COFFRET: "Coffrets", PLAQUE: "Plaques d'honneur", AFFICHE: "Affiches", PLAQUE_RAME: "Plaques de rame",
  SONS: "Sons de gare", GARE: "Habillages de gare", MUSEE: "Musée", TENUES: "Tenues", ALLIANCE: "Alliance",
};

export default function Shop() {
  const { data, error, reload } = useAdminData<{ items: Item[] }>("/shop");
  const [sort, setSort] = useState<"revenu" | "ventes" | "catalogue">("revenu");
  if (!data) return <Loading error={error} onRetry={reload} />;

  const items = [...data.items];
  if (sort === "revenu") items.sort((a, b) => b.revenueCents - a.revenueCents || b.sold - a.sold);
  if (sort === "ventes") items.sort((a, b) => b.sold - a.sold);
  const total = items.reduce((s, i) => s + i.revenueCents, 0);
  const sales = items.reduce((s, i) => s + i.sold, 0);

  return (
    <>
      <PageHead
        title="Boutique"
        intro="Les ventes de chaque objet depuis l'ouverture, hors Premium. Le catalogue vit dans le code (shop.service.ts) : pour offrir un objet, passe par la fiche du joueur."
      />
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-4">
        <p className="font-body text-[14px]">
          <span className="font-mono2 text-[20px] text-amber">{euros(total)}</span> sur {nf(sales)} ventes
        </p>
        <div className="ml-auto flex gap-1.5" role="group" aria-label="Trier">
          {(["revenu", "ventes", "catalogue"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              aria-pressed={sort === s}
              className={`px-3 py-1.5 border font-body text-[13px] ${sort === s ? "border-amber text-amber" : "border-line text-slate2 hover:text-offwhite"}`}
            >
              {s === "revenu" ? "Par recette" : s === "ventes" ? "Par ventes" : "Ordre du catalogue"}
            </button>
          ))}
        </div>
      </div>
      <div className="border border-line bg-navy-900">
        <div className="hidden md:grid grid-cols-[minmax(0,1fr)_150px_80px_70px_80px_100px] gap-3 px-4 py-2 border-b border-line font-body text-[12px] text-slate2">
          <span>Objet</span>
          <span>Rayon</span>
          <span className="text-right">Prix</span>
          <span className="text-right">Ventes</span>
          <span className="text-right">Offerts</span>
          <span className="text-right">Recette</span>
        </div>
        <ul className="divide-y divide-line">
          {items.map((i) => (
            <li key={i.id} className="grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1fr)_150px_80px_70px_80px_100px] gap-x-3 gap-y-0.5 px-4 py-2.5 font-body text-[13.5px]">
              <span className="min-w-0 flex items-center gap-2">
                <span className="truncate" title={i.description}>
                  {i.name}
                </span>
                {i.exclusive && <Pill tone="cobalt">Discord</Pill>}
                {i.isNew && <Pill tone="amber">Nouveau</Pill>}
              </span>
              <span className="md:hidden text-right font-mono2">{euros(i.revenueCents)}</span>
              <span className="text-slate2 truncate">
                {KIND_LABEL[i.kind] ?? i.kind}
                <span className="md:hidden">
                  {" "}
                  · {nf(i.sold)} vente{i.sold > 1 ? "s" : ""}
                  {i.gifted ? `, ${nf(i.gifted)} offert${i.gifted > 1 ? "s" : ""}` : ""}
                </span>
              </span>
              <span className="hidden md:block text-right text-slate2">{i.priceCents ? euros(i.priceCents) : "—"}</span>
              <span className="hidden md:block text-right font-mono2">{nf(i.sold)}</span>
              <span className="hidden md:block text-right font-mono2 text-slate2">{nf(i.gifted)}</span>
              <span className="hidden md:block text-right font-mono2">{euros(i.revenueCents)}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
