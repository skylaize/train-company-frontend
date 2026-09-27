import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Emblem } from "./Emblem";
import { PremiumCTA, PremiumInfo } from "./PremiumCTA";

/* ============================================================
   Appels d'offres (1.5).

   Chaque semaine, trois régions cherchent une compagnie pour une liaison.
   La page répond, dans l'ordre, à : qu'est-ce que je peux remporter ? où en
   sont mes contrats ? qui a gagné quoi ?
   ============================================================ */

interface Tender {
  id: string;
  region: string;
  stationA: string;
  stationB: string;
  km: number | null;
  durationMinutes: number | null;
  budgetPerDay: number;
  minBid: number;
  tripsRequired: number;
  publishedAt: string;
  opensAt: string;
  closesAt: string;
  endsAt: string;
  status: "ANNONCE" | "OUVERT" | "ATTRIBUE" | "INFRUCTUEUX" | "TERMINE";
  myBid: number | null;
  bidCount: number | null;
  totalBids: number | null;
  hasLine: boolean;
  winner: { name: string; emblem: string | null; liveryColor: string; isMe: boolean } | null;
  winningBid: number | null;
  progress: { trips: number; paidTotal: number; running: boolean } | null;
  trips: number | null;
  objectiveMet: boolean | null;
  paidTotal: number | null;
}

interface TendersData {
  isPremium: boolean;
  tenders: Tender[];
  announcedCount: number;
}

const fmt = (n: number) => n.toLocaleString("fr-FR");
const when = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
function left(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "maintenant";
  const h = Math.floor(ms / 3600_000);
  if (h >= 48) return `${Math.floor(h / 24)} jours`;
  if (h >= 1) return `${h} h ${String(Math.floor((ms % 3600_000) / 60_000)).padStart(2, "0")}`;
  return `${Math.max(1, Math.round(ms / 60_000))} min`;
}

export function TendersSection({ company, onChange, onOpenLines }: { company: PremiumInfo; onChange: () => void; onOpenLines: () => void }) {
  const [data, setData] = useState<TendersData | null>(null);
  const [error, setError] = useState(false);

  const load = () =>
    api
      .get("/tenders")
      .then(({ data }) => { setData(data); setError(false); })
      .catch(() => setError(true));

  useEffect(() => {
    load();
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (error && !data) return <p className="text-slate2 font-body">Les appels d'offres ne répondent pas pour le moment. Réessayez dans un instant.</p>;
  if (!data) return <div className="h-40 bg-navy-900 animate-skeleton" />;

  const open = data.tenders.filter((t) => t.status === "OUVERT");
  const mine = data.tenders.filter((t) => t.status === "ATTRIBUE" && t.winner?.isMe);
  const awarded = data.tenders.filter((t) => t.status === "ATTRIBUE" && !t.winner?.isMe);
  const announced = data.tenders.filter((t) => t.status === "ANNONCE");
  const past = data.tenders.filter((t) => t.status === "TERMINE" || t.status === "INFRUCTUEUX");
  const refresh = () => { load(); onChange(); };

  return (
    <div className="space-y-8">
      <HowItWorks />

      {mine.length > 0 && (
        <section>
          <h2 className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-slate2 mb-3">Vos contrats en cours</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {mine.map((t) => <ContractCard key={t.id} t={t} onOpenLines={onOpenLines} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-slate2 mb-3">Marchés ouverts</h2>
        {open.length === 0 ? (
          <p className="border border-line px-4 py-4 text-[13px] text-slate2 font-body">
            Aucun marché ouvert en ce moment. Les prochains ouvrent lundi à 0 h, et les offres restent possibles jusqu'au mercredi.
          </p>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3 md:grid-cols-2">
              {open.map((t) => <OpenCard key={t.id} t={t} premium={data.isPremium} company={company} onDone={refresh} onOpenLines={onOpenLines} />)}
            </div>
            {!data.isPremium && (
              <div className="mt-3 border border-line px-4 py-3 flex flex-wrap items-center gap-3">
                <span className="text-[12.5px] font-body text-slate2 flex-1 min-w-[240px]">
                  Combien de concurrents ont déjà déposé une offre ? Les abonnés le voient sur chaque marché, sans jamais connaître les montants.
                </span>
                <PremiumCTA company={company} compact />
              </div>
            )}
          </>
        )}
      </section>

      {(announced.length > 0 || data.announcedCount > 0) && (
        <section>
          <h2 className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-slate2 mb-3">Annoncés pour la semaine prochaine</h2>
          {announced.length > 0 ? (
            <div className="border border-cobalt/40 bg-cobalt/5 divide-y divide-line">
              {announced.map((t) => (
                <div key={t.id} className="px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-1">
                  <span className="font-mono2 text-[10.5px] uppercase tracking-[0.12em] text-cobalt w-40">{t.region}</span>
                  <span className="font-display text-lg flex-1">{t.stationA} – {t.stationB}</span>
                  <span className="font-mono2 text-[12px] text-slate2">budget {fmt(t.budgetPerDay)} pi./jour · {fmt(t.tripsRequired)} trajets</span>
                  <span className="font-mono2 text-[11px] text-cobalt">ouvre {when(t.opensAt)}</span>
                </div>
              ))}
              <p className="px-4 py-2.5 text-[12px] font-body text-slate2">
                Vue Premium : vous voyez les marchés un jour avant tout le monde, le temps de tracer vos lignes.
              </p>
            </div>
          ) : (
            <div className="border border-line px-4 py-3 flex flex-wrap items-center gap-3">
              <span className="text-[13px] font-body text-slate2 flex-1 min-w-[240px]">
                {data.announcedCount} marché{data.announcedCount > 1 ? "s sont déjà annoncés" : " est déjà annoncé"} pour lundi. Les abonnés savent déjà quelles liaisons préparer.
              </span>
              <PremiumCTA company={company} compact />
            </div>
          )}
        </section>
      )}

      {awarded.length > 0 && (
        <section>
          <h2 className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-slate2 mb-3">Attribués cette semaine</h2>
          <ResultsTable rows={awarded} />
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="font-mono2 text-[11px] uppercase tracking-[0.14em] text-slate2 mb-3">Semaines précédentes</h2>
          <ResultsTable rows={past} />
        </section>
      )}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { d: "Dimanche", t: "Annonce", b: "Les abonnés Premium découvrent les trois marchés de la semaine." },
    { d: "Lundi → mardi", t: "Offres", b: "Chaque compagnie qui exploite la liaison propose une subvention par jour, sous pli fermé." },
    { d: "Mercredi 0 h", t: "Attribution", b: "La moins chère l'emporte, pondérée par la réputation." },
    { d: "Jusqu'à lundi", t: "Contrat", b: "Subvention versée à chaque heure où une de vos rames roule sur la liaison." },
  ];
  return (
    <ol className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border border-line">
      {steps.map((s, i) => (
        <li key={s.t} className="bg-navy-950 px-4 py-3">
          <div className="font-mono2 text-[10.5px] uppercase tracking-[0.12em] text-slate2">{i + 1} · {s.d}</div>
          <div className="font-display text-base mt-0.5">{s.t}</div>
          <p className="text-[12px] font-body text-slate2 mt-1 leading-snug">{s.b}</p>
        </li>
      ))}
    </ol>
  );
}

function OpenCard({
  t,
  premium,
  onDone,
  onOpenLines,
}: {
  t: Tender;
  premium: boolean;
  company?: PremiumInfo;
  onDone: () => void;
  onOpenLines: () => void;
}) {
  const { showToast } = useToast();
  const [amount, setAmount] = useState<number>(t.myBid ?? Math.round((t.budgetPerDay * 0.75) / 10) * 10);
  const [busy, setBusy] = useState(false);
  const ratio = amount / t.budgetPerDay;
  const days = Math.round((new Date(t.endsAt).getTime() - new Date(t.closesAt).getTime()) / 86_400_000);

  async function submit() {
    setBusy(true);
    try {
      await api.post(`/tenders/${t.id}/bid`, { amount });
      showToast(t.myBid ? "Offre modifiée" : "Offre déposée", "success");
      onDone();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Offre refusée", "error");
    } finally {
      setBusy(false);
    }
  }
  async function withdraw() {
    setBusy(true);
    try {
      await api.delete(`/tenders/${t.id}/bid`);
      showToast("Offre retirée", "success");
      onDone();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Impossible de retirer l'offre", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="border border-line border-t-[3px] border-t-amber bg-navy-950/40 flex flex-col">
      <div className="px-4 pt-3 pb-3 border-b border-line">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono2 text-[10.5px] uppercase tracking-[0.12em] text-amber">{t.region}</span>
          <span className="font-mono2 text-[11px] text-slate2">clôture dans {left(t.closesAt)}</span>
        </div>
        <h3 className="font-display text-xl leading-tight mt-1">{t.stationA} – {t.stationB}</h3>
        <div className="text-[12px] font-mono2 text-slate2 mt-1">
          {t.km ?? "—"} km · {t.durationMinutes ?? "—"} min · contrat de {days} jours
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px bg-line">
        <div className="bg-navy-950 px-4 py-2.5">
          <dt className="text-[10.5px] font-body uppercase tracking-[0.1em] text-slate2">Budget / jour</dt>
          <dd className="font-mono2 text-lg text-offwhite tabular-nums">{fmt(t.budgetPerDay)} pi.</dd>
        </div>
        <div className="bg-navy-950 px-4 py-2.5">
          <dt className="text-[10.5px] font-body uppercase tracking-[0.1em] text-slate2">Trajets demandés</dt>
          <dd className="font-mono2 text-lg text-offwhite tabular-nums">{fmt(t.tripsRequired)}</dd>
        </div>
      </dl>

      <div className="px-4 py-3 flex-1 flex flex-col gap-2">
        <label htmlFor={`bid-${t.id}`} className="text-[12px] font-body text-slate2">
          Votre offre : subvention demandée par jour
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`bid-${t.id}`}
            type="number"
            min={t.minBid}
            max={t.budgetPerDay}
            step={10}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-28 bg-navy-900 border border-line px-2.5 py-1.5 font-mono2 text-sm text-offwhite focus:border-amber outline-none"
          />
          <span className="text-[12px] font-mono2 text-slate2">pi./jour · {Math.round(ratio * 100)} % du budget</span>
        </div>
        <input
          type="range"
          aria-label="Ajuster l'offre"
          min={t.minBid}
          max={t.budgetPerDay}
          step={10}
          value={Math.min(t.budgetPerDay, Math.max(t.minBid, amount))}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full accent-amber"
        />
        <p className="text-[11.5px] font-body text-slate2 leading-snug">
          Sur {days} jours de service complet : jusqu'à <span className="text-offwhite">{fmt(amount * days)} pi.</span>, plus une prime
          d'une journée si les {fmt(t.tripsRequired)} trajets sont faits.
        </p>
        {!t.hasLine && (
          <p className="text-[11.5px] font-body text-amber leading-snug">
            Il faut une ligne {t.stationA} – {t.stationB} pour déposer une offre, et une rame dessus pour toucher la subvention.{" "}
            <button onClick={onOpenLines} className="underline underline-offset-2 hover:text-offwhite">Tracer la ligne</button>
          </p>
        )}

        <div className="mt-auto pt-2 flex flex-wrap items-center gap-2">
          <button
            onClick={submit}
            disabled={busy || !t.hasLine || amount < t.minBid || amount > t.budgetPerDay}
            className="px-4 py-2 text-[11px] bg-amber text-onaccent font-mono2 uppercase tracking-wide disabled:opacity-50"
          >
            {t.myBid ? "Modifier l'offre" : "Déposer l'offre"}
          </button>
          {t.myBid !== null && (
            <button onClick={withdraw} disabled={busy} className="px-3 py-2 text-[11px] border border-line text-slate2 font-mono2 uppercase hover:text-offwhite">
              Retirer
            </button>
          )}
          <span className="ml-auto text-[11px] font-mono2 text-slate2">
            {t.myBid !== null && <span className="text-rail-green">offre : {fmt(t.myBid)}</span>}
            {premium && `${t.myBid !== null ? " · " : ""}${t.bidCount ?? 0} offre${(t.bidCount ?? 0) > 1 ? "s" : ""} déposée${(t.bidCount ?? 0) > 1 ? "s" : ""}`}
          </span>
        </div>
      </div>
    </article>
  );
}

function ContractCard({ t, onOpenLines }: { t: Tender; onOpenLines: () => void }) {
  const trips = t.progress?.trips ?? 0;
  const pct = Math.min(100, Math.round((trips / t.tripsRequired) * 100));
  const elapsed = (Date.now() - new Date(t.closesAt).getTime()) / (new Date(t.endsAt).getTime() - new Date(t.closesAt).getTime());
  const onTrack = trips >= t.tripsRequired * Math.min(1, elapsed);
  return (
    <article className="border border-line border-t-[3px] border-t-rail-green px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono2 text-[10.5px] uppercase tracking-[0.12em] text-rail-green">{t.region} · marché remporté</span>
        <span className="font-mono2 text-[11px] text-slate2">fin dans {left(t.endsAt)}</span>
      </div>
      <h3 className="font-display text-xl leading-tight mt-1">{t.stationA} – {t.stationB}</h3>
      <div className="mt-3">
        <div className="flex justify-between text-[12px] font-mono2 mb-1">
          <span className="text-slate2">Trajets</span>
          <span className={onTrack ? "text-rail-green" : "text-amber"}>{fmt(trips)} / {fmt(t.tripsRequired)}</span>
        </div>
        <div className="h-2 bg-line relative">
          <div className={`absolute inset-y-0 left-0 ${onTrack ? "bg-rail-green" : "bg-amber"}`} style={{ width: `${pct}%` }} />
          <div className="absolute inset-y-[-3px] w-px bg-slate2" style={{ left: `${Math.min(100, elapsed * 100)}%` }} title="Où vous devriez en être" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3 text-[12px] font-body">
        <div>
          <div className="text-slate2">Subvention</div>
          <div className="font-mono2 text-offwhite">{fmt(t.winningBid ?? 0)} pi./jour</div>
        </div>
        <div>
          <div className="text-slate2">Déjà versé</div>
          <div className="font-mono2 text-amber">{fmt(t.progress?.paidTotal ?? 0)} pi.</div>
        </div>
      </div>
      {!t.hasLine ? (
        <p className="text-[12px] font-body text-rail-red mt-3">
          Aucune ligne sur cette liaison : rien n'est versé.{" "}
          <button onClick={onOpenLines} className="underline underline-offset-2">Tracer la ligne</button>
        </p>
      ) : !onTrack ? (
        <p className="text-[12px] font-body text-amber mt-3">En retard sur l'objectif : ajoutez une rame sur la ligne pour éviter la pénalité.</p>
      ) : (
        <p className="text-[12px] font-body text-slate2 mt-3">Dans les temps. Prime d'une journée si l'objectif est atteint lundi.</p>
      )}
    </article>
  );
}

function ResultsTable({ rows }: { rows: Tender[] }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="text-left text-[11px] text-slate2 font-body uppercase tracking-[0.14em] border-b border-line">
            <th className="py-2 font-normal">Liaison</th>
            <th className="py-2 font-normal">Titulaire</th>
            <th className="py-2 font-normal text-right">Subvention</th>
            <th className="py-2 font-normal text-right">Offres</th>
            <th className="py-2 font-normal text-right">Résultat</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b border-line last:border-0">
              <td className="py-2.5 font-body">
                {t.stationA} – {t.stationB}
                <span className="block text-[11px] text-slate2">{t.region}</span>
              </td>
              <td className="py-2.5 font-body">
                {t.winner ? (
                  <span className={`inline-flex items-center gap-1.5 ${t.winner.isMe ? "text-rail-green" : ""}`}>
                    {t.winner.emblem && <span style={{ color: t.winner.liveryColor }}><Emblem id={t.winner.emblem} size={14} /></span>}
                    {t.winner.isMe ? "Vous" : t.winner.name}
                  </span>
                ) : (
                  <span className="text-slate2">Aucune offre</span>
                )}
              </td>
              <td className="py-2.5 text-right font-mono2">{t.winningBid ? `${fmt(t.winningBid)} pi./j` : "—"}</td>
              <td className="py-2.5 text-right font-mono2 text-slate2">{t.totalBids ?? "—"}</td>
              <td className="py-2.5 text-right font-mono2 text-[12px]">
                {t.status === "INFRUCTUEUX" ? (
                  <span className="text-slate2">infructueux</span>
                ) : t.status === "TERMINE" ? (
                  <span className={t.objectiveMet ? "text-rail-green" : "text-rail-red"}>
                    {t.objectiveMet ? "rempli" : "non rempli"} · {fmt(t.trips ?? 0)}/{fmt(t.tripsRequired)}
                  </span>
                ) : (
                  <span className="text-slate2">en cours</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
