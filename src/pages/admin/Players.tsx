import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { Btn, Empty, Field, Loading, PageHead, Pill, dateOnly, dateTime, euros, inputCls, nf, since, useAction, useAdminData, useConfirm } from "./ui";

type Row = {
  id: string; name: string; liveryColor: string; pseudo: string; email: string; discordName: string | null; banned: boolean;
  premium: "oui" | "essai" | "non"; balance: number; valeur: number; trains: number; lines: number; division: string;
  pioneer: number | null; createdAt: string; lastActiveAt: string | null;
};
type ListData = { total: number; page: number; pageSize: number; players: Row[] };

const FILTERS = [
  { id: "tous", label: "Tous" },
  { id: "actifs", label: "Actifs 24 h" },
  { id: "inactifs", label: "Absents 7 j" },
  { id: "premium", label: "Premium" },
  { id: "essai", label: "En essai" },
  { id: "discord", label: "Discord lié" },
  { id: "suspendus", label: "Suspendus" },
];
const SORTS = [
  { id: "valeur", label: "Valeur" },
  { id: "tresorerie", label: "Trésorerie" },
  { id: "actifs", label: "Dernière visite" },
  { id: "recents", label: "Inscription" },
  { id: "nom", label: "Nom" },
];

export default function Players() {
  const { id } = useParams();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("tous");
  const [sort, setSort] = useState("valeur");
  const [page, setPage] = useState(0);

  // la recherche part une fois la frappe terminée
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuery(q.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ q: query, filter, sort, page: String(page) });
  const { data, error, reload } = useAdminData<ListData>(`/players?${params}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHead title="Joueurs" intro="Cherche par compagnie, pseudo, e-mail ou pseudo Discord. Un clic ouvre la fiche complète." />

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un joueur"
          aria-label="Rechercher un joueur"
          className={`${inputCls} max-w-xs`}
        />
        <label className="flex items-center gap-2 font-body text-[13px] text-slate2">
          Trier par
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={`${inputCls} w-auto py-1.5`}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {data && <span className="ml-auto font-body text-[13px] text-slate2">{nf(data.total)} compagnie{data.total > 1 ? "s" : ""}</span>}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-1 [scrollbar-width:none]" role="group" aria-label="Filtrer">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setFilter(f.id);
              setPage(0);
            }}
            aria-pressed={filter === f.id}
            className={`shrink-0 px-3 py-1.5 border font-body text-[13px] ${filter === f.id ? "border-amber text-amber" : "border-line text-slate2 hover:text-offwhite"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!data ? (
        <Loading error={error} onRetry={reload} />
      ) : data.players.length === 0 ? (
        <Empty>Aucune compagnie ne correspond. Essaie un autre filtre ou une autre recherche.</Empty>
      ) : (
        <div className="border border-line bg-navy-900">
          <div className="hidden lg:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_110px_110px_70px_120px] gap-3 px-4 py-2 border-b border-line font-body text-[12px] text-slate2">
            <span>Compagnie</span>
            <span>Joueur</span>
            <span className="text-right">Valeur</span>
            <span className="text-right">Trésorerie</span>
            <span className="text-right">Flotte</span>
            <span className="text-right">Vu</span>
          </div>
          <ul className="divide-y divide-line">
            {data.players.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/admin/joueurs/${r.id}`}
                  className={`grid grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_110px_110px_70px_120px] gap-x-3 gap-y-0.5 px-4 py-2.5 hover:bg-navy-800/50 ${id === r.id ? "bg-navy-800/60" : ""}`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.liveryColor }} />
                    <span className="truncate font-body text-[14px]">{r.name}</span>
                    {r.premium === "oui" && <Pill tone="amber">Premium</Pill>}
                    {r.premium === "essai" && <Pill tone="cobalt">Essai</Pill>}
                    {r.banned && <Pill tone="red">Suspendu</Pill>}
                  </span>
                  <span className="lg:hidden font-mono2 text-[13px] text-right">{nf(r.valeur)}</span>
                  <span className="min-w-0 truncate font-body text-[13px] text-slate2">
                    {r.pseudo}
                    <span className="hidden xl:inline"> · {r.email}</span>
                  </span>
                  <span className="lg:hidden font-body text-[12px] text-slate2 text-right">{since(r.lastActiveAt)}</span>
                  <span className="hidden lg:block font-mono2 text-[13px] text-right">{nf(r.valeur)}</span>
                  <span className="hidden lg:block font-mono2 text-[13px] text-right text-slate2">{nf(r.balance)}</span>
                  <span className="hidden lg:block font-mono2 text-[13px] text-right text-slate2">{r.trains}</span>
                  <span className="hidden lg:block font-body text-[12.5px] text-right text-slate2">{since(r.lastActiveAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data && pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 font-body text-[13px]">
          <Btn onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            Précédente
          </Btn>
          <span className="text-slate2">
            Page {page + 1} sur {pages}
          </span>
          <Btn onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>
            Suivante
          </Btn>
        </div>
      )}

      {id && <PlayerDrawer id={id} onChanged={reload} />}
    </>
  );
}

/* ---------------- la fiche ---------------- */

type Detail = {
  id: string; name: string; liveryColor: string; title: string | null; balance: number; valeur: number | null; maxTrains: number;
  isPremium: boolean; premiumTrialUntil: string | null; pioneerNumber: number | null; referralCode: string; createdAt: string; lastActiveAt: string | null;
  division: string;
  owner: { id: string; email: string; pseudo: string; createdAt: string; discordId: string | null; discordName: string | null; bannedAt: string | null; bannedReason: string | null };
  trains: {
    id: string; name: string; model: string; status: string; wear: number; broken: string | null; line: string | null;
    progress: number; departedAt: string | null; workshopUntil: string | null; partsEta: string | null; freight: number; purchasedAt: string;
    purchase: number; resale: number;
  }[];
  lines: { id: string; name: string; route: string[]; priceRatio: number; trains: number }[];
  purchases: { itemId: string; name: string; amountCents: number; purchasedAt: string; giftFrom: string | null; paid: boolean }[];
  transactions: { id: string; type: string; amount: number; description: string; createdAt: string }[];
  loans: { open: number; remaining: number };
  stations: { station: string; level: number }[];
  counts: { achievementUnlocks: number; referrals: number; staff: number; contracts: number; pushSubscriptions: number };
  alliance: { id: string; name: string; color: string; founder: boolean } | null;
  season: { division: string; group: number; points: number } | null;
  adminLog: { id: string; adminName: string; action: string; details: string; createdAt: string }[];
};
type CatalogItem = { id: string; name: string; kind: string; exclusive: boolean; priceCents: number };

const TABS = ["Résumé", "Flotte", "Achats", "Historique", "Actions"] as const;
type Tab = (typeof TABS)[number];

function PlayerDrawer({ id, onChanged }: { id: string; onChanged: () => void }) {
  const navigate = useNavigate();
  const { data: d, error, reload } = useAdminData<Detail>(`/players/${id}`);
  const [tab, setTab] = useState<Tab>("Résumé");
  const close = () => navigate("/admin/joueurs");

  useEffect(() => setTab("Résumé"), [id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector('[role="dialog"][aria-modal="true"] form') && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const refresh = async () => {
    await reload();
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy-950/60" onClick={close}>
      <aside
        role="dialog"
        aria-label="Fiche du joueur"
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-[620px] overflow-y-auto border-l border-line bg-navy-950 shadow-2xl"
      >
        {!d ? (
          <div className="p-6">
            <Loading error={error} onRetry={reload} />
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 bg-navy-950 border-b border-line px-5 pt-5">
              <div className="flex items-start gap-3">
                <span className="mt-1.5 h-4 w-4 shrink-0 rounded-full" style={{ background: d.liveryColor }} />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[22px] leading-tight truncate">{d.name}</h2>
                  <p className="font-body text-[13px] text-slate2 truncate">
                    {d.owner.pseudo} · {d.owner.email}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.isPremium && !d.premiumTrialUntil && <Pill tone="amber">Premium</Pill>}
                    {d.premiumTrialUntil && <Pill tone="cobalt">Essai jusqu'au {dateOnly(d.premiumTrialUntil)}</Pill>}
                    {d.owner.bannedAt && <Pill tone="red">Suspendu : {d.owner.bannedReason}</Pill>}
                    {d.pioneerNumber && <Pill>Pionnier n° {d.pioneerNumber}</Pill>}
                    {d.owner.discordName && <Pill>Discord : {d.owner.discordName}</Pill>}
                  </div>
                </div>
                <button onClick={close} aria-label="Fermer la fiche" className="p-1 text-slate2 hover:text-offwhite text-[22px] leading-none">
                  ×
                </button>
              </div>
              <nav className="flex gap-1 mt-4 -mb-px overflow-x-auto [scrollbar-width:none]">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`shrink-0 px-3 py-2 border-b-2 font-body text-[13.5px] ${tab === t ? "border-amber text-offwhite" : "border-transparent text-slate2 hover:text-offwhite"}`}
                  >
                    {t}
                  </button>
                ))}
              </nav>
            </div>
            <div className="p-5">
              {tab === "Résumé" && <Summary d={d} />}
              {tab === "Flotte" && <Fleet d={d} onChanged={refresh} />}
              {tab === "Achats" && <Purchases d={d} onChanged={refresh} />}
              {tab === "Historique" && <History d={d} />}
              {tab === "Actions" && <Actions d={d} onChanged={refresh} />}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Summary({ d }: { d: Detail }) {
  const rows: [string, ReactNode][] = [
    ["Valeur", `${nf(d.valeur)} pi.`],
    ["Trésorerie", `${nf(d.balance)} pi.`],
    ["Flotte", `${d.trains.length} / ${d.maxTrains} rames, ${d.lines.length} lignes`],
    ["Personnel", nf(d.counts.staff)],
    ["Gares possédées", d.stations.length ? d.stations.map((s) => s.station).join(", ") : "aucune"],
    ["Emprunts en cours", d.loans.open ? `${d.loans.open}, reste ${nf(d.loans.remaining)} pi.` : "aucun"],
    ["Succès", nf(d.counts.achievementUnlocks)],
    ["Filleuls", `${nf(d.counts.referrals)} (code ${d.referralCode})`],
    ["Alliance", d.alliance ? `${d.alliance.name}${d.alliance.founder ? " (fondateur)" : ""}` : "aucune"],
    ["Saison", d.season ? `${d.season.division}, groupe ${d.season.group}, ${nf(d.season.points)} points` : "non classée"],
    ["Titre porté", d.title ?? "aucun"],
    ["Notifications", d.counts.pushSubscriptions ? `${d.counts.pushSubscriptions} appareil${d.counts.pushSubscriptions > 1 ? "s" : ""}` : "désactivées"],
    ["Inscrit", dateTime(d.owner.createdAt)],
    ["Dernière visite", `${dateTime(d.lastActiveAt)} (${since(d.lastActiveAt)})`],
  ];
  return (
    <>
      <dl className="grid grid-cols-[150px_1fr] gap-x-4 gap-y-2 font-body text-[14px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate2">{k}</dt>
            <dd className="min-w-0 break-words">{v}</dd>
          </div>
        ))}
      </dl>
      {d.adminLog.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-[16px] mb-2">Interventions de l'équipe</h3>
          <ul className="space-y-1.5 font-body text-[13px]">
            {d.adminLog.map((l) => (
              <li key={l.id} className="text-slate2">
                <span className="text-offwhite">{dateTime(l.createdAt)}</span> {l.adminName} : {l.details}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

const STATUS: Record<string, string> = { IDLE: "à quai", EN_ROUTE: "en route", MAINTENANCE: "à l'atelier" };

function Fleet({ d, onChanged }: { d: Detail; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <h3 className="font-display text-[16px] mb-1">Rames</h3>
      <p className="font-body text-[12.5px] text-slate2 mb-2">Une rame qui bug : ouvrez-la pour la remettre au dépôt, ou la retirer et rembourser le joueur.</p>
      {d.trains.length === 0 ? (
        <p className="font-body text-[14px] text-slate2 mb-6">Aucune rame.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line mb-6">
          {d.trains.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setOpen(open === t.id ? null : t.id)}
                aria-expanded={open === t.id}
                className="w-full flex items-baseline gap-3 py-2 font-body text-[13.5px] text-left hover:bg-navy-800/40 -mx-1 px-1"
              >
                <span className="flex-1 min-w-0 truncate">
                  {t.name} <span className="text-slate2">{t.model.toLowerCase().replace(/_/g, " ")}</span>
                </span>
                <span className="text-slate2 truncate max-w-[40%]">{t.line ?? STATUS[t.status] ?? t.status}</span>
                <span className={`font-mono2 text-[12.5px] w-12 text-right ${t.broken ? "text-rail-red" : t.wear > 70 ? "text-amber" : "text-slate2"}`}>
                  {t.broken ? "panne" : `${t.wear} %`}
                </span>
              </button>
              {open === t.id && <TrainTools d={d} t={t} onDone={async () => { setOpen(null); await onChanged(); }} />}
            </li>
          ))}
        </ul>
      )}
      <h3 className="font-display text-[16px] mb-2">Lignes</h3>
      {d.lines.length === 0 ? (
        <p className="font-body text-[14px] text-slate2">Aucune ligne.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {d.lines.map((l) => (
            <li key={l.id} className="py-2 font-body text-[13.5px]">
              <div className="flex gap-3">
                <span className="flex-1 truncate">{l.name}</span>
                <span className="text-slate2">
                  {l.trains} rame{l.trains > 1 ? "s" : ""} · prix ×{l.priceRatio.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="text-[12.5px] text-slate2 truncate">{l.route.join(" – ")}</div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type RefundMode = "achat" | "revente" | "montant" | "aucun";

/* Les outils d'une rame : son état exact, la remettre au dépôt, la retirer en remboursant. */
function TrainTools({ d, t, onDone }: { d: Detail; t: Detail["trains"][number]; onDone: () => Promise<void> }) {
  const { run, busy } = useAction();
  const confirm = useConfirm();
  const [mode, setMode] = useState<RefundMode>("achat");
  const [amount, setAmount] = useState(String(t.purchase));
  const [reason, setReason] = useState("");
  const refund = mode === "achat" ? t.purchase : mode === "revente" ? t.resale : mode === "montant" ? Math.max(0, Math.round(Number(amount) || 0)) : 0;
  const options: { id: RefundMode; label: string; value?: number }[] = [
    { id: "achat", label: "Prix d'achat", value: t.purchase },
    { id: "revente", label: "Prix de reprise du jour", value: t.resale },
    { id: "montant", label: "Autre montant" },
    { id: "aucun", label: "Sans remboursement" },
  ];
  const facts: [string, string][] = [
    ["Statut", `${STATUS[t.status] ?? t.status}${t.line ? `, ligne ${t.line}` : ""}`],
    ["Trajet", t.departedAt ? `${t.progress} %, parti ${since(t.departedAt)}` : "à l'arrêt"],
    ["Atelier", t.workshopUntil ? `jusqu'au ${dateTime(t.workshopUntil)}` : t.partsEta ? `pièce attendue ${dateTime(t.partsEta)}` : "non"],
    ["Fret à bord", t.freight ? `${t.freight} contrat${t.freight > 1 ? "s" : ""}` : "aucun"],
    ["Achetée", dateOnly(t.purchasedAt)],
  ];
  return (
    <div className="mb-3 border border-line bg-navy-900 px-3 py-3 space-y-4">
      <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 font-body text-[12.5px]">
        {facts.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate2">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <div>
        <div className="font-body text-[13px] mb-1.5">Remettre au dépôt</div>
        <p className="font-body text-[12px] text-slate2 mb-2">Pour une rame coincée : elle revient à quai, sans ligne, prête à repartir. Le fret à bord retourne au marché.</p>
        <div className="flex flex-wrap gap-2">
          <Btn disabled={busy} onClick={() => run(() => api.post(`/admin/players/${d.id}/trains/${t.id}/reset`, {}), `${t.name} remise au dépôt`, onDone)}>
            Remettre au dépôt
          </Btn>
          <Btn disabled={busy} onClick={() => run(() => api.post(`/admin/players/${d.id}/trains/${t.id}/reset`, { repair: true }), `${t.name} remise au dépôt et réparée`, onDone)}>
            Remettre au dépôt et réparer
          </Btn>
        </div>
      </div>

      <div className="border-t border-line pt-3">
        <div className="font-body text-[13px] mb-1.5">Retirer la rame et rembourser</div>
        <fieldset className="grid sm:grid-cols-2 gap-1.5 mb-2">
          <legend className="sr-only">Remboursement</legend>
          {options.map((o) => (
            <label key={o.id} className={`flex items-center gap-2 border px-2.5 py-1.5 font-body text-[12.5px] cursor-pointer ${mode === o.id ? "border-amber" : "border-line"}`}>
              <input type="radio" name={`refund-${t.id}`} checked={mode === o.id} onChange={() => setMode(o.id)} className="accent-amber" />
              <span className="flex-1">{o.label}</span>
              {o.value !== undefined && <span className="font-mono2 text-[12px]">{nf(o.value)} pi.</span>}
            </label>
          ))}
        </fieldset>
        <div className="grid sm:grid-cols-[130px_1fr] gap-2">
          {mode === "montant" && (
            <Field label="Montant">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className={inputCls} />
            </Field>
          )}
          <div className={mode === "montant" ? "" : "sm:col-span-2"}>
            <Field label="Raison" hint="Visible dans l'historique du joueur et la notification">
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ex. rame bloquée en route" maxLength={120} className={inputCls} />
            </Field>
          </div>
        </div>
        <Btn
          tone="danger"
          className="mt-2"
          disabled={busy}
          onClick={async () => {
            const r = await confirm({
              title: `Retirer ${t.name} ?`,
              body: `La rame disparaît du parc de ${d.name}. ${refund > 0 ? `Le joueur est remboursé de ${nf(refund)} pi.` : "Aucun remboursement."}${t.freight ? " Le fret à bord retourne au marché." : ""}`,
              confirm: refund > 0 ? `Retirer et rembourser ${nf(refund)} pi.` : "Retirer",
              danger: true,
            });
            if (r.ok)
              await run(
                () => api.delete(`/admin/players/${d.id}/trains/${t.id}`, { data: { refund: mode, amount: refund, reason: reason || undefined } }),
                refund > 0 ? `${t.name} retirée, ${nf(refund)} pi. remboursées` : `${t.name} retirée`,
                onDone
              );
          }}
        >
          {refund > 0 ? `Retirer et rembourser ${nf(refund)} pi.` : "Retirer la rame"}
        </Btn>
      </div>
    </div>
  );
}

function Purchases({ d, onChanged }: { d: Detail; onChanged: () => Promise<void> }) {
  const { run, busy } = useAction();
  const confirm = useConfirm();
  const { data: catalog } = useAdminData<{ items: CatalogItem[] }>("/shop");
  const [itemId, setItemId] = useState("");
  const owned = new Set(d.purchases.map((p) => p.itemId));
  const options = (catalog?.items ?? []).filter((i) => !owned.has(i.id) && i.kind !== "PASS");

  return (
    <>
      <form
        className="flex flex-wrap items-end gap-2 mb-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!itemId) return;
          const ok = await run(() => api.post(`/admin/players/${d.id}/items`, { itemId }), "Objet offert", onChanged);
          if (ok) setItemId("");
        }}
      >
        <div className="flex-1 min-w-[220px]">
          <Field label="Offrir un objet" hint="Le joueur le reçoit avec l'animation de déballage, de la part de l'équipe.">
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={inputCls}>
              <option value="">Choisir un objet…</option>
              {options.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                  {i.exclusive ? " (exclusivité Discord)" : i.priceCents ? ` (${euros(i.priceCents)})` : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Btn type="submit" tone="primary" disabled={!itemId || busy}>
          Offrir
        </Btn>
      </form>

      <h3 className="font-display text-[16px] mb-2">Possédés</h3>
      {d.purchases.length === 0 ? (
        <p className="font-body text-[14px] text-slate2">Aucun achat ni cadeau.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {d.purchases.map((p) => (
            <li key={p.itemId} className="flex items-center gap-3 py-2 font-body text-[13.5px]">
              <div className="flex-1 min-w-0">
                <div className="truncate">{p.name}</div>
                <div className="text-[12px] text-slate2">
                  {dateOnly(p.purchasedAt)} · {p.paid ? `payé ${euros(p.amountCents)}` : p.giftFrom ? `offert par ${p.giftFrom}` : "offert"}
                </div>
              </div>
              <button
                className="font-body text-[12.5px] text-slate2 hover:text-rail-red"
                onClick={async () => {
                  const r = await confirm({
                    title: `Retirer ${p.name} ?`,
                    body: p.paid ? `Cet objet a été payé ${euros(p.amountCents)}. Le retirer ne rembourse pas : fais-le depuis Stripe si besoin.` : "Le joueur ne pourra plus l'équiper.",
                    confirm: "Retirer",
                    danger: true,
                  });
                  if (r.ok) await run(() => api.delete(`/admin/players/${d.id}/items/${encodeURIComponent(p.itemId)}`), "Objet retiré", onChanged);
                }}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function History({ d }: { d: Detail }) {
  if (!d.transactions.length) return <p className="font-body text-[14px] text-slate2">Aucun mouvement.</p>;
  return (
    <>
      <p className="font-body text-[13px] text-slate2 mb-3">Les 60 derniers mouvements de trésorerie.</p>
      <ul className="divide-y divide-line border-y border-line">
        {d.transactions.map((t) => (
          <li key={t.id} className="flex items-baseline gap-3 py-1.5 font-body text-[13px]">
            <span className="w-24 shrink-0 text-[12px] text-slate2">{dateTime(t.createdAt)}</span>
            <span className="flex-1 min-w-0 truncate" title={t.description}>
              {t.description}
            </span>
            <span className={`font-mono2 text-[12.5px] ${t.amount > 0 ? "text-rail-green" : t.amount < 0 ? "text-rail-red" : "text-slate2"}`}>
              {t.amount > 0 ? "+" : ""}
              {nf(t.amount)}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Actions({ d, onChanged }: { d: Detail; onChanged: () => Promise<void> }) {
  const { run, busy } = useAction();
  const confirm = useConfirm();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("7");
  const [points, setPoints] = useState("");
  const [name, setName] = useState(d.name);
  const [pseudo, setPseudo] = useState(d.owner.pseudo);
  const n = Number(amount.replace(/\s/g, ""));
  const premiumBought = d.isPremium && !d.premiumTrialUntil;

  return (
    <div className="space-y-7">
      <section>
        <h3 className="font-display text-[16px] mb-2">Pièces</h3>
        <form
          className="grid sm:grid-cols-[140px_1fr_auto] gap-2 items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!n) return;
            if (n < 0) {
              const r = await confirm({ title: `Retirer ${nf(-n)} pièces à ${d.name} ?`, body: `Trésorerie après : ${nf(d.balance + n)} pi.`, confirm: "Retirer", danger: true });
              if (!r.ok) return;
            }
            const ok = await run(() => api.post(`/admin/players/${d.id}/coins`, { amount: n, reason: reason || undefined }), n > 0 ? "Pièces offertes" : "Pièces retirées", onChanged);
            if (ok) {
              setAmount("");
              setReason("");
            }
          }}
        >
          <Field label="Montant" hint="Négatif pour retirer">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="ex. 5000" className={inputCls} />
          </Field>
          <Field label="Raison" hint="Visible dans l'historique du joueur">
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ex. gagnant du concours" className={inputCls} maxLength={120} />
          </Field>
          <Btn type="submit" tone="primary" disabled={!n || busy}>
            {n < 0 ? "Retirer" : "Offrir"}
          </Btn>
        </form>
      </section>

      <section>
        <h3 className="font-display text-[16px] mb-2">Premium</h3>
        <p className="font-body text-[13px] text-slate2 mb-3">
          {premiumBought ? "Premium définitif." : d.premiumTrialUntil ? `En essai jusqu'au ${dateTime(d.premiumTrialUntil)}.` : "Compte gratuit."}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          {!premiumBought && (
            <>
              <div className="w-28">
                <Field label="Jours d'essai">
                  <input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" className={inputCls} />
                </Field>
              </div>
              <Btn disabled={busy} onClick={() => run(() => api.post(`/admin/players/${d.id}/premium`, { mode: "essai", days: Number(days) }), "Essai offert", onChanged)}>
                {d.premiumTrialUntil ? "Prolonger l'essai" : "Offrir un essai"}
              </Btn>
              <Btn
                disabled={busy}
                onClick={async () => {
                  const r = await confirm({ title: `Offrir le Premium à vie à ${d.name} ?`, body: "Le joueur le garde pour toujours, sans payer.", confirm: "Offrir le Premium" });
                  if (r.ok) await run(() => api.post(`/admin/players/${d.id}/premium`, { mode: "definitif" }), "Premium offert", onChanged);
                }}
              >
                Offrir à vie
              </Btn>
            </>
          )}
          {d.isPremium && (
            <Btn
              tone="danger"
              disabled={busy}
              onClick={async () => {
                const r = await confirm({
                  title: `Retirer le Premium de ${d.name} ?`,
                  body: premiumBought ? "Ce Premium a peut-être été payé : le retirer ne rembourse rien." : "L'essai s'arrête tout de suite.",
                  confirm: "Retirer le Premium",
                  danger: true,
                  input: { label: "Raison", placeholder: "ex. remboursé sur demande" },
                });
                if (r.ok) await run(() => api.post(`/admin/players/${d.id}/premium`, { mode: "retirer", reason: r.value }), "Premium retiré", onChanged);
              }}
            >
              Retirer le Premium
            </Btn>
          )}
        </div>
      </section>

      <section>
        <h3 className="font-display text-[16px] mb-2">Points de saison</h3>
        {d.season ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-36">
              <Field label="Ajouter ou retirer" hint={`Actuellement ${nf(d.season.points)}`}>
                <input value={points} onChange={(e) => setPoints(e.target.value)} inputMode="numeric" placeholder="ex. -200" className={inputCls} />
              </Field>
            </div>
            <Btn disabled={busy || !Number(points)} onClick={async () => (await run(() => api.post(`/admin/players/${d.id}/season-points`, { points: Number(points) }), "Points modifiés", onChanged)) && setPoints("")}>
              Appliquer
            </Btn>
            <Btn
              tone="danger"
              disabled={busy}
              onClick={async () => {
                const r = await confirm({ title: "Remettre les points de saison à zéro ?", body: `${d.name} perd ses ${nf(d.season!.points)} points.`, confirm: "Remettre à zéro", danger: true });
                if (r.ok) await run(() => api.post(`/admin/players/${d.id}/season-points`, { reset: true }), "Points remis à zéro", onChanged);
              }}
            >
              Remettre à zéro
            </Btn>
          </div>
        ) : (
          <p className="font-body text-[13px] text-slate2">Pas classée dans la saison en cours.</p>
        )}
      </section>

      <section>
        <h3 className="font-display text-[16px] mb-2">Noms</h3>
        <p className="font-body text-[13px] text-slate2 mb-3">Pour un nom injurieux ou trompeur.</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <Field label="Compagnie">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={40} />
          </Field>
          <Field label="Pseudo">
            <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} className={inputCls} maxLength={24} />
          </Field>
        </div>
        <Btn
          className="mt-2"
          disabled={busy || (name.trim() === d.name && pseudo.trim() === d.owner.pseudo)}
          onClick={() =>
            run(
              () => api.patch(`/admin/players/${d.id}`, { ...(name.trim() !== d.name ? { name } : {}), ...(pseudo.trim() !== d.owner.pseudo ? { pseudo } : {}) }),
              "Noms modifiés",
              onChanged
            )
          }
        >
          Enregistrer les noms
        </Btn>
      </section>

      <section className="border-t border-line pt-5">
        <h3 className="font-display text-[16px] mb-2">Suspension</h3>
        {d.owner.bannedAt ? (
          <>
            <p className="font-body text-[13px] text-slate2 mb-3">
              Suspendu depuis le {dateTime(d.owner.bannedAt)} : {d.owner.bannedReason}
            </p>
            <Btn disabled={busy} onClick={() => run(() => api.delete(`/admin/players/${d.id}/ban`), "Suspension levée", onChanged)}>
              Lever la suspension
            </Btn>
          </>
        ) : (
          <>
            <p className="font-body text-[13px] text-slate2 mb-3">Le joueur ne peut plus se connecter ni jouer. Ses rôles Discord sont retirés. Sa compagnie reste en place.</p>
            <Btn
              tone="danger"
              disabled={busy}
              onClick={async () => {
                const r = await confirm({
                  title: `Suspendre ${d.owner.pseudo} ?`,
                  confirm: "Suspendre le compte",
                  danger: true,
                  input: { label: "Raison", placeholder: "ex. multi-comptes", required: true },
                });
                if (r.ok) await run(() => api.post(`/admin/players/${d.id}/ban`, { reason: r.value }), "Compte suspendu", onChanged);
              }}
            >
              Suspendre le compte
            </Btn>
          </>
        )}
      </section>
    </div>
  );
}
