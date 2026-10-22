import { useEffect, useState } from "react";
import { api } from "../api/client";
import { STATION_COORDS } from "../geo";
import { TrainPicture } from "./TrainPicture";
import { Emblem } from "./Emblem";

/* ============================================================
   2.2 : Halloween sur le réseau.

   Le Train fantôme s'installe toutes les 45 minutes dans une gare du
   réseau. Ici : la carte sur la flotte (où il est, où il va, mes âmes,
   les paliers, les meilleurs chasseurs) et son calque sur la carte.
   L'horaire vient du serveur, l'heure qu'il est se calcule ici.
   ============================================================ */

export const SPECTRAL = "#6b4c9a";
const GLOW = "rgb(var(--c-violet))";

type Haunt = { station: string; at: string };
type Tier = { souls: number; kind: "emblem" | "title" | "livery"; value: string; label: string; reached: boolean };

export interface HalloweenData {
  visible: boolean;
  phase?: "avant" | "pendant" | "apres";
  year?: number;
  startsAt?: string;
  endsAt?: string;
  hauntMinutes?: number;
  demand?: number;
  nightFrom?: number;
  nightTo?: number;
  haunt?: (Haunt & { until: string }) | null;
  next?: Haunt[];
  soulsPerTrip?: number;
  tiers?: Tier[];
  mine?: { souls: number; rank: number | null; served: string[]; best: number };
  top?: { rank: number; companyId: string; name: string; livery: string; souls: number }[];
  hunters?: number;
}

/* un seul appel partagé entre la carte de la flotte, la carte du réseau et la vue cabine */
let cache: { at: number; data: HalloweenData | null } | null = null;
let inflight: Promise<HalloweenData | null> | null = null;
function fetchHalloween() {
  if (cache && Date.now() - cache.at < 50_000) return Promise.resolve(cache.data);
  if (inflight) return inflight;
  inflight = api
    .get("/halloween")
    .then((r) => r.data as HalloweenData)
    .catch(() => null)
    .then((data) => {
      cache = { at: Date.now(), data };
      inflight = null;
      return data;
    });
  return inflight;
}

export function useHalloween() {
  const [data, setData] = useState<HalloweenData | null>(cache?.data ?? null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let alive = true;
    const load = () => void fetchHalloween().then((d) => alive && setData(d));
    load();
    const slow = setInterval(load, 60_000);
    const tick = setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      alive = false;
      clearInterval(slow);
      clearInterval(tick);
    };
  }, []);
  // la hantise en cours, recalée à l'heure qu'il est (l'horaire peut avoir avancé depuis l'appel)
  const sched = [...(data?.haunt ? [data.haunt] : []), ...(data?.next ?? [])];
  let haunt: (Haunt & { until: string }) | null = null;
  for (const h of sched) {
    const at = new Date(h.at).getTime();
    const until = at + (data?.hauntMinutes ?? 45) * 60_000;
    if (at <= now && now < until) haunt = { ...h, until: new Date(until).toISOString() };
  }
  const next = sched.filter((h) => new Date(h.at).getTime() > now);
  return { data, now, haunt, next };
}

/* la gare hantée en ce moment, pour la vue cabine */
export function useHauntedStation() {
  const { data, haunt } = useHalloween();
  return { active: data?.phase === "pendant", station: haunt?.station ?? null };
}

const hm = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(":", " h ");
const day = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));

/* le petit fantôme, dessiné au trait (même grille que les emblèmes) */
export function GhostGlyph({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden="true">
      <path d="M3 14.2V7.4a5 5 0 0 1 10 0v6.8l-1.7-1.3-1.6 1.3L8 12.9l-1.7 1.3-1.6-1.3z" />
      <circle cx="6.3" cy="7.4" r=".6" fill="currentColor" />
      <circle cx="9.7" cy="7.4" r=".6" fill="currentColor" />
    </svg>
  );
}

function TierRow({ t, souls }: { t: Tier; souls: number }) {
  const swatch =
    t.kind === "livery" ? (
      <span className="w-4 h-4 border border-line" style={{ background: t.value }} />
    ) : t.kind === "emblem" ? (
      <Emblem id={t.value} size={16} />
    ) : (
      <span className="font-display text-[13px] leading-none">T</span>
    );
  return (
    <li className={`flex items-center gap-2.5 py-1.5 ${t.reached ? "" : "text-slate2"}`}>
      <span className={`w-5 flex justify-center ${t.reached ? "text-violet" : ""}`}>{swatch}</span>
      <span className="flex-1 font-body text-[13px]">{t.label}</span>
      <span className="font-mono2 text-[12px] tabular-nums">{t.reached ? "gagné" : `${Math.min(souls, t.souls)} / ${t.souls}`}</span>
    </li>
  );
}

/* la carte sur la flotte */
export function HalloweenCard({ onShowMap }: { onShowMap?: () => void }) {
  const { data, now, haunt, next } = useHalloween();
  if (!data?.visible || !data.tiers) return null;
  const mine = data.mine ?? { souls: 0, rank: null, served: [], best: 0 };
  const served = new Set(mine.served);
  const nextTier = data.tiers.find((t) => !t.reached);
  const minsLeft = haunt ? Math.max(1, Math.ceil((new Date(haunt.until).getTime() - now) / 60_000)) : 0;

  return (
    <section className="border border-violet/45 bg-violet/[0.05] mb-6 overflow-hidden rounded-card" aria-label="Halloween sur le réseau">
      <div className="relative h-[86px] border-b border-violet/30 bg-gradient-to-b from-[#120d1f] to-navy-950" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-0 opacity-75 halloween-drift">
          {/* une vieille vapeur passée au violet pâle : le Train fantôme */}
          <div style={{ filter: "grayscale(1) sepia(.5) hue-rotate(215deg) saturate(2.2) brightness(1.15)" }}>
            <TrainPicture model="VAPEUR" livery={SPECTRAL} height={70} align="center" lit label="Le Train fantôme" />
          </div>
        </div>
        <span className="absolute top-2 left-3 flex items-center gap-1.5 font-mono2 text-[10.5px] tracking-[0.18em] text-violet">
          <GhostGlyph size={13} /> LE TRAIN FANTÔME
        </span>
        {data.phase === "pendant" && (
          <span className="absolute top-2 right-3 font-mono2 text-[10.5px] text-slate2">jusqu'au {day(new Date(new Date(data.endsAt!).getTime() - 1).toISOString())}</span>
        )}
      </div>

      <div className="p-4 grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {data.phase === "avant" && (
            <p className="font-body text-[14px]">
              Du {day(data.startsAt!)} au {day(new Date(new Date(data.endsAt!).getTime() - 1).toISOString())}, le Train fantôme hante le réseau. Toutes les {data.hauntMinutes} minutes, il
              s'installe dans une gare : chaque trajet qui y passe récolte une âme, deux de {data.nightFrom} h à {data.nightTo} h.
            </p>
          )}
          {data.phase === "pendant" && (
            <>
              <p className="font-body text-[14px]">
                {haunt ? (
                  <>
                    Il hante <b>{haunt.station}</b> encore {minsLeft} min.{" "}
                    {served.has(haunt.station) ? (
                      <span className="text-rail-green">Vos lignes y passent : chaque trajet récolte {data.soulsPerTrip} âme{(data.soulsPerTrip ?? 1) > 1 ? "s" : ""}.</span>
                    ) : (
                      <span className="text-slate2">Aucune de vos lignes n'y passe.</span>
                    )}
                  </>
                ) : (
                  "Il cherche sa prochaine gare…"
                )}
              </p>
              <p className="font-body text-[12.5px] text-slate2 mt-1">
                Les curieux s'y pressent : voyageurs ×{String(data.demand ?? 1.3).replace(".", ",")} à la gare hantée. Une âme par trajet qui y passe, deux de {data.nightFrom} h à {data.nightTo} h.
              </p>
              {next.length > 0 && (
                <div className="mt-3">
                  <div className="font-body text-[12.5px] text-slate2 mb-1">Ses prochaines gares</div>
                  <ol className="flex flex-wrap gap-1.5">
                    {next.slice(0, 4).map((h) => (
                      <li
                        key={h.at}
                        className={`inline-flex items-baseline gap-1.5 border px-2 py-0.5 font-body text-[12.5px] rounded-card bg-navy-900/40 ${served.has(h.station) ? "border-rail-green/60 text-offwhite" : "border-line text-slate2"}`}
                        title={served.has(h.station) ? "Une de vos lignes y passe" : undefined}
                      >
                        <span className="font-mono2 text-[11px] tabular-nums">{hm(h.at)}</span>
                        {h.station}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
          {data.phase === "apres" && (
            <p className="font-body text-[14px]">
              Le Train fantôme est reparti. {data.hunters} compagnie{(data.hunters ?? 0) > 1 ? "s ont" : " a"} récolté des âmes cette année. Ce que vous avez gagné est à vous pour
              toujours.
            </p>
          )}

          {data.phase !== "avant" && (
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-mono2 text-[26px] leading-none text-violet tabular-nums">{mine.souls}</span>
              <span className="font-body text-[13px] text-slate2">
                âme{mine.souls > 1 ? "s" : ""} récoltée{mine.souls > 1 ? "s" : ""}
                {mine.rank ? `, ${mine.rank}e chasseur sur ${data.hunters}` : ""}
              </span>
            </div>
          )}
          {data.phase === "pendant" && nextTier && (
            <div className="mt-2">
              <div className="h-[4px] bg-navy-950 border border-line rounded-control" role="progressbar" aria-valuenow={mine.best} aria-valuemin={0} aria-valuemax={nextTier.souls} aria-label="Prochain palier">
                <div className="h-full bg-violet" style={{ width: `${Math.min(100, (mine.best / nextTier.souls) * 100)}%` }} />
              </div>
              <p className="font-body text-[12px] text-slate2 mt-1">
                Encore {nextTier.souls - mine.best} âme{nextTier.souls - mine.best > 1 ? "s" : ""} pour {nextTier.label.toLowerCase()}.
              </p>
            </div>
          )}
          {onShowMap && data.phase === "pendant" && (
            <button onClick={onShowMap} className="mt-3 font-body text-[13px] text-violet underline underline-offset-4">
              Le voir sur la carte
            </button>
          )}
        </div>

        <div className="min-w-0 grid gap-4 content-start">
          <div>
            <div className="font-body text-[12.5px] text-slate2 mb-0.5">À gagner pour toujours</div>
            <ul className="divide-y divide-line">
              {data.tiers.map((t) => (
                <TierRow key={t.souls} t={t} souls={mine.best} />
              ))}
            </ul>
          </div>
          {(data.top?.length ?? 0) > 0 && (
            <div>
              <div className="font-body text-[12.5px] text-slate2 mb-0.5">Les meilleurs chasseurs</div>
              <ol>
                {data.top!.slice(0, 5).map((t) => (
                  <li key={t.companyId} className="flex items-center gap-2 py-1 font-body text-[13px]">
                    <span className="w-4 text-right font-mono2 text-[11px] text-slate2">{t.rank}</span>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.livery }} />
                    <span className="flex-1 truncate">{t.name}</span>
                    <span className="font-mono2 text-[12px] tabular-nums">{t.souls}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* sur la carte du réseau : le fantôme sur sa gare, et ses trois prochaines gares en pointillés */
export function HalloweenMapLayer({ k }: { k: number }) {
  const { data, haunt, next } = useHalloween();
  if (data?.phase !== "pendant") return null;
  const here = haunt ? STATION_COORDS[haunt.station] : null;
  return (
    <g aria-label="Le Train fantôme" pointerEvents="none">
      {next.slice(0, 3).map((h, i) => {
        const p = STATION_COORDS[h.station];
        if (!p) return null;
        return (
          <g key={h.at} opacity={0.75 - i * 0.18}>
            <circle cx={p.x} cy={p.y} r={8 * k} fill="none" stroke={GLOW} strokeWidth={0.9 * k} strokeDasharray={`${1.6 * k} ${1.8 * k}`} />
            <text x={p.x} y={p.y + 15 * k} textAnchor="middle" style={{ font: `400 ${6.5 * k}px 'Space Mono', monospace` }} fill={GLOW} stroke="rgb(var(--c-navy-950))" strokeWidth={2 * k} paintOrder="stroke">
              {hm(h.at)}
            </text>
          </g>
        );
      })}
      {here && haunt && (
        <>
          <circle cx={here.x} cy={here.y} r={13 * k} fill={SPECTRAL} opacity="0.35" filter="url(#map-glow)" />
          {/* la position dans l'attribut, l'animation sur un groupe à part : une transformation CSS remplacerait l'attribut */}
          {/* en haut à droite de la gare : au-dessus, il y a déjà l'étiquette d'affluence */}
          <g transform={`translate(${here.x + 7 * k},${here.y - 27 * k}) scale(${1.35 * k})`}>
            <g className="halloween-float">
              <path d="M3 14.2V7.4a5 5 0 0 1 10 0v6.8l-1.7-1.3-1.6 1.3L8 12.9l-1.7 1.3-1.6-1.3z" fill="#efe9ff" stroke="#2a1d40" strokeWidth="0.9" strokeLinejoin="round" />
              <circle cx="6.3" cy="7.4" r=".9" fill="#2a1d40" />
              <circle cx="9.7" cy="7.4" r=".9" fill="#2a1d40" />
            </g>
          </g>
          <text x={here.x + 18 * k} y={here.y - 30 * k} textAnchor="middle" style={{ font: `700 ${7.5 * k}px 'Space Mono', monospace` }} fill={GLOW} stroke="rgb(var(--c-navy-950))" strokeWidth={2.4 * k} paintOrder="stroke">
            {haunt.station}
          </text>
        </>
      )}
    </g>
  );
}
