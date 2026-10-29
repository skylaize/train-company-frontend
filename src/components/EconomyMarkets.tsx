import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Btn, Gauge, SectionTitle, dayHour, fmt, money } from "./EconomySection";

/* ============================================================
   2.4 : les deux marchés de l'atelier et de la voie.

   - Pièces détachées : le stock national et son prix du jour, son propre
     magasin, ses usines, et les pièces que vendent les autres joueurs.
   - Voies : l'état de chaque liaison qu'on emprunte, la cagnotte de
     rénovation, et les concessions.
   ============================================================ */

function useAct(onDone: () => void, reload: () => void) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      showToast(ok);
      reload();
      onDone();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Action impossible", "error");
    } finally {
      setBusy(null);
    }
  };
  return { busy, act };
}

function useData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    api
      .get(url)
      .then((r) => {
        setData(r.data);
        setError(false);
      })
      .catch(() => setError(true));
  }, [url]);
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);
  return { data, error, load };
}

/* ---------------- pièces détachées ---------------- */

interface PartsData {
  market: { part: string; label: string; part_name: string; stock: number; target: number; scarcity: number; priceFactor: number; delayFactor: number; basePrice: number; price: number }[];
  stock: Record<string, number>;
  limit: number;
  factories: { id: string; part: string; label: string; station: string; stored: number; salePrice: number | null; nextIn: number }[];
  listings: { id: string; part: string; label: string; stored: number; price: number; station: string; seller: string; livery: string }[];
  factory: { cost: number; perDay: number; storeMax: number; max: number; stations: string[] };
}

export function PartsPanel({ balance, onDone }: { balance: number; onDone: () => void }) {
  const { data, error, load } = useData<PartsData>("/economy/parts");
  const { busy, act } = useAct(onDone, load);
  const [newPart, setNewPart] = useState("BOGIES");
  const [newStation, setNewStation] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});
  if (error && !data) return <p className="text-slate2 font-body">Le marché des pièces ne répond pas pour le moment.</p>;
  if (!data) return <div className="h-40 bg-navy-900 animate-skeleton rounded-card" />;
  const station = newStation || data.factory.stations[0] || "";

  return (
    <div className="space-y-10">
      <section>
        <SectionTitle title="Le stock national" aside="se reconstitue un peu chaque heure" />
        <p className="text-[13.5px] text-slate2 font-body max-w-3xl mb-4">
          Chaque pièce commandée, par vous ou par un autre joueur, sort du même stock. Quand il baisse, le prix monte (jusqu'à ×3) et la livraison s'allonge (jusqu'à ×2). Une canicule casse les
          bogies de tout le monde en même temps : c'est là qu'un magasin bien garni, ou une usine, fait la différence.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.market.map((m) => {
            const tone = m.scarcity > 0.66 ? "red" : m.scarcity > 0.33 ? "amber" : "green";
            return (
              <div key={m.part} className="border border-line rounded-card bg-navy-900/40 p-4 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-display text-lg leading-tight">{m.label}</div>
                  <div className="font-body text-[12.5px] text-slate2 tabular-nums">
                    vous : {data.stock[m.part] ?? 0} / {data.limit}
                  </div>
                </div>
                <Gauge value={m.stock} max={Math.max(1, m.target)} tone={tone} label={`Stock national, ${m.label}`} />
                <div className="flex justify-between font-body text-[12.5px] text-slate2 tabular-nums">
                  <span>
                    {fmt(m.stock)} / {fmt(m.target)} en stock
                  </span>
                  <span className={m.priceFactor > 1.05 ? "text-amber" : ""}>
                    {fmt(m.price)} pi.{m.priceFactor > 1.05 && ` (×${money(m.priceFactor, 1)})`}
                  </span>
                </div>
                {m.delayFactor > 1.05 && <div className="font-body text-[12px] text-amber">Livraison ×{money(m.delayFactor, 1)}</div>}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle title="Vos usines" aside={`${data.factories.length} / ${data.factory.max}`} />
        <p className="text-[13.5px] text-slate2 font-body max-w-3xl mb-4">
          Une usine produit {data.factory.perDay} pièces d'un type par jour (jusqu'à {data.factory.storeMax} en attente). Rangez-les dans votre magasin, ou vendez-les aux autres joueurs au prix que vous
          fixez : en pleine pénurie, elles valent de l'or.
        </p>
        {data.factories.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 mb-5">
            {data.factories.map((f) => (
              <div key={f.id} className="border border-line rounded-card bg-navy-900/40 p-4 space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <div className="font-body text-[12px] text-slate2">Usine de {f.station}</div>
                    <div className="font-display text-xl leading-tight">{f.label}</div>
                  </div>
                  <div className="text-right font-body text-[12.5px] text-slate2 tabular-nums">
                    <div>
                      <b className="text-offwhite font-mono2 text-lg">{f.stored}</b> en attente
                    </div>
                    <div>prochaine dans {f.nextIn} min</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Btn tone="ghost" busy={busy === `col-${f.id}`} disabled={f.stored === 0} onClick={() => act(`col-${f.id}`, () => api.post(`/economy/factories/${f.id}/collect`), "Pièces rangées au magasin")}>
                    Ranger au magasin
                  </Btn>
                  <input
                    inputMode="numeric"
                    value={prices[f.id] ?? (f.salePrice !== null ? String(f.salePrice) : "")}
                    onChange={(e) => setPrices((p) => ({ ...p, [f.id]: e.target.value }))}
                    placeholder="prix"
                    className="w-20 bg-navy-800 border border-line rounded-control px-2 py-1.5 font-mono2 text-[14px] tabular-nums"
                    aria-label={`Prix de vente, usine de ${f.station}`}
                  />
                  <Btn
                    tone="ghost"
                    busy={busy === `price-${f.id}`}
                    onClick={() => {
                      const raw = (prices[f.id] ?? "").trim();
                      const v = raw === "" ? null : Number(raw);
                      act(`price-${f.id}`, () => api.patch(`/economy/factories/${f.id}`, { salePrice: v }), v === null ? "Retirée de la vente" : "Mise en vente");
                    }}
                  >
                    {f.salePrice !== null ? "Changer le prix" : "Mettre en vente"}
                  </Btn>
                  {f.salePrice !== null && <span className="font-body text-[12.5px] text-rail-green">en vente à {fmt(f.salePrice)} pi.</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        {data.factories.length < data.factory.max && (
          <div className="border border-line rounded-card bg-navy-900/40 p-4 flex flex-wrap gap-3 items-end">
            <label className="font-body text-[13px] text-slate2 flex flex-col gap-1">
              Pièce
              <select value={newPart} onChange={(e) => setNewPart(e.target.value)} className="bg-navy-800 border border-line rounded-control px-2 py-1.5 text-offwhite text-[13.5px]">
                {data.market.map((m) => (
                  <option key={m.part} value={m.part}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-body text-[13px] text-slate2 flex flex-col gap-1">
              Gare
              <select value={station} onChange={(e) => setNewStation(e.target.value)} className="bg-navy-800 border border-line rounded-control px-2 py-1.5 text-offwhite text-[13.5px]">
                {data.factory.stations.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <Btn busy={busy === "factory"} disabled={!station || balance < data.factory.cost} onClick={() => act("factory", () => api.post("/economy/factories", { part: newPart, station }), "Usine construite")}>
              Construire une usine · {fmt(data.factory.cost)} pi.
            </Btn>
          </div>
        )}
      </section>

      <section>
        <SectionTitle title="Les pièces des autres joueurs" />
        {data.listings.length === 0 ? (
          <p className="font-body text-[13.5px] text-slate2">Personne ne vend de pièces pour l'instant.</p>
        ) : (
          <div className="border border-line rounded-card overflow-x-auto">
            <table className="w-full min-w-[480px] font-body text-[13.5px]">
              <thead className="bg-navy-900/60 text-slate2 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Pièce</th>
                  <th className="px-4 py-2 font-medium">Vendeur</th>
                  <th className="px-4 py-2 font-medium text-right">Dispo</th>
                  <th className="px-4 py-2 font-medium text-right">Prix</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {data.listings.map((l) => {
                  const nat = data.market.find((m) => m.part === l.part);
                  return (
                    <tr key={l.id} className="border-t border-line">
                      <td className="px-4 py-2">{l.label}</td>
                      <td className="px-4 py-2">
                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: l.livery }} />
                        {l.seller}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{l.stored}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {fmt(l.price)} pi.
                        {nat && l.price < nat.price && <span className="ml-1 text-[11.5px] text-rail-green">−{fmt(nat.price - l.price)}</span>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Btn tone="ghost" busy={busy === `buy-${l.id}`} disabled={balance < l.price || (data.stock[l.part] ?? 0) >= data.limit} onClick={() => act(`buy-${l.id}`, () => api.post("/economy/parts/buy", { factoryId: l.id, qty: 1 }), "Pièce rangée au magasin")}>
                          {(data.stock[l.part] ?? 0) >= data.limit ? "Magasin plein" : "Acheter"}
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------- voies ---------------- */

interface Segment {
  key: string;
  label: string;
  km: number;
  condition: number;
  lines: string[];
  fund: number;
  myFund: number;
  renovationCost: number;
  price: number;
  concession: {
    id: string; mine: boolean; owner: string; livery: string; toll: number; totalTolls: number; protectedUntil: string; lowSince: string | null; invested: number; buyout: number; canBuyout: boolean;
  } | null;
}

interface TrackData {
  segments: Segment[];
  rules: {
    slowFrom: number; slowFactor: number; badFrom: number; badFactor: number; cofunderShare: number; cofunderBonus: number; cofunderDays: number;
    maxToll: number; minCondition: number; graceHours: number; maxConcessions: number; buyout: number; payout: number; protectionHours: number;
  };
  myConcessions: number;
}

const pct = (x: number) => `${Math.round(x * 100)} %`;

export function TrackPanel({ balance, onDone }: { balance: number; onDone: () => void }) {
  const { data, error, load } = useData<TrackData>("/economy/track");
  const { busy, act } = useAct(onDone, load);
  const [tolls, setTolls] = useState<Record<string, string>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  if (error && !data) return <p className="text-slate2 font-body">L'état des voies ne répond pas pour le moment.</p>;
  if (!data) return <div className="h-40 bg-navy-900 animate-skeleton rounded-card" />;
  const r = data.rules;

  return (
    <div className="space-y-6">
      <p className="text-[13.5px] text-slate2 font-body max-w-3xl">
        Chaque train qui passe use la voie. Sous {r.slowFrom} %, on y roule {pct(r.slowFactor - 1)} moins vite ; sous {r.badFrom} %, {pct(r.badFactor - 1)} moins vite et deux fois plus d'incidents. La
        rénovation est un chantier commun : chacun verse ce qu'il veut, et quand la cagnotte couvre le chantier, la voie repasse à 100 %. Avoir payé au moins {pct(r.cofunderShare)} du chantier rapporte +
        {pct(r.cofunderBonus)} sur vos trajets qui l'empruntent pendant {r.cofunderDays} jours.
      </p>
      <p className="text-[13.5px] text-slate2 font-body max-w-3xl">
        Une <b className="text-offwhite">concession</b> vous rend propriétaire d'une liaison : les autres compagnies vous paient un péage (jusqu'à {pct(r.maxToll)} de leur recette, au prorata des
        kilomètres, moitié prix pour vos alliés). En échange, elle doit rester au-dessus de {r.minCondition} % : en dessous plus de {Math.round(r.graceHours / 24)} jours, vous la perdez. {data.myConcessions} /{" "}
        {r.maxConcessions} concessions.
      </p>
      <div className="space-y-3">
        {data.segments.map((s) => {
          const tone = s.condition < r.badFrom ? "red" : s.condition < r.slowFrom ? "amber" : "green";
          const remaining = Math.max(0, s.renovationCost - s.fund);
          const c = s.concession;
          return (
            <div key={s.key} className="border border-line rounded-card bg-navy-900/40 p-4">
              <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                <div className="flex-1 min-w-[220px] space-y-2">
                  <div className="flex items-baseline gap-3">
                    <div className="font-display text-xl leading-tight">{s.label}</div>
                    <div className="font-body text-[12.5px] text-slate2 tabular-nums">{fmt(s.km)} km</div>
                  </div>
                  <Gauge value={s.condition} max={100} tone={tone} label={`État de la voie ${s.label}`} />
                  <div className="flex justify-between font-body text-[12.5px] tabular-nums">
                    <span className={tone === "red" ? "text-rail-red" : tone === "amber" ? "text-amber" : "text-slate2"}>
                      {money(s.condition, 1)} %{s.condition < r.badFrom ? ` · ${pct(r.badFactor - 1)} plus lent` : s.condition < r.slowFrom ? ` · ${pct(r.slowFactor - 1)} plus lent` : ""}
                    </span>
                    {s.lines.length > 0 && <span className="text-slate2 truncate ml-3">{s.lines.join(", ")}</span>}
                  </div>
                </div>

                <div className="w-full sm:w-[260px] space-y-2">
                  <div className="font-body text-[12.5px] text-slate2 tabular-nums">
                    Rénovation : {fmt(s.fund)} / {fmt(s.renovationCost)} pi.{s.myFund > 0 && ` · dont vous ${fmt(s.myFund)}`}
                  </div>
                  <Gauge value={s.fund} max={Math.max(1, s.renovationCost)} label={`Cagnotte de rénovation ${s.label}`} />
                  {s.condition < 99.5 ? (
                    <div className="flex gap-2">
                      <input
                        inputMode="numeric"
                        value={amounts[s.key] ?? ""}
                        onChange={(e) => setAmounts((a) => ({ ...a, [s.key]: e.target.value }))}
                        placeholder={fmt(remaining)}
                        className="w-24 bg-navy-800 border border-line rounded-control px-2 py-1.5 font-mono2 text-[13.5px] tabular-nums"
                        aria-label={`Montant à verser pour ${s.label}`}
                      />
                      <Btn
                        tone="ghost"
                        busy={busy === `fund-${s.key}`}
                        disabled={balance < 1}
                        onClick={() => {
                          const raw = (amounts[s.key] ?? "").replace(/\s/g, "");
                          act(`fund-${s.key}`, () => api.post("/economy/track/fund", { key: s.key, amount: raw ? Number(raw) : remaining }), "Versé à la cagnotte");
                        }}
                      >
                        Verser
                      </Btn>
                    </div>
                  ) : (
                    <div className="font-body text-[12.5px] text-rail-green">Voie en parfait état</div>
                  )}
                </div>

                <div className="w-full sm:w-[260px] space-y-2">
                  {c ? (
                    c.mine ? (
                      <>
                        <div className="font-body text-[13px]">
                          <b>Votre concession</b> <span className="text-slate2">· {fmt(c.totalTolls)} pi. de péages</span>
                        </div>
                        {c.lowSince && <div className="font-body text-[12.5px] text-rail-red">Sous {r.minCondition} % depuis le {dayHour(c.lowSince)} : rénovez vite.</div>}
                        <div className="flex gap-2 items-center">
                          <input
                            inputMode="decimal"
                            value={tolls[c.id] ?? String(Math.round(c.toll * 100))}
                            onChange={(e) => setTolls((t) => ({ ...t, [c.id]: e.target.value }))}
                            className="w-16 bg-navy-800 border border-line rounded-control px-2 py-1.5 font-mono2 text-[13.5px] tabular-nums"
                            aria-label={`Péage de ${s.label}, en pour cent`}
                          />
                          <span className="font-body text-[13px] text-slate2">%</span>
                          <Btn
                            tone="ghost"
                            busy={busy === `toll-${c.id}`}
                            onClick={() => act(`toll-${c.id}`, () => api.patch(`/economy/concessions/${c.id}`, { toll: Number((tolls[c.id] ?? String(c.toll * 100)).replace(",", ".")) / 100 }), "Péage modifié")}
                          >
                            Péage
                          </Btn>
                          <Btn tone="danger" busy={busy === `sellc-${c.id}`} onClick={() => act(`sellc-${c.id}`, () => api.delete(`/economy/concessions/${c.id}`), "Concession rendue au réseau")}>
                            Rendre
                          </Btn>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-body text-[13px]">
                          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: c.livery }} />
                          Concession de <b>{c.owner}</b> <span className="text-slate2">· péage {pct(c.toll)}</span>
                        </div>
                        {c.canBuyout ? (
                          <Btn tone="amber" busy={busy === `buy-${s.key}`} disabled={balance < c.buyout} onClick={() => act(`buy-${s.key}`, () => api.post("/economy/concessions", { key: s.key }), "Concession rachetée")}>
                            Racheter · {fmt(c.buyout)} pi.
                          </Btn>
                        ) : (
                          <div className="font-body text-[12.5px] text-slate2">Protégée jusqu'au {dayHour(c.protectedUntil)}</div>
                        )}
                      </>
                    )
                  ) : (
                    <>
                      <div className="font-body text-[13px] text-slate2">Pas de concessionnaire</div>
                      <Btn tone="ghost" busy={busy === `buy-${s.key}`} disabled={balance < s.price || data.myConcessions >= r.maxConcessions} onClick={() => act(`buy-${s.key}`, () => api.post("/economy/concessions", { key: s.key }), "Concession achetée")}>
                        Prendre la concession · {fmt(s.price)} pi.
                      </Btn>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {data.segments.length === 0 && <p className="font-body text-[13.5px] text-slate2">Tracez une ligne pour voir l'état des voies que vous empruntez.</p>}
      </div>
    </div>
  );
}
