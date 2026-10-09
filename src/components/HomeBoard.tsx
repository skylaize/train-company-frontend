import { useEffect, useState } from "react";
import { TrainPicture } from "./TrainPicture";
import { Gazette, GazetteData } from "./Gazette";
import { modelSpeed } from "../models";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { NetworkData } from "./NetworkPanels";
import { LINE_PALETTE } from "../geo";
import { SeasonData, DIVISION_COLORS } from "./SeasonSection";
import { WorldCard, WorldData } from "./WorldCard";

/* ============================================================
   Tableau de bord (2.0).

   En tête, les prochaines arrivées comme sur un tableau de gare, et le gain
   du jour ; dessous, ce qui demande un regard — les lignes pleines ou vides,
   les rames usées ou en panne — la décision en cours et le défi du jour.
   ============================================================ */

export interface HBTrain {
  id: string;
  name: string;
  model: string;
  status: "IDLE" | "EN_ROUTE" | "MAINTENANCE";
  progress: number;
  wear: number;
  departedAt?: string | null;
  direction?: number;
  cars?: string[];
  lastPassengers?: number | null;
  lastSeats?: number | null;
  line?: { id?: string; departureStation: string; arrivalStation: string; durationMinutes?: number; stops?: string[]; electrified?: boolean } | null;
  // 2.0 : l'atelier
  brokenPart?: string | null;
  partsEta?: string | null;
  workshopUntil?: string | null;
  organs?: { id: string; label: string; wear: number; broken: boolean }[];
}

export interface HBLine {
  id: string;
  departureStation: string;
  arrivalStation: string;
  stops?: string[];
  electrified?: boolean;
}

export interface HBSummary {
  income: number;
  expenses: number;
  net: number;
  lineTrips: number;
  freightDeliveries: number;
  incidents: number;
}

export interface HBDecision {
  id: string;
  title: string;
  expiresAt: string;
}

export interface HBChallenge {
  label: string;
  target: number;
  reward: number;
  progress: number;
  completed: boolean;
}

// les couleurs de la carte : une ligne garde sa couleur d'une page à l'autre
const LINE_COLORS = LINE_PALETTE;
const fmt = (n: number) => Math.abs(Math.round(n)).toLocaleString("fr-FR");

function tripMs(t: HBTrain) {
  const base = (t.line?.durationMinutes ?? 10) * 60_000;
  return base * modelSpeed(t.model) * (1 + 0.03 * (t.cars?.length ?? 0)) * (t.line?.electrified ? 0.9 : 1);
}

// où en est la rame de son trajet, de 0 à 1, calculé à la seconde près
function ratioOf(t: HBTrain, now: number) {
  if (!t.departedAt) return (t.progress ?? 0) / 100;
  return Math.min(1, Math.max(0, (now - new Date(t.departedAt).getTime()) / tripMs(t)));
}

function towardsOf(t: HBTrain) {
  if (!t.line) return "";
  return t.direction === 1 ? t.line.departureStation : t.line.arrivalStation;
}

function etaLabel(t: HBTrain, now: number) {
  const left = Math.max(0, tripMs(t) * (1 - ratioOf(t, now)));
  if (left < 45_000) return "à quai dans un instant";
  return `dans ${Math.ceil(left / 60_000)} min`;
}

/* ---------------- le tableau des arrivées ---------------- */

/* Comme en gare : les prochaines rames à arriver, l'heure, d'où elles viennent,
   combien elles amènent. Le décompte tourne à la seconde. */
function ArrivalsBoard({ trains, onOpenMap }: { trains: HBTrain[]; onOpenMap: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const running = trains.filter((t) => t.status === "EN_ROUTE" && t.line);
  const rows = running
    .map((t) => ({ t, left: Math.max(0, tripMs(t) * (1 - ratioOf(t, now))) }))
    .sort((a, b) => a.left - b.left)
    .slice(0, 5);
  const hhmm = (ms: number) => new Date(now + ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  const fromOf = (t: HBTrain) => (t.direction === 1 ? t.line!.arrivalStation : t.line!.departureStation);
  const countdown = (ms: number) => {
    if (ms < 45_000) return "à quai";
    const m = Math.floor(ms / 60_000), s = Math.floor((ms % 60_000) / 1000);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <section className="border border-line bg-navy-900/60 min-w-0">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-line">
        <h2 className="font-display text-[20px]">Prochaines arrivées</h2>
        <button onClick={onOpenMap} className="text-[13.5px] text-cobalt hover:underline font-body shrink-0">
          Suivre sur la carte
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-[14px] text-slate2 font-body">Aucune rame en route. Affectez une rame à une ligne pour la voir arriver ici.</p>
      ) : (
        <ul>
          {rows.map(({ t, left }, k) => {
            const soon = left < 120_000;
            return (
              <li key={t.id} className={`grid grid-cols-[52px_1fr_auto] sm:grid-cols-[60px_88px_1fr_90px_64px] items-center gap-x-3 px-4 sm:px-5 py-2.5 ${k > 0 ? "border-t border-line/70" : ""}`}>
                <span className="font-mono2 text-[15px] text-amber tabular-nums">{hhmm(left)}</span>
                <span className="hidden sm:block text-[13.5px] text-slate2 font-body truncate">{t.name}</span>
                <span className="min-w-0 font-body">
                  <span className="text-[15px] font-semibold">{towardsOf(t)}</span>
                  <span className="text-[12.5px] text-slate2"> de {fromOf(t)}</span>
                </span>
                <span className="hidden sm:block text-right font-mono2 text-[12.5px] text-slate2 tabular-nums">
                  {t.lastPassengers ? `${t.lastPassengers} voy.` : "—"}
                </span>
                <span className={`text-right font-mono2 text-[13px] tabular-nums ${soon ? "text-rail-green" : "text-offwhite"}`}>{countdown(left)}</span>
              </li>
            );
          })}
        </ul>
      )}
      {running.length > rows.length && (
        <div className="px-5 py-2 border-t border-line text-[12.5px] text-slate2 font-body">
          Et {running.length - rows.length} autre{running.length - rows.length > 1 ? "s" : ""} en route.
        </div>
      )}
    </section>
  );
}

/* ---------------- le petit tracé d'une ligne ---------------- */

export function MiniRoute({ stations, color, width = 64 }: { stations: string[]; color: string; width?: number }) {
  const w = width;
  return (
    <svg width={w} height="16" viewBox={`0 0 ${w} 16`} aria-hidden="true" className="shrink-0">
      <path d={`M5 8 H${w - 5}`} stroke={color} strokeWidth="3" />
      {stations.map((_, k) => {
        const x = 5 + (k * (w - 10)) / Math.max(1, stations.length - 1);
        const end = k === 0 || k === stations.length - 1;
        return end ? <circle key={k} cx={x} cy="8" r="4.5" fill="rgb(var(--c-navy-950))" stroke={color} strokeWidth="2" /> : <circle key={k} cx={x} cy="8" r="3" fill={color} />;
      })}
    </svg>
  );
}

/* ---------------- le tableau ---------------- */

export function HomeBoard({
  livery,
  trains,
  lines,
  network,
  summary,
  decision,
  challenge,
  repairCostPerPoint,
  onOpenMap,
  onOpenLines,
  onOpenDecision,
  onChange,
  season,
  world,
  onOpenSeason,
  gazette,
  onOpenTrain,
}: {
  gazette?: GazetteData | null;
  onOpenTrain?: (id: string) => void;
  livery: string;
  trains: HBTrain[];
  lines: HBLine[];
  network: NetworkData | null;
  summary: HBSummary | null;
  decision: HBDecision | null;
  challenge: HBChallenge | null;
  repairCostPerPoint: number;
  onOpenMap: () => void;
  onOpenLines: () => void;
  onOpenDecision: () => void;
  onChange: () => void;
  season?: SeasonData | null;
  world?: WorldData | null;
  onOpenSeason?: () => void;
}) {
  const { showToast, showComposter } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const now = Date.now();

  // les lignes qui demandent un regard d'abord : pleines (voyageurs à quai), puis les moins remplies
  const lineRows = lines
    .map((l, i) => {
      const r = network?.lines.find((m) => m.lineId === l.id)?.ridership;
      const route = [l.departureStation, ...(l.stops ?? []), l.arrivalStation];
      const trainsOn = trains.filter((t) => t.line && (t.line.id === l.id || (t.line.departureStation === l.departureStation && t.line.arrivalStation === l.arrivalStation)));
      const urgency = r ? (r.left > 0 ? 200 + r.left : r.fill < 50 ? 100 + (50 - r.fill) : 0) : 0;
      return { l, i, r, route, trainsOn, urgency };
    })
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 3);

  // les rames qui demandent un regard : en panne, usées, puis la prochaine arrivée
  const broken = trains.filter((t) => t.status === "MAINTENANCE" && !t.workshopUntil);
  const worn = trains.filter((t) => t.status !== "MAINTENANCE" && t.wear >= 70).sort((a, b) => b.wear - a.wear);
  const next = trains
    .filter((t) => t.status === "EN_ROUTE" && t.line && !worn.includes(t))
    .sort((a, b) => tripMs(a) * (1 - ratioOf(a, now)) - tripMs(b) * (1 - ratioOf(b, now)));
  const attention = [...broken, ...worn, ...next].slice(0, 3);
  const calm = trains.length - attention.length;

  async function repair(t: HBTrain, preventive: boolean) {
    if (busy) return;
    setBusy(t.id);
    try {
      await api.post("/trains/repair", { trainId: t.id });
      showComposter(preventive ? `${t.name} part à l'atelier` : `${t.name} réparée et remise en service`);
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusy(null);
    }
  }

  const left = decision ? Math.max(0, new Date(decision.expiresAt).getTime() - now) : 0;
  const leftLabel = left >= 3600_000 ? `${Math.floor(left / 3600_000)} h ${String(Math.floor((left % 3600_000) / 60_000)).padStart(2, "0")}` : `${Math.ceil(left / 60_000)} min`;

  return (
    <div className="mb-8 flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_300px] items-start">
        <ArrivalsBoard trains={trains} onOpenMap={onOpenMap} />
        <div className="flex flex-col gap-3.5">
          {summary && (
            <div className="bg-amber text-navy-950 px-[18px] py-4 -rotate-[1.2deg] shadow-[4px_4px_0_rgb(var(--c-amber-dim))]">
              <div className="text-[14px] font-medium font-body">{summary.net >= 0 ? "Aujourd'hui, vous avez gagné" : "Aujourd'hui, vous avez dépensé"}</div>
              <div className="font-mono2 text-[40px] font-bold leading-[1.05] mt-0.5">
                {summary.net >= 0 ? "+" : "−"}
                {fmt(summary.net)}
              </div>
              <div className="text-[13px] mt-1 font-body">
                {summary.lineTrips} trajet{summary.lineTrips > 1 ? "s" : ""}, {summary.freightDeliveries} livraison{summary.freightDeliveries > 1 ? "s" : ""}, {summary.incidents} incident
                {summary.incidents > 1 ? "s" : ""}
              </div>
            </div>
          )}
          {decision && (
            <div className="border border-line px-4 py-3.5">
              <div className="text-[12.5px] text-cobalt font-body">Décision, {leftLabel} pour trancher</div>
              <div className="font-display text-[16px] mt-1 leading-tight">{decision.title}</div>
              <button onClick={onOpenDecision} className="mt-2.5 bg-cobalt text-navy-950 px-3 py-1.5 text-[13px] font-semibold">
                Voir les choix
              </button>
            </div>
          )}
          {season?.season && season.me && (
            <button onClick={onOpenSeason} className="text-left border border-line px-4 py-3 hover:border-slate2 transition-colors">
              <div className="flex justify-between items-baseline text-[14px] font-body">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="w-2.5 h-2.5 rotate-45" style={{ background: DIVISION_COLORS[season.me.division] }} />
                  {season.season.name}
                </span>
                <span className="font-mono2 text-amber">
                  {season.me.rank}
                  {season.me.rank === 1 ? "er" : "e"}/{season.me.groupSize}
                </span>
              </div>
              <div className="text-[12.5px] text-slate2 mt-0.5 font-body">
                Groupe {season.me.divisionName}, {season.me.points.toLocaleString("fr-FR")} points
                {season.objectives ? `, ${season.objectives.filter((o) => o.done).length}/${season.objectives.length} objectifs de la semaine` : ""}
              </div>
            </button>
          )}
          {challenge && (
            <div className="border border-line px-4 py-3">
              <div className="flex justify-between text-[14px] font-body">
                <span className="font-semibold">Défi du jour</span>
                <span className="font-mono2 text-amber">
                  {Math.min(challenge.progress, challenge.target)}/{challenge.target}
                </span>
              </div>
              <div className="text-[12.5px] text-slate2 mt-0.5 font-body">
                {challenge.label}, +{challenge.reward} pi.
              </div>
              <div className="flex gap-1 mt-2">
                {Array.from({ length: Math.min(10, challenge.target) }).map((_, k) => (
                  <span key={k} className={`flex-1 h-[5px] ${k < challenge.progress ? "bg-amber" : "bg-line"}`} />
                ))}
              </div>
            </div>
          )}
          {world && <WorldCard data={world} compact />}
        </div>
      </div>

      <div className="grid gap-7 lg:grid-cols-2">
        {/* vos lignes */}
        <section className="min-w-0">
          <h2 className="font-display text-[20px] mb-2">Vos lignes</h2>
          {lineRows.length === 0 && <p className="text-[13.5px] text-slate2 font-body">Tracez une première ligne pour la voir ici.</p>}
          {lineRows.map(({ l, i, r, route, trainsOn }) => {
            const color = LINE_COLORS[i % LINE_COLORS.length];
            const w = 64;
            const tone = !r ? "bg-slate2" : r.left > 0 ? "bg-rail-red" : r.fill >= 60 ? "bg-rail-green" : "bg-amber";
            return (
              <div key={l.id} className="flex items-center gap-3.5 py-2.5 border-b border-line">
                <MiniRoute stations={route} color={color} width={w} />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold font-body truncate">{route.join(", ")}</div>
                  <div className="text-[12.5px] text-slate2 font-body">
                    {trainsOn.length} rame{trainsOn.length > 1 ? "s" : ""}
                    {l.electrified ? ", électrifiée" : ""}
                    {(l.stops?.length ?? 0) >= 2 ? ", omnibus" : ""}
                  </div>
                </div>
                <div className="w-[110px] shrink-0">
                  <div className="h-1.5 bg-line">
                    <div className={`h-full ${tone}`} style={{ width: `${Math.min(100, r?.fill ?? 0)}%` }} />
                  </div>
                  <div className={`text-[12px] mt-1 font-body ${r && r.left > 0 ? "text-[#fca5a5]" : "text-slate2"}`}>
                    {!r ? "—" : r.left > 0 ? `Pleine, ${r.left} à quai` : `${r.fill} % rempli`}
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={onOpenLines} className="mt-3 text-[14px] text-cobalt hover:underline font-body">
            Voir les {lines.length} lignes
          </button>
        </section>

        {/* vos rames */}
        <section className="flex flex-col gap-2.5 min-w-0">
          <h2 className="font-display text-[20px] mb-1">Vos rames</h2>
          {attention.length === 0 && <p className="text-[13.5px] text-slate2 font-body">Le dépôt est vide : achetez une première rame.</p>}
          {attention.map((t) => {
            const isBroken = t.status === "MAINTENANCE" && !t.workshopUntil;
            const isWorn = !isBroken && t.status !== "MAINTENANCE" && t.wear >= 70;
            const cost = Math.ceil(t.wear * repairCostPerPoint);
            const serviceCost = Math.ceil(t.wear * repairCostPerPoint * 0.6);
            const organ = t.brokenPart ? t.organs?.find((o) => o.id === t.brokenPart)?.label ?? "Un organe" : null;
            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 px-3.5 py-2.5 ${isBroken ? "bg-rail-red/10 shadow-[inset_0_0_0_1px_rgb(var(--c-rail-red)/0.35)]" : "bg-navy-900"}`}
              >
                <span className={`shrink-0 w-[84px] ${isBroken ? "opacity-60 grayscale" : ""}`} aria-hidden="true">
                  <TrainPicture model={t.model} skin={(t as { heritage?: { skin?: string } | null }).heritage?.skin} livery={(t as { heritage?: { livery?: string } | null }).heritage?.livery ?? livery} cars={t.cars ?? []} height={34} track={false} fit={false} align="right" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-semibold font-body">{t.name}</div>
                  <div className={`text-[12.5px] font-body truncate ${isBroken ? "text-[#fca5a5]" : isWorn ? "text-amber" : "text-slate2"}`}>
                    {isBroken
                      ? t.partsEta
                        ? `${organ} : pièce livrée à ${new Date(t.partsEta).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                        : organ
                        ? `${organ} hors service, il faut la pièce`
                        : `En panne${t.line ? ` vers ${towardsOf(t)}` : ""}`
                      : isWorn
                      ? `Usée à ${t.wear} %`
                      : t.line
                      ? `Arrive à ${towardsOf(t)} ${etaLabel(t, now)}`
                      : "À quai"}
                  </div>
                </div>
                {isBroken && t.partsEta ? (
                  <button onClick={() => onOpenTrain?.(t.id)} className="shrink-0 border border-amber/50 text-amber px-2.5 py-1.5 text-[12.5px]">
                    Atelier
                  </button>
                ) : isBroken && t.brokenPart ? (
                  <button onClick={() => onOpenTrain?.(t.id)} className="shrink-0 bg-rail-red text-white px-2.5 py-1.5 text-[12.5px] font-semibold">
                    Réparer…
                  </button>
                ) : isBroken ? (
                  <button onClick={() => repair(t, false)} disabled={busy === t.id} className="shrink-0 bg-rail-red text-white px-2.5 py-1.5 text-[12.5px] font-semibold disabled:opacity-50">
                    Réparer, {cost} pi.
                  </button>
                ) : isWorn ? (
                  <button onClick={() => repair(t, true)} disabled={busy === t.id} className="shrink-0 border border-amber/50 text-amber px-2.5 py-1.5 text-[12.5px] disabled:opacity-50" title="Quelques minutes à l'atelier, au tarif réduit">
                    Réviser, {serviceCost} pi.
                  </button>
                ) : t.lastPassengers ? (
                  <span className="shrink-0 font-mono2 text-[12px] text-slate2">{t.lastPassengers} voy.</span>
                ) : null}
              </div>
            );
          })}
          {calm > 0 && <div className="text-[13px] text-slate2 font-body">{calm === 1 ? "L'autre roule sans souci." : `Les ${calm} autres roulent sans souci.`}</div>}
        </section>

      </div>

      {gazette && <Gazette data={gazette} />}
    </div>
  );
}
