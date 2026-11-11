import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Emblem } from "./Emblem";
import { Plate } from "./Plate";
import { GiftButton } from "./Gift";
import { TrainPicture } from "./TrainPicture";
import { StationMark } from "./TrainMark";

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
  | { type: "PLAQUE"; id: string; label: string }
  | { type: "HABILLAGE"; id: string; label: string } // 2.7
  | { type: "GARE"; id: string; label: string };

// 2.7 : la quête de fin de saison
export interface QuestData {
  name: string;
  intro: string;
  open: boolean;
  opensAt: string;
  endsAt: string;
  step: number;
  progress: number;
  doneAt: string | null;
  steps: { label: string; target: number }[];
  rewards: { all: Reward[]; pass: Reward[] };
  hasPass: boolean;
}

export interface PassData {
  season: null | { id: string; number: number; name: string; endsAt: string };
  itemId?: string;
  priceCents?: number;
  owned?: boolean;
  points?: number;
  reached?: number;
  next?: number | null;
  tiers?: { tier: number; need: number; reached: boolean; free: { coins: number; claimed: boolean } | null; freeReward?: Reward | null; pass: Reward | null }[];
  quest?: QuestData | null;
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

/* 2.7 : l'aperçu d'un habillage du pass, en grand (suggestion de N0RCAM) */
type SkinReward = { type: "HABILLAGE"; id: string; label: string };
let openSkinPreview: ((r: SkinReward, where: string) => void) | null = null;

const PREVIEW_COLORS = ["#2f6fb0", "#a3202a", "#3b5e3f", "#d9772b", "#222428"];

function SkinPreview({ r, where, onClose }: { r: SkinReward; where: string; onClose: () => void }) {
  const [color, setColor] = useState(PREVIEW_COLORS[0]);
  const [night, setNight] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const name = r.label.replace(/^[^«]*«\s*/, "").replace(/\s*».*$/, "");
  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-label={`Aperçu : ${name}`}>
      <div className="w-full max-w-[860px] bg-navy-900 border border-line rounded-card overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div>
            <div className="font-display text-[22px] leading-tight">{name}</div>
            <div className="font-body text-[13px] text-slate2 mt-0.5">{r.label}{where ? ` · ${where}` : ""}</div>
          </div>
          <button onClick={onClose} className="text-slate2 hover:text-offwhite text-xl leading-none px-1" aria-label="Fermer">×</button>
        </div>
        <div className={`mt-3 px-4 pt-6 pb-2 ${night ? "bg-[#070b14]" : "bg-[#cfe0ee]"}`}>
          <TrainPicture skin={r.id} livery={color} lit={night} height={140} track fit label={name} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-2 font-body text-[12.5px] text-slate2">
            Couleur de votre compagnie :
            {PREVIEW_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} aria-label={`Livrée ${c}`} className={`w-6 h-6 rounded-full border-2 ${c === color ? "border-offwhite" : "border-transparent"}`} style={{ background: c }} />
            ))}
          </div>
          <button onClick={() => setNight((n) => !n)} className="font-body text-[12.5px] border border-line px-3 py-1.5 rounded-control text-slate2 hover:text-offwhite">
            {night ? "Voir de jour" : "Voir de nuit"}
          </button>
        </div>
      </div>
    </div>
  );
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
  // 2.7 : habillage de rame ou de gare, dessiné par un joueur
  if (r.type === "HABILLAGE" || r.type === "GARE") {
    const name = r.label.replace(/^[^«]*«\s*/, "").replace(/\s*».*$/, "");
    return (
      <span className="flex flex-col items-center gap-0.5" title={r.label}>
        {r.type === "HABILLAGE" ? (
          <button onClick={() => openSkinPreview?.(r, "")} className="block w-[70px] hover:scale-105 transition-transform" aria-label={`Voir ${name} en grand`}>
            <TrainPicture skin={r.id} livery="#9aa3ad" height={22} track={false} fit={false} align="right" label={r.label} />
          </button>
        ) : (
          <StationMark size={22} className={unlocked ? "text-white" : "text-white/70"} />
        )}
        <span className="bg-[#0b2a4a] border border-[#e8edf5]/50 px-1 font-body text-[10px] leading-tight text-[#e8edf5] text-center max-w-[84px] rounded-control truncate">{name}</span>
      </span>
    );
  }
  if (r.type === "PLAQUE")
    return (
      <span title={r.label}>
        <Plate plate={r.id} className="text-[10px] font-body whitespace-nowrap">
          {companyName.length > 10 ? companyName.slice(0, 9) + "…" : companyName}
        </Plate>
      </span>
    );
  return (
    <span className="bg-[#0b2a4a] border border-[#e8edf5]/70 px-1.5 py-0.5 font-body text-[10.5px] leading-tight text-[#f4d06f] text-center max-w-[84px] rounded-control" title={r.label}>
      {r.title}
    </span>
  );
}

export function SeasonPass({ companyName, compact = false, onChange }: { companyName: string; compact?: boolean; onChange?: () => void }) {
  const [data, setData] = useState<PassData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { showToast, showComposter } = useToast();
  const scroller = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ r: SkinReward; where: string } | null>(null);
  useEffect(() => {
    openSkinPreview = (r, where) => setPreview({ r, where });
    return () => {
      openSkinPreview = null;
    };
  }, []);

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
  /* 2.7 : la gare du palier n est dans la colonne n-1. La rame se plaçait
     une colonne trop loin (au palier 15 avec 14 paliers franchis). */
  const trainX = (reached - 1 + frac) * COL;
  const claimable = tiers.filter((t) => t.reached && t.free && !t.free.claimed).length;
  const unlockedCount = tiers.filter((t) => t.reached && t.pass).length;

  return (
    <section className="border border-line bg-navy-900/50 rounded-card">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <h2 className="font-display text-[22px] leading-tight">{season.name.toLowerCase().startsWith("saison") ? `Pass de la ${season.name.toLowerCase()}` : `Pass « ${season.name} »`}</h2>
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
              <button onClick={buy} disabled={busy !== null} className="bg-amber text-onaccent px-4 py-2.5 text-[14.5px] font-semibold font-body hover:brightness-110 disabled:opacity-50 rounded-control">
                {busy === "buy" ? "Ouverture…" : `Débloquer le pass, ${price}`}
              </button>
            </>
          )}
        </div>
      </div>

      {preview && <SkinPreview r={preview.r} where={preview.where} onClose={() => setPreview(null)} />}

      {/* 2.7 : les rames de ce pass, en vitrine et cliquables */}
      {!compact && (() => {
        const skins: { r: SkinReward; where: string }[] = [];
        for (const t of tiers) {
          if (t.pass?.type === "HABILLAGE") skins.push({ r: t.pass as SkinReward, where: `palier ${t.tier}, avec le pass` });
          if (t.freeReward?.type === "HABILLAGE") skins.push({ r: t.freeReward as SkinReward, where: `palier ${t.tier}, gratuit` });
        }
        for (const q of data.quest?.rewards.all ?? []) if (q.type === "HABILLAGE") skins.push({ r: q as SkinReward, where: "quête de fin de saison" });
        for (const q of data.quest?.rewards.pass ?? []) if (q.type === "HABILLAGE") skins.push({ r: q as SkinReward, where: "quête de fin de saison, avec le pass" });
        if (!skins.length) return null;
        return (
          <div className="border-t border-line px-4 py-3">
            <div className="font-body text-[12.5px] text-slate2 mb-2">Les rames de ce pass, dessinées par N0RCAM : cliquez pour les voir en grand</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {skins.map(({ r, where }) => (
                <button key={r.id + where} onClick={() => setPreview({ r, where })} className="text-left border border-line hover:border-amber/60 rounded-card p-2.5 bg-navy-950/40 transition-colors">
                  <TrainPicture skin={r.id} livery="#2f6fb0" height={44} track={false} fit label={r.label} />
                  <div className="font-body text-[13px] mt-1.5 truncate">{r.label.replace(/^[^«]*«\s*/, "").replace(/\s*».*$/, "")}</div>
                  <div className={`font-body text-[11.5px] ${where.includes("gratuit") ? "text-rail-green" : "text-amber"}`}>{where.charAt(0).toUpperCase() + where.slice(1)}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {!compact && (
        <div ref={scroller} className="overflow-x-auto border-t border-line">
          <div className="relative" style={{ width: COL * 30 + 80, height: tiers.some((t) => t.freeReward) ? 262 : 214 }}>
            {/* étiquettes des deux parcours */}
            <div className="sticky left-0 z-10 w-0">
              <span className="absolute left-1.5 top-8 text-[12px] font-body text-amber whitespace-nowrap bg-navy-900 border border-amber/40 px-1.5 py-0.5 rounded-control">Pass</span>
              <span className="absolute left-1.5 top-[148px] text-[12px] font-body text-slate2 whitespace-nowrap bg-navy-900 border border-line px-1.5 py-0.5 rounded-control">Gratuit</span>
            </div>
            {/* la voie */}
            <div className="absolute left-[56px] right-5 top-[106px] h-[6px] bg-[#3a2f25]" />
            <div className="absolute left-[56px] top-[106px] h-[6px] bg-amber transition-all duration-700" style={{ width: Math.max(0, Math.min(COL * 30, trainX + COL / 2)) }} />
            <div className="absolute left-[56px] right-5 top-[104px] h-[2px] bg-[#9aa3ad]/70" />
            {/* votre rame */}
            <div className="absolute top-[82px] transition-all duration-700" style={{ left: Math.max(0, 56 + trainX + COL / 2 - 34) }} aria-label={`Votre position : ${fmt(points)} points`}>
              <span className="block w-[68px]">
                <TrainPicture model="STANDARD" livery="#f59e0b" height={24} track={false} fit={false} align="right" />
              </span>
            </div>
            {tiers.map((t, i) => {
              const x = 56 + i * COL;
              return (
                <div key={t.tier} className="absolute top-0" style={{ left: x, width: COL }}>
                  {/* récompense du pass */}
                  <div className={`h-[78px] mx-1 mt-1 flex flex-col items-center justify-center gap-1 rounded-control ${t.pass ? (owned && t.reached ? "bg-amber/10 border border-amber/50" : "border border-line") : ""}`}>
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
                        <button onClick={() => claim(t.tier, t.free!.coins)} disabled={busy !== null} className="text-[12px] font-body bg-cobalt text-onaccent px-2 py-1 disabled:opacity-50 rounded-control">
                          Réclamer
                        </button>
                      ) : t.free.claimed ? (
                        <span className="text-[11px] font-body text-rail-green">Réclamé</span>
                      ) : (
                        <span className="text-[11px] font-body text-slate2/70">{fmt(t.need)} pts</span>
                      )}
                    </div>
                  )}
                  {/* 2.7 : un objet du parcours gratuit, débloqué au palier, pour tout le monde */}
                  {t.freeReward && (
                    <div className={`absolute top-[204px] left-1 right-1 flex flex-col items-center gap-0.5 ${t.reached ? "" : "opacity-55"}`}>
                      <RewardChip r={t.freeReward} unlocked={t.reached} companyName={companyName} />
                      <span className={`text-[10.5px] font-body ${t.reached ? "text-rail-green" : "text-slate2/70"}`}>{t.reached ? "Débloqué" : "Gratuit"}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!compact && data.quest && <SeasonQuest q={data.quest} companyName={companyName} />}
    </section>
  );
}

/* 2.7 : la quête de fin de saison, sous le pass. */
function SeasonQuest({ q, companyName }: { q: QuestData; companyName: string }) {
  const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const done = Boolean(q.doneAt);
  return (
    <div className="border-t border-line px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-[19px]">Quête de fin de saison · {q.name}</h3>
        <span className="font-body text-[12.5px] text-slate2">
          {done ? "Terminée" : q.open ? `Jusqu'au ${day(q.endsAt)}` : `S'ouvre le ${day(q.opensAt)}`}
        </span>
      </div>
      <p className="font-body text-[13px] text-slate2 mt-1 max-w-[70ch]">{q.intro}</p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-5">
        {q.steps.map((s, i) => {
          const state = done || i < q.step ? "fait" : i === q.step && q.open ? "en cours" : "à venir";
          const pct = state === "fait" ? 100 : state === "en cours" ? Math.round((q.progress / s.target) * 100) : 0;
          return (
            <li key={i} className={`border rounded-card px-3 py-2.5 font-body ${state === "en cours" ? "border-amber/60 bg-amber/[0.05]" : state === "fait" ? "border-rail-green/40" : "border-line opacity-70"}`}>
              <div className="text-[11px] text-slate2">Palier {i + 1}</div>
              <div className="text-[13px] text-offwhite leading-snug mt-0.5 min-h-[2.6em]">{s.label}</div>
              <div className="mt-2 h-1.5 bg-navy-950 border border-line overflow-hidden">
                <div className={`h-full ${state === "fait" ? "bg-rail-green" : "bg-amber"}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 text-[11px] font-mono2 text-slate2">{state === "fait" ? "fait" : state === "en cours" ? `${q.progress.toLocaleString("fr-FR")} / ${s.target.toLocaleString("fr-FR")}` : ""}</div>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 font-body text-[12.5px]">
        <span className="text-slate2">Au bout :</span>
        {q.rewards.all.map((r, i) => (
          <span key={`a${i}`} className="flex items-center gap-2">
            <RewardChip r={r} unlocked={done} companyName={companyName} />
            <span className="text-slate2">pour tout le monde</span>
          </span>
        ))}
        {q.rewards.pass.map((r, i) => (
          <span key={`p${i}`} className={`flex items-center gap-2 ${q.hasPass ? "" : "opacity-60"}`}>
            <RewardChip r={r} unlocked={done && q.hasPass} companyName={companyName} />
            <span className="text-amber">avec le pass</span>
          </span>
        ))}
      </div>
    </div>
  );
}
