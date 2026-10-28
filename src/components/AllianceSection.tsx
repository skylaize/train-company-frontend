import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { BoosterBadge } from "./BoosterBadge";
import { AllianceMap, MapMember, MapMode, MapRegion, bonusFor, buildNetwork } from "./AllianceMap";

/* ============================================================
   Alliances (2.0, page refaite en 2.3).

   Jusqu'à cinq compagnies. Une gare que desservent aussi des alliés
   rapporte plus, aucun allié ne paie de redevance de quai chez un autre,
   et l'alliance a son classement : la somme des points de saison.

   2.3 : la page se lit de haut en bas. L'identité de l'alliance, puis la
   carte (le cœur de la page) avec sa liste, puis les membres, le tableau
   d'affichage et le classement. Les réglages du fondateur ont leur bloc.
   ============================================================ */

interface Rules { max: number; cost: number; allyStep: number; allyMaxAllies: number; messageMax: number; colors: string[]; applyMax?: number; applyMessageMax?: number; pitchMax?: number }
export interface Objectives {
  weekStart: string;
  endsAt: string;
  bonus: { coins: number; points: number; paid: boolean };
  objectives: { kind: string; label: string; target: number; coins: number; points: number; progress: number; done: boolean; shares: { companyId: string; value: number }[] }[];
}
export interface RegionRow {
  id: string;
  name: string;
  stations: number;
  locked: boolean;
  holder: null | { id: string; name: string; color: string; mine: boolean; stations: number; weeks: number };
  mine: number;
  race: { allianceId: string; name: string; color: string; stations: number; mine: boolean }[];
}
export interface RegionsData { weekStart: string; nextAt: string; bonus: number; rules: { base: number; spreadFrom: number }; regions: RegionRow[] }
interface RankRow { id: string; name: string; color: string; members: number; points: number; rank: number }
export interface AllianceData {
  alliance: null | { id: string; name: string; color: string; discordUrl: string | null; recruiting?: boolean; pitch?: string | null; founder: boolean; rank: number | null; total: number; points: number; livery?: string | null };
  liveryChoices?: string[]; // 2.1 : coffret d'alliance
  rules: Rules;
  invites?: { id: string; alliance: string; color: string; at: string }[];
  members?: { companyId: string; name: string; liveryColor: string; founder: boolean; isMe: boolean; points: number; joinedAt: string; booster?: boolean }[];
  lines?: { companyId: string; color: string; route: string[] }[];
  shared?: { station: string; members: number; bonus: number }[];
  messages?: { id: string; name: string; color: string; text: string; at: string; mine: boolean; system?: boolean; booster?: boolean }[];
  // 2.3 : objectifs de la semaine et régions
  objectives?: Objectives | null;
  regions?: RegionsData | null;
  invited?: string[];
  sentInvites?: { companyId: string; name: string; at: string }[]; // 2.4.1 : pour pouvoir les retirer
  // 2.0.2 : candidatures
  directory?: { id: string; name: string; color: string; pitch: string | null; founder: string; members: number; room: number; points: number; rank: number | null; applied: boolean }[];
  myApplications?: { id: string; allianceId: string; alliance: string; color: string; message: string; at: string }[];
  applications?: { id: string; companyId: string; name: string; liveryColor: string; points: number; lines: number; message: string; at: string }[];
  ranking: RankRow[];
}

const fmt = (n: number) => n.toLocaleString("fr-FR");
const ordinal = (n: number) => `${n}${n === 1 ? "re" : "e"}`;
const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
};
const initials = (name: string) => {
  const w = name.replace(/^(Compagnie|Cie)\s+(du|de la|des|de|d')?\s*/i, "").split(/[\s-]+/).filter(Boolean);
  return ((w[0]?.[0] ?? "?") + (w[1]?.[0] ?? w[0]?.[1] ?? "")).toUpperCase();
};

/* Les couleurs des membres sur cette page. Vous gardez l'accent du thème ;
   les autres reçoivent une teinte chacun, dans l'ordre d'arrivée. Deux jeux :
   les teintes vives se perdent sur le crème du thème Papier. */
const MEMBER_HUES = {
  dark: ["#f472b6", "#a3e635", "#b9a6ff", "#fb923c", "#2dd4bf"],
  paper: ["#b5306b", "#4d7c0f", "#6d4fc2", "#c2560c", "#0f766e"],
};
function useThemeId() {
  const read = () => document.documentElement.dataset.theme ?? "sombre";
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setTheme(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

export function allianceLead(data: AllianceData | null) {
  if (!data) return null;
  if (!data.alliance) {
    if (data.invites?.length) return `${data.invites.length > 1 ? `${data.invites.length} alliances vous invitent` : `${data.invites[0].alliance} vous invite`} à la rejoindre.`;
    const n = data.myApplications?.length ?? 0;
    if (n) return n > 1 ? `${n} candidatures en attente de réponse.` : `Votre candidature à ${data.myApplications![0].alliance} attend sa réponse.`;
    const open = data.directory?.length ?? 0;
    return open ? `${open} alliance${open > 1 ? "s recrutent" : " recrute"} : postulez, ou fondez la vôtre.` : "Associez-vous à quatre compagnies : vos gares communes rapportent plus.";
  }
  const a = data.alliance;
  const waiting = data.applications?.length ?? 0;
  if (a.founder && waiting) return `${waiting} candidature${waiting > 1 ? "s attendent" : " attend"} votre réponse.`;
  const best = Math.max(0, ...(data.shared ?? []).map((s) => s.bonus));
  return `${a.name} est ${a.rank ?? "–"}${a.rank === 1 ? "re" : "e"} des alliances${best ? `, et vos gares communes rapportent jusqu'à ${best} % de plus` : ""}.`;
}

/* ---------------- petites pièces communes ---------------- */

function Card({ title, aside, children, className = "" }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-card border border-line bg-navy-900/50 p-4 md:p-5 ${className}`}>
      {(title || aside) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-3">
          {title && <h2 className="font-display text-[19px] leading-tight">{title}</h2>}
          {aside && <span className="text-[12.5px] text-slate2 font-body">{aside}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

function Avatar({ name, color, size = 34 }: { name: string; color: string; size?: number }) {
  return (
    <span
      className="shrink-0 inline-flex items-center justify-center rounded-control font-body font-semibold"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.37), color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

const btnPrimary = "rounded-control bg-cobalt text-onaccent px-3.5 py-2 text-[13.5px] font-semibold font-body hover:bg-cobalt/90 transition-colors disabled:opacity-40";
const btnSoft = "rounded-control bg-offwhite/[0.06] hover:bg-offwhite/[0.1] px-3.5 py-2 text-[13.5px] font-body text-offwhite transition-colors disabled:opacity-40";
const btnQuiet = "rounded-control px-2.5 py-1.5 text-[13px] font-body text-slate2 hover:text-offwhite hover:bg-offwhite/[0.05] transition-colors disabled:opacity-40";
const field = "w-full min-w-0 rounded-control bg-navy-950/60 border border-line px-3 py-2 text-[13.5px] font-body placeholder:text-slate2/70 focus:outline-none focus:border-cobalt";

/* ============================================================ */

export function AllianceSection({ data, onReload, onChange }: { data: AllianceData | null; onReload: () => void; onChange: () => void }) {
  const { showToast, showComposter } = useToast();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    onReload();
    const id = window.setInterval(onReload, 30_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(fn: () => Promise<unknown>, done?: string) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      if (done) showComposter(done);
      onReload();
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <p className="text-slate2 font-body text-sm">Chargement…</p>;
  if (!data.alliance) return <WithoutAlliance data={data} busy={busy} run={run} />;
  return <WithAlliance data={data} busy={busy} run={run} />;
}

type Run = (fn: () => Promise<unknown>, done?: string) => void;

/* ---------------- sans alliance ---------------- */

function WithoutAlliance({ data, busy, run }: { data: AllianceData; busy: boolean; run: Run }) {
  const { rules } = data;
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [applyTo, setApplyTo] = useState<string | null>(null);
  const [applyText, setApplyText] = useState("");
  const chosen = color ?? rules.colors[0];
  const pending = data.myApplications?.length ?? 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start">
      <div className="flex flex-col gap-5 min-w-0">
        {(data.invites ?? []).length > 0 && (
          <Card title="Vos invitations">
            <ul className="flex flex-col gap-1">
              {data.invites!.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-control px-2 py-2 hover:bg-offwhite/[0.03]">
                  <Avatar name={i.alliance} color={i.color} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-semibold font-body truncate">{i.alliance}</div>
                    <div className="text-[12.5px] text-slate2 font-body">{ago(i.at)}</div>
                  </div>
                  <button disabled={busy} onClick={() => run(() => api.post(`/alliance/invites/${i.id}`, { accept: true }), `Bienvenue dans ${i.alliance}`)} className={btnPrimary}>
                    Rejoindre
                  </button>
                  <button disabled={busy} onClick={() => run(() => api.post(`/alliance/invites/${i.id}`, { accept: false }))} className={btnQuiet}>
                    Refuser
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {pending > 0 && (
          <Card title="Vos candidatures">
            <ul className="flex flex-col gap-1">
              {data.myApplications!.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-control px-2 py-2">
                  <Avatar name={c.alliance} color={c.color} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-semibold font-body truncate">{c.alliance}</div>
                    <div className="text-[12.5px] text-slate2 font-body">Envoyée {ago(c.at)}, en attente du fondateur</div>
                  </div>
                  <button disabled={busy} onClick={() => run(() => api.delete(`/alliance/applications/${c.id}`), "Candidature retirée")} className={`${btnQuiet} hover:text-rail-red`}>
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title="Les alliances qui recrutent" aside={rules.applyMax ? `${pending} candidature${pending > 1 ? "s" : ""} sur ${rules.applyMax}` : undefined}>
          {(data.directory ?? []).length === 0 ? (
            <p className="text-[13.5px] text-slate2 font-body">Aucune alliance ne cherche de membre en ce moment. Fondez la vôtre ci-dessous.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.directory!.map((d) => {
                const open = applyTo === d.id;
                const full = !d.applied && pending >= (rules.applyMax ?? 3);
                return (
                  <li key={d.id} className="rounded-control bg-navy-950/40 px-3.5 py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <Avatar name={d.name} color={d.color} />
                      <div className="flex-1 min-w-[10rem]">
                        <div className="text-[14.5px] font-semibold font-body">{d.name}</div>
                        <div className="text-[12.5px] text-slate2 font-body">
                          {d.rank ? `${ordinal(d.rank)} · ` : ""}
                          {d.members} sur {rules.max} · <span className="font-mono2 tabular-nums">{fmt(d.points)}</span> pts
                        </div>
                      </div>
                      {d.applied ? (
                        <span className="rounded-full bg-rail-green/10 text-rail-green px-2.5 py-1 text-[12.5px] font-body">Candidature envoyée</span>
                      ) : (
                        <button
                          disabled={busy || full}
                          title={full ? `${rules.applyMax} candidatures en attente au plus` : undefined}
                          onClick={() => { setApplyTo(open ? null : d.id); setApplyText(""); }}
                          className={open ? btnQuiet : btnPrimary}
                        >
                          {open ? "Annuler" : "Postuler"}
                        </button>
                      )}
                    </div>
                    {d.pitch && <p className="text-[13.5px] font-body mt-2 leading-snug max-w-prose">{d.pitch}</p>}
                    <div className="text-[12.5px] text-slate2 font-body mt-1">
                      Fondée par {d.founder}, encore {d.room} place{d.room > 1 ? "s" : ""}
                    </div>
                    {open && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          run(async () => { await api.post(`/alliances/${d.id}/apply`, { message: applyText }); setApplyTo(null); setApplyText(""); }, `Candidature envoyée à ${d.name}`);
                        }}
                        className="mt-3 flex flex-col gap-2"
                      >
                        <label className="sr-only" htmlFor={`apply-${d.id}`}>Message au fondateur</label>
                        <textarea
                          id={`apply-${d.id}`}
                          value={applyText}
                          maxLength={rules.applyMessageMax ?? 200}
                          rows={2}
                          autoFocus
                          onChange={(e) => setApplyText(e.target.value)}
                          placeholder="Un mot pour le fondateur : vos lignes, vos gares, ce que vous apportez…"
                          className={`${field} resize-none`}
                        />
                        <div className="flex items-center gap-3">
                          <button disabled={busy} className={btnPrimary}>Envoyer la candidature</button>
                          <span className="text-[12px] text-slate2 font-body tabular-nums">{applyText.length}/{rules.applyMessageMax ?? 200}</span>
                        </div>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Fonder une alliance">
          <p className="text-[13.5px] text-slate2 font-body max-w-prose leading-relaxed">
            Jusqu'à {rules.max} compagnies. Une gare que desservent aussi vos alliés rapporte {Math.round(rules.allyStep * 100)} % de plus par allié (jusqu'à +
            {Math.round(rules.allyStep * rules.allyMaxAllies * 100)} %), vos alliés ne paient pas de redevance dans vos gares, et l'alliance a son classement de saison.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <label className="sr-only" htmlFor="alliance-name">Nom de l'alliance</label>
            <input id="alliance-name" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} placeholder="Nom de l'alliance" className={`${field} flex-1 min-w-[200px] !w-auto`} />
            <button disabled={busy || name.trim().length < 3} onClick={() => run(() => api.post("/alliance", { name, color: chosen }), "Alliance fondée")} className={btnPrimary}>
              Fonder · <span className="font-mono2">{fmt(rules.cost)}</span> pi.
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3" role="radiogroup" aria-label="Couleur de l'alliance">
            <span className="text-[13px] text-slate2 font-body mr-1">Couleur</span>
            {rules.colors.map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={chosen === c}
                onClick={() => setColor(c)}
                aria-label={`Couleur ${c}`}
                className={`w-7 h-7 rounded-full transition-shadow ${chosen === c ? "shadow-[0_0_0_2px_rgb(var(--c-navy-900)),0_0_0_4px_rgb(var(--c-offwhite))]" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <p className="text-[12.5px] text-slate2 font-body mt-4">Un fondateur peut aussi vous inviter directement : l'invitation apparaîtra en haut de cette page.</p>
        </Card>
      </div>
      <Card title="Classement des alliances">
        <Ranking rows={data.ranking} />
      </Card>
    </div>
  );
}

/* ---------------- avec alliance ---------------- */

function WithAlliance({ data, busy, run }: { data: AllianceData; busy: boolean; run: Run }) {
  const a = data.alliance!;
  const { rules } = data;
  const theme = useThemeId();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [mode, setMode] = useState<MapMode>("all");
  const [pinned, setPinned] = useState<string | null>(null);
  const [peek, setPeek] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [hoverRegion, setHoverRegion] = useState<string | null>(null);
  const focus = peek ?? pinned;
  const regionRows = data.regions?.regions ?? [];
  const mapRegions: MapRegion[] = regionRows.map((r) => ({ id: r.id, name: r.name, color: r.holder?.color ?? null, mine: Boolean(r.holder?.mine), locked: r.locked }));

  const rawMembers = data.members ?? [];
  // l'ordre d'arrivée fixe les couleurs : elles ne changent pas quand le classement bouge
  const members: (MapMember & { founder: boolean; points: number; liveryColor: string; booster?: boolean })[] = useMemo(() => {
    const hues = theme === "papier" ? MEMBER_HUES.paper : MEMBER_HUES.dark;
    let i = 0;
    return [...rawMembers]
      .sort((x, y) => new Date(x.joinedAt).getTime() - new Date(y.joinedAt).getTime())
      .map((m) => ({ ...m, color: m.isMe ? "rgb(var(--c-cobalt))" : hues[i++ % hues.length] }));
  }, [rawMembers, theme]);
  const net = useMemo(() => buildNetwork(data.lines ?? [], members), [data.lines, members]);
  const me = members.find((m) => m.isMe)?.companyId ?? "";
  const n = (s: string) => net.served.get(s)?.length ?? 0;
  const meIn = (s: string) => (net.served.get(s) ?? []).includes(me);
  const bonus = (k: number) => bonusFor(k, rules.allyStep, rules.allyMaxAllies);

  const room = rules.max - rawMembers.length - (data.invited?.length ?? 0);
  const sharedAll = net.stations.filter((s) => n(s) >= 2);
  const mineShared = sharedAll.filter(meIn);
  const maxBonus = bonus(rules.allyMaxAllies + 1);

  // la liste à côté de la carte suit la vue choisie
  const byWeight = (x: string, y: string) => n(y) - n(x) || x.localeCompare(y);
  const rows =
    mode === "conquer"
      ? net.stations.filter((s) => !meIn(s)).sort(byWeight).map((s) => ({ s, val: `+${bonus(n(s) + 1)} %`, conquer: true }))
      : sharedAll
          .filter((s) => (mode !== "mine" || meIn(s)) && (!focus || (net.served.get(s) ?? []).includes(focus)))
          .sort(byWeight)
          .map((s) => ({ s, val: `+${bonus(n(s))} %`, conquer: false }));
  const listTitle = mode === "conquer" ? "Vos alliés vous attendent" : mode === "mine" ? "Vos gares communes" : "Gares communes";

  const modes: { id: MapMode; label: string }[] = [
    { id: "all", label: "Tout le réseau" },
    { id: "mine", label: "Mes gares communes" },
    { id: "conquer", label: "À conquérir" },
    ...(data.regions ? [{ id: "regions" as MapMode, label: "Régions" }] : []),
  ];
  const sortedMembers = [...members].sort((x, y) => y.points - x.points);
  const topPoints = Math.max(1, ...members.map((m) => m.points));

  return (
    <div className="flex flex-col gap-5">
      {/* l'identité de l'alliance */}
      <section className="rounded-card border border-line bg-navy-900/50 p-4 md:p-5 flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="flex items-center gap-3.5 flex-1 min-w-[260px]">
          <span
            className="shrink-0 w-[52px] h-[52px] rounded-card inline-flex items-center justify-center font-display text-[19px] font-bold text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.15)]"
            style={{ background: a.color }}
            aria-hidden="true"
          >
            {initials(a.name)}
          </span>
          <div className="min-w-0">
            <div className="font-display text-[21px] leading-tight truncate">{a.name}</div>
            <div className="flex flex-wrap gap-1.5 mt-1.5 font-body text-[12.5px]">
              <span className="rounded-full bg-offwhite/[0.07] px-2.5 py-0.5 text-slate2">
                {rawMembers.length} / {rules.max} compagnies
              </span>
              {a.rank && (
                <span className="rounded-full bg-amber/[0.12] px-2.5 py-0.5 text-amber">
                  {ordinal(a.rank)} sur {a.total} alliance{a.total > 1 ? "s" : ""}
                </span>
              )}
              <span className="rounded-full bg-offwhite/[0.07] px-2.5 py-0.5 text-slate2">
                <span className="font-mono2 tabular-nums text-offwhite">{fmt(a.points)}</span> pts de saison
              </span>
            </div>
          </div>
        </div>

        {/* 2.1 : la livrée commune (coffret d'alliance) */}
        {(a.livery || (data.liveryChoices?.length ?? 0) > 0) && (
          <div className="flex flex-wrap items-center gap-2.5 font-body">
            <span className="text-[13px] text-slate2">Livrée commune</span>
            {(data.liveryChoices?.length ?? 0) > 0 ? (
              <span className="flex items-center gap-1.5" role="group" aria-label="Livrées d'alliance">
                {data.liveryChoices!.map((c) => (
                  <button
                    key={c}
                    onClick={() => run(() => api.post("/alliance/livery", { livery: c }), "Livrée commune peinte")}
                    aria-pressed={a.livery === c}
                    title={c}
                    aria-label={`Livrée ${c}`}
                    className={`w-7 h-7 rounded-control transition-shadow ${a.livery === c ? "shadow-[0_0_0_2px_rgb(var(--c-navy-900)),0_0_0_4px_rgb(var(--c-offwhite))]" : "shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]"}`}
                    style={{ background: c }}
                  />
                ))}
              </span>
            ) : (
              <span className="w-7 h-7 rounded-control border border-[#d9a441]" style={{ background: a.livery! }} title="portée par l'alliance, filet doré compris" />
            )}
            {a.livery && (
              <button onClick={() => run(() => api.patch("/company", { liveryColor: a.livery }), "Vos rames portent la livrée de l'alliance")} className="rounded-control bg-cobalt/[0.12] text-cobalt hover:bg-cobalt/[0.18] px-3 py-1.5 text-[13px] transition-colors">
                La porter sur mes rames
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 font-body">
          {a.discordUrl && (
            <a href={a.discordUrl} target="_blank" rel="noopener noreferrer" className={btnSoft}>
              Salon Discord
            </a>
          )}
          {confirmLeave ? (
            <span className="flex items-center gap-2 text-[13px] rounded-control bg-rail-red/[0.08] pl-3 pr-1 py-1">
              Quitter {a.name} ?
              <button onClick={() => run(() => api.post("/alliance/leave"), "Vous avez quitté l'alliance")} className="rounded-control bg-rail-red text-white px-2.5 py-1 font-semibold">
                Oui
              </button>
              <button onClick={() => setConfirmLeave(false)} className={btnQuiet}>
                Non
              </button>
            </span>
          ) : (
            <button onClick={() => setConfirmLeave(true)} className={`${btnQuiet} hover:!text-rail-red`}>
              Quitter
            </button>
          )}
        </div>
      </section>

      {/* 2.3 : les objectifs de la semaine */}
      {data.objectives !== undefined && <WeekObjectives obj={data.objectives} members={members} />}

      {/* le réseau commun */}
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-[20px] leading-tight">Le réseau commun</h2>
            <p className="text-[13.5px] text-slate2 font-body mt-1">
              {mode === "regions" && data.regions
                ? regionsLine(data.regions)
                : sharedAll.length === 0
                ? "Aucune gare desservie par deux membres pour l'instant."
                : `${sharedAll.length} gare${sharedAll.length > 1 ? "s" : ""} en commun, dont ${mineShared.length} sur vos lignes. Survolez une gare pour voir qui la dessert.`}
            </p>
          </div>
          <div role="tablist" aria-label="Affichage de la carte" className="inline-flex max-w-full overflow-x-auto gap-1 p-1 rounded-control bg-navy-950/60 border border-line">
            {modes.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={mode === m.id}
                onClick={() => { setMode(m.id); setPinned(null); setPeek(null); setHover(null); }}
                className={`shrink-0 rounded-[calc(var(--r-control)-3px)] px-3 py-1.5 text-[13px] font-body transition-colors ${mode === m.id ? "bg-navy-700/70 text-offwhite font-medium" : "text-slate2 hover:text-offwhite"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex-[999_1_460px] min-w-0 flex flex-col gap-3">
            <AllianceMap
              net={net}
              members={members}
              mode={mode}
              focus={focus}
              hover={hover}
              onHover={setHover}
              step={rules.allyStep}
              maxAllies={rules.allyMaxAllies}
              regions={mapRegions}
              hoverRegion={hoverRegion}
              onHoverRegion={setHoverRegion}
            />
            {mode === "regions" ? (
              <RegionLegend rows={regionRows} />
            ) : (
            <div className="flex flex-wrap items-center gap-1.5" onMouseLeave={() => setPeek(null)}>
              {members.map((m) => {
                const on = focus === m.companyId;
                return (
                  <button
                    key={m.companyId}
                    onMouseEnter={() => setPeek(m.companyId)}
                    onFocus={() => setPeek(m.companyId)}
                    onBlur={() => setPeek(null)}
                    onClick={() => setPinned((f) => (f === m.companyId ? null : m.companyId))}
                    aria-pressed={pinned === m.companyId}
                    className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12.5px] font-body transition-all ${on ? "border-offwhite/40 bg-offwhite/[0.06]" : "border-line hover:border-slate2/60"} ${focus && !on ? "opacity-50" : ""}`}
                  >
                    <span className="w-4 h-1 rounded-full" style={{ background: m.color }} />
                    <span className={m.isMe ? "text-offwhite font-medium" : "text-offwhite/90"}>{m.isMe ? "Vous" : m.name}</span>
                    <span className="text-slate2 tabular-nums">{net.lineCount.get(m.companyId) ?? 0}</span>
                  </button>
                );
              })}
              <span className="ml-auto flex items-center gap-1.5 text-[12px] text-slate2 font-body">
                <span className="w-3 h-3 rounded-full bg-amber" aria-hidden="true" />
                gare commune, le chiffre compte les compagnies
              </span>
            </div>
            )}
          </div>

          {mode === "regions" && data.regions ? (
            <RegionList data={data.regions} hover={hoverRegion} onHover={setHoverRegion} />
          ) : (
          <div className="flex-[1_1_250px] min-w-0 flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[14px] font-semibold font-body">{listTitle}</h3>
              <span className="text-[12px] text-slate2 font-body">{mode === "conquer" ? "si vous venez" : `${rows.length} gare${rows.length > 1 ? "s" : ""}`}</span>
            </div>
            {rows.length === 0 ? (
              <p className="text-[13px] text-slate2 font-body leading-relaxed">
                {mode === "conquer"
                  ? "Vous desservez déjà toutes les gares de vos alliés."
                  : "Tracez une ligne vers une gare d'un allié : chacun de vous y gagne."}
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5 max-h-[460px] overflow-y-auto pr-1 -mr-1" onMouseLeave={() => setHover(null)}>
                {rows.map((r) => (
                  <li key={r.s}>
                    <button
                      onMouseEnter={() => setHover(r.s)}
                      onFocus={() => setHover(r.s)}
                      onClick={() => setHover(hover === r.s ? null : r.s)}
                      className={`w-full flex items-center gap-2.5 rounded-control px-2.5 py-1.5 text-left font-body transition-colors ${hover === r.s ? "bg-cobalt/[0.1]" : "hover:bg-offwhite/[0.04]"}`}
                    >
                      <span className="flex-1 min-w-0 truncate text-[13.5px]">{r.s}</span>
                      <span className="flex gap-[3px]" aria-label={(net.served.get(r.s) ?? []).map((id) => members.find((m) => m.companyId === id)?.name).join(", ")}>
                        {(net.served.get(r.s) ?? []).map((id) => (
                          <span key={id} className="w-2 h-2 rounded-full" style={{ background: members.find((m) => m.companyId === id)?.color }} />
                        ))}
                      </span>
                      <span className={`w-12 text-right font-mono2 text-[12.5px] tabular-nums ${r.conquer ? "text-cobalt" : "text-amber"}`}>{r.val}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[12px] text-slate2 font-body leading-relaxed mt-1">
              +{Math.round(rules.allyStep * 100)} % par allié qui dessert la même gare, jusqu'à +{maxBonus} %. Pas de redevance de quai entre alliés.
            </p>
          </div>
          )}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,0.95fr)] items-start">
        <Members a={a} members={sortedMembers} topPoints={topPoints} data={data} room={room} busy={busy} run={run} />
        <Board a={a} data={data} busy={busy} run={run} colorOf={(name) => members.find((m) => m.name === name)?.color} />
        <div className="flex flex-col gap-5 min-w-0">
          <Card title="Classement des alliances">
            <Ranking rows={data.ranking} highlight={a.id} />
          </Card>
          {a.founder && <FounderSettings a={a} rules={rules} busy={busy} run={run} />}
        </div>
      </div>
    </div>
  );
}

/* ---------------- les membres ---------------- */

function Members({
  a, members, topPoints, data, room, busy, run,
}: {
  a: NonNullable<AllianceData["alliance"]>;
  members: (MapMember & { founder: boolean; points: number; booster?: boolean })[];
  topPoints: number;
  data: AllianceData;
  room: number;
  busy: boolean;
  run: Run;
}) {
  const [invite, setInvite] = useState("");
  return (
    <Card title="Les membres" aside="points de saison">
      <ul className="flex flex-col gap-0.5">
        {members.map((m) => (
          <li key={m.companyId} className={`flex items-center gap-3 rounded-control px-2 py-2 ${m.isMe ? "bg-cobalt/[0.07]" : ""}`}>
            <Avatar name={m.name} color={m.color} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className={`text-[14px] font-body truncate ${m.isMe ? "font-semibold" : ""}`} title={m.name}>{m.name}</span>
                {m.booster && <BoosterBadge className="self-center" />}
                {(m.isMe || m.founder) && (
                  <span className="text-[12px] text-slate2 font-body shrink-0">{m.isMe ? (m.founder ? "vous, fondateur" : "vous") : "fondateur"}</span>
                )}
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-line/70 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.round((m.points / topPoints) * 100)}%`, background: m.color }} />
              </div>
            </div>
            <span className={`font-mono2 text-[13px] tabular-nums ${m.isMe ? "text-amber" : ""}`}>{fmt(m.points)}</span>
            {a.founder && !m.isMe && (
              <button
                onClick={() => run(() => api.post("/alliance/kick", { companyId: m.companyId }), `${m.name} ne fait plus partie de l'alliance`)}
                className="shrink-0 -mr-1 w-7 h-7 inline-flex items-center justify-center rounded-control text-slate2/70 hover:text-rail-red hover:bg-rail-red/[0.08]"
                title={`Exclure ${m.name}`}
                aria-label={`Exclure ${m.name}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </li>
        ))}
        {(data.sentInvites ?? (data.invited ?? []).map((name) => ({ companyId: "", name, at: "" }))).map((inv) => (
          <li key={inv.companyId || inv.name} className="flex items-center gap-3 rounded-control px-2 py-2 text-[13px] text-slate2 font-body">
            <span className="w-[34px] h-[34px] rounded-control border border-dashed border-line shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0">
              {inv.name}, invitation envoyée
              {/* 2.4.1 : une invitation tombe d'elle-même au bout de 7 jours */}
              {inv.at && <span className="text-slate2/70"> · expire dans {Math.max(0, 7 - Math.floor((Date.now() - Date.parse(inv.at)) / 86_400_000))} j</span>}
            </span>
            {inv.companyId && (
              <button
                onClick={() => run(() => api.delete(`/alliance/invited/${inv.companyId}`), `Invitation de ${inv.name} retirée`)}
                className="shrink-0 -mr-1 w-7 h-7 inline-flex items-center justify-center rounded-control text-slate2/70 hover:text-rail-red hover:bg-rail-red/[0.08]"
                title={`Retirer l'invitation de ${inv.name}`}
                aria-label={`Retirer l'invitation de ${inv.name}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>

      {a.founder && (data.applications ?? []).length > 0 && (
        <div className="mt-4 pt-4 border-t border-line">
          <div className="flex justify-between items-baseline mb-2">
            <h3 className="text-[14px] font-semibold font-body">Candidatures</h3>
            <span className="text-[12.5px] text-slate2 font-body">{room > 0 ? `${room} place${room > 1 ? "s" : ""} libre${room > 1 ? "s" : ""}` : "alliance complète"}</span>
          </div>
          <ul className="flex flex-col gap-2">
            {data.applications!.map((c) => (
              <li key={c.id} className="rounded-control bg-navy-950/40 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} color={c.liveryColor} size={30} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-body font-semibold truncate">{c.name}</div>
                    <div className="text-[12.5px] text-slate2 font-body">
                      {c.lines} ligne{c.lines > 1 ? "s" : ""} · {fmt(c.points)} pts · {ago(c.at)}
                    </div>
                  </div>
                </div>
                {c.message && <p className="text-[13.5px] font-body mt-2 leading-snug break-words text-offwhite/90">« {c.message} »</p>}
                <div className="flex gap-2 mt-2.5">
                  <button disabled={busy || room <= 0} onClick={() => run(() => api.post(`/alliance/applications/${c.id}`, { accept: true }), `${c.name} rejoint l'alliance`)} className={btnPrimary}>
                    Accepter
                  </button>
                  <button disabled={busy} onClick={() => run(() => api.post(`/alliance/applications/${c.id}`, { accept: false }))} className={`${btnQuiet} hover:!text-rail-red`}>
                    Refuser
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {a.founder && room > 0 ? (
        <form
          className="flex gap-2 mt-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (invite.trim()) run(async () => { await api.post("/alliance/invite", { companyName: invite }); setInvite(""); }, "Invitation envoyée");
          }}
        >
          <label className="sr-only" htmlFor="alliance-invite">Nom exact d'une compagnie à inviter</label>
          <input id="alliance-invite" value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="Nom exact d'une compagnie" className={field} />
          <button disabled={busy || !invite.trim()} className={`${btnPrimary} shrink-0`}>
            Inviter
          </button>
        </form>
      ) : (
        room <= 0 && <p className="text-[12.5px] text-slate2 font-body mt-3">Alliance complète.</p>
      )}
    </Card>
  );
}

/* ---------------- le tableau d'affichage ---------------- */

function Board({ a, data, busy, run, colorOf }: { a: NonNullable<AllianceData["alliance"]>; data: AllianceData; busy: boolean; run: Run; colorOf: (name: string) => string | undefined }) {
  const [text, setText] = useState("");
  const max = data.rules.messageMax;
  return (
    <Card title="Le tableau d'affichage" aside="gardé sept jours">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) run(async () => { await api.post("/alliance/messages", { text }); setText(""); });
        }}
        className="flex gap-2"
      >
        <label className="sr-only" htmlFor="alliance-message">Message aux membres</label>
        <input id="alliance-message" value={text} maxLength={max} onChange={(e) => setText(e.target.value)} placeholder="Écrire aux membres…" className={field} />
        <button disabled={busy || !text.trim()} className={`${btnPrimary} shrink-0`}>
          Publier
        </button>
      </form>
      <p className="text-[12px] text-slate2 font-body mt-1.5">
        {text.length > 0 ? `${text.length}/${max} · ` : ""}L'auteur et le fondateur peuvent retirer un message.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {(data.messages ?? []).length === 0 && <li className="text-[13px] text-slate2 font-body py-2">Rien d'affiché pour l'instant.</li>}
        {(data.messages ?? []).map((m) => (
          <li key={m.id} className={`flex gap-3 rounded-control px-3 py-2.5 ${m.system ? "bg-amber/[0.07] shadow-[inset_2px_0_0_rgb(var(--c-amber))]" : m.mine ? "bg-cobalt/[0.07]" : "bg-navy-950/40"}`}>
            {m.system ? (
              // 2.3 : les annonces du jeu (objectifs, régions) ont leur signal, pas d'initiales
              <span className="shrink-0 w-7 h-7 rounded-full bg-amber text-navy-950 inline-flex items-center justify-center font-display text-[14px] font-bold" aria-hidden="true">
                R
              </span>
            ) : (
              <Avatar name={m.name} color={m.mine ? "rgb(var(--c-cobalt))" : colorOf(m.name) ?? m.color} size={28} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 text-[12.5px] font-body">
                <span className={`font-semibold truncate ${m.system ? "text-amber" : ""}`}>{m.mine ? "Vous" : m.name}</span>
                {m.booster && <BoosterBadge className="self-center" />}
                <span className="text-slate2 shrink-0">{ago(m.at)}</span>
                {(m.mine || a.founder) && !m.system && (
                  <button onClick={() => run(() => api.delete(`/alliance/messages/${m.id}`))} className="ml-auto shrink-0 text-slate2/80 hover:text-rail-red">
                    retirer
                  </button>
                )}
              </div>
              <p className="text-[14px] font-body mt-0.5 leading-snug break-words">{m.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------------- les réglages du fondateur ---------------- */

function FounderSettings({ a, rules, busy, run }: { a: NonNullable<AllianceData["alliance"]>; rules: Rules; busy: boolean; run: Run }) {
  const [discord, setDiscord] = useState<string | null>(null);
  const [pitch, setPitch] = useState<string | null>(null);
  const recruiting = a.recruiting ?? true;
  return (
    <Card title="Réglages du fondateur">
      <label className="flex items-start gap-3 cursor-pointer font-body">
        <input
          type="checkbox"
          checked={recruiting}
          disabled={busy}
          onChange={(e) => run(() => api.patch("/alliance", { recruiting: e.target.checked }), e.target.checked ? "L'alliance recrute" : "Recrutement fermé")}
          className="accent-[rgb(var(--c-cobalt))] w-4 h-4 mt-0.5"
        />
        <span>
          <span className="block text-[13.5px]">Recevoir des candidatures</span>
          <span className="block text-[12.5px] text-slate2 mt-0.5 leading-snug">
            {recruiting ? "Votre alliance figure dans la liste de celles qui recrutent, tant qu'il reste de la place." : "Votre alliance n'apparaît plus dans la liste. Les invitations restent possibles."}
          </span>
        </span>
      </label>

      <label htmlFor="alliance-pitch" className="block text-[13px] text-slate2 font-body mt-4 mb-1.5">
        Présentation, lue par les candidats
      </label>
      <textarea
        id="alliance-pitch"
        value={pitch ?? a.pitch ?? ""}
        maxLength={rules.pitchMax ?? 200}
        rows={3}
        onChange={(e) => setPitch(e.target.value)}
        placeholder="Par exemple : réseau du Sud-Ouest, on cherche des lignes vers Toulouse et Bordeaux."
        className={`${field} resize-none`}
      />
      {pitch !== null && (
        <button disabled={busy} onClick={() => run(async () => { await api.patch("/alliance", { pitch }); setPitch(null); }, "Présentation enregistrée")} className={`${btnSoft} mt-2`}>
          Enregistrer la présentation
        </button>
      )}

      <label htmlFor="alliance-discord" className="block text-[13px] text-slate2 font-body mt-4 mb-1.5">
        Lien du salon Discord
      </label>
      <div className="flex gap-2">
        <input id="alliance-discord" value={discord ?? a.discordUrl ?? ""} onChange={(e) => setDiscord(e.target.value)} placeholder="https://discord.gg/…" className={field} />
        <button disabled={busy || discord === null} onClick={() => run(async () => { await api.patch("/alliance", { discordUrl: discord }); setDiscord(null); }, "Lien enregistré")} className={`${btnSoft} shrink-0`}>
          Enregistrer
        </button>
      </div>
    </Card>
  );
}

/* ---------------- le classement ---------------- */

function Ranking({ rows, highlight }: { rows: RankRow[]; highlight?: string }) {
  if (rows.length === 0) return <p className="text-[13px] text-slate2 font-body">Aucune alliance pour l'instant : la première fondée sera en tête.</p>;
  return (
    <ol className="flex flex-col gap-0.5">
      {rows.map((r) => {
        const mine = r.id === highlight;
        return (
          <li key={r.id} className={`flex items-center gap-2.5 rounded-control px-2.5 py-2 text-[13.5px] font-body ${mine ? "bg-cobalt/[0.08] shadow-[inset_0_0_0_1px_rgb(var(--c-cobalt)/0.45)]" : ""}`}>
            <span className={`w-5 text-right font-mono2 text-[12.5px] tabular-nums ${r.rank <= 3 ? "text-amber" : "text-slate2"}`}>{r.rank}</span>
            <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: r.color }} />
            <span className={`flex-1 min-w-0 truncate ${mine ? "font-semibold" : ""}`}>{r.name}</span>
            <span className="text-[12px] text-slate2 shrink-0">{r.members} cie{r.members > 1 ? "s" : ""}</span>
            <span className="font-mono2 tabular-nums w-[4.5rem] text-right">{fmt(r.points)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export async function loadAlliance(): Promise<AllianceData | null> {
  try {
    const { data } = await api.get("/alliance");
    return data;
  } catch {
    return null;
  }
}

/* ---------------- 2.3 : les objectifs de la semaine ---------------- */

const untilText = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "nouveaux objectifs dans un instant";
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `encore ${h} h`;
  const d = Math.floor(h / 24);
  return `encore ${d} jour${d > 1 ? "s" : ""}${h % 24 ? ` et ${h % 24} h` : ""}`;
};

function WeekObjectives({ obj, members }: { obj: Objectives | null; members: (MapMember & { name: string })[] }) {
  const colorOf = (id: string) => members.find((m) => m.companyId === id)?.color ?? "rgb(var(--c-slate2))";
  const nameOf = (id: string) => {
    const m = members.find((x) => x.companyId === id);
    return m ? (m.isMe ? "vous" : m.name) : "un ancien membre";
  };
  if (!obj) {
    return (
      <Card title="Objectifs de la semaine">
        <p className="text-[13.5px] text-slate2 font-body">Les objectifs sont tirés chaque lundi à minuit. Les vôtres arrivent au prochain tirage.</p>
      </Card>
    );
  }
  const doneCount = obj.objectives.filter((o) => o.done).length;
  return (
    <Card
      title="Objectifs de la semaine"
      aside={
        <>
          <span className="font-mono2 tabular-nums text-offwhite">{doneCount}/{obj.objectives.length}</span> atteints · {untilText(obj.endsAt)}
        </>
      }
    >
      <ol className="grid gap-3 md:grid-cols-3">
        {obj.objectives.map((o, i) => {
          const total = Math.max(1, o.target);
          const shares = [...o.shares].filter((s) => s.value > 0).sort((x, y) => y.value - x.value);
          const pct = Math.min(100, Math.round((o.progress / total) * 100));
          return (
            <li key={o.kind} className={`rounded-control border px-3.5 py-3 flex flex-col gap-2.5 ${o.done ? "border-rail-green/40 bg-rail-green/[0.06]" : "border-line bg-navy-950/35"}`}>
              <div className="flex items-start gap-2.5">
                <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full inline-flex items-center justify-center font-mono2 text-[11px] ${o.done ? "bg-rail-green text-navy-950" : "bg-offwhite/[0.08] text-slate2"}`} aria-hidden="true">
                  {o.done ? "✓" : i + 1}
                </span>
                <p className="flex-1 text-[14px] font-body leading-snug">{o.label}</p>
              </div>
              {/* la jauge : chaque membre y pose sa part, à sa couleur */}
              <div
                className="h-2.5 rounded-full bg-offwhite/[0.07] overflow-hidden flex"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={o.target}
                aria-valuenow={o.progress}
                aria-label={o.label}
              >
                {shares.map((s) => (
                  <span
                    key={s.companyId}
                    className="h-full first:rounded-l-full shadow-[inset_-1px_0_0_rgb(var(--c-navy-950)/0.6)]"
                    style={{ width: `${Math.min(100, (s.value / total) * 100)}%`, background: colorOf(s.companyId) }}
                    title={`${nameOf(s.companyId)} : ${fmt(s.value)}`}
                  />
                ))}
              </div>
              <div className="flex items-baseline justify-between gap-2 text-[12.5px] font-body">
                <span className="font-mono2 tabular-nums">
                  {fmt(o.progress)} <span className="text-slate2">/ {fmt(o.target)}</span>
                </span>
                <span className="text-slate2">{o.done ? "réussi" : `${pct} %`}</span>
              </div>
              {shares.length > 0 && (
                <p className="text-[12px] text-slate2 font-body leading-snug">
                  {shares.slice(0, 3).map((s, k) => (
                    <span key={s.companyId}>
                      {k > 0 && ", "}
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: colorOf(s.companyId) }} />
                      {nameOf(s.companyId)} {Math.round((s.value / Math.max(1, o.progress)) * 100)} %
                    </span>
                  ))}
                  {shares.length > 3 && ` et ${shares.length - 3} autre${shares.length > 4 ? "s" : ""}`}
                </p>
              )}
              <p className="mt-auto text-[12px] font-body text-slate2 border-t border-line/70 pt-2">
                <span className="text-amber font-mono2 tabular-nums">{fmt(o.coins)}</span> pièces et <span className="font-mono2 tabular-nums text-offwhite">{o.points}</span> pts à chaque membre qui y a contribué
              </p>
            </li>
          );
        })}
      </ol>
      <p className={`text-[12.5px] font-body mt-3 ${obj.bonus.paid ? "text-rail-green" : "text-slate2"}`}>
        {obj.bonus.paid
          ? `Les trois sont atteints : chaque membre a reçu ${fmt(obj.bonus.coins)} pièces et ${obj.bonus.points} pts de saison en plus.`
          : `Les trois atteints avant lundi : ${fmt(obj.bonus.coins)} pièces et ${obj.bonus.points} pts de saison en plus pour tous les membres.`}
      </p>
    </Card>
  );
}

/* ---------------- 2.3 : les régions ---------------- */

function regionsLine(r: RegionsData) {
  const held = r.regions.filter((x) => x.holder?.mine).length;
  const next = new Date(r.nextAt).toLocaleDateString("fr-FR", { weekday: "long" });
  if (held === 0) return `Votre alliance ne tient aucune région cette semaine. Le prochain décompte a lieu ${next} à minuit : la région revient à l'alliance qui y dessert le plus de gares.`;
  return `Vous tenez ${held} région${held > 1 ? "s" : ""} : +${String(r.bonus).replace(".", ",")} % sur les billets des lignes qui y passent. Prochain décompte ${next} à minuit.`;
}

function RegionLegend({ rows }: { rows: RegionRow[] }) {
  const holders = [...new Map(rows.filter((r) => r.holder).map((r) => [r.holder!.id, r.holder!])).values()];
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-body">
      {holders.map((h) => (
        <span key={h.id} className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 ${h.mine ? "border-offwhite/40" : "border-line"}`}>
          <span className="w-3 h-3 rounded-[3px]" style={{ background: h.color }} />
          {h.mine ? `${h.name} (vous)` : h.name}
          <span className="text-slate2 tabular-nums">{rows.filter((r) => r.holder?.id === h.id).length}</span>
        </span>
      ))}
      {holders.length === 0 && <span className="text-slate2">Aucune région tenue cette semaine.</span>}
    </div>
  );
}

function RegionList({ data, hover, onHover }: { data: RegionsData; hover: string | null; onHover: (id: string | null) => void }) {
  return (
    <div className="flex-[1_1_270px] min-w-0 flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-semibold font-body">Qui tient quoi</h3>
        <span className="text-[12px] text-slate2 font-body">vos gares / le meneur</span>
      </div>
      <ul className="flex flex-col gap-0.5 max-h-[470px] overflow-y-auto pr-1 -mr-1" onMouseLeave={() => onHover(null)}>
        {data.regions.map((r) => {
          const lead = r.race[0];
          const on = hover === r.id;
          return (
            <li key={r.id}>
              <button
                onMouseEnter={() => onHover(r.id)}
                onFocus={() => onHover(r.id)}
                onClick={() => onHover(on ? null : r.id)}
                className={`w-full text-left rounded-control px-2.5 py-1.5 font-body transition-colors ${on ? "bg-cobalt/[0.1]" : "hover:bg-offwhite/[0.04]"}`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: r.holder?.color ?? "transparent", boxShadow: r.holder ? undefined : "inset 0 0 0 1px rgb(var(--c-slate2) / 0.6)" }} />
                  <span className={`flex-1 min-w-0 truncate text-[13.5px] ${r.holder?.mine ? "font-semibold" : ""}`}>{r.name}</span>
                  {r.holder?.mine && !on && <span className="text-[11.5px] text-slate2">{r.holder.weeks} sem.</span>}
                  {r.locked ? (
                    <span className="text-[11.5px] text-slate2 rounded-full bg-offwhite/[0.06] px-2 py-0.5">extension</span>
                  ) : (
                    <span className="font-mono2 text-[12.5px] tabular-nums text-slate2">
                      <span className={r.mine > 0 ? "text-offwhite" : ""}>{r.mine}</span>
                      {lead && !lead.mine && <span> / {lead.stations}</span>}
                    </span>
                  )}
                </span>
                {on && (
                  <span className="block pl-5 mt-0.5 text-[12px] text-slate2 leading-snug">
                    {r.locked
                      ? "Réservée aux compagnies qui ont l'extension Corse."
                      : r.holder
                        ? `${r.holder.mine ? "À vous" : r.holder.name} depuis ${r.holder.weeks} semaine${r.holder.weeks > 1 ? "s" : ""} (${r.holder.stations} gare${r.holder.stations > 1 ? "s" : ""} au décompte).`
                        : "Personne ne la tient."}
                    {!r.locked && lead && ` En ce moment : ${lead.mine ? "vous menez" : `${lead.name} mène`} avec ${lead.stations} gare${lead.stations > 1 ? "s" : ""}.`}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-[12px] text-slate2 font-body leading-relaxed mt-1">
        Chaque lundi, une région revient à l'alliance qui y dessert le plus de gares (à égalité, celle qui y a fait le plus de trajets). +{data.rules.base} % par région, un peu moins au-delà de {data.rules.spreadFrom}.
      </p>
    </div>
  );
}
