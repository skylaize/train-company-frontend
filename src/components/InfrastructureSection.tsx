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
}

interface InfraData {
  rules: Rules;
  stations: OwnedStation[];
  market: MarketStation[];
  workshops: { id: string; station: string; createdAt: string; lines: number }[];
  lines: { id: string; route: string[]; km: number; electrified: boolean; cost: number; doubleTrack?: boolean; doubleCost?: number; trains?: number; hsl?: HslInfo }[];
  yards?: { id: string; station: string; createdAt: string; served: boolean }[];
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

  useEffect(() => {
    load();
  }, []);

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
    } finally {
      setBusy(null);
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
          {pct(rules.homeBonusCap)}). Un concurrent peut vous la racheter {String(rules.buyoutCost).replace(".", ",")} fois son prix après{" "}
          {rules.protectionHours} h : vous touchez alors {String(rules.buyoutPayout).replace(".", ",")} fois ce qu'elle vous a coûté.
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
                      {!s.served && " · aucune de vos lignes n'y passe"}
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
            const locked = m.protectedUntil != null;
            return (
              <div key={m.station} className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1.4fr_1fr_0.7fr_auto] gap-x-4 items-center px-4 py-2.5 border-b border-line last:border-0">
                <div className="min-w-0">
                  <span className="font-body text-offwhite">{m.station}</span>
                  <span className="ml-2 font-mono2 text-[10.5px] text-slate2">{m.sizeLabel}</span>
                  {m.served && <span className="ml-2 font-body text-[12px] text-cobalt font-medium">votre réseau</span>}
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
                <button
                  onClick={() => act("buy" + m.station, "/infrastructure/stations/buy", { station: m.station }, m.owner ? `Gare de ${m.station} rachetée` : `Gare de ${m.station} achetée`)}
                  disabled={!!busy || full || locked || balance < m.price}
                  title={full ? `${rules.maxStations} gares au plus` : locked ? `Protégée jusqu'à ${when(m.protectedUntil!)}` : balance < m.price ? "Trésorerie insuffisante" : undefined}
                  className={`text-[12px] font-body border px-2 py-1 disabled:opacity-40 whitespace-nowrap font-medium rounded-control ${m.owner ? "text-amber border-amber/40 hover:bg-amber/10" : "text-cobalt border-cobalt/40 hover:bg-cobalt/10"}`}
                >
                  {locked ? "protégée" : m.owner ? "Racheter" : "Acheter"} · {fmt(m.price)}
                </button>
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
          </div>
        </div>
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
