import { useEffect, useState } from "react";
import { SeasonPass } from "./SeasonPass";
import { api } from "../api/client";
import { WorldCard, WorldData } from "./WorldCard";

/* ============================================================
   Saisons (2.0).

   Quatre semaines, un classement qui repart à zéro, des divisions par
   taille. La page dit d'abord où l'on en est, puis montre le groupe de
   douze, les objectifs de la semaine et ce que la saison rapporte.
   ============================================================ */

export interface SeasonData {
  season: null | {
    id: string;
    number: number;
    name: string;
    startsAt: string;
    endsAt: string;
    week: number;
    weeks: number;
    weekEndsAt: string;
  };
  me?: { division: number; divisionName: string; groupNo: number; points: number; rank: number; groupSize: number };
  group?: { rank: number; companyId: string; name: string; liveryColor: string; points: number; trend: number; isMe: boolean }[];
  movers?: number;
  divisions?: { id: number; name: string; count: number }[];
  objectives?: { kind: string; label: string; target: number; points: number; progress: number; done: boolean }[];
  reward?: { title: string; livery: string; liveryName: string; cut: number };
  scoring?: { label: string; points: string }[];
  last?: { name: string; finalRank: number | null; outcome: string | null; rewarded: boolean } | null;
}

export const DIVISION_COLORS = ["#b45309", "#94a3b8", "#f59e0b", "#e2e8f0"];
const fmt = (n: number) => n.toLocaleString("fr-FR");

export function countdown(iso: string, now = Date.now()) {
  const ms = Math.max(0, new Date(iso).getTime() - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d} j ${String(h).padStart(2, "0")} h` : `${h} h ${String(m).padStart(2, "0")} min`;
}

/* La phrase d'en-tête de la page Saison, reprise par l'en-tête général. */
export function seasonLead(data: SeasonData | null) {
  if (!data?.season || !data.me) return null;
  const { me, movers = 0, divisions = [] } = data;
  const top = me.division === 3;
  const next = divisions[me.division + 1]?.name;
  if (me.points === 0) return `Saison ouverte : chaque trajet vous rapporte des points dans votre groupe ${me.divisionName}.`;
  if (movers && me.rank <= movers && next) return `Vous êtes ${me.rank}${me.rank === 1 ? "er" : "e"} de votre groupe ${me.divisionName} : restez sur le podium et vous montez en ${next}.`;
  if (movers && me.rank > me.groupSize - movers && me.division > 0) return `Vous êtes ${me.rank}e sur ${me.groupSize} : attention, les trois derniers redescendent.`;
  if (top) return `Vous êtes ${me.rank}${me.rank === 1 ? "er" : "e"} de votre groupe Platine, la plus haute division.`;
  return `Vous êtes ${me.rank}e de votre groupe ${me.divisionName}, avec ${fmt(me.points)} points.`;
}

export function SeasonSection({ data, world, onReload, companyName = "Votre compagnie", onChange }: { data: SeasonData | null; world: WorldData | null; onReload: () => void; companyName?: string; onChange?: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    onReload();
    // la page relit la saison à l'ouverture
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) return <p className="text-slate2 font-body text-sm">Chargement de la saison…</p>;
  if (!data.season || !data.me) return <p className="text-slate2 font-body text-sm">La première saison n'a pas encore commencé : elle ouvre avec la 2.0, revenez très vite.</p>;
  const { season, me, group = [], movers = 0, divisions = [], objectives = [], reward, scoring = [], last } = data;

  return (
    <div className="flex flex-col gap-8">
      {last && last.finalRank && (
        <div className="rounded-control bg-cobalt/[0.08] px-3.5 py-2.5 font-body text-[14px]">
          {last.name} : {last.finalRank}
          {last.finalRank === 1 ? "er" : "e"} de votre groupe
          {last.outcome === "MONTEE" ? ", vous êtes monté de division" : last.outcome === "DESCENTE" ? ", vous êtes redescendu d'une division" : ""}.
          {last.rewarded ? " La livrée et le titre de la saison sont dans vos couleurs et vos titres." : ""}
        </div>
      )}

      {/* 2.0 : le Pass de saison */}
      <SeasonPass companyName={companyName} onChange={onChange} />

      {/* l'échelle des divisions */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        {divisions.map((d) => {
          const mine = d.id === me.division;
          return (
            <div key={d.id} className={`flex-1 px-3.5 py-2.5 border rounded-card ${mine ? "border-cobalt/60 bg-cobalt/[0.06]" : "border-line bg-navy-900/40"}`}>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: DIVISION_COLORS[d.id] }} />
                <span className="font-display text-[16px]">{d.name}</span>
                {mine && <span className="ml-auto text-[12px] text-cobalt font-body">votre division</span>}
              </div>
              <div className="text-[12.5px] text-slate2 font-body mt-0.5">
                {d.count} compagnie{d.count > 1 ? "s" : ""}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* le groupe */}
        <section className="min-w-0">
          <div className="flex flex-wrap justify-between items-baseline gap-2 mb-2">
            <h2 className="font-display text-[20px]">
              Division {me.divisionName}, groupe {me.groupNo}
            </h2>
            <span className="text-[12.5px] text-slate2 font-body">
              Fin de la saison dans <span className="font-mono2 text-amber">{countdown(season.endsAt, now)}</span>
            </span>
          </div>
          <div className="flex flex-col">
            {group.map((g) => {
              const up = movers && g.rank <= movers && me.division < 3;
              const down = movers && g.rank > group.length - movers && me.division > 0;
              return (
                <div key={g.companyId}>
                  {movers > 0 && g.rank === movers + 1 && me.division < 3 && <Divider tone="text-rail-green" bar="bg-rail-green/40" text={`les ${movers} premiers montent en ${divisions[me.division + 1]?.name}`} />}
                  {movers > 0 && g.rank === group.length - movers + 1 && me.division > 0 && <Divider tone="text-rail-red" bar="bg-rail-red/40" text={`les ${movers} derniers redescendent en ${divisions[me.division - 1]?.name}`} />}
                  <div className={`grid grid-cols-[4px_30px_minmax(0,1fr)_42px_72px] items-center gap-3 py-2 pl-1.5 pr-3 rounded-control ${g.isMe ? "bg-cobalt/[0.08] shadow-[inset_0_0_0_1px_rgb(var(--c-cobalt)/0.5)]" : ""}`}>
                    <span className={`self-stretch my-1 rounded-full ${up ? "bg-rail-green" : down ? "bg-rail-red" : ""}`} />
                    <span className={`font-mono2 text-[14px] text-right ${g.isMe ? "text-offwhite" : "text-slate2"}`}>{g.rank}</span>
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2.5 h-2.5 shrink-0 rounded-[3px]" style={{ background: g.liveryColor }} />
                      <span className={`text-[14.5px] font-body truncate ${g.isMe ? "font-semibold" : ""}`}>{g.name}</span>
                      {g.isMe && <span className="text-[12px] text-cobalt font-body">vous</span>}
                    </span>
                    <span className={`font-mono2 text-[12px] text-right ${g.trend > 0 ? "text-rail-green" : g.trend < 0 ? "text-rail-red" : "text-slate2/60"}`} title="Évolution du rang depuis hier">
                      {g.trend > 0 ? `+${g.trend}` : g.trend < 0 ? `−${-g.trend}` : "="}
                    </span>
                    <span className={`font-mono2 text-[15px] text-right tabular-nums ${g.isMe ? "text-amber" : ""}`}>{fmt(g.points)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {movers === 0 && <p className="text-[12.5px] text-slate2 font-body mt-2">Moins de six compagnies dans ce groupe : personne ne monte ni ne descend cette saison.</p>}
        </section>

        {/* la semaine et ce que rapporte la saison */}
        <section className="flex flex-col gap-6 min-w-0">
          <div>
            <div className="flex flex-wrap justify-between items-baseline gap-2">
              <h2 className="font-display text-[20px]">Objectifs de la semaine</h2>
              <span className="text-[12.5px] text-slate2 font-body">
                semaine {season.week} sur {season.weeks}, nouveaux dans {countdown(season.weekEndsAt, now)}
              </span>
            </div>
            {objectives.map((o) => (
              <div key={o.kind} className="py-2.5 border-b border-line">
                <div className="flex justify-between gap-3 text-[14px] font-body">
                  <span className={o.done ? "text-slate2 line-through" : ""}>{o.label}</span>
                  <span className={`font-mono2 shrink-0 ${o.done ? "text-rail-green" : "text-amber"}`}>+{o.points}</span>
                </div>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <span className="flex-1 h-[5px] bg-line">
                    <span className={`block h-full ${o.done ? "bg-rail-green" : "bg-amber"}`} style={{ width: `${(o.progress / o.target) * 100}%` }} />
                  </span>
                  <span className="font-mono2 text-[12px] text-slate2 tabular-nums">
                    {o.progress}/{o.target}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {reward && (
              <div className="border border-line px-4 py-3.5 rounded-card bg-navy-900/40">
                <div className="text-[14px] font-semibold font-body">En fin de saison</div>
                <div className="flex items-center gap-3 mt-2.5">
                  <span className="w-10 h-5 shrink-0" style={{ background: `linear-gradient(90deg, ${reward.livery} 0 60%, #f8fafc 60% 66%, ${reward.livery} 66%)` }} />
                  <span className="text-[13px] font-body leading-snug">
                    Livrée « {reward.liveryName} » et le titre <b>{reward.title}</b>
                  </span>
                </div>
                <p className="text-[12.5px] text-slate2 font-body mt-2">Pour les {reward.cut} premiers de chaque groupe. Jamais en boutique.</p>
              </div>
            )}
            <div className="border border-line px-4 py-3.5 rounded-card bg-navy-900/40">
              <div className="text-[14px] font-semibold font-body">Gagner des points</div>
              <div className="mt-1.5">
                {scoring.map((s) => (
                  <div key={s.label} className="flex justify-between gap-3 text-[13px] font-body py-0.5">
                    <span className="text-slate2">{s.label}</span>
                    <span className="font-mono2 shrink-0">{s.points}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {world && <WorldCard data={world} />}
        </section>
      </div>
    </div>
  );
}

function Divider({ tone, bar, text }: { tone: string; bar: string; text: string }) {
  return (
    <div className={`flex items-center gap-2.5 py-1.5 pl-4 pr-3 text-[12px] font-body ${tone}`}>
      <span className={`flex-1 h-px ${bar}`} />
      {text}
      <span className={`flex-1 h-px ${bar}`} />
    </div>
  );
}

/* Chargement partagé par le tableau de bord. */
export async function loadSeason(): Promise<SeasonData | null> {
  try {
    const { data } = await api.get("/season");
    return data;
  } catch {
    return null;
  }
}
