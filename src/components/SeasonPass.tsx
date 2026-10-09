import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Emblem } from "./Emblem";
import { Plate } from "./Plate";
import { GiftButton } from "./Gift";
import { TrainPicture } from "./TrainPicture";

/* ============================================================
   Le Pass de saison (2.0), dessiné comme une ligne de chemin de fer :
   vingt paliers sont vingt gares, votre rame avance avec vos points de
   saison. Au-dessus de la voie, ce que débloque le pass ; en dessous, les
   pièces du parcours gratuit, pour tout le monde.
   ============================================================ */

type Reward =
  | { type: "LIVREE"; color: string; label: string }
  | { type: "EMBLEME"; id: string; label: string }
  | { type: "TITRE"; title: string; label: string }
  | { type: "PLAQUE"; id: string; label: string };

export interface PassData {
  season: null | { id: string; number: number; name: string; endsAt: string };
  itemId?: string;
  priceCents?: number;
  owned?: boolean;
  points?: number;
  reached?: number;
  next?: number | null;
  tiers?: { tier: number; need: number; reached: boolean; free: { coins: number; claimed: boolean } | null; pass: Reward | null }[];
}

const fmt = (n: number) => n.toLocaleString("fr-FR");
const euros = (c: number) => (c / 100).toFixed(2).replace(".", ",") + " €";
const COL = 92;

export async function loadPass(): Promise<PassData | null> {
  try {
    const { data } = await api.get("/season/pass");
    return data;
  } catch {
    return null;
  }
}

function RewardChip({ r, unlocked, companyName }: { r: Reward; unlocked: boolean; companyName: string }) {
  if (r.type === "LIVREE")
    return (
      <span className="block w-[78px]" title={r.label}>
        <TrainPicture model="EXPRESS" livery={r.color} height={30} track={false} fit={false} align="right" label={r.label} />
      </span>
    );
  if (r.type === "EMBLEME")
    return (
      <span className={`w-9 h-9 rounded-full inline-flex items-center justify-center bg-[#0b2a4a] border ${unlocked ? "border-white/80 text-white" : "border-white/30 text-white/70"}`} title={r.label}>
        <Emblem id={r.id} size={18} />
      </span>
    );
  if (r.type === "PLAQUE")
    return (
      <span title={r.label}>
        <Plate plate={r.id} className="text-[10px] font-body whitespace-nowrap">
          {companyName.length > 10 ? companyName.slice(0, 9) + "…" : companyName}
        </Plate>
      </span>
    );
  return (
    <span className="bg-[#0b2a4a] border border-[#e8edf5]/70 px-1.5 py-0.5 font-body text-[10.5px] leading-tight text-[#f4d06f] text-center max-w-[84px]" title={r.label}>
      {r.title}
    </span>
  );
}

export function SeasonPass({ companyName, compact = false, onChange }: { companyName: string; compact?: boolean; onChange?: () => void }) {
  const [data, setData] = useState<PassData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { showToast, showComposter } = useToast();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadPass().then(setData);
  }, []);
  // la piste s'ouvre sur votre position
  useEffect(() => {
    if (!data?.tiers || !scroller.current) return;
    scroller.current.scrollLeft = Math.max(0, 56 + (data.reached ?? 0) * COL - scroller.current.clientWidth / 2);
  }, [data?.reached, data?.tiers]);

  if (!data?.season || !data.tiers) return null;
  const { season, tiers, owned, points = 0, reached = 0, next } = data;
  const price = euros(data.priceCents ?? 299);

  async function buy() {
    setBusy("buy");
    try {
      const { data: r } = await api.post("/shop/checkout", { itemId: data!.itemId });
      if (r?.url) window.location.href = r.url;
    } catch (err: any) {
      showToast(err?.response?.data?.error ?? "Impossible d'ouvrir la page de paiement", "error");
      setBusy(null);
    }
  }
  async function claim(tier: number, coins: number) {
    setBusy(`claim:${tier}`);
    try {
      await api.post("/season/pass/claim", { tier });
      showComposter(`Palier ${tier} : +${fmt(coins)} pi.`);
      setData(await loadPass());
      onChange?.();
    } catch (err: any) {
      showToast(err?.response?.data?.error ?? "Erreur", "error");
    } finally {
      setBusy(null);
    }
  }

  // position de la rame sur la ligne : entre le dernier palier franchi et le suivant
  const prevNeed = reached > 0 ? tiers[reached - 1].need : 0;
  const frac = next ? Math.min(1, (points - prevNeed) / (next - prevNeed)) : 0;
  const trainX = (reached + frac) * COL;
  const claimable = tiers.filter((t) => t.reached && t.free && !t.free.claimed).length;
  const unlockedCount = tiers.filter((t) => t.reached && t.pass).length;

  return (
    <section className="border border-line bg-navy-900/50">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <h2 className="font-display text-[22px] leading-tight">Pass de la {season.name.toLowerCase()}</h2>
          <p className="text-[13.5px] text-slate2 font-body mt-1 max-w-[62ch]">
            Palier <span className="text-offwhite font-semibold">{reached}</span> sur 30 avec {fmt(points)} points de saison
            {next ? `, prochain palier à ${fmt(next)}` : ", ligne terminée"}.{" "}
            {owned
              ? `${unlockedCount} récompense${unlockedCount > 1 ? "s" : ""} du pass débloquée${unlockedCount > 1 ? "s" : ""}, gardée${unlockedCount > 1 ? "s" : ""} pour toujours.`
              : "Les pièces sont pour tout le monde ; le pass ajoute une livrée à chaque étape, un emblème, des titres et une plaque."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {claimable > 0 && <span className="text-[13px] font-body text-amber">{claimable} palier{claimable > 1 ? "s" : ""} à réclamer</span>}
          {owned ? (
            <span className="text-[14px] font-body text-rail-green">Pass actif</span>
          ) : (
            <>
              <GiftButton itemName="le Pass de saison" priceLabel={price} itemId={data.itemId} />
              <button onClick={buy} disabled={busy !== null} className="bg-amber text-onaccent px-4 py-2.5 text-[14.5px] font-semibold font-body hover:brightness-110 disabled:opacity-50">
                {busy === "buy" ? "Ouverture…" : `Débloquer le pass, ${price}`}
              </button>
            </>
          )}
        </div>
      </div>

      {!compact && (
        <div ref={scroller} className="overflow-x-auto border-t border-line">
          <div className="relative" style={{ width: COL * 30 + 80, height: 214 }}>
            {/* étiquettes des deux parcours */}
            <div className="sticky left-0 z-10 w-0">
              <span className="absolute left-1.5 top-8 text-[12px] font-body text-amber whitespace-nowrap bg-navy-900 border border-amber/40 px-1.5 py-0.5">Pass</span>
              <span className="absolute left-1.5 top-[148px] text-[12px] font-body text-slate2 whitespace-nowrap bg-navy-900 border border-line px-1.5 py-0.5">Gratuit</span>
            </div>
            {/* la voie */}
            <div className="absolute left-[56px] right-5 top-[106px] h-[6px] bg-[#3a2f25]" />
            <div className="absolute left-[56px] top-[106px] h-[6px] bg-amber transition-all duration-700" style={{ width: Math.min(COL * 30, trainX + COL / 2) }} />
            <div className="absolute left-[56px] right-5 top-[104px] h-[2px] bg-[#9aa3ad]/70" />
            {/* votre rame */}
            <div className="absolute top-[82px] transition-all duration-700" style={{ left: 56 + trainX + COL / 2 - 34 }} aria-label={`Votre position : ${fmt(points)} points`}>
              <span className="block w-[68px]">
                <TrainPicture model="STANDARD" livery="#f59e0b" height={24} track={false} fit={false} align="right" />
              </span>
            </div>
            {tiers.map((t, i) => {
              const x = 56 + i * COL;
              return (
                <div key={t.tier} className="absolute top-0" style={{ left: x, width: COL }}>
                  {/* récompense du pass */}
                  <div className={`h-[78px] mx-1 mt-1 flex flex-col items-center justify-center gap-1 ${t.pass ? (owned && t.reached ? "bg-amber/10 border border-amber/50" : "border border-line") : ""}`}>
                    {t.pass && (
                      <>
                        <div className={owned && t.reached ? "" : "opacity-55"}>
                          <RewardChip r={t.pass} unlocked={Boolean(owned && t.reached)} companyName={companyName} />
                        </div>
                        <span className={`text-[10.5px] font-body ${owned && t.reached ? "text-amber" : "text-slate2/70"}`}>{owned && t.reached ? "Débloqué" : t.reached ? "Avec le pass" : ""}</span>
                      </>
                    )}
                  </div>
                  {/* la gare du palier */}
                  <div className="absolute top-[100px] left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className={`w-[18px] h-[18px] rounded-full border-2 ${t.reached ? "bg-amber border-amber" : "bg-navy-950 border-slate2/60"}`} />
                    <span className={`font-mono2 text-[11px] mt-1 ${t.reached ? "text-amber" : "text-slate2"}`}>{t.tier}</span>
                  </div>
                  {/* parcours gratuit */}
                  {t.free && (
                    <div className="absolute top-[146px] left-1 right-1 flex flex-col items-center gap-1">
                      <span className={`font-mono2 text-[13px] ${t.free.claimed ? "text-slate2 line-through" : "text-offwhite"}`}>+{fmt(t.free.coins)} pi.</span>
                      {t.reached && !t.free.claimed ? (
                        <button onClick={() => claim(t.tier, t.free!.coins)} disabled={busy !== null} className="text-[12px] font-body bg-cobalt text-onaccent px-2 py-1 disabled:opacity-50">
                          Réclamer
                        </button>
                      ) : t.free.claimed ? (
                        <span className="text-[11px] font-body text-rail-green">Réclamé</span>
                      ) : (
                        <span className="text-[11px] font-body text-slate2/70">{fmt(t.need)} pts</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
