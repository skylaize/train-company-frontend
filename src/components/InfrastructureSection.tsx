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
}

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
  lines: { id: string; route: string[]; km: number; electrified: boolean; cost: number }[];
}

const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
const pct = (x: number) => `${Math.round(x * 100)} %`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

function SectionTitle({ n, title, aside }: { n: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3 border-b border-line pb-2">
      <h2 className="flex items-baseline gap-3">
        <span className="font-mono2 text-[11px] text-cobalt">{n}</span>
        <span className="font-display text-xl leading-none">{title}</span>
      </h2>
      {aside && <span className="font-mono2 text-[11px] text-slate2 text-right">{aside}</span>}
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
        </p>

        {data.stations.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 mb-5">
            {data.stations.map((s) => {
              const protectedNow = new Date(s.protectedUntil).getTime() > Date.now();
              return (
                <div key={s.station} className="border border-line bg-navy-900/40">
                  {/* le panneau de gare : nom en grand, bandeau de couleur */}
                  <div className="flex items-stretch border-b border-line">
                    <div className="w-1.5 bg-cobalt" />
                    <div className="px-4 py-3 flex-1 min-w-0">
                      <div className="font-mono2 text-[10px] uppercase tracking-[0.16em] text-slate2">
                        {s.sizeLabel} · commerces niv. {s.level}/{rules.maxLevel}
                      </div>
                      <div className="font-display text-2xl leading-tight truncate">{s.station}</div>
                    </div>
                    <div className="px-4 py-3 text-right border-l border-line">
                      <div className="font-mono2 text-[10px] uppercase tracking-[0.14em] text-slate2">Trafic 24 h</div>
                      <div className="font-mono2 text-lg tabular-nums">{fmt(s.traffic24h)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-line text-center border-b border-line">
                    <div className="py-2.5">
                      <div className="font-mono2 text-sm text-rail-green tabular-nums">+{fmt(s.totalShops)}</div>
                      <div className="text-[10px] uppercase tracking-wide text-slate2 font-body">commerces</div>
                    </div>
                    <div className="py-2.5">
                      <div className="font-mono2 text-sm text-rail-green tabular-nums">+{fmt(s.totalFees)}</div>
                      <div className="text-[10px] uppercase tracking-wide text-slate2 font-body">redevances</div>
                    </div>
                    <div className="py-2.5">
                      <div className="font-mono2 text-sm tabular-nums">{fmt(s.invested)}</div>
                      <div className="text-[10px] uppercase tracking-wide text-slate2 font-body">investi</div>
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
                        className="text-[11px] font-mono2 uppercase text-cobalt border border-cobalt/40 px-2 py-1 hover:bg-cobalt/10 disabled:opacity-40"
                        title={`Recettes des commerces ×${String(rules.shopLevelMult[String(s.level + 1)]).replace(".", ",")}`}
                      >
                        Agrandir · {fmt(s.nextUpgrade)} pi.
                      </button>
                    )}
                    <button
                      onClick={() => act("sell" + s.station, "/infrastructure/stations/sell", { station: s.station }, `Gare de ${s.station} revendue`)}
                      disabled={!!busy}
                      className="text-[11px] font-mono2 uppercase text-slate2 border border-line px-2 py-1 hover:text-rail-red disabled:opacity-40"
                    >
                      Revendre · {fmt(s.sellValue)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border border-line">
          <div className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1.4fr_1fr_0.7fr_auto] gap-x-4 px-4 py-2 border-b border-line font-mono2 text-[10.5px] uppercase tracking-[0.14em] text-slate2">
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
                  {m.served && <span className="ml-2 font-mono2 text-[10px] uppercase text-cobalt">votre réseau</span>}
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
                  className={`text-[11px] font-mono2 uppercase border px-2 py-1 disabled:opacity-40 whitespace-nowrap ${m.owner ? "text-amber border-amber/40 hover:bg-amber/10" : "text-cobalt border-cobalt/40 hover:bg-cobalt/10"}`}
                >
                  {locked ? "protégée" : m.owner ? "Racheter" : "Acheter"} · {fmt(m.price)}
                </button>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-navy-900/40 border-t border-line">
            <span className="text-[12px] text-slate2 font-body">Une autre gare :</span>
            <select value={other} onChange={(e) => setOther(e.target.value)} className="bg-navy-950 border border-line text-sm px-2 py-1 font-body">
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
                className="text-[11px] font-mono2 uppercase text-cobalt border border-cobalt/40 px-2 py-1 hover:bg-cobalt/10 disabled:opacity-40"
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
            <div key={w.id} className="border border-line px-4 py-3 min-w-[200px]">
              <div className="font-mono2 text-[10px] uppercase tracking-[0.16em] text-slate2">Atelier</div>
              <div className="font-display text-lg leading-tight">{w.station}</div>
              <div className="text-[12px] font-body text-slate2 mt-0.5">
                {w.lines ? `${w.lines} ligne${w.lines > 1 ? "s" : ""} en profite${w.lines > 1 ? "nt" : ""}` : <span className="text-amber">aucune ligne n'y passe</span>}
              </div>
              <button
                onClick={() => act("close" + w.id, "/infrastructure/workshops/close", { workshopId: w.id }, `Atelier de ${w.station} fermé`)}
                disabled={!!busy}
                className="mt-2 text-[10.5px] font-mono2 uppercase text-slate2 hover:text-rail-red"
              >
                Fermer · +{fmt(rules.workshopCost * rules.sellBack)}
              </button>
            </div>
          ))}
          {data.workshops.length < rules.maxWorkshops && (
            <div className="border border-dashed border-line px-4 py-3 min-w-[240px] flex flex-col gap-2">
              <div className="font-mono2 text-[10px] uppercase tracking-[0.16em] text-slate2">Ouvrir un atelier</div>
              <select value={shopStation} onChange={(e) => setShopStation(e.target.value)} className="bg-navy-950 border border-line text-sm px-2 py-1 font-body">
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
                className="text-[11px] font-mono2 uppercase text-cobalt border border-cobalt/40 px-2 py-1 hover:bg-cobalt/10 disabled:opacity-40"
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
        <div className="border border-line divide-y divide-line">
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
                <span className="font-mono2 text-[11px] uppercase text-amber w-40 text-right">ϟ électrifiée</span>
              ) : (
                <button
                  onClick={() => act("el" + l.id, "/infrastructure/electrify", { lineId: l.id }, `${l.route[0]} – ${l.route[l.route.length - 1]} électrifiée`)}
                  disabled={!!busy || balance < l.cost}
                  className="w-40 text-[11px] font-mono2 uppercase text-amber border border-amber/40 px-2 py-1 hover:bg-amber/10 disabled:opacity-40"
                >
                  Électrifier · {fmt(l.cost)}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
