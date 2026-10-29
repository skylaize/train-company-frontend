import { PARIS_NOTE } from "../models";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { PartsPanel, TrackPanel } from "./EconomyMarkets";

/* ============================================================
   2.4 : Énergie & carbone.

   La page répond à trois questions : combien me coûtent mes trains (gazole
   et courant, heure par heure), combien je vais payer lundi (taxe carbone),
   et qu'est-ce que je peux faire pour payer moins (cuves, contrats,
   centrales, électrification). Les pièces détachées et l'état des voies ont
   leur onglet.
   ============================================================ */

type Tab = "energie" | "carbone" | "pieces" | "voies";

interface Meter { hour: string; kwh: number; liters: number; produced: number; co2: number; cost: number; income: number; settled: boolean; trial: boolean }
interface Plant { id: string; kind: string; label: string; station: string; produced: number; outputNow: number; builtAt: string }
interface CatalogItem { kind: string; label: string; cost: number; kwh: number; sites: string[]; anywhere: boolean }
interface Advice { lineId: string; name: string; tripsWeek: number; co2Week: number; electrifyCost: number; weeklySaving: number }

export interface EnergyData {
  trial: { active: boolean; until: string | null };
  prices: {
    diesel: { now: number; base: number; shock: string | null; mine: number };
    power: { now: number; base: number; profile: string; shock: string | null; mine: number };
    history: { kind: "DIESEL" | "POWER"; value: number; at: string }[];
    outage: { region: string; until: string } | null;
  };
  contracts: { diesel: { price: number; until: string } | null; power: { price: number; until: string } | null; days: number; fee: number };
  tank: { tanks: number; liters: number; capacity: number; tankCost: number; tankLiters: number; maxTanks: number };
  battery: { kwh: number; capacity: number; offPeak: boolean };
  offerPrice: number | null;
  fuelBlocked: boolean;
  meters: Meter[];
  plants: Plant[];
  catalog: CatalogItem[];
  maxPlants: number;
  carbon: {
    week: number;
    quota: number;
    valuation: number;
    rate: number;
    estimate: number;
    bracket: { index: number; from: number; to: number | null; rate: number };
    brackets: { from: number; rate: number }[];
    bills: { week: string; emitted: number; taxable: number; rate: number; amount: number; trial: boolean }[];
    advice: Advice[];
  };
}

export const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
export const money = (n: number, digits = 2) => n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const dayHour = (iso: string) => new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const hourLabel = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit" }).replace(/\D/g, "");
export const compact = (n: number) => (Math.abs(n) >= 1_000_000 ? `${money(n / 1_000_000, 1)} M` : Math.abs(n) >= 10_000 ? `${fmt(n / 1000)} k` : fmt(n));

export function SectionTitle({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3 border-b border-line pb-2">
      <h2 className="font-display text-xl leading-none">{title}</h2>
      {aside && <span className="font-body text-[12.5px] text-slate2 text-right tabular-nums">{aside}</span>}
    </div>
  );
}

export function Gauge({ value, max, tone = "cobalt", label }: { value: number; max: number; tone?: "cobalt" | "amber" | "green" | "red"; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const color = tone === "amber" ? "bg-amber" : tone === "green" ? "bg-rail-green" : tone === "red" ? "bg-rail-red" : "bg-cobalt";
  return (
    <div className="h-2 rounded-full bg-navy-800 overflow-hidden" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} aria-label={label}>
      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Btn({ children, onClick, disabled, tone = "primary", busy }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: "primary" | "ghost" | "danger" | "amber"; busy?: boolean }) {
  const cls =
    tone === "primary"
      ? "bg-cobalt text-onaccent hover:brightness-110"
      : tone === "amber"
      ? "bg-amber text-onaccent hover:brightness-110"
      : tone === "danger"
      ? "border border-rail-red/50 text-rail-red hover:bg-rail-red/10"
      : "border border-line text-offwhite hover:border-slate2";
  return (
    <button onClick={onClick} disabled={disabled || busy} className={`px-3.5 py-2 rounded-control font-body text-[13.5px] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}>
      {busy ? "…" : children}
    </button>
  );
}

/* Petite courbe des cours sur sept jours, sans bibliothèque. */
function PriceChart({ points, color, unit }: { points: { value: number; at: string }[]; color: string; unit: string }) {
  if (points.length < 2) return <p className="font-body text-[13px] text-slate2">Le relevé des cours commence : la courbe apparaîtra dans quelques heures.</p>;
  const W = 520, H = 90, pad = 4;
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals) * 0.95, hi = Math.max(...vals) * 1.05;
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - lo) / (hi - lo || 1)) * (H - pad * 2);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Cours sur sept jours, dernier ${money(last.value, 3)} ${unit}`}>
        <path d={`${d} L${x(points.length - 1)},${H} L${x(0)},${H} Z`} fill={color} opacity="0.12" />
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        <circle cx={x(points.length - 1)} cy={y(last.value)} r="3.5" fill={color} />
      </svg>
      <figcaption className="flex justify-between font-body text-[12px] text-slate2 tabular-nums mt-1">
        <span>il y a 7 jours</span>
        <span>
          min {money(Math.min(...vals), 3)} · max {money(Math.max(...vals), 3)} {unit}
        </span>
      </figcaption>
    </figure>
  );
}

/* Barres de la facture d'énergie heure par heure (24 h). */
function HourBars({ meters }: { meters: Meter[] }) {
  const last = meters.slice(-24);
  if (!last.length) return <p className="font-body text-[13px] text-slate2">Pas encore de consommation relevée : elle s'affiche dès le premier trajet.</p>;
  const max = Math.max(1, ...last.map((m) => Math.max(m.cost, m.income)));
  return (
    <div>
      <div className="flex items-end gap-[3px] h-24" role="img" aria-label="Facture d'énergie, heure par heure">
        {last.map((m) => (
          <div key={m.hour} className="flex-1 flex flex-col justify-end h-full" title={`${hourLabel(m.hour)} h : ${fmt(m.liters)} L, ${fmt(m.kwh)} kWh, ${money(m.co2, 2)} t de CO₂ · ${fmt(m.cost)} pi. payés, ${fmt(m.income)} pi. encaissés${m.settled ? "" : " (heure en cours)"}`}>
            {m.income > 0 && <div className="bg-rail-green/70 rounded-t-sm" style={{ height: `${(m.income / max) * 100}%` }} />}
            <div className={`${m.settled ? "bg-amber/80" : "bg-amber/30"} rounded-t-sm`} style={{ height: `${Math.max(2, (m.cost / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between font-body text-[11.5px] text-slate2 mt-1 tabular-nums">
        <span>{hourLabel(last[0].hour)} h</span>
        <span className="flex gap-3">
          <span><span className="inline-block w-2 h-2 rounded-sm bg-amber/80 mr-1" />payé</span>
          <span><span className="inline-block w-2 h-2 rounded-sm bg-rail-green/70 mr-1" />revendu</span>
        </span>
        <span>{hourLabel(last[last.length - 1].hour)} h</span>
      </div>
      <Consumption meters={last} />
    </div>
  );
}

/* 2.4 : ce que la compagnie consomme vraiment (litres, kWh, CO₂), et pas
   seulement ce que ça coûte. Le détail heure par heure se déplie : sur
   téléphone, l'infobulle des barres ne s'affiche pas. */
function Consumption({ meters }: { meters: Meter[] }) {
  const total = (k: "liters" | "kwh" | "produced" | "co2") => meters.reduce((a, m) => a + (m[k] ?? 0), 0);
  const rows = [...meters].reverse();
  return (
    <div className="mt-5">
      <div className="font-body text-[13px] text-slate2 mb-2">Consommation, dernières 24 h</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Figure label="Gazole" value={`${fmt(total("liters"))} L`} />
        <Figure label="Courant" value={`${fmt(total("kwh"))} kWh`} />
        <Figure label="Produit par vos centrales" value={`${fmt(total("produced"))} kWh`} />
        <Figure label="CO₂ émis" value={`${money(total("co2"), 1)} t`} />
      </div>
      <details className="mt-3 group">
        <summary className="cursor-pointer select-none font-body text-[13px] text-cobalt hover:underline underline-offset-[3px] list-none">
          <span className="group-open:hidden">Voir le détail heure par heure</span>
          <span className="hidden group-open:inline">Masquer le détail</span>
        </summary>
        <div className="mt-2 border border-line rounded-card overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-max whitespace-nowrap text-[12.5px] font-body tabular-nums">
            <thead>
              <tr className="text-left text-slate2 border-b border-line">
                <th className="px-3 py-1.5 font-normal">Heure</th>
                <th className="px-3 py-1.5 font-normal text-right">Gazole</th>
                <th className="px-3 py-1.5 font-normal text-right">Courant</th>
                <th className="px-3 py-1.5 font-normal text-right">Produit</th>
                <th className="px-3 py-1.5 font-normal text-right">CO₂</th>
                <th className="px-3 py-1.5 font-normal text-right">Facture</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.hour} className="border-b border-line last:border-0">
                  <td className="px-3 py-1.5">
                    {hourLabel(m.hour)} h{!m.settled && <span className="ml-1.5 text-[11.5px] text-amber">en cours</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono2">{fmt(m.liters)} L</td>
                  <td className="px-3 py-1.5 text-right font-mono2">{fmt(m.kwh)} kWh</td>
                  <td className="px-3 py-1.5 text-right font-mono2">{fmt(m.produced)} kWh</td>
                  <td className="px-3 py-1.5 text-right font-mono2">{money(m.co2, 2)} t</td>
                  <td className="px-3 py-1.5 text-right font-mono2">
                    {m.settled || m.cost ? `${fmt(m.cost - m.income)} pi.` : "à la fin de l'heure"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line rounded-card bg-navy-900/40 px-3 py-2">
      <div className="font-body text-[12px] text-slate2">{label}</div>
      <div className="font-mono2 text-[17px] tabular-nums text-offwhite">{value}</div>
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "amber" | "red" | "green" }) {
  const color = tone === "amber" ? "text-amber" : tone === "red" ? "text-rail-red" : tone === "green" ? "text-rail-green" : "text-offwhite";
  return (
    <div className="border border-line rounded-card bg-navy-900/40 px-4 py-3">
      <div className="font-body text-[12.5px] text-slate2">{label}</div>
      <div className={`font-mono2 text-2xl tabular-nums leading-tight mt-0.5 ${color}`}>{value}</div>
      {sub && <div className="font-body text-[12.5px] text-slate2 mt-1">{sub}</div>}
    </div>
  );
}

export function EconomySection({ balance, onChange }: { balance: number; onChange: () => void }) {
  const [tab, setTab] = useState<Tab>(() => {
    try {
      return (localStorage.getItem("reseau.energie.onglet") as Tab) || "energie";
    } catch {
      return "energie";
    }
  });
  const [data, setData] = useState<EnergyData | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    api
      .get("/economy/energy")
      .then((r) => {
        setData(r.data);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);
  const pick = (t: Tab) => {
    setTab(t);
    try {
      localStorage.setItem("reseau.energie.onglet", t);
    } catch {
      /* stockage refusé : l'onglet vaut pour la visite */
    }
  };
  const refresh = () => {
    load();
    onChange();
  };

  if (error && !data) return <p className="text-slate2 font-body">L'énergie ne répond pas pour le moment. Réessayez dans un instant.</p>;
  if (!data) return <div className="h-40 bg-navy-900 animate-skeleton rounded-card" />;

  const tabs: { id: Tab; label: string }[] = [
    { id: "energie", label: "Énergie" },
    { id: "carbone", label: "Carbone" },
    { id: "pieces", label: "Pièces détachées" },
    { id: "voies", label: "Voies" },
  ];

  return (
    <div className="space-y-8">
      {data.trial.active && data.trial.until && (
        <div className="border border-cobalt/40 bg-cobalt/5 rounded-card px-4 py-3 font-body text-[14px]">
          <b>Période d'essai jusqu'au {dayHour(data.trial.until)}.</b>{" "}
          <span className="text-slate2">
            Gazole, courant et taxe carbone sont calculés et affichés, mais rien n'est prélevé : regardez ce que vous paieriez, et préparez-vous.
          </span>
        </div>
      )}
      {data.fuelBlocked && (
        <div className="border border-rail-red/50 bg-rail-red/5 rounded-card px-4 py-3 font-body text-[14px]">
          <b className="text-rail-red">Votre dernière facture d'énergie n'a pas pu être payée.</b>{" "}
          <span className="text-slate2">Vos rames thermiques attendent au dépôt jusqu'à la prochaine facture réglée. Renflouez la trésorerie ou passez à l'électrique.</span>
        </div>
      )}
      <div role="tablist" className="inline-flex max-w-full gap-1 p-1 overflow-x-auto rounded-control bg-navy-900/70 border border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => pick(t.id)}
            className={`shrink-0 px-3.5 py-1.5 text-[13.5px] font-body transition-colors rounded-[calc(var(--r-control)-3px)] ${tab === t.id ? "bg-navy-700/70 text-offwhite font-medium shadow-sm" : "text-slate2 hover:text-offwhite"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "energie" && <EnergyPanel data={data} balance={balance} onDone={refresh} />}
      {tab === "carbone" && <CarbonPanel data={data} onDone={refresh} />}
      {tab === "pieces" && <PartsPanel balance={balance} onDone={refresh} />}
      {tab === "voies" && <TrackPanel balance={balance} onDone={refresh} />}
    </div>
  );
}

/* ---------------- Énergie ---------------- */

// 2.4.2 : les centrales qui stockent sans produire
const STORAGE = ["BATTERIE", "BATTERIE_XL", "STEP"];

function EnergyPanel({ data, balance, onDone }: { data: EnergyData; balance: number; onDone: () => void }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [offer, setOffer] = useState(data.offerPrice !== null ? String(data.offerPrice).replace(".", ",") : "");
  const [site, setSite] = useState<Record<string, string>>({});
  const act = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      showToast(ok);
      onDone();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Action impossible", "error");
    } finally {
      setBusy(null);
    }
  };

  const day = data.meters.filter((m) => new Date(m.hour).getTime() > Date.now() - 24 * 3_600_000);
  const sum = (k: keyof Meter) => day.reduce((a, m) => a + (m[k] as number), 0);
  const diesel = data.prices.history.filter((h) => h.kind === "DIESEL");
  const power = data.prices.history.filter((h) => h.kind === "POWER");
  const room = data.tank.capacity - data.tank.liters;
  const fillCost = Math.round(room * data.prices.diesel.now);
  const plantsLeft = data.maxPlants - data.plants.length;

  return (
    <div className="space-y-10">
      <section>
        <div className="grid gap-3 sm:grid-cols-3">
          <Tile
            label="Gazole, à la pompe"
            value={`${money(data.prices.diesel.now)} pi./L`}
            tone={data.prices.diesel.now > data.prices.diesel.base * 1.2 ? "red" : data.prices.diesel.now < data.prices.diesel.base * 0.9 ? "green" : undefined}
            sub={data.prices.diesel.shock ?? (data.contracts.diesel ? `Votre contrat : ${money(data.contracts.diesel.price)} pi./L` : `Prix de référence ${money(data.prices.diesel.base)} pi./L`)}
          />
          <Tile
            label={`Courant, ${data.prices.power.profile}`}
            value={`${money(data.prices.power.now, 3)} pi./kWh`}
            tone={data.prices.power.now > data.prices.power.base * 1.3 ? "red" : data.prices.power.now < data.prices.power.base * 0.8 ? "green" : undefined}
            sub={data.prices.power.shock ?? (data.contracts.power ? `Votre contrat : ${money(data.contracts.power.price, 3)} pi./kWh` : `Plus cher de 7 h à 9 h et de 17 h à 20 h${PARIS_NOTE}`)}
          />
          {data.prices.outage ? (
            <Tile label="Panne de sous-station" value={data.prices.outage.region} tone="amber" sub={`Rames électriques arrêtées jusqu'à ${new Date(data.prices.outage.until).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`} />
          ) : (
            <Tile label="Votre facture, 24 h" value={`${fmt(sum("cost") - sum("income"))} pi.`} sub={`${fmt(sum("liters"))} L · ${fmt(sum("kwh"))} kWh · ${money(sum("co2"), 1)} t de CO₂`} />
          )}
        </div>
      </section>

      <section>
        <SectionTitle title="Votre énergie, heure par heure" aside="la facture se règle à la fin de chaque heure" />
        <HourBars meters={data.meters} />
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <div>
            <div className="font-body text-[13px] text-slate2 mb-1">Gazole, 7 jours</div>
            <PriceChart points={diesel} color="rgb(var(--c-amber))" unit="pi./L" />
          </div>
          <div>
            <div className="font-body text-[13px] text-slate2 mb-1">Courant, 7 jours (prix moyen, hors heure de pointe)</div>
            <PriceChart points={power} color="rgb(var(--c-cobalt))" unit="pi./kWh" />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle title="Gazole" aside={`${fmt(data.tank.liters)} / ${fmt(data.tank.capacity)} L en cuve`} />
        <p className="text-[13.5px] text-slate2 font-body max-w-3xl mb-4">
          Une rame sur une ligne non électrifiée consomme environ {money(1.5, 1)} L par minute de trajet. Elle puise d'abord dans vos cuves, payées au prix du jour où vous les avez remplies,
          puis à la pompe. Remplissez quand le gazole baisse ; un contrat à prix fixe vous protège d'une flambée pendant {data.contracts.days} jours (+{Math.round(data.contracts.fee * 100)} % de frais).
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="border border-line rounded-card bg-navy-900/40 p-4 space-y-3">
            <div className="flex justify-between font-body text-[13.5px]">
              <span>Cuves</span>
              <span className="tabular-nums text-slate2">
                {data.tank.tanks} / {data.tank.maxTanks}
              </span>
            </div>
            <Gauge value={data.tank.liters} max={Math.max(1, data.tank.capacity)} tone="amber" label="Gazole en cuve" />
            <div className="flex flex-wrap gap-2">
              <Btn tone="ghost" busy={busy === "tank"} disabled={data.tank.tanks >= data.tank.maxTanks || balance < data.tank.tankCost} onClick={() => act("tank", () => api.post("/economy/tanks", { qty: 1 }), "Cuve installée au dépôt")}>
                Cuve de {fmt(data.tank.tankLiters)} L · {fmt(data.tank.tankCost)} pi.
              </Btn>
              <Btn busy={busy === "fill"} disabled={room < 1 || balance < fillCost} onClick={() => act("fill", () => api.post("/economy/tanks/fill"), "Cuves pleines")}>
                Faire le plein · {fmt(fillCost)} pi.
              </Btn>
            </div>
            {data.trial.active && room >= 1 && <p className="font-body text-[12px] text-slate2">Pendant l'essai, le gazole est gratuit : inutile de remplir tout de suite.</p>}
          </div>
          <div className="border border-line rounded-card bg-navy-900/40 p-4 space-y-3">
            <div className="font-body text-[13.5px]">Contrat gazole à prix fixe</div>
            {data.contracts.diesel ? (
              <p className="font-body text-[13.5px] text-slate2">
                <b className="text-offwhite">{money(data.contracts.diesel.price)} pi./L</b> jusqu'au {dayHour(data.contracts.diesel.until)}.
              </p>
            ) : (
              <>
                <p className="font-body text-[13px] text-slate2">
                  Bloquez {money(data.prices.diesel.now * (1 + data.contracts.fee))} pi./L pendant {data.contracts.days} jours, quoi qu'il arrive au pétrole.
                </p>
                <Btn tone="ghost" busy={busy === "cd"} onClick={() => act("cd", () => api.post("/economy/contracts", { kind: "DIESEL" }), "Contrat de gazole signé")}>
                  Signer le contrat
                </Btn>
              </>
            )}
          </div>
          <div className="border border-line rounded-card bg-navy-900/40 p-4 space-y-3">
            <div className="font-body text-[13.5px]">Contrat d'électricité à prix fixe</div>
            {data.contracts.power ? (
              <p className="font-body text-[13.5px] text-slate2">
                <b className="text-offwhite">{money(data.contracts.power.price, 3)} pi./kWh</b> à toute heure, jusqu'au {dayHour(data.contracts.power.until)}.
              </p>
            ) : (
              <>
                <p className="font-body text-[13px] text-slate2">Un seul prix à toute heure, même en pointe et par grand froid, pendant {data.contracts.days} jours.</p>
                <Btn tone="ghost" busy={busy === "cp"} onClick={() => act("cp", () => api.post("/economy/contracts", { kind: "POWER" }), "Contrat d'électricité signé")}>
                  Signer le contrat
                </Btn>
              </>
            )}
          </div>
        </div>
      </section>

      <section>
        <SectionTitle title="Vos centrales" aside={`${data.plants.length} / ${data.maxPlants}`} />
        <p className="text-[13.5px] text-slate2 font-body max-w-3xl mb-4">
          Le courant que vous produisez sert d'abord vos rames, puis remplit vos batteries ; le surplus part aux autres joueurs à votre prix s'il bat le réseau, sinon au réseau à 80 % de son prix.
          Votre propre courant ne compte pas dans la taxe carbone. La production suit la vraie météo de la gare.
        </p>
        {data.plants.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 mb-5">
            {data.plants.map((p) => (
              <div key={p.id} className="border border-line rounded-card bg-navy-900/40 px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-body text-[12px] text-slate2">{p.label}</div>
                  <div className="font-display text-xl leading-tight truncate">{p.station}</div>
                  <div className="font-body text-[12.5px] text-slate2 tabular-nums">
                    {STORAGE.includes(p.kind) ? "stocke le surplus et le courant des heures creuses" : `${fmt(p.outputNow)} kWh/h en ce moment · ${fmt(p.produced)} kWh depuis la construction`}
                  </div>
                </div>
                <Btn tone="danger" busy={busy === `sell-${p.id}`} onClick={() => act(`sell-${p.id}`, () => api.delete(`/economy/plants/${p.id}`), "Centrale revendue (moitié du prix)")}>
                  Revendre
                </Btn>
              </div>
            ))}
          </div>
        )}
        {/* 2.4.2 : six cartes, trois qui produisent puis trois qui stockent */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.catalog.map((c) => {
            const chosen = site[c.kind] ?? c.sites[0] ?? "";
            return (
              <div key={c.kind} className="border border-line rounded-card bg-navy-900/40 p-4 flex flex-col gap-2">
                <div className="font-display text-lg leading-tight">{c.label}</div>
                <div className="font-body text-[13px] text-slate2 flex-1">
                  {c.kind === "SOLAIRE" && `${fmt(c.kwh)} kWh/h en plein soleil, rien la nuit. Dans le Sud.`}
                  {c.kind === "EOLIEN" && `Jusqu'à ${fmt(c.kwh)} kWh/h selon le vent réel. Sur la côte ou dans le Nord.`}
                  {c.kind === "BARRAGE" && `${fmt(c.kwh)} kWh/h jour et nuit. En montagne.`}
                  {c.kind === "BATTERIE" && `Stocke ${fmt(c.kwh)} kWh : le surplus du jour, ou le courant des heures creuses pour la pointe.`}
                  {c.kind === "BATTERIE_XL" && `Stocke ${fmt(c.kwh)} kWh en une seule place de centrale. Un peu plus chère au kWh que trois batteries.`}
                  {c.kind === "STEP" && `Stocke ${fmt(c.kwh)} kWh en remontant l'eau d'un lac de barrage : le stockage le moins cher au kWh. En montagne.`}
                </div>
                {c.sites.length ? (
                  <select
                    value={chosen}
                    onChange={(e) => setSite((s) => ({ ...s, [c.kind]: e.target.value }))}
                    className="bg-navy-800 border border-line rounded-control px-2 py-1.5 font-body text-[13.5px]"
                    aria-label={`Gare de la centrale ${c.label}`}
                  >
                    {c.sites.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="font-body text-[12.5px] text-slate2">Aucune de vos gares ne convient : {c.kind === "BARRAGE" || c.kind === "STEP" ? "desservez une gare de montagne" : c.kind === "SOLAIRE" ? "desservez une gare du Sud" : "desservez une gare de la côte ou du Nord"}.</p>
                )}
                <Btn
                  busy={busy === `build-${c.kind}`}
                  disabled={!chosen || plantsLeft <= 0 || balance < c.cost}
                  onClick={() => act(`build-${c.kind}`, () => api.post("/economy/plants", { kind: c.kind, station: chosen }), `${c.label} construit à ${chosen}`)}
                >
                  Construire · {fmt(c.cost)} pi.
                </Btn>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle title="Batterie et revente" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="border border-line rounded-card bg-navy-900/40 p-4 space-y-3">
            <div className="flex justify-between font-body text-[13.5px]">
              <span>Batteries</span>
              <span className="tabular-nums text-slate2">
                {fmt(data.battery.kwh)} / {fmt(data.battery.capacity)} kWh
              </span>
            </div>
            <Gauge value={data.battery.kwh} max={Math.max(1, data.battery.capacity)} tone="green" label="Charge des batteries" />
            <label className="flex items-center gap-2 font-body text-[13.5px] cursor-pointer">
              <input
                type="checkbox"
                checked={data.battery.offPeak}
                disabled={busy === "offpeak" || data.battery.capacity === 0}
                onChange={(e) => act("offpeak", () => api.patch("/economy/settings", { batteryOffPeak: e.target.checked }), e.target.checked ? "Recharge aux heures creuses activée" : "Recharge aux heures creuses coupée")}
                className="accent-cobalt"
              />
              Recharger au réseau aux heures creuses (la nuit, et en plein soleil l'été)
            </label>
            {data.battery.capacity === 0 && <p className="font-body text-[12.5px] text-slate2">Construisez une batterie pour stocker du courant.</p>}
          </div>
          <div className="border border-line rounded-card bg-navy-900/40 p-4 space-y-3">
            <div className="font-body text-[13.5px]">Vendre votre surplus aux autres joueurs</div>
            <p className="font-body text-[13px] text-slate2">
              Fixez votre prix au kWh. Il ne trouve preneur que s'il est moins cher que le réseau ({money(data.prices.power.now, 3)} pi./kWh en ce moment). Sans prix, le surplus part au réseau.
            </p>
            <div className="flex gap-2 items-center">
              <input
                inputMode="decimal"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                placeholder="ex. 0,18"
                className="w-28 bg-navy-800 border border-line rounded-control px-2 py-1.5 font-mono2 text-[14px] tabular-nums"
                aria-label="Prix de vente du kWh"
              />
              <span className="font-body text-[13px] text-slate2">pi./kWh</span>
              <Btn
                tone="ghost"
                busy={busy === "offer"}
                onClick={() => {
                  const v = offer.trim() === "" ? null : Number(offer.replace(",", "."));
                  act("offer", () => api.patch("/economy/settings", { offerPrice: v }), v === null ? "Le surplus part au réseau" : "Prix de vente enregistré");
                }}
              >
                Enregistrer
              </Btn>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Carbone ---------------- */

function CarbonPanel({ data, onDone }: { data: EnergyData; onDone: () => void }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const c = data.carbon;
  const over = c.week > c.quota;
  const sorted = [...c.brackets].sort((a, b) => a.from - b.from);
  const electrify = async (a: Advice) => {
    setBusy(a.lineId);
    try {
      await api.post("/infrastructure/electrify", { lineId: a.lineId });
      showToast(`${a.name} électrifiée`);
      onDone();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Électrification impossible", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="grid gap-3 sm:grid-cols-3">
          <Tile label="CO₂ émis depuis lundi" value={`${money(c.week, 1)} t`} tone={over ? "amber" : "green"} sub={`Quota gratuit : ${fmt(c.quota)} t par semaine`} />
          <Tile label="Prix de la tonne pour vous" value={c.rate > 0 ? `${money(c.rate, 1)} pi.` : "exonérée"} sub={`Valeur de la compagnie : ${compact(c.valuation)} pi.`} />
          <Tile
            label={data.trial.active ? "Vous paieriez lundi" : "À payer lundi"}
            value={`${fmt(c.estimate)} pi.`}
            tone={c.estimate > 0 ? "red" : "green"}
            sub={c.estimate > 0 ? `${money(Math.max(0, c.week - c.quota), 1)} t au-delà du quota, au rythme actuel` : over ? "votre taille vous exonère" : "vous êtes sous le quota"}
          />
        </div>
        <div className="mt-4">
          <Gauge value={c.week} max={Math.max(c.quota * 2, c.week)} tone={over ? "amber" : "green"} label="CO₂ de la semaine" />
          <div className="flex justify-between font-body text-[12px] text-slate2 mt-1 tabular-nums">
            <span>0 t</span>
            <span>quota {fmt(c.quota)} t</span>
            <span>{fmt(Math.max(c.quota * 2, c.week))} t</span>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle title="Le barème" aside="plus la compagnie est grande, plus la tonne coûte cher" />
        <p className="text-[13.5px] text-slate2 font-body max-w-3xl mb-4">
          Comme l'impôt sur le revenu : chaque tranche de la valeur de votre compagnie a son prix de la tonne, et le prix appliqué est la moyenne, pondérée par la part de votre valeur dans chaque
          tranche. Il monte en douceur, sans effet de seuil. Rames thermiques et courant du réseau émettent ; votre propre courant (centrales), non.
        </p>
        <div className="border border-line rounded-card overflow-x-auto">
          <table className="w-full min-w-[480px] font-body text-[13.5px]">
            <thead className="bg-navy-900/60 text-slate2 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Valeur de la compagnie</th>
                <th className="px-4 py-2 font-medium text-right">Prix de la tonne dans la tranche</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((b, i) => {
                const to = sorted[i + 1]?.from;
                const here = c.bracket.index === i;
                return (
                  <tr key={b.from} className={`border-t border-line ${here ? "bg-amber/10" : ""}`}>
                    <td className="px-4 py-2 tabular-nums">
                      {to ? `${compact(b.from)} à ${compact(to)} pi.` : `plus de ${compact(b.from)} pi.`}
                      {here && <span className="ml-2 text-amber text-[12px] font-medium">vous êtes ici</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{b.rate > 0 ? `${fmt(b.rate)} pi.` : "exonérée"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {c.advice.length > 0 && (
        <section>
          <SectionTitle title="Ce que l'électrification vous ferait gagner" aside="par semaine, au trafic de la semaine passée" />
          <div className="space-y-2">
            {c.advice.map((a) => (
              <div key={a.lineId} className="border border-line rounded-card bg-navy-900/40 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex-1 min-w-[180px]">
                  <div className="font-display text-lg leading-tight">{a.name}</div>
                  <div className="font-body text-[12.5px] text-slate2 tabular-nums">
                    {fmt(a.tripsWeek)} trajets · {money(a.co2Week, 1)} t de CO₂ par semaine
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono2 text-lg tabular-nums text-rail-green">+{fmt(a.weeklySaving)} pi./sem.</div>
                  <div className="font-body text-[12px] text-slate2">gazole, courant et taxe compris</div>
                </div>
                <Btn busy={busy === a.lineId} onClick={() => electrify(a)}>
                  Électrifier · {fmt(a.electrifyCost)} pi.
                </Btn>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle title="Vos factures" />
        {c.bills.length === 0 ? (
          <p className="font-body text-[13.5px] text-slate2">La première facture tombera lundi à minuit.</p>
        ) : (
          <div className="border border-line rounded-card overflow-x-auto">
            <table className="w-full min-w-[480px] font-body text-[13.5px]">
              <thead className="bg-navy-900/60 text-slate2 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Semaine du</th>
                  <th className="px-4 py-2 font-medium text-right">Émis</th>
                  <th className="px-4 py-2 font-medium text-right">Taxé</th>
                  <th className="px-4 py-2 font-medium text-right">Prix de la tonne</th>
                  <th className="px-4 py-2 font-medium text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {c.bills.map((b) => (
                  <tr key={b.week} className="border-t border-line tabular-nums">
                    <td className="px-4 py-2">{b.week.split("-").reverse().join("/")}</td>
                    <td className="px-4 py-2 text-right">{money(b.emitted, 1)} t</td>
                    <td className="px-4 py-2 text-right">{money(b.taxable, 1)} t</td>
                    <td className="px-4 py-2 text-right">{money(b.rate, 1)} pi.</td>
                    <td className="px-4 py-2 text-right">
                      {fmt(b.amount)} pi.{b.trial && <span className="ml-1 text-[11.5px] text-cobalt">essai, non prélevé</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
