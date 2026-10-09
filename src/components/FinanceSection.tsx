import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Emblem } from "./Emblem";
import { PremiumCTA } from "./PremiumCTA";

/* ============================================================
   Finances (1.7) : rapport de la semaine, banque, bourse.
   ============================================================ */

const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`;
const dec = (n: number, d = 2) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });

function useLoad<T>(url: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const load = () =>
    api
      .get(url)
      .then(({ data }) => {
        setData(data);
        setError(false);
      })
      .catch(() => setError(true));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error, load };
}

const Skeleton = () => <div className="h-40 bg-navy-900 animate-skeleton" />;
const Down = ({ what }: { what: string }) => <p className="text-slate2 font-body">{what} ne répond pas pour le moment. Réessayez dans un instant.</p>;

/* ---------------- rapport de la semaine ---------------- */

interface Report {
  from: string;
  to: string;
  current: boolean;
  net: number;
  prevNet: number;
  operating: number;
  prevOperating: number;
  income: { label: string; amount: number }[];
  expenses: { label: string; amount: number }[];
  trips: number;
  incidents: number;
  lines: { lineId: string; name: string; revenue: number; trips: number }[];
}

export function WeeklyReportSection({ isPremium }: { isPremium: boolean }) {
  const [week, setWeek] = useState(0);
  const { data, error } = useLoad<Report>(`/finance/report?week=${week}`, [week]);

  if (error && !data) return <Down what="Le rapport" />;
  if (!data) return <Skeleton />;
  const totalIn = data.income.reduce((a, x) => a + x.amount, 0);
  const totalOut = data.expenses.reduce((a, x) => a + x.amount, 0);
  const trend = data.prevOperating ? Math.round(((data.operating - data.prevOperating) / Math.abs(data.prevOperating)) * 100) : null;
  const maxLine = Math.max(1, ...data.lines.map((l) => l.revenue));
  const last = new Date(new Date(data.to).getTime() - 1).toISOString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex border border-line">
          <button onClick={() => setWeek((w) => Math.min(8, w + 1))} className="px-3 py-1.5 text-slate2 hover:text-offwhite border-r border-line" aria-label="Semaine précédente">‹</button>
          <button onClick={() => setWeek((w) => Math.max(0, w - 1))} disabled={week === 0} className="px-3 py-1.5 text-slate2 hover:text-offwhite disabled:opacity-30" aria-label="Semaine suivante">›</button>
        </div>
        <span className="font-body text-[14px]">
          {data.current ? "Semaine en cours" : "Semaine"} du {day(data.from)} au {day(last)}
        </span>
        <button
          onClick={() => (isPremium ? downloadCsv(data, day(data.from)) : undefined)}
          disabled={!isPremium}
          title={isPremium ? "Télécharger ce rapport pour un tableur" : "Premium : export du rapport en CSV"}
          className="ml-auto text-[11px] font-mono2 uppercase text-cobalt border border-cobalt/40 px-2.5 py-1 hover:bg-cobalt/10 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {isPremium ? "Exporter CSV" : "Premium · Exporter CSV"}
        </button>
      </div>

      {/* l'en-tête du rapport : trois chiffres, comme la une d'un bilan */}
      <div className="grid grid-cols-2 md:grid-cols-4 border border-line divide-x divide-line">
        {[
          { l: "Résultat d'exploitation", v: signed(data.operating), c: data.operating >= 0 ? "text-rail-green" : "text-rail-red", sub: trend == null ? "—" : `${trend >= 0 ? "+" : ""}${trend} % vs semaine d'avant` },
          { l: "Variation de trésorerie", v: signed(data.net), c: data.net >= 0 ? "text-offwhite" : "text-amber", sub: "investissements et banque compris" },
          { l: "Trajets", v: fmt(data.trips), c: "text-offwhite", sub: `${fmt(data.incidents)} incident${data.incidents > 1 ? "s" : ""}` },
          { l: "Meilleure ligne", v: data.lines[0]?.name ?? "—", c: "text-offwhite", sub: data.lines[0] ? `${fmt(data.lines[0].revenue)} pi.` : "" },
        ].map((k) => (
          <div key={k.l} className="px-4 py-3 min-w-0 max-md:[&:nth-child(3)]:border-t max-md:[&:nth-child(4)]:border-t border-line">
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-slate2 font-body">{k.l}</div>
            <div className={`font-mono2 text-xl tabular-nums truncate mt-1 ${k.c}`}>{k.v}</div>
            <div className="text-[11px] text-slate2 font-body mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {[
          { title: "Entrées", rows: data.income, total: totalIn, color: "bg-rail-green" },
          { title: "Sorties", rows: data.expenses, total: totalOut, color: "bg-rail-red/80" },
        ].map((col) => (
          <div key={col.title}>
            <div className="flex items-baseline justify-between border-b border-line pb-1.5 mb-2">
              <span className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-slate2">{col.title}</span>
              <span className="font-mono2 text-sm tabular-nums">{fmt(col.total)} pi.</span>
            </div>
            {col.rows.length === 0 && <p className="text-[12.5px] text-slate2 font-body">Rien cette semaine.</p>}
            {col.rows.map((r) => (
              <div key={r.label} className="py-1.5">
                <div className="flex justify-between text-[13px] font-body">
                  <span>{r.label}</span>
                  <span className="font-mono2 tabular-nums">{fmt(r.amount)}</span>
                </div>
                <div className="h-1 bg-navy-900 mt-1">
                  <div className={`h-full ${col.color}`} style={{ width: `${(r.amount / Math.max(1, col.total)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <MonthStrip isPremium={isPremium} />

      {data.lines.length > 0 && (
        <div>
          <div className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-slate2 border-b border-line pb-1.5 mb-2">Recettes par ligne</div>
          {data.lines.map((l, i) => (
            <div key={l.lineId} className="grid grid-cols-[1.5rem_1fr_auto] md:grid-cols-[1.5rem_14rem_1fr_auto] items-center gap-3 py-1.5">
              <span className="font-mono2 text-[11px] text-slate2">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-body text-[13px] truncate">{l.name}</span>
              <div className="hidden md:block h-2 bg-navy-900">
                <div className="h-full bg-cobalt" style={{ width: `${(l.revenue / maxLine) * 100}%` }} />
              </div>
              <span className="font-mono2 text-[12.5px] tabular-nums text-right">
                {fmt(l.revenue)} <span className="text-slate2">· {fmt(l.trips)} traj.</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Export CSV (Premium) : séparateur « ; » et virgule décimale, pour que le
   fichier s'ouvre tel quel dans un tableur français. */
function downloadCsv(r: Report, label: string) {
  const rows: (string | number)[][] = [["Rapport de la semaine", label], [], ["Rubrique", "Poste", "Montant (pi.)"]];
  for (const x of r.income) rows.push(["Entrées", x.label, x.amount]);
  for (const x of r.expenses) rows.push(["Sorties", x.label, -x.amount]);
  rows.push([], ["Résultat d'exploitation", "", r.operating], ["Variation de trésorerie", "", r.net], ["Trajets", "", r.trips], ["Incidents", "", r.incidents]);
  rows.push([], ["Ligne", "Trajets", "Recettes (pi.)"]);
  for (const l of r.lines) rows.push([l.name, l.trips, l.revenue]);
  const csv = "\ufeff" + rows.map((row) => row.map((c) => (typeof c === "string" && /[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : String(c))).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `reseau-rapport-${new Date(r.from).toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface WeekRow { from: string; to: string; current: boolean; net: number; operating: number; trips: number; incidents: number; income: number; expenses: number; bestLine: string | null }

/* Premium : les quatre dernières semaines côte à côte. */
function MonthStrip({ isPremium }: { isPremium: boolean }) {
  const [weeks, setWeeks] = useState<WeekRow[] | null>(null);
  useEffect(() => {
    if (isPremium) api.get("/finance/report/history").then(({ data }) => setWeeks(data.weeks)).catch(() => setWeeks([]));
  }, [isPremium]);

  if (!isPremium) {
    return (
      <div className="border border-line px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-[12.5px] font-body text-slate2 flex-1 min-w-[240px]">
          Les abonnés comparent leurs quatre dernières semaines d'un coup d'œil et exportent chaque rapport pour un tableur.
        </span>
        <PremiumCTA company={{ isPremium }} compact />
      </div>
    );
  }
  if (!weeks) return <div className="h-24 bg-navy-900 animate-skeleton" />;
  const max = Math.max(1, ...weeks.map((w) => Math.abs(w.operating)));
  return (
    <div>
      <div className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-slate2 border-b border-line pb-1.5 mb-2">Quatre dernières semaines</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[...weeks].reverse().map((w) => (
          <div key={w.from} className={`border px-3 py-2.5 ${w.current ? "border-cobalt/50" : "border-line"}`}>
            <div className="font-mono2 text-[10.5px] uppercase text-slate2">
              {w.current ? "en cours" : `sem. du ${new Date(w.from).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" })}`}
            </div>
            <div className={`font-mono2 text-lg tabular-nums ${w.operating >= 0 ? "text-rail-green" : "text-rail-red"}`}>{signed(w.operating)}</div>
            <div className="h-1 bg-navy-950 mt-1">
              <div className={w.operating >= 0 ? "h-full bg-rail-green" : "h-full bg-rail-red"} style={{ width: `${(Math.abs(w.operating) / max) * 100}%` }} />
            </div>
            <div className="text-[11px] text-slate2 font-body mt-1.5">
              {fmt(w.trips)} trajets{w.bestLine ? ` · ${w.bestLine}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- banque ---------------- */

interface Loan {
  id: string;
  principal: number;
  ratePct: number;
  totalDue: number;
  remaining: number;
  hours: number;
  missed: number;
  createdAt: string;
  closedAt: string | null;
  installment: number;
  payoff: number;
  hoursLeft: number;
}
interface LoansData {
  capacity: { cap: number; debt: number; available: number; open: number; late: boolean };
  reputation: number;
  riskPremium: number;
  maxOpen: number;
  offers: { hours: number; ratePct: number; label: string }[];
  amounts: number[];
  loans: Loan[];
}

export function BankSection({ balance, onChange }: { balance: number; onChange: () => void }) {
  const { data, error, load } = useLoad<LoansData>("/finance/loans");
  const [amount, setAmount] = useState<number | null>(null);
  const [hours, setHours] = useState<number>(72);
  const [busy, setBusy] = useState(false);
  const { showToast, showComposter } = useToast();

  if (error && !data) return <Down what="La banque" />;
  if (!data) return <Skeleton />;
  const offer = data.offers.find((o) => o.hours === hours) ?? data.offers[0];
  const chosen = amount ?? data.amounts.find((a) => a <= data.capacity.available) ?? null;
  const due = chosen ? Math.round(chosen * (1 + offer.ratePct / 100)) : 0;
  const open = data.loans.filter((l) => !l.closedAt);
  const blocked = data.capacity.open >= data.maxOpen ? `${data.maxOpen} emprunts en cours au plus` : data.capacity.late ? "Une échéance est restée impayée" : null;

  async function post(url: string, body: object, done: string) {
    if (busy) return;
    setBusy(true);
    try {
      await api.post(url, body);
      showComposter(done);
      await load();
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6 min-w-0">
        {/* guichet */}
        <div className="border border-line border-t-2 border-t-cobalt">
          <div className="px-5 py-4 border-b border-line flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-xl">Demande de prêt</h3>
            <span className="font-mono2 text-[12px] text-slate2">
              encore {fmt(data.capacity.available)} pi. empruntables · réputation {data.reputation} %
            </span>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate2 font-body mb-2">Montant</div>
              <div className="flex flex-wrap gap-2">
                {data.amounts.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmount(a)}
                    disabled={a > data.capacity.available}
                    className={`font-mono2 text-sm px-3 py-2 border tabular-nums disabled:opacity-30 ${chosen === a ? "border-cobalt text-cobalt bg-cobalt/10" : "border-line hover:border-slate2"}`}
                  >
                    {fmt(a)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate2 font-body mb-2">Durée</div>
              <div className="grid grid-cols-3 gap-2">
                {data.offers.map((o) => (
                  <button
                    key={o.hours}
                    onClick={() => setHours(o.hours)}
                    className={`text-left px-3 py-2 border ${hours === o.hours ? "border-cobalt bg-cobalt/10" : "border-line hover:border-slate2"}`}
                  >
                    <div className="font-body text-sm">{o.label}</div>
                    <div className="font-mono2 text-[11.5px] text-slate2">{dec(o.ratePct, 1)} % d'intérêts</div>
                  </button>
                ))}
              </div>
              {data.riskPremium > 0 && (
                <p className="text-[11.5px] text-amber font-body mt-1.5">
                  Prime de risque : +{dec(data.riskPremium, 1)} point{data.riskPremium >= 2 ? "s" : ""} à cause de votre réputation.
                </p>
              )}
            </div>
            {chosen ? (
              <div className="border border-dashed border-line px-4 py-3 font-mono2 text-[12.5px] grid grid-cols-2 gap-y-1">
                <span className="text-slate2">Vous recevez</span>
                <span className="text-right text-rail-green tabular-nums">+{fmt(chosen)} pi.</span>
                <span className="text-slate2">Vous rendez</span>
                <span className="text-right tabular-nums">{fmt(due)} pi.</span>
                <span className="text-slate2">Échéance horaire</span>
                <span className="text-right tabular-nums">{fmt(Math.ceil(due / offer.hours))} pi. × {offer.hours}</span>
              </div>
            ) : (
              <p className="text-[12.5px] text-slate2 font-body">La banque ne vous prête plus rien pour l'instant : remboursez un emprunt ou faites grandir la compagnie.</p>
            )}
            <button
              onClick={() => chosen && post("/finance/loans", { amount: chosen, hours: offer.hours }, `Prêt de ${fmt(chosen)} pi. accordé`)}
              disabled={!chosen || !!blocked || busy}
              title={blocked ?? undefined}
              className="w-full bg-cobalt text-onaccent text-sm font-semibold uppercase py-2.5 hover:bg-cobalt/90 disabled:opacity-40"
            >
              {blocked ?? "Signer le prêt"}
            </button>
          </div>
        </div>

        {/* emprunts */}
        <div>
          <div className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-slate2 border-b border-line pb-1.5 mb-2">Vos emprunts</div>
          {data.loans.length === 0 && <p className="text-[13px] text-slate2 font-body">Aucun emprunt pour l'instant.</p>}
          <div className="space-y-2">
            {data.loans.map((l) => {
              const paid = 1 - l.remaining / l.totalDue;
              return (
                <div key={l.id} className={`border px-4 py-3 ${l.closedAt ? "border-line opacity-60" : l.missed ? "border-rail-red/50" : "border-line"}`}>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="font-mono2 text-lg tabular-nums">{fmt(l.principal)} pi.</span>
                    <span className="font-mono2 text-[12px] text-slate2">
                      {dec(l.ratePct, 1)} % · {l.hours === 24 ? "1 jour" : `${l.hours / 24} jours`}
                    </span>
                    {l.missed > 0 && !l.closedAt && <span className="font-mono2 text-[11px] uppercase text-rail-red">{l.missed} impayé{l.missed > 1 ? "s" : ""}</span>}
                    <span className="ml-auto font-mono2 text-[12px] text-slate2">
                      {l.closedAt ? "soldé" : `reste ${fmt(l.remaining)} pi. · ${fmt(l.installment)} pi./h · ~${l.hoursLeft} h`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-navy-900 border border-line mt-2">
                    <div className="h-full bg-cobalt" style={{ width: `${Math.round(paid * 100)}%` }} />
                  </div>
                  {!l.closedAt && (
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => post("/finance/loans/repay", { loanId: l.id }, "Emprunt soldé")}
                        disabled={busy || balance < l.payoff}
                        className="text-[11px] font-mono2 uppercase text-cobalt border border-cobalt/40 px-2 py-1 hover:bg-cobalt/10 disabled:opacity-40"
                        title="La moitié des intérêts restants est effacée"
                      >
                        Solder maintenant · {fmt(l.payoff)} pi.
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {open.length > 0 && <p className="text-[11.5px] text-slate2 font-body">Les échéances sont prélevées chaque heure. Si la trésorerie ne suit pas : pénalité de 5 % et un point de réputation.</p>}
      </div>

      <aside className="border border-line p-4 h-max text-[12.5px] font-body text-slate2 space-y-2">
        <div className="font-mono2 text-[10.5px] uppercase tracking-[0.16em] text-offwhite">Conditions de la banque</div>
        <p>Plafond : la moitié de la valeur de votre compagnie, dettes non comprises ({fmt(data.capacity.cap)} pi. aujourd'hui).</p>
        <p>{data.maxOpen} emprunts en même temps au plus, et aucun nouveau prêt tant qu'une échéance est impayée.</p>
        <p>Rembourser en avance efface la moitié des intérêts restants.</p>
        <p>Un emprunt ne gonfle pas votre valeur au classement : ce que vous devez en est retranché.</p>
      </aside>
    </div>
  );
}

/* ---------------- bourse ---------------- */

interface Quote {
  id: string;
  name: string;
  emblem: string | null;
  liveryColor: string;
  price: number;
  change24h: number;
  held: number;
  dividendPerShare: number;
  yieldPct: number;
  history: number[];
  mine: { shares: number; invested: number; value: number } | null;
  buyOne: number;
  listed?: boolean;
}
interface MarketData {
  rules: { shares: number; maxHold: number; maxFloat: number; fee: number; dividendRate: number; dividendHour: number; listingDays: number };
  me: Quote | { id: string; name: string; listed: false; price: number };
  companies: Quote[];
  portfolio: number;
  isPremium: boolean;
  maxOrders: number;
  shareholders: { name: string; emblem: string | null; liveryColor: string; shares: number }[] | null;
  orders: { id: string; issuerId: string; issuerName: string; side: "BUY" | "SELL"; shares: number; limitPrice: number }[] | null;
}

function Spark({ values, up }: { values: number[]; up: boolean }) {
  if (values.length < 2) return <span className="inline-block w-24 h-6" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 96},${22 - ((v - min) / Math.max(1e-9, max - min)) * 20}`).join(" ");
  return (
    <svg width="96" height="24" viewBox="0 0 96 24" className="shrink-0" aria-hidden>
      <polyline points={pts} fill="none" strokeWidth="1.5" className={up ? "stroke-rail-green" : "stroke-rail-red"} />
    </svg>
  );
}

export function StockMarketSection({ balance, onChange }: { balance: number; onChange: () => void }) {
  const { data, error, load } = useLoad<MarketData>("/bourse");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const { showToast, showComposter } = useToast();

  if (error && !data) return <Down what="La bourse" />;
  if (!data) return <Skeleton />;
  const { rules } = data;

  async function trade(q: Quote, side: "buy" | "sell") {
    const n = Math.max(1, qty[q.id] ?? 10);
    if (busy) return;
    setBusy(q.id + side);
    try {
      const { data: r } = await api.post(`/bourse/${side}`, { issuerId: q.id, shares: n });
      showComposter(side === "buy" ? `${n} actions ${q.name} achetées (${fmt(r.cost)} pi.)` : `${n} actions ${q.name} vendues (${fmt(r.proceeds)} pi.)`);
      await load();
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusy(null);
    }
  }

  const holdings = data.companies.filter((c) => c.mine);
  const portfolioValue = holdings.reduce((a, c) => a + (c.mine?.value ?? 0), 0);
  const portfolioCost = holdings.reduce((a, c) => a + (c.mine?.invested ?? 0), 0);
  const me = data.me as Quote & { listed?: boolean };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 border border-line divide-x divide-line">
        <div className="px-4 py-3">
          <div className="text-[10.5px] uppercase tracking-[0.12em] text-slate2 font-body">Votre action</div>
          <div className="font-mono2 text-xl tabular-nums mt-1">{dec(me.price)} pi.</div>
          <div className={`text-[11px] font-mono2 ${me.listed === false ? "text-slate2" : me.change24h >= 0 ? "text-rail-green" : "text-rail-red"}`}>
            {me.listed === false ? `cotée après ${rules.listingDays} jours et une ligne` : `${me.change24h >= 0 ? "+" : ""}${dec(me.change24h, 1)} % sur 24 h`}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10.5px] uppercase tracking-[0.12em] text-slate2 font-body">Vos actionnaires</div>
          <div className="font-mono2 text-xl tabular-nums mt-1">{me.listed === false ? "—" : `${fmt(me.held)} / ${fmt(rules.shares)}`}</div>
          <div className="text-[11px] font-body text-slate2">actions détenues par d'autres</div>
        </div>
        <div className="px-4 py-3 max-md:border-t border-line">
          <div className="text-[10.5px] uppercase tracking-[0.12em] text-slate2 font-body">Portefeuille</div>
          <div className="font-mono2 text-xl tabular-nums mt-1">{fmt(portfolioValue)} pi.</div>
          <div className={`text-[11px] font-mono2 ${portfolioValue >= portfolioCost ? "text-rail-green" : "text-rail-red"}`}>
            {holdings.length ? `${signed(portfolioValue - portfolioCost)} de plus-value` : "aucune action"}
          </div>
        </div>
        <div className="px-4 py-3 max-md:border-t border-line">
          <div className="text-[10.5px] uppercase tracking-[0.12em] text-slate2 font-body">Dividendes</div>
          <div className="font-mono2 text-xl tabular-nums mt-1">{rules.dividendHour} h</div>
          <div className="text-[11px] font-body text-slate2">chaque soir, {Math.round(rules.dividendRate * 100)} % des recettes voyageurs</div>
        </div>
      </div>

      <div className="border border-line overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-[10.5px] text-slate2 font-body uppercase tracking-[0.14em] border-b border-line">
              <th className="py-2 px-4 font-normal">Compagnie</th>
              <th className="py-2 font-normal text-right">Cours</th>
              <th className="py-2 font-normal text-right">24 h</th>
              <th className="py-2 font-normal pl-4">7 jours</th>
              <th className="py-2 font-normal text-right" title="Dividende versé chaque soir par action, rapporté au cours">Div. / jour</th>
              <th className="py-2 font-normal text-right pl-4">Détenu</th>
              <th className="py-2 px-4 font-normal text-right">Ordre</th>
            </tr>
          </thead>
          <tbody>
            {data.companies.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-5 text-slate2 font-body">Aucune autre compagnie cotée pour l'instant.</td>
              </tr>
            )}
            {data.companies.map((c) => {
              const n = Math.max(1, qty[c.id] ?? 10);
              return (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-navy-900/40">
                  <td className="py-2.5 px-4">
                    <span className="flex items-center gap-2 min-w-0">
                      <span style={{ color: c.liveryColor }}>{c.emblem ? <Emblem id={c.emblem} size={13} /> : "■"}</span>
                      <span className="font-body truncate">{c.name}</span>
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono2 tabular-nums">{dec(c.price)}</td>
                  <td className={`py-2.5 text-right font-mono2 tabular-nums text-[12.5px] ${c.change24h >= 0 ? "text-rail-green" : "text-rail-red"}`}>
                    {c.change24h >= 0 ? "▲" : "▼"} {dec(Math.abs(c.change24h), 1)} %
                  </td>
                  <td className="py-2.5 pl-4">
                    <Spark values={c.history} up={(c.history[c.history.length - 1] ?? 0) >= (c.history[0] ?? 0)} />
                  </td>
                  <td className="py-2.5 text-right font-mono2 text-[12.5px] tabular-nums">{dec(c.yieldPct, 1)} %</td>
                  <td className="py-2.5 text-right pl-4 font-mono2 text-[12.5px] tabular-nums">
                    {c.mine ? (
                      <span title={`Payées ${fmt(c.mine.invested)} pi., valent ${fmt(c.mine.value)} pi.`}>
                        {c.mine.shares} <span className={c.mine.value >= c.mine.invested ? "text-rail-green" : "text-rail-red"}>({signed(c.mine.value - c.mine.invested)})</span>
                      </span>
                    ) : (
                      <span className="text-slate2">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min={1}
                        max={rules.maxHold}
                        value={n}
                        onChange={(e) => setQty((q) => ({ ...q, [c.id]: Math.min(rules.maxHold, Math.max(1, Number(e.target.value) || 1)) }))}
                        className="w-14 bg-navy-950 border border-line px-1.5 py-1 font-mono2 text-[12px] text-right"
                        aria-label={`Nombre d'actions ${c.name}`}
                      />
                      <button
                        onClick={() => trade(c, "buy")}
                        disabled={!!busy || balance < c.buyOne * n || (c.mine?.shares ?? 0) + n > rules.maxHold}
                        className="text-[10.5px] font-mono2 uppercase text-rail-green border border-rail-green/40 px-2 py-1 hover:bg-rail-green/10 disabled:opacity-35"
                        title={`≈ ${fmt(c.buyOne * n)} pi.`}
                      >
                        Acheter
                      </button>
                      <button
                        onClick={() => trade(c, "sell")}
                        disabled={!!busy || !c.mine || c.mine.shares < n}
                        className="text-[10.5px] font-mono2 uppercase text-rail-red border border-rail-red/40 px-2 py-1 hover:bg-rail-red/10 disabled:opacity-35"
                      >
                        Vendre
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PremiumBourse data={data} onDone={load} />

      <p className="text-[11.5px] text-slate2 font-body max-w-3xl">
        Le cours suit la valeur de la compagnie et une journée de ses recettes, divisées en {fmt(rules.shares)} actions ; il monte quand les joueurs en achètent.{" "}
        {rules.maxHold} actions au plus par compagnie, {rules.maxFloat} en circulation au total : chaque compagnie garde la majorité. Frais de{" "}
        {Math.round(rules.fee * 100)} % à l'achat comme à la vente.
      </p>
    </div>
  );
}

/* Premium : qui détient vos actions, et des ordres qui s'exécutent seuls. */
function PremiumBourse({ data, onDone }: { data: MarketData; onDone: () => void }) {
  const [issuer, setIssuer] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [shares, setShares] = useState(10);
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  if (!data.isPremium) {
    return (
      <div className="border border-line px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-[12.5px] font-body text-slate2 flex-1 min-w-[240px]">
          Premium : voyez quelles compagnies ont acheté vos actions, et posez des ordres automatiques — acheter quand le cours descend sous un prix, vendre quand il le dépasse — même quand vous n'êtes pas là.
        </span>
        <PremiumCTA company={{ isPremium: false }} compact />
      </div>
    );
  }

  const chosen = data.companies.find((c) => c.id === issuer);
  async function place() {
    if (!chosen || !(Number(limit.replace(",", ".")) > 0)) return;
    setBusy(true);
    try {
      await api.post("/bourse/orders", { issuerId: chosen.id, side, shares, limitPrice: Number(limit.replace(",", ".")) });
      showToast(`Ordre posé : ${side === "BUY" ? "achat" : "vente"} de ${shares} ${chosen.name}`);
      setLimit("");
      onDone();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusy(false);
    }
  }
  async function cancel(id: string) {
    try {
      await api.delete(`/bourse/orders/${id}`);
      onDone();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="border border-line">
        <div className="px-4 py-2.5 border-b border-line flex items-baseline justify-between">
          <span className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-slate2">Ordres automatiques</span>
          <span className="font-mono2 text-[11px] text-slate2">{data.orders?.length ?? 0}/{data.maxOrders}</span>
        </div>
        <div className="p-4 flex flex-wrap items-end gap-2">
          <select value={issuer} onChange={(e) => setIssuer(e.target.value)} className="bg-navy-950 border border-line text-sm px-2 py-1.5 font-body min-w-[160px]" aria-label="Compagnie">
            <option value="">compagnie…</option>
            {data.companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({dec(c.price)})
              </option>
            ))}
          </select>
          <div className="flex border border-line">
            {(["BUY", "SELL"] as const).map((sd) => (
              <button key={sd} onClick={() => setSide(sd)} className={`px-2.5 py-1.5 text-[11px] font-mono2 uppercase ${side === sd ? (sd === "BUY" ? "bg-rail-green/15 text-rail-green" : "bg-rail-red/15 text-rail-red") : "text-slate2"}`}>
                {sd === "BUY" ? "Acheter" : "Vendre"}
              </button>
            ))}
          </div>
          <input type="number" min={1} max={100} value={shares} onChange={(e) => setShares(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} className="w-16 bg-navy-950 border border-line px-2 py-1.5 font-mono2 text-sm text-right" aria-label="Actions" />
          <span className="text-[12px] text-slate2 font-body pb-1.5">{side === "BUY" ? "si le cours ≤" : "si le cours ≥"}</span>
          <input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={chosen ? dec(chosen.price) : "prix"} inputMode="decimal" className="w-20 bg-navy-950 border border-line px-2 py-1.5 font-mono2 text-sm text-right" aria-label="Cours limite" />
          <button onClick={place} disabled={busy || !chosen || !limit || (data.orders?.length ?? 0) >= data.maxOrders} className="text-[11px] font-mono2 uppercase text-cobalt border border-cobalt/40 px-2.5 py-1.5 hover:bg-cobalt/10 disabled:opacity-40">
            Poser l'ordre
          </button>
        </div>
        {(data.orders ?? []).length > 0 && (
          <div className="border-t border-line divide-y divide-line">
            {data.orders!.map((o) => (
              <div key={o.id} className="px-4 py-2 flex items-center gap-3 text-[13px] font-body">
                <span className={`font-mono2 text-[10.5px] uppercase w-14 ${o.side === "BUY" ? "text-rail-green" : "text-rail-red"}`}>{o.side === "BUY" ? "Achat" : "Vente"}</span>
                <span className="flex-1 min-w-0 truncate">
                  {o.shares} × {o.issuerName}
                </span>
                <span className="font-mono2 text-[12px] text-slate2">
                  {o.side === "BUY" ? "≤" : "≥"} {dec(o.limitPrice)}
                </span>
                <button onClick={() => cancel(o.id)} className="text-[10.5px] font-mono2 uppercase text-slate2 hover:text-rail-red">Annuler</button>
              </div>
            ))}
          </div>
        )}
        <p className="px-4 pb-3 text-[11.5px] text-slate2 font-body">Vérifiés toutes les 30 secondes, même hors ligne. Une notification prévient quand un ordre passe.</p>
      </div>

      <div className="border border-line">
        <div className="px-4 py-2.5 border-b border-line font-mono2 text-[11px] uppercase tracking-[0.14em] text-slate2">Vos actionnaires</div>
        {(data.shareholders ?? []).length === 0 ? (
          <p className="px-4 py-3 text-[12.5px] text-slate2 font-body">Personne ne détient encore vos actions.</p>
        ) : (
          <div className="divide-y divide-line">
            {data.shareholders!.map((h) => (
              <div key={h.name} className="px-4 py-2 flex items-center gap-2 text-[13px] font-body">
                <span style={{ color: h.liveryColor }}>{h.emblem ? <Emblem id={h.emblem} size={12} /> : "■"}</span>
                <span className="flex-1 truncate">{h.name}</span>
                <span className="font-mono2 tabular-nums">{h.shares}</span>
                <span className="font-mono2 text-[11px] text-slate2 w-12 text-right">{dec(h.shares / 10, 1)} %</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
