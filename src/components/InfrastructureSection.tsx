import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Emblem } from "./Emblem";

/* ============================================================
   Infrastructures (1.7) : gares, ateliers, électrification.

   Trois placements qui ne roulent pas mais qui rapportent ou font économiser.
   La page répond pour chacun à : combien ça coûte, combien ça rapporte, et
   est-ce que mon réseau en profite.
   ============================================================ */

interface Rules {
  maxStations: number;
  nextStationCap?: { rank: string; max: number } | null; // 2.1
  stationPrices: Record<string, number>;
  maxLevel: number;
  platformFee: number;
  shopPerPassenger: number;
  shopLevelMult: Record<string, number>;
  homeBonusStep: number;
  homeBonusCap: number;
  buyoutCost: number;
  buyoutPayout: number;
  sellBack: number;
  // 2.6 : commerces et gares surveillées
  shopSlots?: Record<string, number>;
  shopPriceShare?: number;
  shopSellBack?: number;
  shopRent?: number;
  shopsPerRankStation?: number;
  maxShops?: number;
  maxWatches?: number;
  isPremium?: boolean;
  protectionHours: number;
  workshopCost: number;
  maxWorkshops: number;
  workshopWear: number;
  electricSpeed: number;
  electricWear: number;
  // 2.1
  doubleSpeed?: number;
  doubleDelay?: number;
  cadenceStep?: number;
  cadenceCap?: number;
  yardCost?: number;
  maxYards?: number;
  yardPay?: number;
  yardTime?: number;
  // 2.2 : grande vitesse
  hsl?: {
    minKm: number; perKm: number; minCost: number; kmPerDay: number; minDays: number; maxDays: number;
    minGrade: number; minGradeName: string; gradeOk: boolean;
    building: { lineId: string; route: string[]; openAt: string } | null;
    tgv: { cost: number; seats: number; speed: number; fare: number; wear: number; minGrade: number };
  };
}

type HslInfo = { state: "aucune" | "chantier" | "ouverte"; openAt: string | null; cost: number; days: number; blocker: string | null };

interface OwnedStation {
  station: string;
  size: number;
  sizeLabel: string;
  level: number;
  invested: number;
  protectedUntil: string;
  totalFees: number;
  totalShops: number;
  boughtAt: string;
  nextUpgrade: number | null;
  sellValue: number;
  traffic24h: number;
  served: boolean;
  buyoutPayout?: number; // 2.6
  shops?: ShopInfo;
}

// 2.6 : les emplacements de commerce d'une gare
interface ShopInfo {
  slots: number;
  taken: number;
  price: number;
  mine: boolean;
}

interface MyShop extends ShopInfo {
  id: string;
  station: string;
  sizeLabel: string;
  paid: number;
  totalIncome: number;
  boughtAt: string;
  sellValue: number;
  traffic24h: number;
}

interface AdvisorRow {
  station: string;
  sizeLabel: string;
  passengers24h: number;
  slots: number;
  taken: number;
  mine: boolean;
  price: number;
  perDay: number;
  paybackDays: number | null;
}

interface MarketStation {
  station: string;
  size: number;
  sizeLabel: string;
  price: number;
  traffic24h: number;
  served: boolean;
  owner: { name: string; emblem: string | null; liveryColor: string; level: number } | null;
  protectedUntil: string | null;
  shops?: ShopInfo; // 2.6
  watched?: boolean;
  auction?: { endsAt: string; minPrice: number; bestBid: number | null; mine: boolean; nextMin: number } | null; // 2.7
}

/* 2.7 : les enchères d'une gare dont la protection vient de tomber */
function AuctionCell({ station, a, balance, busy, now, onBid }: { station: string; a: NonNullable<MarketStation["auction"]>; balance: number; busy: boolean; now: number; onBid: (amount: number) => void }) {
  const [amount, setAmount] = useState(String(a.nextMin));
  useEffect(() => setAmount(String(a.nextMin)), [a.nextMin]);
  const left = Math.max(0, new Date(a.endsAt).getTime() - now);
  const clock = `${Math.floor(left / 60_000)}:${String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")}`;
  const n = Math.round(Number(amount.replace(/\s/g, "")));
  return (
    <div className="flex flex-col items-end gap-1 min-w-[150px]">
      <span className="font-body text-[11.5px] text-amber">
        Enchères · {clock}
      </span>
      <span className="font-body text-[11.5px] text-slate2">
        {a.bestBid ? (a.mine ? <span className="text-rail-green">Vous menez · {fmt(a.bestBid)}</span> : <>Meilleure offre {fmt(a.bestBid)}</>) : <>Départ {fmt(a.minPrice)}</>}
      </span>
      {!a.mine && (
        <span className="flex items-center gap-1">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            aria-label={`Votre enchère pour ${station}`}
            className="w-[86px] bg-navy-950 border border-line px-1.5 py-0.5 text-right font-mono2 text-[12px] rounded-control"
          />
          <button
            onClick={() => onBid(n)}
            disabled={busy || !(n >= a.nextMin) || n > balance}
            title={n > balance ? "Trésorerie insuffisante" : n < a.nextMin ? `Au moins ${fmt(a.nextMin)}` : "La somme est bloquée, et rendue si quelqu'un fait mieux"}
            className="text-[12px] font-body border px-2 py-0.5 text-amber border-amber/40 hover:bg-amber/10 disabled:opacity-40 font-medium rounded-control"
          >
            Enchérir
          </button>
        </span>
      )}
    </div>
  );
}

interface InfraData {
  rules: Rules;
  stations: OwnedStation[];
  market: MarketStation[];
  workshops: { id: string; station: string; createdAt: string; lines: number }[];
  lines: { id: string; route: string[]; km: number; electrified: boolean; cost: number; doubleTrack?: boolean; doubleCost?: number; trains?: number; hsl?: HslInfo }[];
  yards?: { id: string; station: string; createdAt: string; served: boolean }[];
  shops?: MyShop[]; // 2.6
  watches?: string[];
}

const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
const pct = (x: number) => `${Math.round(x * 100)} %`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/* 2.3 : plus de numéros « 01, 02… » devant les titres : la page n'est pas un formulaire
   administratif. n reste dans la signature pour l'ordre de lecture du code. */
function SectionTitle({ title, aside }: { n?: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3 border-b border-line pb-2">
      <h2 className="font-display text-xl leading-none">{title}</h2>
      {aside && <span className="font-body text-[12.5px] text-slate2 text-right tabular-nums">{aside}</span>}
    </div>
  );
}

export function InfrastructureSection({
  balance,
  stationSizes,
  onChange,
}: {
  balance: number;
  stationSizes: Record<string, { size: number; sizeLabel: string }>;
  onChange: () => void;
}) {
  const [data, setData] = useState<InfraData | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [shopStation, setShopStation] = useState("");
  const [yardStation, setYardStation] = useState("");
  const { showToast, showComposter } = useToast();

  const load = () =>
    api
      .get("/infrastructure")
      .then(({ data }) => {
        setData(data);
        setError(false);
      })
      .catch(() => setError(true));

  /* 2.5.1 : la page ne se rechargeait jamais. Un joueur qui attendait la fin
     de la protection d'une gare voyait son bouton rester « protégée » jusqu'à
     ce qu'il recharge, pendant qu'un autre, arrivé après, l'achetait. On
     recharge toutes les 30 s, l'horloge tourne à la seconde, et le bouton
     s'ouvre à l'instant où la protection tombe. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    load();
    const refresh = setInterval(load, 30_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, []);

  // 2.7 : pendant des enchères, la page se recharge toutes les 8 s pour voir les offres arriver
  const auctionOpen = Boolean(data?.market.some((m) => m.auction));
  useEffect(() => {
    if (!auctionOpen) return;
    const t = setInterval(load, 8_000);
    return () => clearInterval(t);
  }, [auctionOpen]);

  async function act(key: string, url: string, body: object, done: string) {
    if (busy) return;
    setBusy(key);
    try {
      await api.post(url, body);
      showComposter(done);
      await load();
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
      void load(); // la gare a pu changer de mains : la liste se remet à jour
    } finally {
      setBusy(null);
    }
  }

  // 2.6 : surveiller une gare (prévenu en même temps que tous ses surveillants)
  async function watch(station: string) {
    try {
      const { data: r } = await api.post("/infrastructure/stations/watch", { station });
      showToast(r.watching ? `Gare de ${station} surveillée : vous serez prévenu 10 min avant la fin de sa protection` : `Vous ne surveillez plus ${station}`);
      await load();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    }
  }

  if (error && !data) return <p className="text-slate2 font-body">Les infrastructures ne répondent pas pour le moment. Réessayez dans un instant.</p>;
  if (!data) return <div className="h-40 bg-navy-900 animate-skeleton" />;
  const { rules } = data;
  const full = data.stations.length >= rules.maxStations;
  const owned = new Set(data.stations.map((s) => s.station));
  const inMarket = new Set(data.market.map((m) => m.station));
  const otherChoices = Object.keys(stationSizes)
    .filter((s) => !owned.has(s) && !inMarket.has(s))
    .sort((a, b) => a.localeCompare(b, "fr"));
  const otherPrice = other ? rules.stationPrices[String(stationSizes[other]?.size ?? 2)] : 0;
  const workshopStations = new Set(data.workshops.map((w) => w.station));
  const myStations = [...new Set(data.lines.flatMap((l) => l.route))].sort((a, b) => a.localeCompare(b, "fr"));

  return (
    <div className="space-y-10">
      {/* ---------------- gares ---------------- */}
      <section>
        <SectionTitle n="01" title="Gares" aside={`${data.stations.length}/${rules.maxStations} gares`} />
        <p className="text-[13px] text-slate2 font-body max-w-3xl mb-4">
          Une gare à vous encaisse les dépenses des voyageurs dans ses commerces, à chaque train qui s'y arrête, et une redevance de quai de{" "}
          {pct(rules.platformFee)} de la recette des autres compagnies. Vos propres trajets qui la desservent rapportent +{pct(rules.homeBonusStep)} (jusqu'à +
          {pct(rules.homeBonusCap)}). Un concurrent peut vous la racheter après {rules.protectionHours} h, {String(rules.buyoutCost).replace(".", ",")} fois sa valeur (prix de base et
          agrandissements) : vous touchez alors {String(rules.buyoutPayout).replace(".", ",")} fois cette valeur. Le prix ne monte plus d'un rachat à l'autre ;
          une gare achetée avant la 2.6 vous rapporte toujours {String(rules.buyoutPayout).replace(".", ",")} fois ce que vous l'avez payée.{" "}
          À la fin de la protection, la gare part 10 minutes aux enchères : la meilleure offre l'emporte, et votre dédommagement monte avec elle.
          {rules.nextStationCap && (
            <>
              {" "}
              Vous pouvez posséder {rules.maxStations} gares ; au grade {rules.nextStationCap.rank}, ce sera {rules.nextStationCap.max}.
            </>
          )}
        </p>

        {data.stations.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 mb-5">
            {data.stations.map((s) => {
              const protectedNow = new Date(s.protectedUntil).getTime() > Date.now();
              return (
                <div key={s.station} className="border border-line bg-navy-900/40 rounded-card">
                  {/* le panneau de gare : nom en grand */}
                  <div className="flex items-stretch border-b border-line">
                    <div className="px-4 py-3 flex-1 min-w-0">
                      <div className="font-body text-[12px] text-slate2 font-medium">
                        {s.sizeLabel} · commerces niv. {s.level}/{rules.maxLevel}
                      </div>
                      <div className="font-display text-2xl leading-tight truncate">{s.station}</div>
                    </div>
                    <div className="px-4 py-3 text-right border-l border-line">
                      <div className="font-body text-[12px] text-slate2 font-medium">Trafic 24 h</div>
                      <div className="font-mono2 text-lg tabular-nums">{fmt(s.traffic24h)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-line text-center border-b border-line">
                    <div className="py-2.5">
                      <div className="font-mono2 text-sm text-rail-green tabular-nums">+{fmt(s.totalShops)}</div>
                      <div className="text-[12px] text-slate2 font-body">commerces</div>
                    </div>
                    <div className="py-2.5">
                      <div className="font-mono2 text-sm text-rail-green tabular-nums">+{fmt(s.totalFees)}</div>
                      <div className="text-[12px] text-slate2 font-body">redevances</div>
                    </div>
                    <div className="py-2.5">
                      <div className="font-mono2 text-sm tabular-nums">{fmt(s.invested)}</div>
                      <div className="text-[12px] text-slate2 font-body">investi</div>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-[11.5px] font-body text-slate2 flex-1 min-w-[160px]">
                      {protectedNow ? `Protégée jusqu'à ${when(s.protectedUntil)}` : "Rachetable par un concurrent"}
                      {s.buyoutPayout ? ` (vous toucheriez ${fmt(s.buyoutPayout)})` : ""}
                      {!s.served && " · aucune de vos lignes n'y passe"}
                      {s.shops && (
                        <span className="block">
                          {s.shops.taken
                            ? `${s.shops.taken}/${s.shops.slots} commerces loués : vous touchez ${pct(rules.shopRent ?? 0.15)} de leurs recettes`
                            : `${s.shops.slots} emplacements de commerce, aucun loué : vous tenez les commerces vous-même`}
                        </span>
                      )}
                    </span>
                    {s.nextUpgrade != null && (
                      <button
                        onClick={() => act("up" + s.station, "/infrastructure/stations/upgrade", { station: s.station }, `Commerces de ${s.station} agrandis`)}
                        disabled={!!busy || balance < s.nextUpgrade}
                        className="text-[12px] font-body text-cobalt border border-cobalt/40 px-2 py-1 hover:bg-cobalt/10 disabled:opacity-40 font-medium rounded-control"
                        title={`Recettes des commerces ×${String(rules.shopLevelMult[String(s.level + 1)]).replace(".", ",")}`}
                      >
                        Agrandir · {fmt(s.nextUpgrade)} pi.
                      </button>
                    )}
                    <button
                      onClick={() => act("sell" + s.station, "/infrastructure/stations/sell", { station: s.station }, `Gare de ${s.station} revendue`)}
                      disabled={!!busy}
                      className="text-[12px] font-body text-slate2 border border-line px-2 py-1 hover:text-rail-red disabled:opacity-40 font-medium rounded-control"
                    >
                      Revendre · {fmt(s.sellValue)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border border-line rounded-card">
          <div className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1.4fr_1fr_0.7fr_auto] gap-x-4 px-4 py-2 border-b border-line font-body text-[12px] text-slate2 font-medium">
            <span>Gare</span>
            <span className="hidden md:block">Propriétaire</span>
            <span className="text-right">Trafic 24 h</span>
            <span className="text-right">Prix</span>
          </div>
          {data.market.length === 0 && <p className="px-4 py-4 text-[13px] text-slate2 font-body">Tracez des lignes : les gares de votre réseau apparaîtront ici.</p>}
          {data.market.map((m) => {
            const left = m.protectedUntil != null ? new Date(m.protectedUntil).getTime() - now : 0;
            const locked = left > 0;
            // la dernière heure, un compte à rebours plutôt qu'une heure
            const countdown = locked && left < 3600_000 ? `${Math.floor(left / 60_000)} min ${String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")} s` : null;
            return (
              <div key={m.station} className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1.4fr_1fr_0.7fr_auto] gap-x-4 items-center px-4 py-2.5 border-b border-line last:border-0">
                <div className="min-w-0">
                  <span className="font-body text-offwhite">{m.station}</span>
                  <span className="ml-2 font-mono2 text-[10.5px] text-slate2">{m.sizeLabel}</span>
                  {m.served && <span className="ml-2 font-body text-[12px] text-cobalt font-medium">votre réseau</span>}
                  {/* 2.6 : les commerces de la gare, et la surveillance de sa protection */}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {m.shops && (
                      <ShopButton
                        atMax={(data.shops ?? []).length >= (rules.maxShops ?? 3)}
                        station={m.station}
                        info={m.shops}
                        busy={busy}
                        balance={balance}
                        onBuy={() => act("shop" + m.station, "/infrastructure/shops/buy", { station: m.station }, `Commerce ouvert à ${m.station}`)}
                      />
                    )}
                    {m.owner && (
                      <button
                        onClick={() => watch(m.station)}
                        disabled={!!busy}
                        title={m.watched ? "Ne plus surveiller" : `Être prévenu ${rules.isPremium ? "30" : "10"} min avant la fin de sa protection, puis à l'ouverture des enchères (10 min, la meilleure offre l'emporte)`}
                        className={`text-[11.5px] font-body px-1.5 py-0.5 border rounded-control whitespace-nowrap ${m.watched ? "text-amber border-amber/50" : "text-slate2 border-line hover:text-offwhite"}`}
                      >
                        {m.watched ? "◉ surveillée" : "○ surveiller"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-1.5 text-[12.5px] font-body min-w-0">
                  {m.owner ? (
                    <>
                      <span style={{ color: m.owner.liveryColor }}>{m.owner.emblem ? <Emblem id={m.owner.emblem} size={12} /> : "■"}</span>
                      <span className="truncate">{m.owner.name}</span>
                    </>
                  ) : (
                    <span className="text-slate2">libre</span>
                  )}
                </div>
                <span className="text-right font-mono2 text-[12.5px] tabular-nums">{fmt(m.traffic24h)}</span>
                {m.auction ? (
                  <AuctionCell
                    station={m.station}
                    a={m.auction}
                    balance={balance}
                    busy={!!busy}
                    now={now}
                    onBid={(amount) => act("bid" + m.station, "/infrastructure/stations/bid", { station: m.station, amount }, `Enchère de ${fmt(amount)} pi. sur ${m.station}`)}
                  />
                ) : (
                <button
                  onClick={() => act("buy" + m.station, "/infrastructure/stations/buy", { station: m.station }, m.owner ? `Gare de ${m.station} rachetée` : `Gare de ${m.station} achetée`)}
                  disabled={!!busy || full || locked || balance < m.price}
                  title={full ? `${rules.maxStations} gares au plus` : locked ? `Protégée jusqu'à ${when(m.protectedUntil!)}` : balance < m.price ? "Trésorerie insuffisante" : undefined}
                  className={`text-[12px] font-body border px-2 py-1 disabled:opacity-40 whitespace-nowrap font-medium rounded-control ${m.owner ? "text-amber border-amber/40 hover:bg-amber/10" : "text-cobalt border-cobalt/40 hover:bg-cobalt/10"}`}
                >
                  {locked ? (countdown ? `enchères dans ${countdown}` : "protégée") : m.owner ? "Racheter" : "Acheter"} · {fmt(m.price)}
                </button>
                )}
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-navy-900/40 border-t border-line">
            <span className="text-[12px] text-slate2 font-body">Une autre gare :</span>
            <select value={other} onChange={(e) => setOther(e.target.value)} className="bg-navy-950 border border-line text-sm px-2 py-1 font-body rounded-control">
              <option value="">choisir…</option>
              {otherChoices.map((s) => (
                <option key={s} value={s}>
                  {s} ({stationSizes[s]?.sizeLabel})
                </option>
              ))}
            </select>
            {other && (
              <button
                onClick={() => act("buy" + other, "/infrastructure/stations/buy", { station: other }, `Gare de ${other} achetée`).then(() => setOther(""))}
                disabled={!!busy || full || balance < otherPrice}
                className="text-[12px] font-body text-cobalt border border-cobalt/40 px-2 py-1 hover:bg-cobalt/10 disabled:opacity-40 font-medium rounded-control"
              >
                Acheter · {fmt(otherPrice)}
              </button>
            )}
            {other && (
              <button
                onClick={() => act("shop" + other, "/infrastructure/shops/buy", { station: other }, `Commerce ouvert à ${other}`).then(() => setOther(""))}
                disabled={!!busy || balance < Math.round(otherPrice * (rules.shopPriceShare ?? 0.4))}
                className="text-[12px] font-body text-rail-green border border-rail-green/40 px-2 py-1 hover:bg-rail-green/10 disabled:opacity-40 font-medium rounded-control"
              >
                Ouvrir un commerce · {fmt(Math.round(otherPrice * (rules.shopPriceShare ?? 0.4)))}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- 2.6 : commerces ---------------- */}
      <section>
        <SectionTitle title="Vos commerces" aside={`${(data.shops ?? []).length}/${rules.maxShops ?? 3} commerces`} />
        <p className="text-[13px] text-slate2 font-body max-w-3xl mb-4">
          Chaque gare a des emplacements de commerce selon sa taille (capitale {rules.shopSlots?.["5"] ?? 16}, métropole {rules.shopSlots?.["4"] ?? 12}, grande ville{" "}
          {rules.shopSlots?.["3"] ?? 8}, ville moyenne {rules.shopSlots?.["2"] ?? 6}, petite ville {rules.shopSlots?.["1"] ?? 4}), une place par compagnie et par gare, et{" "}
          {rules.maxShops ?? 3} commerces au plus par compagnie. Les commerçants
          se partagent ce que dépensent les voyageurs de la gare ; son propriétaire en touche {pct(rules.shopRent ?? 0.15)} de loyer. Un commerce coûte{" "}
          {pct(rules.shopPriceShare ?? 0.4)} du prix de la gare, ne se rachète pas, et se revend {pct(rules.shopSellBack ?? 0.6)} de son prix. Pour les grades,{" "}
          {rules.shopsPerRankStation ?? 2} commerces comptent pour une gare.
        </p>
        {(data.shops ?? []).length > 0 ? (
          <div className="border border-line rounded-card mb-4">
            {(data.shops ?? []).map((sh) => (
              <div key={sh.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 border-b border-line last:border-0">
                <div className="min-w-0 flex-1">
                  <span className="font-body text-offwhite">{sh.station}</span>
                  <span className="ml-2 font-mono2 text-[10.5px] text-slate2">{sh.sizeLabel}</span>
                  <span className="ml-2 font-body text-[12px] text-slate2">
                    {sh.taken}/{sh.slots} commerçants · trafic {fmt(sh.traffic24h)}
                  </span>
                </div>
                <span className="font-mono2 text-[12.5px] text-rail-green tabular-nums">+{fmt(sh.totalIncome)}</span>
                <button
                  onClick={() => act("sellshop" + sh.station, "/infrastructure/shops/sell", { station: sh.station }, `Commerce de ${sh.station} revendu`)}
                  disabled={!!busy}
                  className="text-[12px] font-body text-slate2 border border-line px-2 py-1 hover:text-rail-red disabled:opacity-40 font-medium rounded-control"
                >
                  Revendre · {fmt(sh.sellValue)}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-slate2 font-body mb-4">Pas encore de commerce. Ouvrez-en un depuis la liste des gares ci-dessus.</p>
        )}
        <ShopAdvisor premium={Boolean(rules.isPremium)} busy={busy} balance={balance} onBuy={(st) => act("shop" + st, "/infrastructure/shops/buy", { station: st }, `Commerce ouvert à ${st}`)} />
      </section>

      {/* ---------------- ateliers ---------------- */}
      <section>
        <SectionTitle n="02" title="Ateliers régionaux" aside={`${data.workshops.length}/${rules.maxWorkshops} ateliers`} />
        <p className="text-[13px] text-slate2 font-body max-w-3xl mb-4">
          Vos rames dont l'itinéraire passe par la gare d'un atelier s'usent {pct(1 - rules.workshopWear)} moins vite : moins de révisions, moins de pannes.{" "}
          {fmt(rules.workshopCost)} pi. l'atelier.
        </p>
        <div className="flex flex-wrap gap-3">
          {data.workshops.map((w) => (
            <div key={w.id} className="border border-line px-4 py-3 min-w-[200px] rounded-card bg-navy-900/40">
              <div className="font-body text-[12px] text-slate2 font-medium">Atelier</div>
              <div className="font-display text-lg leading-tight">{w.station}</div>
              <div className="text-[12px] font-body text-slate2 mt-0.5">
                {w.lines ? `${w.lines} ligne${w.lines > 1 ? "s" : ""} en profite${w.lines > 1 ? "nt" : ""}` : <span className="text-amber">aucune ligne n'y passe</span>}
              </div>
              <button
                onClick={() => act("close" + w.id, "/infrastructure/workshops/close", { workshopId: w.id }, `Atelier de ${w.station} fermé`)}
                disabled={!!busy}
                className="mt-2 text-[12px] font-body text-slate2 hover:text-rail-red font-medium"
              >
                Fermer · +{fmt(rules.workshopCost * rules.sellBack)}
              </button>
            </div>
          ))}
          {data.workshops.length < rules.maxWorkshops && (
            <div className="border border-dashed border-line px-4 py-3 min-w-[240px] flex flex-col gap-2 rounded-card bg-navy-900/40">
              <div className="font-body text-[12px] text-slate2 font-medium">Ouvrir un atelier</div>
              <select value={shopStation} onChange={(e) => setShopStation(e.target.value)} className="bg-navy-950 border border-line text-sm px-2 py-1 font-body rounded-control">
                <option value="">gare de votre réseau…</option>
                {myStations
                  .filter((s) => !workshopStations.has(s))
                  .map((s) => (
                    <option key={s} value={s}>
                      {s} ({data.lines.filter((l) => l.route.includes(s)).length} ligne{data.lines.filter((l) => l.route.includes(s)).length > 1 ? "s" : ""})
                    </option>
                  ))}
              </select>
              <button
                onClick={() => act("ws", "/infrastructure/workshops", { station: shopStation }, `Atelier ouvert à ${shopStation}`).then(() => setShopStation(""))}
                disabled={!shopStation || !!busy || balance < rules.workshopCost}
                className="text-[12px] font-body text-cobalt border border-cobalt/40 px-2 py-1 hover:bg-cobalt/10 disabled:opacity-40 font-medium rounded-control"
              >
                Construire · {fmt(rules.workshopCost)} pi.
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- électrification ---------------- */}
      <section>
        <SectionTitle n="03" title="Électrification" aside={`${data.lines.filter((l) => l.electrified).length}/${data.lines.length} lignes`} />
        <p className="text-[13px] text-slate2 font-body max-w-3xl mb-4">
          Une ligne électrifiée se parcourt {pct(1 - rules.electricSpeed)} plus vite (donc plus de trajets à l'heure) et use {pct(1 - rules.electricWear)} moins le matériel.
          Payé au kilomètre, une fois. Changer les gares de la ligne fait perdre l'électrification.
        </p>
        <div className="border border-line divide-y divide-line rounded-card">
          {data.lines.length === 0 && <p className="px-4 py-4 text-[13px] text-slate2 font-body">Aucune ligne à électrifier pour l'instant.</p>}
          {data.lines.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
              {/* la caténaire : trait plein si électrifiée, pointillé sinon */}
              <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
                {l.route.map((st, i) => (
                  <span key={st + i} className="flex items-center gap-1.5">
                    <span className={`text-[13px] font-body ${i === 0 || i === l.route.length - 1 ? "text-offwhite" : "text-slate2"}`}>{st}</span>
                    {i < l.route.length - 1 && <span className={`w-6 border-t-2 ${l.electrified ? "border-amber" : "border-dashed border-line"}`} />}
                  </span>
                ))}
              </div>
              <span className="font-mono2 text-[12px] text-slate2 tabular-nums w-20 text-right">{fmt(l.km)} km</span>
              {l.electrified ? (
                <span className="font-body text-[12px] text-amber w-40 text-right font-medium">ϟ électrifiée</span>
              ) : (
                <button
                  onClick={() => act("el" + l.id, "/infrastructure/electrify", { lineId: l.id }, `${l.route[0]} – ${l.route[l.route.length - 1]} électrifiée`)}
                  disabled={!!busy || balance < l.cost}
                  className="w-40 text-[12px] font-body text-amber border border-amber/40 px-2 py-1 hover:bg-amber/10 disabled:opacity-40 font-medium rounded-control"
                >
                  Électrifier · {fmt(l.cost)}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- 2.1 : double voie ---------------- */}
      {rules.doubleSpeed !== undefined && (
        <section>
          <SectionTitle n="04" title="Double voie" aside={`${data.lines.filter((l) => l.doubleTrack).length}/${data.lines.length} lignes`} />
          <p className="text-[13px] text-slate2 font-body max-w-3xl mb-4">
            Sur une voie unique, les trains se croisent en gare et s'attendent. Avec une deuxième voie, plus d'attente : trajets {pct(1 - rules.doubleSpeed)} plus rapides et{" "}
            {pct(1 - (rules.doubleDelay ?? 1))} de retards en moins. Et le cadencement attire du monde : chaque rame de plus sur la ligne ramène {pct(rules.cadenceStep ?? 0)} de
            voyageurs en plus, jusqu'à {pct(rules.cadenceCap ?? 0)}. En vue cabine, vous voyez passer vos rames qui roulent en sens inverse.
          </p>
          <div className="border border-line divide-y divide-line rounded-card">
            {data.lines.length === 0 && <p className="px-4 py-4 text-[13px] text-slate2 font-body">Aucune ligne pour l'instant.</p>}
            {data.lines.map((l) => {
              const n = l.trains ?? 0;
              const cadence = Math.min(rules.cadenceCap ?? 0, (rules.cadenceStep ?? 0) * Math.max(0, n - 1));
              return (
                <div key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
                    {l.route.map((st, i) => (
                      <span key={st + i} className="flex items-center gap-1.5">
                        <span className={`text-[13px] font-body ${i === 0 || i === l.route.length - 1 ? "text-offwhite" : "text-slate2"}`}>{st}</span>
                        {i < l.route.length - 1 && (
                          // deux traits pleins : double voie ; un plein et un pointillé : voie unique
                          <span className="w-7 flex flex-col gap-[3px]" aria-hidden="true">
                            <span className="border-t-2 border-offwhite/80" />
                            <span className={`border-t-2 ${l.doubleTrack ? "border-offwhite/80" : "border-dashed border-line"}`} />
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                  <span className="font-body text-[12.5px] text-slate2 w-44 text-right">
                    {n} rame{n > 1 ? "s" : ""}
                    {cadence > 0 && <span className={l.doubleTrack ? "text-rail-green" : ""}> · cadencement +{pct(cadence)}</span>}
                  </span>
                  {l.doubleTrack ? (
                    <span className="font-body text-[12px] text-offwhite w-40 text-right font-medium">‖ double voie</span>
                  ) : (
                    <button
                      onClick={() => act("dv" + l.id, "/infrastructure/double", { lineId: l.id }, `${l.route[0]} – ${l.route[l.route.length - 1]} à double voie`)}
                      disabled={!!busy || balance < (l.doubleCost ?? Infinity)}
                      className="w-40 text-[12px] font-body text-offwhite border border-offwhite/40 px-2 py-1 hover:bg-offwhite/10 disabled:opacity-40 font-medium rounded-control"
                    >
                      Doubler · {fmt(l.doubleCost ?? 0)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------------- 2.1 : gares de triage ---------------- */}
      {data.yards && rules.yardCost !== undefined && (
        <section>
          <SectionTitle n="05" title="Gares de triage" aside={`${data.yards.length}/${rules.maxYards} gares`} />
          <p className="text-[13px] text-slate2 font-body max-w-3xl mb-4">
            Le fret qui part d'une de vos gares de triage ou y arrive est trié sur place : sa part de la tournée est {pct(1 - (rules.yardTime ?? 1))} plus courte et la livraison
            rapporte {pct((rules.yardPay ?? 1) - 1)} de plus. {fmt(rules.yardCost)} pi. la gare de triage.
          </p>
          <div className="flex flex-wrap gap-3">
            {data.yards.map((y) => (
              <div key={y.id} className="border border-line px-4 py-3 min-w-[220px] rounded-card bg-navy-900/40">
                <YardGlyph />
                <div className="font-display text-lg leading-tight mt-1">{y.station}</div>
                <button
                  onClick={() => act("yc" + y.id, "/infrastructure/yards/close", { yardId: y.id }, `Gare de triage de ${y.station} fermée`)}
                  disabled={!!busy}
                  className="mt-2 text-[12px] font-body text-slate2 hover:text-rail-red font-medium"
                >
                  Fermer · +{fmt((rules.yardCost ?? 0) * rules.sellBack)}
                </button>
              </div>
            ))}
            {data.yards.length < (rules.maxYards ?? 0) && (
              <div className="border border-dashed border-line px-4 py-3 min-w-[260px] flex flex-col gap-2 rounded-card bg-navy-900/40">
                <div className="font-body text-[12px] text-slate2 font-medium">Ouvrir une gare de triage</div>
                <select value={yardStation} onChange={(e) => setYardStation(e.target.value)} className="bg-navy-950 border border-line text-sm px-2 py-1 font-body rounded-control">
                  <option value="">choisir une gare…</option>
                  <optgroup label="Votre réseau">
                    {myStations.filter((s) => !data.yards!.some((y) => y.station === s)).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Autres gares">
                    {Object.keys(stationSizes)
                      .filter((s) => !myStations.includes(s) && !data.yards!.some((y) => y.station === s))
                      .sort((a, b) => a.localeCompare(b, "fr"))
                      .map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                  </optgroup>
                </select>
                <button
                  onClick={() => act("yard", "/infrastructure/yards", { station: yardStation }, `Gare de triage ouverte à ${yardStation}`).then(() => setYardStation(""))}
                  disabled={!yardStation || !!busy || balance < (rules.yardCost ?? 0)}
                  className="text-[12px] font-body text-cobalt border border-cobalt/40 px-2 py-1 hover:bg-cobalt/10 disabled:opacity-40 font-medium rounded-control"
                >
                  Construire · {fmt(rules.yardCost ?? 0)} pi.
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---------------- 2.2 : lignes à grande vitesse ---------------- */}
      {rules.hsl && <HighSpeedPanel rules={rules.hsl} lines={data.lines} balance={balance} busy={busy} act={act} />}
    </div>
  );
}

/* ============================================================
   2.2 : les lignes à grande vitesse. Une ligne par rangée, ce qu'il
   manque pour poser la LGV (ou le chantier en cours), et le bouton.
   ============================================================ */
function HighSpeedPanel({
  rules,
  lines,
  balance,
  busy,
  act,
}: {
  rules: NonNullable<Rules["hsl"]>;
  lines: InfraData["lines"];
  balance: number;
  busy: string | null;
  act: (key: string, url: string, body: object, done: string) => Promise<void>;
}) {
  const open = lines.filter((l) => l.hsl?.state === "ouverte");
  const km = open.reduce((a, l) => a + l.km, 0);
  // les lignes assez longues d'abord, les plus longues en tête
  const sorted = [...lines].sort((a, b) => Number(b.km >= rules.minKm) - Number(a.km >= rules.minKm) || b.km - a.km);
  const site = rules.building;
  const siteProgress = (l: InfraData["lines"][number]) => {
    if (!l.hsl?.openAt) return 0;
    const end = new Date(l.hsl.openAt).getTime();
    const start = end - l.hsl.days * 86_400_000;
    return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
  };
  return (
    <section>
      <SectionTitle n="06" title="Grande vitesse" aside={open.length ? `${open.length} LGV · ${fmt(km)} km` : "aucune LGV"} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] mb-4">
        <p className="text-[13px] text-slate2 font-body max-w-3xl">
          Le dernier étage de l'infrastructure. Sur une ligne électrifiée, à double voie et longue d'au moins {rules.minKm} km, posez une ligne à grande vitesse :{" "}
          {fmt(rules.perKm)} pi. du kilomètre ({fmt(rules.minCost)} au moins) et un chantier d'un jour pour {rules.kmPerDay} km, de {rules.minDays} à {rules.maxDays} jours. La ligne
          continue de rouler pendant les travaux, mais ses gares ne peuvent plus changer. Un seul chantier à la fois.
        </p>
        <div className="border border-line px-4 py-3 rounded-card bg-navy-900/40">
          <div className="font-display text-lg leading-tight">La rame TGV</div>
          <p className="text-[12.5px] text-slate2 font-body mt-1">
            {fmt(rules.tgv.cost)} pi., {rules.tgv.seats} places. Sur une LGV ouverte, trajets {pct(1 - rules.tgv.speed)} plus courts, billet +{pct(rules.tgv.fare - 1)}, usure +
            {pct(rules.tgv.wear - 1)}. Au catalogue du matériel.
          </p>
        </div>
      </div>
      {!rules.gradeOk && (
        <p className="mb-3 text-[13px] font-body text-amber">Les LGV et la rame TGV s'ouvrent au grade « {rules.minGradeName} ».</p>
      )}
      <div className="border border-line divide-y divide-line rounded-card">
        {lines.length === 0 && <p className="px-4 py-4 text-[13px] text-slate2 font-body">Aucune ligne pour l'instant.</p>}
        {sorted.map((l) => {
          const h = l.hsl;
          if (!h) return null;
          const name = `${l.route[0]} – ${l.route[l.route.length - 1]}`;
          const ready = !h.blocker && rules.gradeOk && !site;
          return (
            <div key={l.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <div className="flex-1 min-w-[220px]">
                  <div className="text-[13.5px] font-body text-offwhite">{l.route.join(" – ")}</div>
                  <div className="text-[12px] font-body text-slate2">
                    {fmt(l.km)} km
                    {h.state === "aucune" && h.blocker && l.km >= rules.minKm && <span> · {h.blocker}</span>}
                    {h.state === "aucune" && !h.blocker && <span> · {h.days} jours de chantier</span>}
                  </div>
                </div>
                {h.state === "ouverte" ? (
                  <span className="font-body text-[12px] text-cobalt w-52 text-right font-medium">» LGV ouverte</span>
                ) : h.state === "chantier" ? (
                  <span className="font-body text-[12px] text-amber w-52 text-right font-medium">Ouverture {when(h.openAt!)}</span>
                ) : l.km < rules.minKm ? (
                  <span className="font-body text-[12px] text-slate2 w-52 text-right">trop courte pour une LGV</span>
                ) : (
                  <button
                    onClick={() => act("hsl" + l.id, "/infrastructure/high-speed", { lineId: l.id }, `Chantier de la LGV ${name} lancé`)}
                    disabled={!ready || !!busy || balance < h.cost}
                    title={site ? `Un chantier est déjà en cours (${site.route[0]} – ${site.route[site.route.length - 1]})` : undefined}
                    className="w-52 text-[12px] font-body text-cobalt border border-cobalt/40 px-2 py-1 hover:bg-cobalt/10 disabled:opacity-40 font-medium rounded-control"
                  >
                    Lancer le chantier · {fmt(h.cost)}
                  </button>
                )}
              </div>
              {h.state === "chantier" && (
                <div className="mt-2 h-[4px] bg-navy-950 border border-line rounded-control" role="progressbar" aria-valuenow={Math.round(siteProgress(l) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Chantier de la LGV ${name}`}>
                  <div className="h-full bg-amber" style={{ width: `${siteProgress(l) * 100}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* le faisceau de voies d'une gare de triage, en petit */
function YardGlyph() {
  return (
    <svg width="120" height="30" viewBox="0 0 120 30" aria-hidden="true" className="block">
      <path d="M2 26h30" stroke="rgb(var(--c-slate2))" strokeWidth="1.6" />
      {[4, 11, 18, 25].map((y, i) => (
        <path key={y} d={`M32 26 C44 26 46 ${y} 58 ${y} H118`} stroke="rgb(var(--c-slate2))" strokeWidth="1.6" fill="none" opacity={0.6 + i * 0.1} />
      ))}
      {[[64, 4, "#8a5a32"], [84, 11, "#2a6f8f"], [70, 18, "#b98a2c"], [94, 25, "#6b7280"]].map(([x, y, c], i) => (
        <rect key={i} x={x as number} y={(y as number) - 3.2} width="18" height="5" fill={c as string} />
      ))}
    </svg>
  );
}

/* 2.6 : le bouton « Ouvrir un commerce » d'une gare, avec ses places */
function ShopButton({ info, busy, balance, onBuy, atMax }: { station: string; info: ShopInfo; busy: string | null; balance: number; onBuy: () => void; atMax?: boolean }) {
  if (info.mine) return <span className="text-[11.5px] font-body text-rail-green">votre commerce · {info.taken}/{info.slots}</span>;
  const full = info.taken >= info.slots;
  return (
    <button
      onClick={onBuy}
      disabled={!!busy || full || atMax || balance < info.price}
      title={full ? "Tous les emplacements sont pris" : atMax ? "Vous avez déjà le maximum de commerces" : balance < info.price ? "Trésorerie insuffisante" : undefined}
      className="text-[11.5px] font-body text-rail-green border border-rail-green/40 px-1.5 py-0.5 hover:bg-rail-green/10 disabled:opacity-40 rounded-control whitespace-nowrap"
    >
      {full ? `commerces complets · ${info.slots}/${info.slots}` : `Commerce ${info.taken}/${info.slots} · ${Math.round(info.price).toLocaleString("fr-FR")}`}
    </button>
  );
}

/* 2.6 (Premium) : le conseiller des commerces. Chargé à la demande. */
function ShopAdvisor({ premium, busy, balance, onBuy }: { premium: boolean; busy: string | null; balance: number; onBuy: (station: string) => void }) {
  const [rows, setRows] = useState<AdvisorRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const load = () =>
    api
      .get("/infrastructure/shops/advisor")
      .then(({ data }) => setRows(data.locked ? [] : data.rows))
      .catch(() => setRows([]));
  if (!premium) {
    return (
      <div className="border border-line border-dashed rounded-card px-4 py-3 text-[13px] font-body text-slate2">
        <span className="text-amber font-medium">Premium</span> · Le conseiller des commerces classe les gares par rendement d'une place : ce qu'elle rapporterait par jour, d'après les
        voyageurs des dernières 24 h, et en combien de jours elle serait payée.
      </div>
    );
  }
  return (
    <div className="border border-line rounded-card">
      <button
        onClick={() => {
          setOpen(!open);
          if (!rows) void load();
        }}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left font-body text-[13.5px]"
      >
        <span>
          <span className="text-amber font-medium">Conseiller des commerces</span>
          <span className="text-slate2"> · où une place rapporterait le plus</span>
        </span>
        <span className="text-slate2">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="border-t border-line">
          {!rows ? (
            <p className="px-4 py-3 text-[13px] text-slate2 font-body">Calcul…</p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-slate2 font-body">Pas assez de trafic sur les dernières 24 h pour conseiller.</p>
          ) : (
            <table className="w-full text-[12.5px] font-body">
              <thead>
                <tr className="text-slate2 text-left">
                  <th className="px-4 py-1.5 font-medium">Gare</th>
                  <th className="px-2 py-1.5 font-medium text-right hidden sm:table-cell">Voyageurs 24 h</th>
                  <th className="px-2 py-1.5 font-medium text-right">Places</th>
                  <th className="px-2 py-1.5 font-medium text-right">Par jour</th>
                  <th className="px-2 py-1.5 font-medium text-right">Payé en</th>
                  <th className="px-4 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.station} className="border-t border-line">
                    <td className="px-4 py-1.5">
                      {r.station} <span className="font-mono2 text-[10.5px] text-slate2">{r.sizeLabel}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono2 tabular-nums hidden sm:table-cell">{r.passengers24h.toLocaleString("fr-FR")}</td>
                    <td className="px-2 py-1.5 text-right font-mono2 tabular-nums">
                      {r.taken}/{r.slots}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono2 tabular-nums text-rail-green">+{r.perDay.toLocaleString("fr-FR")}</td>
                    <td className="px-2 py-1.5 text-right font-mono2 tabular-nums">{r.paybackDays != null ? `${String(r.paybackDays).replace(".", ",")} j` : "—"}</td>
                    <td className="px-4 py-1.5 text-right">
                      {r.mine ? (
                        <span className="text-rail-green">à vous</span>
                      ) : (
                        <button
                          onClick={() => {
                            onBuy(r.station);
                            setTimeout(load, 800);
                          }}
                          disabled={!!busy || balance < r.price}
                          className="text-[11.5px] text-rail-green border border-rail-green/40 px-1.5 py-0.5 hover:bg-rail-green/10 disabled:opacity-40 rounded-control"
                        >
                          {r.price.toLocaleString("fr-FR")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="px-4 py-2 text-[11.5px] text-slate2 font-body border-t border-line">
            Estimation : ce que dépensent les voyageurs des dernières 24 h, partagé entre les commerçants (vous compris), loyer du propriétaire déduit.
          </p>
        </div>
      )}
    </div>
  );
}
