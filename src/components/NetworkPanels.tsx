import { useState } from "react";
import { Emblem } from "./Emblem";
import { PremiumCTA, PremiumInfo } from "./PremiumCTA";

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
}

export interface NetworkData {
  isPremium: boolean;
  stations: NetworkStation[];
  pairs: { a: string; b: string; companies: number; trains: number; mine: boolean }[];
  lines: LineMarket[];
  upcoming: { station: string; label: string; multiplier: number; startsAt: string; endsAt: string }[] | null;
  upcomingCount: number;
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
  const active = network.stations.flatMap((s) => s.events.map((e) => ({ station: s.name, ...e })));
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
          <li className="px-4 py-3 text-[12.5px] text-slate2 font-body">Aucun événement en cours : la demande est normale partout.</li>
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
