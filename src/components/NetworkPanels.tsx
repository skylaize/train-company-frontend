import { useState } from "react";
import { Emblem } from "./Emblem";
import { PremiumCTA, PremiumInfo } from "./PremiumCTA";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

/* ============================================================
   Gares vivantes et concurrence (1.4) — les morceaux d'interface.

   La page des lignes répond à trois questions :
   - où est la demande en ce moment ? (les événements de gare)
   - combien vaut chacune de mes lignes ? (la demande de ses deux gares)
   - à qui je la dispute, et est-ce que je gagne ? (la part des voyageurs)
   ============================================================ */

export interface NetworkStation {
  name: string;
  size: number;
  sizeLabel: string;
  demand: number;
  events: { label: string; multiplier: number; endsAt: string }[];
}

export interface Rival {
  name: string;
  emblem: string | null;
  trains: number;
  share: number;
  reputation?: number;
  expressPct?: number;
  comfortPct?: number;
}

export interface LineMarket {
  lineId: string;
  demand: number;
  running: boolean;
  share: number | null;
  multiplier: number | null;
  leading: boolean | null;
  rivals: Rival[];
  self: { reputation: number; expressPct: number; comfortPct: number; trains: number } | null;
  hub?: number; // 1.5 : multiplicateur de correspondance, 1 = aucune
  // 1.7 : voyageurs par départ, places, remplissage
  ridership?: { perDeparture: number; seats: number; carried: number; left: number; fill: number; trains: number; price: number; idealPrice: number; estimated: boolean; auto?: boolean };
}

export interface SeasonInfo {
  id: string;
  name: string;
  blurb: string;
  stations: string[];
  multiplier: number;
  startsAt: string;
  endsAt: string;
}

export interface NetworkData {
  isPremium: boolean;
  stations: NetworkStation[];
  pairs: { a: string; b: string; companies: number; trains: number; mine: boolean }[];
  lines: LineMarket[];
  upcoming: { station: string; label: string; multiplier: number; startsAt: string; endsAt: string }[] | null;
  upcomingCount: number;
  hubs?: { station: string; lines: number; bonus: number }[];
  hubRule?: { step: number; cap: number };
  season?: { active: SeasonInfo | null; next: SeasonInfo | null };
  // 1.6
  international?: {
    stations: { name: string; country: string; code: string }[];
    licence: {
      owned: boolean;
      cost: number;
      minGrade: number;
      gradeOk: boolean;
      openToAllAt: string | null;
      earlyAccess: boolean;
      canBuy: boolean;
      reason: string | null;
    };
    revenueBonus: number;
    tollRate: number;
  };
  // 1.7 : heures de pointe
  peak?: { hour: number; kind: "pointe" | "creuse" | "nuit" | "normale"; factor: number; until: number; curve: number[] };
  night?: { active: boolean; from: number; to: number; multiplier: number; dayMultiplier: number; minDuration: number };
  // 1.7
  ownedStations?: { station: string; mine: boolean; level: number }[];
}

const dayMonth = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

/* Temps fort de saison (1.5) : bandeau en tête de la page des lignes. */
export function SeasonBanner({ network, onOpenShop }: { network: NetworkData; onOpenShop?: () => void }) {
  const active = network.season?.active;
  const next = network.season?.next;
  if (!active && !next) return null;
  if (!active && next) {
    return (
      <div className="border border-line px-4 py-2.5 mb-4 text-[12.5px] font-body text-slate2">
        Prochain temps fort : <span className="text-offwhite">{next.name}</span>, à partir du {dayMonth(next.startsAt)}.
      </div>
    );
  }
  const a = active!;
  // la date de fin est exclusive (minuit le lendemain) : on affiche le dernier jour
  const lastDay = new Date(new Date(a.endsAt).getTime() - 3600_000).toISOString();
  return (
    <section className="border border-amber/40 bg-amber/5 mb-6 px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
      <div className="flex-1 min-w-[240px]">
        <div className="font-mono2 text-[10.5px] uppercase tracking-[0.14em] text-amber">Temps fort · jusqu'au {dayMonth(lastDay)}</div>
        <div className="font-display text-lg leading-tight mt-0.5">{a.name}</div>
        <p className="text-[12.5px] font-body text-slate2 mt-1">{a.blurb}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {a.stations.map((st) => (
            <span key={st} className="text-[11px] font-mono2 border border-amber/40 text-amber px-1.5 py-0.5">
              {st} {pct(a.multiplier)}
            </span>
          ))}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono2 text-2xl text-amber tabular-nums">{daysLeft(a.endsAt)} j</div>
        <div className="text-[10.5px] font-body text-slate2 uppercase tracking-[0.1em]">restants</div>
        {onOpenShop && (
          <button onClick={onOpenShop} className="mt-2 text-[11px] font-mono2 uppercase text-amber underline underline-offset-2 hover:text-offwhite">
            Édition limitée en boutique
          </button>
        )}
      </div>
    </section>
  );
}

/* Cellule « correspondance » d'une ligne (1.5). */
export function HubCell({ hub }: { hub: number | undefined }) {
  if (!hub || hub <= 1.0001) return <span className="text-slate2 text-[11px] font-body">—</span>;
  return <span className="font-mono2 text-[12px] text-cobalt">+{Math.round((hub - 1) * 100)} %</span>;
}

/* Ce que créerait une nouvelle ligne entre deux gares : les correspondances
   qu'elle ouvre ou renforce, calculées comme sur le serveur — destinations
   distinctes, lignes où roule au moins une rame. */
export function hubPreview(
  lines: { departureStation: string; arrivalStation: string; stops?: string[]; id?: string; trains?: unknown[] }[],
  route: string[],
  rule: { step: number; cap: number } | undefined,
  excludeId?: string | null
) {
  if (!rule || route.length < 2 || route.some((s) => !s) || new Set(route).size !== route.length) return [];
  const all = (l: { departureStation: string; arrivalStation: string; stops?: string[] }) => [l.departureStation, ...(l.stops ?? []), l.arrivalStation];
  // modification d'une ligne sans changer ses gares : rien de nouveau à annoncer
  const edited = excludeId ? lines.find((l) => l.id === excludeId) : null;
  if (edited && [...all(edited)].sort().join("|") === [...route].sort().join("|")) return [];
  const bonus = (n: number) => Math.min(rule.cap, rule.step * Math.max(0, n - 1));
  const served = lines.filter((l) => l.id !== excludeId && (!l.trains || l.trains.length > 0));
  // 1.7 : comme côté serveur, chaque gare d'un itinéraire est reliée à toutes les autres
  return route
    .map((st) => {
      const dests = new Set<string>();
      for (const l of served) {
        const r = all(l);
        if (r.includes(st)) r.forEach((x) => x !== st && dests.add(x));
      }
      const before = dests.size;
      route.forEach((x) => x !== st && dests.add(x));
      const after = dests.size;
      return { station: st, before, after, gain: Math.round((bonus(after) - bonus(before)) * 100), total: Math.round(bonus(after) * 100) };
    })
    .filter((h) => h.after >= 2 && h.after > h.before);
}

const pct = (m: number) => `${m >= 1 ? "+" : "−"}${Math.abs(Math.round((m - 1) * 100))} %`;
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const inMinutes = (iso: string) => Math.max(1, Math.round((new Date(iso).getTime() - Date.now()) / 60_000));

export function stationOf(network: NetworkData | null, name: string) {
  return network?.stations.find((s) => s.name === name) ?? null;
}

export function pairOf(network: NetworkData | null, a: string, b: string) {
  return network?.pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a)) ?? null;
}

/* 1.7 : l'affluence de la journée. Une barre par heure, l'heure en cours
   en ambre : on voit d'un coup d'œil quand vos rames vont déborder. */
export function RushPanel({ network, premium }: { network: NetworkData; premium: boolean }) {
  const p = network.peak;
  if (!p) return null;
  const pctOf = (f: number) => Math.round(Math.abs(f - 1) * 100);
  const sentence =
    p.kind === "pointe"
      ? `Heure de pointe jusqu'à ${p.until} h : ${pctOf(p.factor)} % de voyageurs en plus. Une rame trop petite en laisse sur le quai.`
      : p.kind === "creuse"
      ? `Heures creuses jusqu'à ${p.until} h : ${pctOf(p.factor)} % de voyageurs en moins. Un billet moins cher remplit les rames.`
      : p.kind === "nuit"
      ? `La nuit, jusqu'à ${p.until} h : moitié moins de voyageurs, sauf dans les trains de nuit.`
      : `Affluence ordinaire jusqu'à ${p.until} h (×${p.factor.toFixed(2).replace(".", ",")}).`;
  const max = Math.max(...p.curve);
  const W = 240, H = 44, bw = W / 24;
  return (
    <section className="border border-line mb-6">
      <div className="px-4 py-2.5 border-b border-line flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-slate2">Affluence de la journée</h2>
        <span className="text-[11px] font-body text-slate2">Pointe de 7 h à 9 h et de 17 h à 19 h, creux de 14 h à 16 h.</span>
      </div>
      <div className="px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className={`flex-1 min-w-[220px] font-body text-[13px] ${p.kind === "pointe" ? "text-amber" : "text-offwhite"}`}>
          {sentence}
          {!premium && <span className="block text-[11.5px] text-slate2 mt-1">Premium : le prix automatique recale le billet à chaque changement d'heure.</span>}
        </p>
        <svg width={W} height={H + 12} viewBox={`0 0 ${W} ${H + 12}`} role="img" aria-label={`Affluence heure par heure, ${p.hour} h en cours`} className="shrink-0">
          {p.curve.map((f, h) => {
            const bh = Math.max(2, (f / max) * H);
            const now = h === p.hour;
            const rush = f >= 1.3;
            return (
              <rect
                key={h}
                x={h * bw + 1}
                y={H - bh}
                width={bw - 2}
                height={bh}
                fill={now ? "rgb(var(--c-amber))" : rush ? "rgb(var(--c-cobalt) / 0.7)" : "rgb(var(--c-slate2) / 0.35)"}
              >
                <title>{`${h} h : ×${f.toFixed(2).replace(".", ",")}`}</title>
              </rect>
            );
          })}
          {[0, 6, 12, 18].map((h) => (
            <text key={h} x={h * bw + 1} y={H + 11} fontSize="9" fill="rgb(var(--c-slate2))" fontFamily="Space Mono, monospace">
              {h} h
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}

/* Le tableau des événements : ce qui se passe maintenant, et — pour les
   abonnés — ce qui arrive dans l'heure. */
export function StationEventsPanel({
  network,
  company,
  onChange,
}: {
  network: NetworkData;
  company: PremiumInfo;
  onChange: () => void;
}) {
  const seasonName = network.season?.active?.name;
  const active = network.stations.flatMap((s) => s.events.filter((e) => e.label !== seasonName).map((e) => ({ station: s.name, ...e })));
  const upcoming = network.upcoming ?? [];

  return (
    <section className="border border-line mb-6">
      <div className="px-4 py-2.5 border-b border-line flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-slate2">Gares du moment</h2>
        <span className="text-[11px] font-body text-slate2">
          Une ligne rapporte selon la taille de ses deux gares et ce qui s'y passe.
        </span>
      </div>

      <ul className="divide-y divide-line">
        {active.length === 0 && (
          <li className="px-4 py-3 text-[12.5px] text-slate2 font-body">
            {seasonName
              ? "Aucun autre événement que le temps fort de saison : en dehors de ses gares, la demande est normale."
              : "Aucun événement en cours : la demande est normale partout."}
          </li>
        )}
        {active.map((e) => (
          <li key={`${e.station}-${e.label}`} className="px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className={`font-mono2 text-[12px] w-14 ${e.multiplier >= 1 ? "text-rail-green" : "text-rail-red"}`}>{pct(e.multiplier)}</span>
            <span className="font-body text-[13px] text-offwhite">{e.station}</span>
            <span className="font-body text-[12.5px] text-slate2 flex-1">{e.label}</span>
            <span className="font-mono2 text-[11px] text-slate2">jusqu'à {hhmm(e.endsAt)}</span>
          </li>
        ))}
        {upcoming.map((e) => (
          <li key={`up-${e.station}-${e.label}`} className="px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 bg-cobalt/5">
            <span className={`font-mono2 text-[12px] w-14 ${e.multiplier >= 1 ? "text-rail-green" : "text-rail-red"}`}>{pct(e.multiplier)}</span>
            <span className="font-body text-[13px] text-offwhite">{e.station}</span>
            <span className="font-body text-[12.5px] text-slate2 flex-1">{e.label}</span>
            <span className="font-mono2 text-[11px] text-cobalt">dans {inMinutes(e.startsAt)} min</span>
          </li>
        ))}
      </ul>

      {!network.isPremium && network.upcomingCount > 0 && (
        <div className="px-4 py-3 border-t border-line flex flex-wrap items-center gap-3">
          <span className="text-[12.5px] font-body text-slate2 flex-1 min-w-[220px]">
            {network.upcomingCount === 1 ? "Un événement est annoncé" : `${network.upcomingCount} événements sont annoncés`} pour
            l'heure qui vient. Les abonnés le voient déjà et placent leurs rames.
          </span>
          <PremiumCTA company={company} onChange={onChange} compact />
        </div>
      )}
    </section>
  );
}

/* Cellule « voyageurs » d'une ligne. */
export function LineShareCell({ market }: { market: LineMarket | undefined }) {
  if (!market) return <span className="text-slate2">—</span>;
  if (!market.running) {
    return (
      <span className="text-[11px] font-body text-slate2">
        {market.rivals.length > 0 ? `${market.rivals.length} concurrent${market.rivals.length > 1 ? "s" : ""} · aucune rame` : "aucune rame"}
      </span>
    );
  }
  if (market.rivals.length === 0) {
    return <span className="text-[11px] font-mono2 text-slate2">Seul · 100 %</span>;
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`font-mono2 text-[12px] ${market.leading ? "text-rail-green" : "text-amber"}`}>{Math.round(market.share ?? 0)} %</span>
      <span className="text-[11px] font-body text-slate2">
        face à {market.rivals.length} · {market.multiplier && market.multiplier !== 1 ? pct(market.multiplier) : "±0 %"}
      </span>
    </span>
  );
}

export function DemandCell({ demand }: { demand: number | undefined }) {
  if (demand === undefined) return <span className="text-slate2">—</span>;
  const tone = demand >= 1.1 ? "text-rail-green" : demand < 0.9 ? "text-rail-red" : "text-offwhite";
  return <span className={`font-mono2 text-[12px] ${tone}`}>×{demand.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</span>;
}

/* Détail d'une ligne partagée : qui sont les concurrents, et pourquoi on gagne
   ou on perd. Le détail chiffré est l'avantage Premium ; en gratuit, les noms
   et les parts restent visibles. */
export function RivalsDetail({
  market,
  premium,
  company,
  onChange,
}: {
  market: LineMarket;
  premium: boolean;
  company: PremiumInfo;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (market.rivals.length === 0) return null;

  return (
    <div className="mt-2">
      <button onClick={() => setOpen((v) => !v)} className="text-[11px] font-mono2 uppercase text-cobalt hover:underline">
        {open ? "Masquer la concurrence" : "Voir la concurrence"}
      </button>
      {open && (
        <div className="mt-2 border border-line bg-navy-900/40">
          <table className="w-full text-[12px] font-body">
            <thead>
              <tr className="text-left text-slate2 font-mono2 text-[10px] uppercase tracking-[0.1em] border-b border-line">
                <th className="px-3 py-1.5 font-normal">Compagnie</th>
                <th className="px-3 py-1.5 font-normal text-right">Rames</th>
                <th className="px-3 py-1.5 font-normal text-right">Voyageurs</th>
                {premium && (
                  <>
                    <th className="px-3 py-1.5 font-normal text-right">Réputation</th>
                    <th className="px-3 py-1.5 font-normal text-right">Express</th>
                    <th className="px-3 py-1.5 font-normal text-right">État</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {market.self && (
                <tr className="border-b border-line text-cobalt">
                  <td className="px-3 py-1.5">Vous</td>
                  <td className="px-3 py-1.5 text-right font-mono2">{market.self.trains}</td>
                  <td className="px-3 py-1.5 text-right font-mono2">{Math.round(market.share ?? 0)} %</td>
                  <td className="px-3 py-1.5 text-right font-mono2">{market.self.reputation} %</td>
                  <td className="px-3 py-1.5 text-right font-mono2">{market.self.expressPct} %</td>
                  <td className="px-3 py-1.5 text-right font-mono2">{market.self.comfortPct} %</td>
                </tr>
              )}
              {market.rivals.map((r) => (
                <tr key={r.name} className="border-b border-line last:border-0">
                  <td className="px-3 py-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      {r.emblem && <Emblem id={r.emblem} size={12} />}
                      {r.name}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono2">{r.trains}</td>
                  <td className="px-3 py-1.5 text-right font-mono2">{Math.round(r.share)} %</td>
                  {premium && (
                    <>
                      <td className="px-3 py-1.5 text-right font-mono2">{r.reputation ?? "—"} %</td>
                      <td className="px-3 py-1.5 text-right font-mono2">{r.expressPct ?? "—"} %</td>
                      <td className="px-3 py-1.5 text-right font-mono2">{r.comfortPct ?? "—"} %</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {premium ? (
            <p className="px-3 py-2 text-[11px] text-slate2 border-t border-line">
              Ce qui fait gagner des voyageurs : la réputation, le nombre de rames (avec un rendement décroissant), les rames
              Express et des rames en bon état. Vous êtes prévenu si un concurrent arrive ou vous passe devant.
            </p>
          ) : (
            <div className="px-3 py-2 border-t border-line flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-slate2 flex-1 min-w-[200px]">
                Pourquoi ils gagnent ou perdent (réputation, Express, état des rames) et les alertes quand un concurrent arrive :
                c'est la veille concurrentielle du Premium.
              </span>
              <PremiumCTA company={company} onChange={onChange} compact />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Licence internationale (1.6) : en tête de la page des lignes.
   Achetée, elle se résume à une ligne ; sinon elle dit ce qui manque.
   ============================================================ */
const fmtPi = (n: number) => n.toLocaleString("fr-FR");

export function LicencePanel({ network, onChange }: { network: NetworkData; onChange: () => void }) {
  const intl = network.international;
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  if (!intl) return null;
  const { licence } = intl;
  const places = intl.stations.map((s) => s.name).join(", ");
  const bonus = String(intl.revenueBonus).replace(".", ",");
  const toll = Math.round(intl.tollRate * 100);

  async function buy() {
    setBusy(true);
    try {
      await api.post("/company/licence");
      showToast("Licence internationale obtenue : l'étranger est ouvert à vos lignes");
      onChange();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Achat impossible", "error");
    } finally {
      setBusy(false);
    }
  }

  if (licence.owned) {
    return (
      <div className="border border-line px-4 py-2.5 mb-4 text-[12.5px] font-body text-slate2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-cobalt">Licence internationale</span>
        <span>{places} : recette ×{bonus}, dont {toll} % de péage de sillon.</span>
      </div>
    );
  }

  /* 1.6 : loin du grade requis, une ligne suffit. Le grand encart attendait
     un nouveau venu dès sa première visite, pour une licence qu'il n'aura pas
     avant des jours : c'était du bruit. */
  if (!licence.gradeOk) {
    return (
      <div className="border border-line px-4 py-2.5 mb-4 text-[12.5px] font-body text-slate2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-slate2">Licence internationale</span>
        <span>{places} : ouvertes à vos lignes dès le grade « Baron du rail ».</span>
      </div>
    );
  }

  const lockedForFree = licence.openToAllAt !== null && !licence.earlyAccess;
  return (
    <section className="border border-line mb-6">
      <div className="px-4 py-3 border-b border-line flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-cobalt">Nouveau · Licence internationale</h2>
        {licence.earlyAccess && <span className="font-mono2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 bg-amber/15 text-amber">Accès anticipé Premium</span>}
      </div>
      <div className="px-4 py-4 grid md:grid-cols-[1fr_auto] gap-4 items-center">
        <div className="font-body">
          <p className="text-[13px] text-offwhite leading-snug">
            Six gares à l'étranger : {places}. Une ligne qui passe la frontière rapporte ×{bonus} par trajet, dont {toll} % reversés en péage de sillon.
          </p>
          <ul className="mt-2 text-[12px] space-y-0.5">
            <li className={licence.gradeOk ? "text-rail-green" : "text-slate2"}>{licence.gradeOk ? "✓" : "○"} Grade « Baron du rail »</li>
            <li className="text-slate2">○ {fmtPi(licence.cost)} pi. en trésorerie, payés une fois</li>
            {lockedForFree && (
              <li className="text-amber">
                ○ Ouverte à tous le {new Date(licence.openToAllAt!).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} — les abonnés Premium y ont accès dès maintenant
              </li>
            )}
          </ul>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          {lockedForFree ? (
            <PremiumCTA company={{ isPremium: network.isPremium }} compact />
          ) : (
            <button
              onClick={buy}
              disabled={busy || !licence.canBuy}
              className="px-4 py-2 text-[11px] bg-cobalt text-onaccent font-mono2 uppercase tracking-wide disabled:opacity-40"
            >
              {busy ? "Achat…" : `Acheter la licence · ${fmtPi(licence.cost)} pi.`}
            </button>
          )}
          {!licence.canBuy && licence.reason && !lockedForFree && <span className="text-[11.5px] text-slate2 font-body">{licence.reason}</span>}
        </div>
      </div>
    </section>
  );
}
