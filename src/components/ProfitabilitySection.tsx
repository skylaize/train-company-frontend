import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

/* ============================================================
   Rentabilité (Premium).

   Une seule question : qu'est-ce qui me rapporte, et qu'est-ce qui me coûte ?
   La page y répond du général au particulier — les sept derniers jours, puis
   les lignes, puis chaque rame — et chaque tableau est trié pour que la
   réponse soit en haut : la meilleure ligne, la rame la plus rentable, et en
   bas celle qui coûte plus qu'elle ne rapporte.
   ============================================================ */

interface TrainStat {
  id: string;
  name: string;
  model: string;
  status: string;
  wear: number;
  line: string | null;
  revenue: number;
  lineRevenue: number;
  freightRevenue: number;
  insurance: number;
  repairs: number;
  trips: number;
  deliveries: number;
  breakdowns: number;
  delays: number;
  net: number;
  netPerHour: number;
  hoursObserved: number;
}

interface LineStat {
  id: string;
  name: string;
  label: string;
  durationMinutes: number;
  trainsNow: number;
  revenue: number;
  trips: number;
  perTrip: number;
  repairs: number;
  net: number;
  netPerHour: number;
}

interface Stats {
  locked: boolean;
  since?: string | null;
  trains?: TrainStat[];
  lines?: LineStat[];
  totals?: {
    lineRevenue: number;
    freightRevenue: number;
    repairs: number;
    insurance: number;
    upkeep: number;
    breakdowns: number;
  };
  payrollPerHour?: number;
  daily?: { day: string; revenue: number; repairs: number; upkeep: number }[];
}

const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n))}`;

const DAY_LABEL = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });

export function ProfitabilitySection() {
  const [data, setData] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .get("/stats/profitability")
      .then(({ data }) => setData(data))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="text-sm text-slate2 font-body">La rentabilité n'est pas disponible pour le moment.</p>;
  if (!data) return <p className="text-sm text-slate2 font-body">Calcul de la rentabilité…</p>;
  if (data.locked) return <LockedPreview />;

  const trains = data.trains ?? [];
  const lines = data.lines ?? [];
  const t = data.totals!;
  const revenue = t.lineRevenue + t.freightRevenue;

  if (!data.since) {
    return (
      <p className="text-sm text-slate2 font-body max-w-[62ch]">
        Pas encore de données. La rentabilité se mesure à partir des trajets et des livraisons effectués depuis la mise
        à jour : revenez après quelques trajets.
      </p>
    );
  }

  const sinceDate = new Date(data.since);
  const partial = Date.now() - sinceDate.getTime() < 6.5 * 24 * 3600_000;

  return (
    <div>
      <p className="text-[12.5px] text-slate2 font-body mb-6 max-w-[70ch]">
        {partial
          ? `Mesuré depuis le ${sinceDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${sinceDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} — les sept jours se rempliront au fil du jeu.`
          : "Les sept derniers jours."}{" "}
        Le bénéfice d'une rame, c'est ce qu'elle rapporte moins ce qu'elle coûte en réparations et en assurance.
        L'entretien du réseau et les salaires se paient pour toute la compagnie et sont comptés à part.
      </p>

      {/* ---- synthèse ---- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-line border border-line mb-8">
        {[
          { label: "Recettes voyageurs", value: fmt(t.lineRevenue), tone: "text-offwhite" },
          { label: "Recettes fret", value: fmt(t.freightRevenue), tone: "text-offwhite" },
          { label: "Réparations", value: `−${fmt(t.repairs)}`, tone: "text-offwhite" },
          { label: "Entretien du réseau", value: `−${fmt(t.upkeep)}`, tone: "text-offwhite" },
          { label: "Salaires, actuellement", value: `${fmt(data.payrollPerHour ?? 0)}/h`, tone: "text-offwhite" },
        ].map((c) => (
          <div key={c.label} className="px-4 py-3 bg-navy-950">
            <div className={`font-mono2 text-lg ${c.tone}`}>{c.value}</div>
            <div className="text-[10.5px] text-slate2 font-body uppercase tracking-[0.1em] mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <DailyChart daily={data.daily ?? []} />

      {/* ---- lignes ---- */}
      <section className="mb-10">
        <h2 className="font-display text-xl mb-1">Lignes</h2>
        <p className="text-[12.5px] text-slate2 font-body mb-3">
          Classées par bénéfice à l'heure : c'est le chiffre qui dit où placer la prochaine rame.
        </p>
        {lines.length === 0 ? (
          <p className="text-[12.5px] text-slate2 font-body border border-dashed border-line px-4 py-3">Aucune ligne ouverte.</p>
        ) : (
          <div className="overflow-x-auto border border-line">
            <table className="w-full text-[12.5px] font-body min-w-[560px]">
              <thead>
                <tr className="text-left text-slate2 font-mono2 text-[10.5px] uppercase tracking-[0.1em] border-b border-line">
                  <th className="px-3 py-2 font-normal">Ligne</th>
                  <th className="px-3 py-2 font-normal text-right">Rames</th>
                  <th className="px-3 py-2 font-normal text-right">Trajets</th>
                  <th className="px-3 py-2 font-normal text-right">Par trajet</th>
                  <th className="px-3 py-2 font-normal text-right">Réparations</th>
                  <th className="px-3 py-2 font-normal text-right">Bénéfice</th>
                  <th className="px-3 py-2 font-normal text-right">Par heure</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2">
                      <span className="text-offwhite">{l.label}</span>
                      {i === 0 && lines.length > 1 && l.net > 0 && (
                        <span className="ml-2 font-mono2 text-[10px] uppercase text-rail-green border border-rail-green/40 px-1 py-px">
                          la plus rentable
                        </span>
                      )}
                      <div className="text-[11px] text-slate2">{l.durationMinutes} min de trajet</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono2">{l.trainsNow}</td>
                    <td className="px-3 py-2 text-right font-mono2">{fmt(l.trips)}</td>
                    <td className="px-3 py-2 text-right font-mono2">{fmt(l.perTrip)}</td>
                    <td className="px-3 py-2 text-right font-mono2 text-slate2">−{fmt(l.repairs)}</td>
                    <td className={`px-3 py-2 text-right font-mono2 ${l.net < 0 ? "text-rail-red" : "text-offwhite"}`}>{signed(l.net)}</td>
                    <td className={`px-3 py-2 text-right font-mono2 ${l.netPerHour < 0 ? "text-rail-red" : "text-offwhite"}`}>{signed(l.netPerHour)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---- rames ---- */}
      <section>
        <h2 className="font-display text-xl mb-1">Rames</h2>
        <p className="text-[12.5px] text-slate2 font-body mb-3">
          De la plus rentable à la moins rentable. Une rame qui tombe souvent en panne coûte autant qu'elle rapporte :
          c'est elle qui a besoin d'un mécanicien.
        </p>
        {trains.length === 0 ? (
          <p className="text-[12.5px] text-slate2 font-body border border-dashed border-line px-4 py-3">Aucune rame.</p>
        ) : (
          <div className="overflow-x-auto border border-line">
            <table className="w-full text-[12.5px] font-body min-w-[640px]">
              <thead>
                <tr className="text-left text-slate2 font-mono2 text-[10.5px] uppercase tracking-[0.1em] border-b border-line">
                  <th className="px-3 py-2 font-normal">Rame</th>
                  <th className="px-3 py-2 font-normal text-right">Recettes</th>
                  <th className="px-3 py-2 font-normal text-right">Réparations</th>
                  <th className="px-3 py-2 font-normal text-right">Pannes</th>
                  <th className="px-3 py-2 font-normal text-right">Retards</th>
                  <th className="px-3 py-2 font-normal text-right">Bénéfice</th>
                  <th className="px-3 py-2 font-normal text-right">Par heure</th>
                </tr>
              </thead>
              <tbody>
                {trains.map((tr) => {
                  const costly = tr.revenue > 0 && tr.repairs + tr.insurance > tr.revenue * 0.6;
                  return (
                    <tr key={tr.id} className="border-b border-line last:border-0">
                      <td className="px-3 py-2">
                        <span className="text-offwhite">{tr.name}</span>
                        {costly && (
                          <span
                            className="ml-2 font-mono2 text-[10px] uppercase text-amber border border-amber/40 px-1 py-px"
                            title="Plus de 60 % de ses recettes partent en réparations"
                          >
                            coûteuse
                          </span>
                        )}
                        <div className="text-[11px] text-slate2">
                          {tr.line ?? (tr.deliveries > 0 ? "Fret" : "À quai")}
                          {tr.trips > 0 && ` · ${fmt(tr.trips)} trajets`}
                          {tr.deliveries > 0 && ` · ${fmt(tr.deliveries)} livraison${tr.deliveries > 1 ? "s" : ""}`}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono2">{fmt(tr.revenue)}</td>
                      <td className="px-3 py-2 text-right font-mono2 text-slate2">
                        −{fmt(tr.repairs + tr.insurance)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono2">{tr.breakdowns}</td>
                      <td className="px-3 py-2 text-right font-mono2">{tr.delays}</td>
                      <td className={`px-3 py-2 text-right font-mono2 ${tr.net < 0 ? "text-rail-red" : "text-offwhite"}`}>{signed(tr.net)}</td>
                      <td className={`px-3 py-2 text-right font-mono2 ${tr.netPerHour < 0 ? "text-rail-red" : "text-offwhite"}`}>{signed(tr.netPerHour)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11.5px] text-slate2 font-body mt-3">
          {t.breakdowns} panne{t.breakdowns > 1 ? "s" : ""} sur la période
          {t.insurance > 0 && ` · ${fmt(t.insurance)} pi. d'assurance fret`} · recettes totales {fmt(revenue)} pi.
        </p>
      </section>
    </div>
  );
}

/* Recettes et dépenses par jour : deux barres côte à côte, une seule échelle.
   Le bénéfice du jour est écrit sous chaque paire — c'est le chiffre qu'on
   cherche, on ne le fait pas deviner à partir de deux hauteurs. */
function DailyChart({ daily }: { daily: { day: string; revenue: number; repairs: number; upkeep: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...daily.map((d) => Math.max(d.revenue, d.repairs + d.upkeep)));
  const H = 140;

  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
        <h2 className="font-display text-xl">Jour par jour</h2>
        <div className="flex gap-4 text-[11px] font-body text-slate2">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-cobalt rounded-[2px]" /> Recettes
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber rounded-[2px]" /> Réparations et entretien
          </span>
        </div>
      </div>

      <div className="border border-line px-3 pt-4 pb-2" role="img" aria-label="Recettes et dépenses des sept derniers jours">
        <div className="relative" style={{ height: H }}>
          {/* repère à mi-hauteur, discret */}
          <div className="absolute left-0 right-0 border-t border-line/60" style={{ top: H / 2 }} />
          <div className="absolute inset-0 grid grid-cols-7 gap-2 items-end">
            {daily.map((d, i) => {
              const cost = d.repairs + d.upkeep;
              return (
                <div
                  key={d.day}
                  className="relative h-full flex items-end justify-center gap-[2px] cursor-default"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div
                    className={`w-[38%] max-w-[22px] bg-cobalt rounded-t-[4px] transition-opacity ${hover !== null && hover !== i ? "opacity-40" : ""}`}
                    style={{ height: `${(d.revenue / max) * 100}%`, minHeight: d.revenue > 0 ? 2 : 0 }}
                  />
                  <div
                    className={`w-[38%] max-w-[22px] bg-amber rounded-t-[4px] transition-opacity ${hover !== null && hover !== i ? "opacity-40" : ""}`}
                    style={{ height: `${(cost / max) * 100}%`, minHeight: cost > 0 ? 2 : 0 }}
                  />
                  {hover === i && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 bg-navy-900 border border-line px-2.5 py-1.5 text-[11px] font-body whitespace-nowrap shadow-lg">
                      <div className="text-offwhite mb-0.5">{DAY_LABEL(d.day)}</div>
                      <div className="text-slate2">Recettes <span className="font-mono2 text-offwhite">{fmt(d.revenue)}</span></div>
                      <div className="text-slate2">Réparations <span className="font-mono2 text-offwhite">{fmt(d.repairs)}</span></div>
                      <div className="text-slate2">Entretien <span className="font-mono2 text-offwhite">{fmt(d.upkeep)}</span></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 mt-2 border-t border-line pt-1.5">
          {daily.map((d) => {
            const net = d.revenue - d.repairs - d.upkeep;
            return (
              <div key={d.day} className="text-center">
                <div className="text-[10.5px] font-body text-slate2 capitalize">{DAY_LABEL(d.day)}</div>
                <div className={`text-[11px] font-mono2 ${net < 0 ? "text-rail-red" : "text-offwhite"}`}>{signed(net)}</div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[11px] text-slate2 font-body mt-1.5">Sous chaque jour : recettes moins réparations et entretien, hors salaires.</p>
    </section>
  );
}

/* Ce que verrait un abonné, sans les chiffres : on montre la forme de la
   page plutôt qu'une liste d'arguments. */
function LockedPreview() {
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  async function upgrade() {
    setBusy(true);
    try {
      const { data } = await api.post("/billing/checkout");
      if (data?.url) window.location.href = data.url;
      else showToast("Impossible d'ouvrir la page de paiement", "error");
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Impossible d'ouvrir la page de paiement", "error");
    } finally {
      setBusy(false);
    }
  }

  const fake = [
    ["Lyon → Marseille", "+2 140"],
    ["Paris → Lille", "+1 380"],
    ["Nantes → Rennes", "−210"],
  ];

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[3px] opacity-60" aria-hidden>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-line border border-line mb-6">
          {["12 480", "6 920", "−4 310", "−2 150", "1 560/h"].map((v) => (
            <div key={v} className="px-4 py-3 bg-navy-950">
              <div className="font-mono2 text-lg">{v}</div>
              <div className="h-2 w-20 bg-line mt-2" />
            </div>
          ))}
        </div>
        <div className="border border-line h-36 mb-6 flex items-end gap-3 px-4 pb-3">
          {[60, 72, 48, 80, 66, 90, 74].map((h, i) => (
            <div key={i} className="flex-1 flex items-end justify-center gap-[2px] h-full">
              <div className="w-3 bg-cobalt rounded-t-[4px]" style={{ height: `${h}%` }} />
              <div className="w-3 bg-amber rounded-t-[4px]" style={{ height: `${h * 0.45}%` }} />
            </div>
          ))}
        </div>
        <div className="border border-line divide-y divide-line">
          {fake.map(([l, v]) => (
            <div key={l} className="flex justify-between px-3 py-2 text-[12.5px]">
              <span>{l}</span>
              <span className="font-mono2">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 flex items-start justify-center pt-10 px-4">
        <div className="bg-navy-900 border border-line border-t-[3px] border-t-cobalt max-w-md p-5 shadow-xl">
          <h2 className="font-display text-xl mb-1">Ce qui vous rapporte, ce qui vous coûte</h2>
          <p className="text-[13px] text-slate2 font-body mb-4">
            Recettes, réparations, pannes et bénéfice à l'heure pour chaque ligne et chaque rame, sur sept jours. Pour
            savoir où placer la prochaine rame et laquelle vous coûte plus qu'elle ne rapporte.
          </p>
          <button
            onClick={upgrade}
            disabled={busy}
            className="px-4 py-2 bg-cobalt text-onaccent font-mono2 text-[11px] uppercase tracking-wide disabled:opacity-50"
          >
            {busy ? "Ouverture…" : "Passer Premium · dès 5,99 €"}
          </button>
          <p className="text-[11px] text-slate2 font-body mt-2">Paiement unique, aucun abonnement. Inclus aussi : le bilan de retour et la file de chantiers.</p>
        </div>
      </div>
    </div>
  );
}
