import { useEffect, useState } from "react";
import { api } from "../api/client";
import { STATION_COORDS } from "../geo";
import { TrainPicture } from "./TrainPicture";

/* ============================================================
   2.1.2 : le Train des 200.

   Un train spécial fait le tour de France en 48 h par toutes les gares du
   réseau. Son horaire est fixé au départ : on calcule ici où il en est, à
   la seconde, sans redemander au serveur. Les noms peints sur ses voitures
   et la prime du joueur, eux, viennent du serveur (toutes les minutes).
   ============================================================ */

export const TRAIN200_GOLD = "#d4a017";

export interface Train200Data {
  exists: boolean;
  startsAt?: string;
  endsAt?: string;
  reward?: number;
  route?: { station: string; at: string }[];
  painted?: { name: string; livery: string; station: string; at: string }[];
  mine?: { station: string; at: string; reward: number } | null;
  nextForMe?: { station: string; at: string } | null;
}

/* un seul appel partagé entre la carte de la flotte et la carte du réseau */
let cache: { at: number; data: Train200Data | null } | null = null;
let inflight: Promise<Train200Data | null> | null = null;
function fetchTrain200(force = false) {
  if (!force && cache && Date.now() - cache.at < 55_000) return Promise.resolve(cache.data);
  if (inflight) return inflight;
  inflight = api
    .get("/train200")
    .then((r) => r.data as Train200Data)
    .catch(() => null)
    .then((data) => {
      cache = { at: Date.now(), data };
      inflight = null;
      return data;
    });
  return inflight;
}

export function useTrain200() {
  const [data, setData] = useState<Train200Data | null>(cache?.data ?? null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let alive = true;
    const load = () => void fetchTrain200().then((d) => alive && setData(d));
    load();
    const slow = setInterval(load, 60_000);
    const fast = setInterval(() => setNow(Date.now()), 2_000);
    return () => {
      alive = false;
      clearInterval(slow);
      clearInterval(fast);
    };
  }, []);
  return { data, now };
}

export type Train200Phase = "attente" | "route" | "arrive";

export function train200State(data: Train200Data | null, now: number) {
  if (!data?.exists || !data.route || data.route.length < 2) return null;
  const route = data.route;
  const times = route.map((s) => new Date(s.at).getTime());
  const start = times[0], end = times[times.length - 1];
  const phase: Train200Phase = now < start ? "attente" : now >= end ? "arrive" : "route";
  let i = 0;
  while (i < route.length - 2 && times[i + 1] <= now) i++;
  const ratio = phase === "attente" ? 0 : phase === "arrive" ? 1 : Math.min(1, Math.max(0, (now - times[i]) / (times[i + 1] - times[i] || 1)));
  const from = route[phase === "arrive" ? route.length - 1 : i];
  const to = route[phase === "arrive" ? route.length - 1 : i + 1];
  const a = STATION_COORDS[from.station], b = STATION_COORDS[to.station];
  const pos = a && b ? { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI } : null;
  return {
    phase,
    from,
    to,
    pos,
    progress: Math.min(1, Math.max(0, (now - start) / (end - start))),
    passed: phase === "attente" ? 0 : i + (phase === "arrive" ? 2 : 1),
    total: route.length,
  };
}

function hhmm(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("fr-FR", { weekday: "long" });
  return `${day} à ${d.getHours()} h ${String(d.getMinutes()).padStart(2, "0")}`;
}

function soon(iso: string, now: number) {
  const ms = new Date(iso).getTime() - now;
  if (ms < 60_000) return "dans un instant";
  const m = Math.round(ms / 60_000);
  if (m < 60) return `dans ${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `dans ${h} h ${String(m % 60).padStart(2, "0")}` : hhmm(iso);
}

/* la carte sur la flotte : où en est le train, et quand il passe chez soi */
export function Train200Card({ onShowMap }: { onShowMap?: () => void }) {
  const { data, now } = useTrain200();
  const st = train200State(data, now);
  if (!data || !st) return null;
  const painted = data.painted ?? [];
  const reward = data.reward ?? 250;

  return (
    <div className="border border-[#d4a017]/50 bg-[#d4a017]/[0.04] mb-6 overflow-hidden">
      <div className="relative h-[86px] border-b border-[#d4a017]/30 bg-gradient-to-b from-navy-900 to-navy-950" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-0">
          <TrainPicture model="STANDARD" livery={TRAIN200_GOLD} height={70} align="center" label="Train des 200" />
        </div>
        <span className="absolute top-2 left-3 font-mono2 text-[10.5px] tracking-[0.18em] text-[#d4a017]">TRAIN DES 200</span>
      </div>
      <div className="p-4">
        {st.phase === "attente" && (
          <p className="font-body text-[14px]">
            Départ de <b>{st.from.station}</b> {soon(st.from.at, now)}, pour 48 h de tournée par les {st.total} gares du réseau.
          </p>
        )}
        {st.phase === "route" && (
          <p className="font-body text-[14px]">
            Entre <b>{st.from.station}</b> et <b>{st.to.station}</b>, arrivée {soon(st.to.at, now)}. Gare {Math.min(st.passed, st.total)} sur {st.total}.
          </p>
        )}
        {st.phase === "arrive" && (
          <p className="font-body text-[14px]">
            Arrivé au terminus de {st.to.station} après 48 h de tournée. {painted.length} compagnies sont peintes sur ses voitures.
          </p>
        )}
        <div className="h-[3px] bg-navy-900 mt-3" aria-hidden="true">
          <div className="h-full bg-[#d4a017] transition-all duration-1000" style={{ width: `${st.progress * 100}%` }} />
        </div>

        <p className="font-body text-[13.5px] mt-3">
          {data.mine ? (
            <span className="text-rail-green">
              Il est passé chez vous, à {data.mine.station} : +{data.mine.reward} pi., et votre nom est sur ses voitures.
            </span>
          ) : data.nextForMe ? (
            <span className="text-slate2">
              Il passe chez vous à <b className="text-offwhite">{data.nextForMe.station}</b> {soon(data.nextForMe.at, now)} : +{reward} pi. et votre nom sur ses voitures.
            </span>
          ) : st.phase !== "arrive" ? (
            <span className="text-slate2">Il ne passe par aucune de vos gares. Ouvrez une ligne sur son trajet pour qu'il s'arrête chez vous (+{reward} pi.).</span>
          ) : null}
        </p>

        {painted.length > 0 && (
          <div className="mt-3">
            <div className="font-mono2 text-[10.5px] uppercase tracking-[0.14em] text-slate2 mb-1.5">Peintes sur ses voitures</div>
            <div className="flex flex-wrap gap-1.5">
              {painted
                .slice(-8)
                .reverse()
                .map((p) => (
                  <span key={p.name} className="inline-flex items-center gap-1.5 border border-line px-2 py-0.5 font-body text-[12px]" title={`Gare de ${p.station}`}>
                    <span className="w-2 h-2 rounded-full" style={{ background: p.livery }} />
                    {p.name}
                  </span>
                ))}
              {painted.length > 8 && <span className="font-body text-[12px] text-slate2 px-1 py-0.5">et {painted.length - 8} autres</span>}
            </div>
          </div>
        )}
        {onShowMap && st.phase !== "arrive" && (
          <button onClick={onShowMap} className="mt-3 font-body text-[13px] text-[#d4a017] underline underline-offset-4">
            Le suivre sur la carte
          </button>
        )}
      </div>
    </div>
  );
}

/* sur la carte du réseau : son trajet en pointillés dorés, et le train lui-même */
export function Train200MapLayer({ k }: { k: number }) {
  const { data, now } = useTrain200();
  const st = train200State(data, now);
  if (!data?.route || !st || st.phase === "arrive") return null;
  const pts = data.route.map((s) => STATION_COORDS[s.station]).filter(Boolean);
  return (
    <g aria-label="Le Train des 200" pointerEvents="none">
      <polyline
        points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke={TRAIN200_GOLD}
        strokeWidth={1.4 * k}
        strokeDasharray={`${4 * k} ${3 * k}`}
        strokeLinejoin="round"
        opacity="0.55"
      />
      {st.pos && (
        <>
          <circle cx={st.pos.x} cy={st.pos.y} r={10 * k} fill={TRAIN200_GOLD} opacity="0.3" filter="url(#map-glow)" />
          <g transform={`translate(${st.pos.x},${st.pos.y}) rotate(${st.pos.angle}) scale(${k})`}>
            <rect x="-9" y="-3.2" width="18" height="6.4" rx="3.2" fill={TRAIN200_GOLD} stroke="#1a1408" strokeWidth="0.9" />
            <rect x="4.5" y="-1.8" width="3" height="3.6" rx="0.8" fill="#1a1408" />
          </g>
          <text
            x={st.pos.x}
            y={st.pos.y - 11 * k}
            textAnchor="middle"
            style={{ font: `700 ${8 * k}px 'Space Mono', monospace` }}
            fill={TRAIN200_GOLD}
            stroke="#0b0f19"
            strokeWidth={2.4 * k}
            paintOrder="stroke"
          >
            200
          </text>
        </>
      )}
    </g>
  );
}
