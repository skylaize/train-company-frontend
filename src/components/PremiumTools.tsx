import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

/* ============================================================
   2.1.1 (Premium) : les outils de l'exploitant.

   - la cote de revente d'une rame : ses 14 derniers jours, les 7 prochains
     et le meilleur jour pour la revendre ;
   - les horaires d'une rame : hors de sa plage, elle se gare au terminus ;
   - les alertes personnalisées : trésorerie, usure, fret, revente.
   ============================================================ */

const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", timeZone: "Europe/Paris" });
const dayShort = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "narrow", timeZone: "Europe/Paris" });

interface Outlook {
  heritage?: boolean;
  history: { date: string; value: number; cote: number }[];
  forecast: { date: string; value: number; cote: number }[];
  today: number;
  cote: number;
  best: { date: string; value: number; gain: number } | null;
  sellNow: boolean;
  high14: boolean;
}

/* ---------- la cote de revente ---------- */

export function ResaleOutlook({ trainId, trainName }: { trainId: string; trainName: string }) {
  const [o, setO] = useState<Outlook | null>(null);
  const [failed, setFailed] = useState(false);
  const { showToast, showComposter } = useToast();
  useEffect(() => {
    api
      .get(`/trains/${trainId}/resale`)
      .then(({ data }) => setO(data))
      .catch(() => setFailed(true));
  }, [trainId]);
  if (failed) return null;
  if (!o) return <div className="h-[112px] mt-3 bg-navy-950 animate-skeleton" />;
  if (o.heritage) return null;

  const pts = [...o.history, ...o.forecast];
  const W = 560, H = 96, padX = 6, padY = 12;
  const min = Math.min(...pts.map((p) => p.value)), max = Math.max(...pts.map((p) => p.value));
  const span = Math.max(1, max - min);
  const x = (i: number) => padX + (i / (pts.length - 1)) * (W - padX * 2);
  const y = (v: number) => padY + (1 - (v - min) / span) * (H - padY * 2);
  const todayI = o.history.length - 1;
  const past = o.history.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const future = [o.history[todayI], ...o.forecast].map((p, i) => `${i ? "L" : "M"}${x(todayI + i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const bestI = o.best ? pts.findIndex((p) => p.date === o.best!.date) : todayI;
  const delta = Math.round((o.cote - 1) * 100);

  async function watch() {
    const threshold = o!.best ? o!.best.value : Math.round(o!.today * 1.05);
    try {
      await api.post("/alerts", { kind: "REVENTE", threshold, targetId: trainId });
      showComposter(`Alerte posée : ${trainName} à ${fmt(threshold)} pi.`);
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    }
  }

  return (
    <div className="mt-3 border border-line bg-navy-950/60 rounded-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 pt-2.5">
        <span className="text-[12.5px] font-body text-slate2">
          Cote de l'occasion aujourd'hui :{" "}
          <span className={`font-mono2 ${delta > 0 ? "text-rail-green" : delta < 0 ? "text-amber" : "text-offwhite"}`}>
            {delta > 0 ? "+" : delta < 0 ? "−" : ""}
            {Math.abs(delta)} %
          </span>
        </span>
        <span className="text-[11.5px] font-body text-slate2">14 jours, et la semaine qui vient à usure égale</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[96px] block" role="img" aria-label={`Valeur de reprise de ${trainName} : ${fmt(o.today)} pi. aujourd'hui`}>
        {/* aujourd'hui */}
        <line x1={x(todayI)} x2={x(todayI)} y1={4} y2={H - 4} stroke="rgb(var(--c-line))" strokeDasharray="2 3" />
        <path d={past} fill="none" stroke="rgb(var(--c-cobalt))" strokeWidth="2" strokeLinejoin="round" />
        <path d={future} fill="none" stroke="rgb(var(--c-amber))" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" />
        <circle cx={x(todayI)} cy={y(o.today)} r="3.5" fill="rgb(var(--c-cobalt))" />
        {o.best && <circle cx={x(bestI)} cy={y(o.best.value)} r="4.5" fill="none" stroke="rgb(var(--c-amber))" strokeWidth="2" />}
        {pts.map((p, i) =>
          i % 2 === 0 || i === todayI ? (
            <text key={p.date} x={x(i)} y={H - 1} textAnchor="middle" fontSize="8.5" fill="rgb(var(--c-slate2))" fontFamily="var(--font-mono, monospace)">
              {i === todayI ? "auj." : dayShort(p.date)}
            </text>
          ) : null
        )}
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2.5 border-t border-line pt-2">
        <p className="text-[13px] font-body">
          {o.sellNow ? (
            <span className="text-rail-green">
              C'est le bon jour : la reprise ne fera pas mieux cette semaine{o.high14 ? ", et elle est au plus haut des 14 derniers jours" : ""}.
            </span>
          ) : (
            <span className="text-offwhite">
              Meilleur jour : <span className="text-amber">{dayLabel(o.best!.date)}</span>, {fmt(o.best!.value)} pi.{" "}
              <span className="text-slate2">(+{fmt(o.best!.gain)} pi. si l'usure ne bouge pas)</span>
            </span>
          )}
        </p>
        {!o.sellNow && (
          <button onClick={watch} className="text-[12.5px] font-body text-amber border border-amber/40 px-2.5 py-1 hover:bg-amber/10 rounded-control">
            Me prévenir ce jour-là
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- les horaires d'une rame ---------- */

const PRESETS: { label: string; from: number | null; to: number | null }[] = [
  { label: "Toute la journée", from: null, to: null },
  { label: "La nuit, 22 h – 6 h", from: 22, to: 6 },
  { label: "Le jour, 6 h – 22 h", from: 6, to: 22 },
  { label: "Les pointes, 7 h – 20 h", from: 7, to: 20 },
];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function scheduleText(from?: number | null, to?: number | null) {
  if (from == null || to == null) return null;
  return `${from} h – ${to} h`;
}

export function TrainSchedule({
  train,
  isPremium,
  onChange,
  onGoPremium,
}: {
  train: { id: string; name: string; model: string; serviceFrom?: number | null; serviceTo?: number | null };
  isPremium: boolean;
  onChange: () => void;
  onGoPremium: () => void;
}) {
  const [from, setFrom] = useState<number | null>(train.serviceFrom ?? null);
  const [to, setTo] = useState<number | null>(train.serviceTo ?? null);
  const [busy, setBusy] = useState(false);
  const { showToast, showComposter } = useToast();
  const dirty = from !== (train.serviceFrom ?? null) || to !== (train.serviceTo ?? null);
  const sleeper = train.model === "COUCHETTES" || train.model === "NUIT_EUROPE";

  async function save(f: number | null, t: number | null) {
    setBusy(true);
    try {
      await api.post("/trains/schedule", { trainId: train.id, from: f, to: t });
      showComposter(f == null ? `${train.name} roule toute la journée` : `${train.name} roulera de ${f} h à ${t} h`);
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusy(false);
    }
  }

  // la plage sur un cadran de 24 heures, en barre
  const on = (h: number) => from == null || to == null || (from < to ? h >= from && h < to : h >= from || h < to);

  return (
    <section className="px-5 py-4 border-b border-line">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="font-body font-semibold text-[15px]">Horaires</h4>
        {!isPremium && <span className="text-[12px] font-body text-amber">Premium</span>}
      </div>
      <p className="text-[13px] text-slate2 font-body mt-0.5">
        Hors de sa plage, la rame termine son trajet et se gare au terminus, sans s'user ; elle repart à l'heure de reprise.
        {sleeper ? " Pour un train de nuit, « la nuit » évite les trajets de jour qui rapportent peu." : ""}
      </p>
      <div className="mt-3 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-px" aria-hidden="true">
        {HOURS.map((h) => (
          <div key={h} className="flex flex-col items-center gap-1">
            <span className={`h-3 w-full ${on(h) ? "bg-cobalt" : "bg-navy-950 border border-line"}`} />
            {h % 6 === 0 && <span className="text-[9.5px] font-mono2 text-slate2">{h}</span>}
          </div>
        ))}
      </div>
      {isPremium ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setFrom(p.from);
                setTo(p.to);
              }}
              aria-pressed={from === p.from && to === p.to}
              className={`text-[12.5px] font-body border px-2.5 py-1 rounded-control ${from === p.from && to === p.to ? "border-cobalt text-cobalt" : "border-line text-slate2 hover:text-offwhite"}`}
            >
              {p.label}
            </button>
          ))}
          <span className="flex items-center gap-1.5 text-[12.5px] font-body text-slate2">
            de
            <select value={from ?? ""} onChange={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); setFrom(v); if (v !== null && to === null) setTo((v + 8) % 24); if (v === null) setTo(null); }} className="bg-navy-950 border border-line px-1.5 py-0.5 text-offwhite rounded-control">
              <option value="">—</option>
              {HOURS.map((h) => <option key={h} value={h}>{h} h</option>)}
            </select>
            à
            <select value={to ?? ""} onChange={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); setTo(v); if (v !== null && from === null) setFrom((v + 16) % 24); if (v === null) setFrom(null); }} className="bg-navy-950 border border-line px-1.5 py-0.5 text-offwhite rounded-control">
              <option value="">—</option>
              {HOURS.map((h) => <option key={h} value={h}>{h} h</option>)}
            </select>
          </span>
          <button
            onClick={() => save(from, to)}
            disabled={!dirty || busy || (from !== null && from === to)}
            className="ml-auto text-[13px] font-semibold font-body bg-cobalt text-onaccent px-3 py-1.5 disabled:opacity-40 rounded-control"
          >
            {busy ? "…" : "Enregistrer"}
          </button>
        </div>
      ) : (
        <button onClick={onGoPremium} className="mt-3 text-[13.5px] font-body text-amber border border-amber/40 px-3.5 py-2 hover:bg-amber/10 rounded-control">
          Les horaires par rame sont réservés au Premium
        </button>
      )}
    </section>
  );
}

/* ---------- les alertes personnalisées ---------- */

interface AlertRow {
  id: string;
  kind: "TRESORERIE" | "USURE" | "FRET" | "REVENTE";
  threshold: number;
  targetId: string | null;
  active: boolean;
  firedAt: string | null;
  message: string | null;
}

const KINDS: { id: AlertRow["kind"]; label: string; unit: string; hint: string; def: number }[] = [
  { id: "TRESORERIE", label: "Trésorerie sous", unit: "pi.", hint: "Prévenu quand la caisse passe sous ce montant", def: 1000 },
  { id: "USURE", label: "Rame usée à", unit: "%", hint: "Prévenu dès qu'une rame atteint cette usure", def: 80 },
  { id: "FRET", label: "Contrat de fret d'au moins", unit: "pi.", hint: "Prévenu quand un contrat qui paie autant arrive sur le marché", def: 400 },
  { id: "REVENTE", label: "Reprise d'une rame à", unit: "pi.", hint: "Prévenu quand la rame se reprend au moins à ce prix", def: 300 },
];

export function describeAlert(a: { kind: string; threshold: number; targetId: string | null }, trainName: (id: string | null) => string | null) {
  const k = KINDS.find((x) => x.id === a.kind);
  if (!k) return a.kind;
  const v = `${fmt(a.threshold)} ${k.unit}`;
  if (a.kind === "REVENTE") return `${trainName(a.targetId) ?? "Rame vendue"} reprise à ${v} ou plus`;
  if (a.kind === "USURE") return `Une rame usée à ${v} ou plus`;
  if (a.kind === "TRESORERIE") return `Trésorerie sous ${v}`;
  return `Contrat de fret à ${v} ou plus`;
}

export function AlertsPanel({ isPremium, trains, onGoPremium }: { isPremium: boolean; trains: { id: string; name: string }[]; onGoPremium: () => void }) {
  const [rows, setRows] = useState<AlertRow[] | null>(null);
  const [max, setMax] = useState(10);
  const [kind, setKind] = useState<AlertRow["kind"]>("TRESORERIE");
  const [value, setValue] = useState<string>("1000");
  const [target, setTarget] = useState<string>(trains[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const { showToast, showComposter } = useToast();
  const trainName = (id: string | null) => trains.find((t) => t.id === id)?.name ?? null;

  const load = () =>
    api
      .get("/alerts")
      .then(({ data }) => {
        setRows(data.alerts);
        setMax(data.max);
      })
      .catch(() => setRows([]));
  useEffect(() => {
    load();
  }, []);

  async function add() {
    setBusy(true);
    try {
      await api.post("/alerts", { kind, threshold: Number(value), targetId: kind === "REVENTE" ? target : null });
      showComposter("Alerte posée");
      await load();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    try {
      await api.delete(`/alerts/${id}`);
      await load();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    }
  }

  const k = KINDS.find((x) => x.id === kind)!;
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3 border-b border-line pb-2">
        <h2 className="font-display text-xl leading-none">Mes alertes</h2>
        <span className="text-[12px] font-body text-slate2">
          {rows ? `${rows.length}/${max}` : ""} {isPremium ? "" : "· Premium"}
        </span>
      </div>
      <p className="text-[13px] text-slate2 font-body max-w-[66ch] mb-4">
        L'alerte part sur votre téléphone (si les notifications sont activées) et s'affiche dans le jeu, une fois quand la
        condition se vérifie, puis de nouveau si elle change (une autre rame, un autre contrat).
      </p>
      {rows && rows.length > 0 && (
        <ul className="border border-line divide-y divide-line mb-4 rounded-card">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${a.active ? "bg-amber" : "bg-line"}`} title={a.active ? "Condition vérifiée en ce moment" : "En veille"} />
              <span className="text-[14px] font-body flex-1 min-w-[200px]">{describeAlert(a, trainName)}</span>
              <span className="text-[12px] font-body text-slate2">
                {a.firedAt ? `dernière : ${new Date(a.firedAt).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}` : "jamais déclenchée"}
              </span>
              <button onClick={() => remove(a.id)} className="text-[12.5px] font-body text-slate2 hover:text-rail-red">
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
      {isPremium ? (
        <div className="border border-dashed border-line p-3 flex flex-wrap items-center gap-2 rounded-card bg-navy-900/40">
          <select
            value={kind}
            onChange={(e) => {
              const nk = e.target.value as AlertRow["kind"];
              setKind(nk);
              setValue(String(KINDS.find((x) => x.id === nk)!.def));
            }}
            className="bg-navy-950 border border-line text-[13.5px] px-2 py-1.5 font-body rounded-control"
          >
            {KINDS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
          {kind === "REVENTE" && (
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="bg-navy-950 border border-line text-[13.5px] px-2 py-1.5 font-body rounded-control">
              {trains.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <span className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-28 bg-navy-950 border border-line text-[13.5px] px-2 py-1.5 font-mono2 text-right rounded-control"
              aria-label={k.label}
            />
            <span className="text-[13px] font-body text-slate2">{k.unit}</span>
          </span>
          <button onClick={add} disabled={busy || value === "" || (rows?.length ?? 0) >= max} className="text-[13px] font-semibold font-body bg-cobalt text-onaccent px-3 py-1.5 disabled:opacity-40 rounded-control">
            Poser l'alerte
          </button>
          <span className="basis-full text-[12px] font-body text-slate2">{k.hint}.</span>
        </div>
      ) : (
        <button onClick={onGoPremium} className="text-[13.5px] font-body text-amber border border-amber/40 px-3.5 py-2 hover:bg-amber/10 rounded-control">
          Les alertes personnalisées sont réservées au Premium
        </button>
      )}
    </section>
  );
}

/* Les alertes déclenchées s'affichent aussi dans le jeu : on relève celles
   arrivées depuis la dernière visite (mémorisée par compagnie). */
export function useAlertFeed(companyId: string | undefined, isPremium: boolean, onFire: (message: string) => void) {
  useEffect(() => {
    if (!companyId || !isPremium) return;
    const key = `reseau.alertes.vues.${companyId}`;
    let seen = 0;
    try {
      seen = Number(localStorage.getItem(key) ?? 0) || Date.now();
    } catch {
      seen = Date.now();
    }
    const check = async () => {
      try {
        const { data } = await api.get("/alerts");
        const fresh = (data.alerts as AlertRow[]).filter((a) => a.firedAt && new Date(a.firedAt).getTime() > seen && a.message);
        for (const a of fresh) onFire(a.message!);
        const last = Math.max(seen, ...fresh.map((a) => new Date(a.firedAt!).getTime()));
        seen = last;
        try {
          localStorage.setItem(key, String(last));
        } catch {
          /* rien */
        }
      } catch {
        /* rien */
      }
    };
    void check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, isPremium]);
}
