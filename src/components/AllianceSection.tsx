import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { STATION_COORDS } from "../geo";

/* ============================================================
   Alliances (2.0).

   Jusqu'à cinq compagnies. Une gare que desservent aussi des alliés
   rapporte plus, aucun allié ne paie de redevance de quai chez un autre,
   et l'alliance a son classement : la somme des points de saison.
   ============================================================ */

interface Rules { max: number; cost: number; allyStep: number; allyMaxAllies: number; messageMax: number; colors: string[]; applyMax?: number; applyMessageMax?: number; pitchMax?: number }
interface RankRow { id: string; name: string; color: string; members: number; points: number; rank: number }
export interface AllianceData {
  alliance: null | { id: string; name: string; color: string; discordUrl: string | null; recruiting?: boolean; pitch?: string | null; founder: boolean; rank: number | null; total: number; points: number };
  rules: Rules;
  invites?: { id: string; alliance: string; color: string; at: string }[];
  members?: { companyId: string; name: string; liveryColor: string; founder: boolean; isMe: boolean; points: number; joinedAt: string }[];
  lines?: { companyId: string; color: string; route: string[] }[];
  shared?: { station: string; members: number; bonus: number }[];
  messages?: { id: string; name: string; color: string; text: string; at: string; mine: boolean }[];
  invited?: string[];
  // 2.0.2 : candidatures
  directory?: { id: string; name: string; color: string; pitch: string | null; founder: string; members: number; room: number; points: number; rank: number | null; applied: boolean }[];
  myApplications?: { id: string; allianceId: string; alliance: string; color: string; message: string; at: string }[];
  applications?: { id: string; companyId: string; name: string; liveryColor: string; points: number; lines: number; message: string; at: string }[];
  ranking: RankRow[];
}

const fmt = (n: number) => n.toLocaleString("fr-FR");
const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
};

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

export function AllianceSection({ data, onReload, onChange }: { data: AllianceData | null; onReload: () => void; onChange: () => void }) {
  const { showToast, showComposter } = useToast();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [invite, setInvite] = useState("");
  const [text, setText] = useState("");
  const [discord, setDiscord] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [applyTo, setApplyTo] = useState<string | null>(null);
  const [applyText, setApplyText] = useState("");
  const [pitch, setPitch] = useState<string | null>(null);

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
  const { rules } = data;

  /* ---------------- sans alliance ---------------- */
  if (!data.alliance) {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          {(data.invites ?? []).length > 0 && (
            <section>
              <h2 className="font-display text-[20px] mb-2">Vos invitations</h2>
              {data.invites!.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center gap-3 py-2.5 border-b border-line">
                  <span className="w-3 h-3 rotate-45" style={{ background: i.color }} />
                  <span className="text-[15px] font-semibold font-body flex-1">{i.alliance}</span>
                  <span className="text-[12.5px] text-slate2 font-body">{ago(i.at)}</span>
                  <button disabled={busy} onClick={() => run(() => api.post(`/alliance/invites/${i.id}`, { accept: true }), `Bienvenue dans ${i.alliance}`)} className="bg-cobalt text-onaccent px-3 py-1.5 text-[13px] font-semibold font-body">
                    Rejoindre
                  </button>
                  <button disabled={busy} onClick={() => run(() => api.post(`/alliance/invites/${i.id}`, { accept: false }))} className="text-[13px] text-slate2 hover:text-offwhite font-body">
                    Refuser
                  </button>
                </div>
              ))}
            </section>
          )}

          {(data.myApplications ?? []).length > 0 && (
            <section>
              <h2 className="font-display text-[20px] mb-2">Vos candidatures</h2>
              {data.myApplications!.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 py-2.5 border-b border-line">
                  <span className="w-3 h-3 rotate-45" style={{ background: c.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold font-body">{c.alliance}</div>
                    <div className="text-[12.5px] text-slate2 font-body">Envoyée {ago(c.at)}, en attente du fondateur</div>
                  </div>
                  <button disabled={busy} onClick={() => run(() => api.delete(`/alliance/applications/${c.id}`), "Candidature retirée")} className="text-[13px] text-slate2 hover:text-rail-red font-body">
                    Retirer
                  </button>
                </div>
              ))}
            </section>
          )}

          <section>
            <div className="flex justify-between items-baseline mb-1">
              <h2 className="font-display text-[20px]">Les alliances qui recrutent</h2>
              {rules.applyMax ? <span className="text-[12.5px] text-slate2 font-body">{data.myApplications?.length ?? 0} candidature{(data.myApplications?.length ?? 0) > 1 ? "s" : ""} sur {rules.applyMax}</span> : null}
            </div>
            {(data.directory ?? []).length === 0 ? (
              <p className="text-[13.5px] text-slate2 font-body py-2">Aucune alliance ne cherche de membre en ce moment. Fondez la vôtre ci-dessous.</p>
            ) : (
              data.directory!.map((d) => {
                const open = applyTo === d.id;
                const full = !d.applied && (data.myApplications?.length ?? 0) >= (rules.applyMax ?? 3);
                return (
                  <div key={d.id} className="py-3 border-b border-line">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="w-3 h-3 rotate-45" style={{ background: d.color }} />
                      <span className="text-[15px] font-semibold font-body">{d.name}</span>
                      <span className="text-[12.5px] text-slate2 font-body">
                        {d.rank ? `${d.rank}${d.rank === 1 ? "re" : "e"}, ` : ""}
                        {d.members} sur {rules.max}, {fmt(d.points)} pts
                      </span>
                      <span className="ml-auto">
                        {d.applied ? (
                          <span className="text-[13px] text-rail-green font-body">Candidature envoyée</span>
                        ) : (
                          <button
                            disabled={busy || full}
                            title={full ? `${rules.applyMax} candidatures en attente au plus` : undefined}
                            onClick={() => { setApplyTo(open ? null : d.id); setApplyText(""); }}
                            className={`px-3 py-1.5 text-[13px] font-semibold font-body disabled:opacity-40 ${open ? "border border-line text-slate2" : "bg-cobalt text-onaccent"}`}
                          >
                            {open ? "Annuler" : "Postuler"}
                          </button>
                        )}
                      </span>
                    </div>
                    {d.pitch && <p className="text-[13.5px] font-body mt-1.5 leading-snug max-w-prose">{d.pitch}</p>}
                    <div className="text-[12px] text-slate2/80 font-body mt-1">Fondée par {d.founder}, encore {d.room} place{d.room > 1 ? "s" : ""}</div>
                    {open && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          run(async () => { await api.post(`/alliances/${d.id}/apply`, { message: applyText }); setApplyTo(null); setApplyText(""); }, `Candidature envoyée à ${d.name}`);
                        }}
                        className="mt-2.5 flex flex-col gap-2"
                      >
                        <textarea
                          value={applyText}
                          maxLength={rules.applyMessageMax ?? 200}
                          rows={2}
                          autoFocus
                          onChange={(e) => setApplyText(e.target.value)}
                          placeholder="Un mot pour le fondateur : vos lignes, vos gares, ce que vous apportez…"
                          className="w-full bg-transparent border border-line px-3 py-2 text-[13.5px] font-body focus:outline-none focus:border-cobalt resize-none"
                        />
                        <div className="flex items-center gap-3">
                          <button disabled={busy} className="bg-cobalt text-onaccent px-3 py-1.5 text-[13px] font-semibold font-body disabled:opacity-40">
                            Envoyer la candidature
                          </button>
                          <span className="text-[12px] text-slate2/70 font-body">{applyText.length}/{rules.applyMessageMax ?? 200}</span>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })
            )}
          </section>

          <section className="border border-line p-5">
            <h2 className="font-display text-[20px]">Fonder une alliance</h2>
            <p className="text-[13.5px] text-slate2 font-body mt-1.5 max-w-prose">
              Jusqu'à {rules.max} compagnies. Une gare que desservent aussi vos alliés rapporte {Math.round(rules.allyStep * 100)} % de plus par allié (jusqu'à +{Math.round(rules.allyStep * rules.allyMaxAllies * 100)} %), vos
              alliés ne paient pas de redevance dans vos gares, et l'alliance a son classement de saison.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <input
                value={name}
                maxLength={32}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom de l'alliance"
                className="flex-1 min-w-[200px] bg-transparent border border-line px-3 py-2 text-[14px] font-body focus:outline-none focus:border-cobalt"
              />
              <button
                disabled={busy || name.trim().length < 3}
                onClick={() => run(() => api.post("/alliance", { name, color: color ?? rules.colors[0] }), "Alliance fondée")}
                className="bg-cobalt text-onaccent px-4 py-2 text-[14px] font-semibold font-body disabled:opacity-40"
              >
                Fonder, {fmt(rules.cost)} pi.
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[12.5px] text-slate2 font-body mr-1">Couleur</span>
              {rules.colors.map((c) => (
                <button key={c} onClick={() => setColor(c)} aria-label={`Couleur ${c}`} className={`w-6 h-6 rotate-45 border-2 ${(color ?? rules.colors[0]) === c ? "border-offwhite" : "border-transparent"}`} style={{ background: c }} />
              ))}
            </div>
            <p className="text-[12.5px] text-slate2 font-body mt-4">Un fondateur peut aussi vous inviter directement : l'invitation apparaîtra en haut de cette page.</p>
          </section>
        </div>
        <Ranking rows={data.ranking} />
      </div>
    );
  }

  /* ---------------- avec alliance ---------------- */
  const a = data.alliance;
  const members = data.members ?? [];
  const room = rules.max - members.length - (data.invited?.length ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-4 h-4 rotate-45" style={{ background: a.color }} />
        <span className="font-display text-[22px]">{a.name}</span>
        <span className="text-[13px] text-slate2 font-body">
          {members.length} compagnie{members.length > 1 ? "s" : ""} sur {rules.max}, {fmt(a.points)} points de saison
        </span>
        <span className="ml-auto flex gap-2">
          {a.discordUrl && (
            <a href={a.discordUrl} target="_blank" rel="noopener noreferrer" className="border border-line px-3 py-1.5 text-[13px] font-body hover:border-slate2">
              Salon Discord
            </a>
          )}
          {confirmLeave ? (
            <span className="flex items-center gap-2 text-[13px] font-body">
              Quitter {a.name} ?
              <button onClick={() => run(() => api.post("/alliance/leave"), "Vous avez quitté l'alliance")} className="text-rail-red border border-rail-red/40 px-2.5 py-1">Oui</button>
              <button onClick={() => setConfirmLeave(false)} className="text-slate2 border border-line px-2.5 py-1">Non</button>
            </span>
          ) : (
            <button onClick={() => setConfirmLeave(true)} className="text-[13px] text-slate2 hover:text-rail-red font-body px-1">
              Quitter
            </button>
          )}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* les membres */}
        <section className="min-w-0">
          <div className="flex justify-between items-baseline">
            <h2 className="font-display text-[20px]">Les membres</h2>
            <span className="text-[12.5px] text-slate2 font-body">points de saison</span>
          </div>
          {members.map((m) => (
            <div key={m.companyId} className="grid grid-cols-[12px_minmax(0,1fr)_auto] gap-3 items-center py-2.5 border-b border-line">
              <span className="w-3 h-3" style={{ background: m.liveryColor }} />
              <div className="min-w-0">
                <div className={`text-[14.5px] font-body truncate ${m.isMe ? "font-semibold" : ""}`}>{m.name}</div>
                <div className="text-[12.5px] text-slate2 font-body">
                  {m.isMe ? "Vous" : m.founder ? "Fondateur" : "Membre"}
                  {m.isMe && m.founder ? ", fondateur" : ""}
                  {a.founder && !m.isMe && (
                    <button onClick={() => run(() => api.post("/alliance/kick", { companyId: m.companyId }), `${m.name} ne fait plus partie de l'alliance`)} className="ml-2 text-slate2/70 hover:text-rail-red">
                      exclure
                    </button>
                  )}
                </div>
              </div>
              <span className={`font-mono2 text-[14px] tabular-nums ${m.isMe ? "text-amber" : ""}`}>{fmt(m.points)}</span>
            </div>
          ))}
          {a.founder && (data.applications ?? []).length > 0 && (
            <div className="mt-5">
              <div className="flex justify-between items-baseline">
                <h3 className="font-display text-[17px]">Candidatures</h3>
                <span className="text-[12.5px] text-slate2 font-body">{room > 0 ? `${room} place${room > 1 ? "s" : ""} libre${room > 1 ? "s" : ""}` : "alliance complète"}</span>
              </div>
              {data.applications!.map((c) => (
                <div key={c.id} className="py-2.5 border-b border-line">
                  <div className="grid grid-cols-[12px_minmax(0,1fr)_auto] gap-3 items-center">
                    <span className="w-3 h-3" style={{ background: c.liveryColor }} />
                    <div className="min-w-0">
                      <div className="text-[14.5px] font-body font-semibold truncate">{c.name}</div>
                      <div className="text-[12.5px] text-slate2 font-body">
                        {c.lines} ligne{c.lines > 1 ? "s" : ""}, {fmt(c.points)} pts de saison, {ago(c.at)}
                      </div>
                    </div>
                    <span className="flex gap-2">
                      <button disabled={busy || room <= 0} onClick={() => run(() => api.post(`/alliance/applications/${c.id}`, { accept: true }), `${c.name} rejoint l'alliance`)} className="bg-cobalt text-onaccent px-2.5 py-1 text-[12.5px] font-semibold font-body disabled:opacity-40">
                        Accepter
                      </button>
                      <button disabled={busy} onClick={() => run(() => api.post(`/alliance/applications/${c.id}`, { accept: false }))} className="text-[12.5px] text-slate2 hover:text-rail-red font-body">
                        Refuser
                      </button>
                    </span>
                  </div>
                  {c.message && <p className="text-[13.5px] font-body mt-1.5 ml-[24px] leading-snug break-words border-l-2 border-line pl-2.5">{c.message}</p>}
                </div>
              ))}
            </div>
          )}
          {(data.invited ?? []).map((n) => (
            <div key={n} className="py-2 border-b border-line text-[13px] text-slate2 font-body">
              {n}, invitation envoyée
            </div>
          ))}
          {a.founder && room > 0 && (
            <div className="flex gap-2 mt-3">
              <input
                value={invite}
                onChange={(e) => setInvite(e.target.value)}
                placeholder="Nom exact d'une compagnie"
                className="flex-1 min-w-0 bg-transparent border border-line px-3 py-1.5 text-[13.5px] font-body focus:outline-none focus:border-cobalt"
              />
              <button
                disabled={busy || !invite.trim()}
                onClick={() => run(async () => { await api.post("/alliance/invite", { companyName: invite }); setInvite(""); }, "Invitation envoyée")}
                className="bg-cobalt text-onaccent px-3 py-1.5 text-[13px] font-semibold font-body disabled:opacity-40"
              >
                Inviter
              </button>
            </div>
          )}
          <div className="mt-5">
            <Ranking rows={data.ranking} highlight={a.id} />
          </div>
        </section>

        {/* le réseau commun */}
        <section className="min-w-0">
          <div className="flex justify-between items-baseline mb-2">
            <h2 className="font-display text-[20px]">Le réseau commun</h2>
            <span className="text-[12.5px] text-slate2 font-body">
              {(data.shared ?? []).length} gare{(data.shared ?? []).length > 1 ? "s" : ""} en commun
            </span>
          </div>
          <AllianceMap lines={data.lines ?? []} shared={data.shared ?? []} />
          <div className="mt-3">
            {(data.shared ?? []).length === 0 ? (
              <p className="text-[13px] text-slate2 font-body">Aucune gare desservie par deux membres pour l'instant. Tracez une ligne vers une gare d'un allié : chacun de vous y gagne.</p>
            ) : (
              (data.shared ?? []).map((s) => (
                <div key={s.station} className="flex justify-between text-[13.5px] font-body py-1 border-b border-line/60">
                  <span>{s.station}</span>
                  <span className="text-slate2">
                    {s.members} membres, <span className="text-amber font-mono2">+{s.bonus} %</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* le tableau d'affichage */}
        <section className="min-w-0">
          <div className="flex justify-between items-baseline">
            <h2 className="font-display text-[20px]">Le tableau d'affichage</h2>
            <span className="text-[12.5px] text-slate2 font-body">entre membres</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) run(async () => { await api.post("/alliance/messages", { text }); setText(""); });
            }}
            className="flex gap-2 mt-2"
          >
            <input
              value={text}
              maxLength={rules.messageMax}
              onChange={(e) => setText(e.target.value)}
              placeholder="Écrire aux membres…"
              className="flex-1 min-w-0 bg-transparent border border-line px-3 py-1.5 text-[13.5px] font-body focus:outline-none focus:border-cobalt"
            />
            <button disabled={busy || !text.trim()} className="bg-navy-900 border border-line px-3 py-1.5 text-[13px] font-body disabled:opacity-40">
              Afficher
            </button>
          </form>
          <p className="text-[12px] text-slate2/70 font-body mt-1.5">Messages courts, gardés sept jours. L'auteur et le fondateur peuvent les retirer.</p>
          <div className="mt-2">
            {(data.messages ?? []).length === 0 && <p className="text-[13px] text-slate2 font-body py-2">Rien d'affiché pour l'instant.</p>}
            {(data.messages ?? []).map((m) => (
              <div key={m.id} className="py-2.5 border-b border-line">
                <div className="flex items-center gap-2 text-[12.5px] font-body">
                  <span className="w-2 h-2" style={{ background: m.color }} />
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-slate2/70">{ago(m.at)}</span>
                  {(m.mine || a.founder) && (
                    <button onClick={() => run(() => api.delete(`/alliance/messages/${m.id}`))} className="ml-auto text-slate2/60 hover:text-rail-red">
                      retirer
                    </button>
                  )}
                </div>
                <div className="text-[14px] font-body mt-1 leading-snug break-words">{m.text}</div>
              </div>
            ))}
          </div>
          {a.founder && (
            <div className="mt-5">
              <div className="text-[13px] text-slate2 font-body mb-1.5">Lien du salon Discord de l'alliance</div>
              <div className="flex gap-2">
                <input
                  value={discord ?? a.discordUrl ?? ""}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="https://discord.gg/…"
                  className="flex-1 min-w-0 bg-transparent border border-line px-3 py-1.5 text-[13px] font-body focus:outline-none focus:border-cobalt"
                />
                <button disabled={busy || discord === null} onClick={() => run(async () => { await api.patch("/alliance", { discordUrl: discord }); setDiscord(null); }, "Lien enregistré")} className="border border-line px-3 py-1.5 text-[13px] font-body disabled:opacity-40">
                  Enregistrer
                </button>
              </div>
            </div>
          )}
          {a.founder && (
            <div className="mt-5">
              <label className="flex items-center gap-2.5 text-[13.5px] font-body cursor-pointer">
                <input
                  type="checkbox"
                  checked={a.recruiting ?? true}
                  disabled={busy}
                  onChange={(e) => run(() => api.patch("/alliance", { recruiting: e.target.checked }), e.target.checked ? "L'alliance recrute" : "Recrutement fermé")}
                  className="accent-[rgb(var(--c-cobalt))] w-4 h-4"
                />
                Recevoir des candidatures
              </label>
              <p className="text-[12px] text-slate2/70 font-body mt-1">
                {a.recruiting ?? true ? "Votre alliance figure dans la liste de celles qui recrutent, tant qu'il reste de la place." : "Votre alliance n'apparaît plus dans la liste. Les invitations restent possibles."}
              </p>
              <div className="text-[13px] text-slate2 font-body mt-3 mb-1.5">Présentation, lue par les candidats</div>
              <textarea
                value={pitch ?? a.pitch ?? ""}
                maxLength={rules.pitchMax ?? 200}
                rows={2}
                onChange={(e) => setPitch(e.target.value)}
                placeholder="Par exemple : réseau du Sud-Ouest, on cherche des lignes vers Toulouse et Bordeaux."
                className="w-full bg-transparent border border-line px-3 py-1.5 text-[13px] font-body focus:outline-none focus:border-cobalt resize-none"
              />
              <button disabled={busy || pitch === null} onClick={() => run(async () => { await api.patch("/alliance", { pitch }); setPitch(null); }, "Présentation enregistrée")} className="mt-1.5 border border-line px-3 py-1.5 text-[13px] font-body disabled:opacity-40">
                Enregistrer
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Ranking({ rows, highlight }: { rows: RankRow[]; highlight?: string }) {
  return (
    <section>
      <h2 className="font-display text-[18px] mb-1.5">Classement des alliances</h2>
      {rows.length === 0 ? (
        <p className="text-[13px] text-slate2 font-body">Aucune alliance pour l'instant : la première fondée sera en tête.</p>
      ) : (
        rows.map((r) => (
          <div key={r.id} className={`grid grid-cols-[24px_12px_minmax(0,1fr)_auto] gap-2.5 items-center py-1.5 px-1 text-[13.5px] font-body ${r.id === highlight ? "bg-navy-900 shadow-[inset_0_0_0_1px_rgb(var(--c-cobalt))]" : ""}`}>
            <span className="font-mono2 text-slate2 text-right">{r.rank}</span>
            <span className="w-2.5 h-2.5 rotate-45" style={{ background: r.color }} />
            <span className="truncate">
              {r.name} <span className="text-slate2 text-[12px]">· {r.members}</span>
            </span>
            <span className="font-mono2 tabular-nums">{fmt(r.points)}</span>
          </div>
        ))
      )}
    </section>
  );
}

/* Les lignes des membres, chacune à la couleur de sa compagnie, et les gares
   communes cerclées d'ambre. Cadrée sur les gares utilisées. */
function AllianceMap({ lines, shared }: { lines: { companyId: string; color: string; route: string[] }[]; shared: { station: string; bonus: number }[] }) {
  const pts = lines.flatMap((l) => l.route).map((s) => STATION_COORDS[s]).filter(Boolean);
  if (pts.length === 0) {
    return <div className="border border-line h-[220px] flex items-center justify-center text-[13px] text-slate2 font-body bg-[#0d1526]">Pas encore de ligne dans l'alliance.</div>;
  }
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const pad = 30;
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
  const w = Math.max(120, maxX - minX), h = Math.max(90, maxY - minY);
  const sharedSet = new Set(shared.map((s) => s.station));
  const stations = [...new Set(lines.flatMap((l) => l.route))].filter((s) => STATION_COORDS[s]);
  const k = Math.max(w / 300, h / 210); // taille constante à l'écran
  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="w-full h-[260px] border border-line bg-[#0d1526]" role="img" aria-label="Les lignes de l'alliance">
      {lines.map((l, i) => (
        <polyline
          key={i}
          points={l.route.filter((s) => STATION_COORDS[s]).map((s) => `${STATION_COORDS[s].x},${STATION_COORDS[s].y}`).join(" ")}
          fill="none"
          stroke={l.color}
          strokeWidth={3 * k}
          strokeLinejoin="round"
          opacity="0.9"
        />
      ))}
      {stations.map((s) => {
        const p = STATION_COORDS[s];
        const sh = sharedSet.has(s);
        return (
          <g key={s}>
            <circle cx={p.x} cy={p.y} r={(sh ? 6 : 3.5) * k} fill="#0b0f19" stroke={sh ? "#f59e0b" : "#cbd5e1"} strokeWidth={(sh ? 2.5 : 1.5) * k} />
            <text x={p.x + 8 * k} y={p.y + 4 * k} fontSize={11 * k} fill={sh ? "#f59e0b" : "#cbd5e1"} fontFamily="Work Sans, sans-serif">
              {s}
            </text>
          </g>
        );
      })}
    </svg>
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
