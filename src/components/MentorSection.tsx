import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

/* ============================================================
   2.5 : le compagnonnage.

   Deux visages sur la même page :
   - l'apprenti (compagnie de moins de deux semaines) choisit un tuteur dans
     la liste, lit ses conseils et lui répond ;
   - le tuteur (Baron du rail et plus) ouvre ses portes, voit l'état de
     chacun de ses apprentis et leur laisse un mot.
   Chaque grade franchi par l'apprenti rapporte aux deux, jusqu'au diplôme.
   ============================================================ */

type Note = { id: string; mine: boolean; text: string; at: string };
type Req = { label: string; met: boolean; current: number; target: number };
export interface MentorData {
  rules: {
    mentorMinGrade: string;
    mentorMinDays: number;
    maxApprentices: number;
    apprenticeMaxDays: number;
    graduateGrade: string;
    rewards: { grade: string; apprentice: number; mentor: number }[];
    masterTitle: string;
    masterGraduates: number;
  };
  me: { open: boolean; pitch: string | null; canMentor: boolean; graduates: number; grade: string };
  apprentices: {
    mentorshipId: string;
    id: string;
    name: string;
    livery: string;
    since: string;
    lastActiveAt: string | null;
    balance: number;
    trains: number;
    lines: number;
    broken: number;
    fuelBlocked: boolean;
    grade: string;
    next: { name: string; requirements: Req[] } | null;
    nextReward: [number, number] | null;
    notes: Note[];
  }[];
  mentor: null | {
    mentorshipId: string;
    id: string;
    name: string;
    livery: string;
    pitch: string | null;
    grade: string;
    lastActiveAt: string | null;
    since: string;
    myGrade: string;
    nextReward: [number, number] | null;
    notes: Note[];
  };
  canBeApprentice: boolean;
  hadMentor: boolean;
  daysLeft: number;
  available: { id: string; name: string; livery: string; pitch: string | null; grade: string; lastActiveAt: string | null; apprentices: number; graduates: number }[];
}

const fmt = (n: number) => n.toLocaleString("fr-FR");
function seen(iso: string | null) {
  if (!iso) return "jamais vu";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 10) return "en ligne";
  if (m < 60) return `vu il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vu il y a ${h} h`;
  return `vu il y a ${Math.floor(h / 24)} j`;
}

function Notes({ notes, onSend, other }: { notes: Note[]; onSend: (text: string) => Promise<boolean>; other: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  return (
    <div className="border-t border-line pt-3 mt-3">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          placeholder={`Un mot pour ${other}…`}
          className="flex-1 min-w-0 bg-navy-950/60 border border-line px-3 py-2 text-[13.5px] font-body rounded-control focus:outline-none focus:border-cobalt"
          onKeyDown={async (e) => {
            if (e.key === "Enter" && text.trim().length > 1 && !sending) {
              setSending(true);
              if (await onSend(text.trim())) setText("");
              setSending(false);
            }
          }}
        />
        <button
          disabled={text.trim().length < 2 || sending}
          onClick={async () => {
            setSending(true);
            if (await onSend(text.trim())) setText("");
            setSending(false);
          }}
          className="shrink-0 bg-cobalt text-onaccent text-[13px] font-semibold font-body px-3.5 py-2 disabled:opacity-40 rounded-control"
        >
          Envoyer
        </button>
      </div>
      {notes.length > 0 && (
        <ul className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
          {notes.map((n) => (
            <li key={n.id} className={`font-body text-[13px] leading-snug ${n.mine ? "text-slate2" : "text-offwhite"}`}>
              <span className="text-[11.5px] text-slate2/80 mr-1.5">
                {n.mine ? "Vous" : other} · {new Date(n.at).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              {n.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MentorSection({ onChange }: { onChange: () => void }) {
  const { showToast } = useToast();
  const [data, setData] = useState<MentorData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pitch, setPitch] = useState("");
  const load = useCallback(() => {
    api.get("/mentor").then((r) => {
      setData(r.data);
      setPitch(r.data?.me?.pitch ?? "");
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  async function act(key: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(key);
    try {
      await fn();
      if (ok) showToast(ok);
      load();
      onChange();
      return true;
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Impossible pour le moment", "error");
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (!data) return <div className="h-40 bg-navy-900 animate-skeleton rounded-card" />;
  const { rules } = data;

  const rewardTable = (
    <div className="grid grid-cols-3 gap-x-4 gap-y-1 font-body text-[13px] max-w-[420px]">
      <span className="text-slate2 text-[12px]">Grade de l'apprenti</span>
      <span className="text-slate2 text-[12px] text-right">Apprenti</span>
      <span className="text-slate2 text-[12px] text-right">Tuteur</span>
      {rules.rewards.map((r) => (
        <span key={r.grade} className="contents">
          <span>{r.grade}</span>
          <span className="text-right tabular-nums text-rail-green">+{fmt(r.apprentice)}</span>
          <span className="text-right tabular-nums text-rail-green">+{fmt(r.mentor)}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <section className="border border-line bg-navy-900/60 rounded-card px-5 py-4">
        <div className="text-[12px] font-body text-amber font-medium">Compagnonnage</div>
        <h2 className="font-display text-2xl leading-tight">Un tuteur pour bien démarrer</h2>
        <p className="font-body text-[13.5px] text-slate2 mt-1 max-w-[72ch]">
          Une compagnie de moins de {rules.apprenticeMaxDays} jours choisit un tuteur parmi les joueurs installés ({rules.mentorMinGrade} ou plus). Le tuteur voit où en est son apprenti et lui
          laisse des conseils ; chaque grade franchi rapporte aux deux, jusqu'au diplôme ({rules.graduateGrade}). {rules.masterGraduates} apprentis diplômés donnent le titre « {rules.masterTitle} ».
        </p>
        <div className="mt-3">{rewardTable}</div>
      </section>

      {/* ---------------- côté apprenti ---------------- */}
      {data.mentor && (
        <section className="border border-line border-t-[3px] bg-navy-900/60 rounded-card px-5 py-4" style={{ borderTopColor: data.mentor.livery }}>
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-[14rem]">
              <div className="text-[12px] font-body text-slate2">Votre tuteur · {seen(data.mentor.lastActiveAt)}</div>
              <div className="font-display text-xl leading-tight" style={{ color: data.mentor.livery }}>{data.mentor.name}</div>
              <div className="font-body text-[12.5px] text-slate2">{data.mentor.grade}</div>
              {data.mentor.pitch && <p className="font-body text-[13.5px] mt-2 max-w-[60ch]">« {data.mentor.pitch} »</p>}
            </div>
            <div className="text-right font-body text-[13px] shrink-0">
              <div className="text-slate2 text-[12px]">Vous êtes {data.mentor.myGrade}</div>
              {data.mentor.nextReward && <div className="text-rail-green">prochain grade : +{fmt(data.mentor.nextReward[0])} pi. pour vous</div>}
              <button
                onClick={() => act("end", () => api.post(`/mentor/${data.mentor!.mentorshipId}/end`), "Compagnonnage terminé")}
                disabled={busy === "end"}
                className="mt-2 text-[12px] text-slate2 hover:text-rail-red"
              >
                Mettre fin au compagnonnage
              </button>
            </div>
          </div>
          <Notes notes={data.mentor.notes} other={data.mentor.name} onSend={(t) => act("note", () => api.post(`/mentor/${data.mentor!.mentorshipId}/note`, { text: t }))} />
        </section>
      )}

      {data.canBeApprentice && !data.mentor && (
        <section>
          <h3 className="font-display text-[20px]">Choisir un tuteur</h3>
          <p className="font-body text-[13px] text-slate2 mb-3">
            Encore {data.daysLeft} jour{data.daysLeft > 1 ? "s" : ""} pour en choisir un. Les plus actifs d'abord.
          </p>
          {data.available.length === 0 ? (
            <p className="font-body text-[13.5px] text-slate2 border border-line rounded-card px-4 py-3">
              Aucun tuteur disponible pour le moment. Revenez un peu plus tard, ou demandez sur le Discord du jeu.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.available.map((m) => (
                <div key={m.id} className="border border-line border-t-[3px] bg-navy-900/40 rounded-card px-4 py-3 flex flex-col gap-1.5" style={{ borderTopColor: m.livery }}>
                  <div className="font-display text-lg leading-tight" style={{ color: m.livery }}>{m.name}</div>
                  <div className="font-body text-[12px] text-slate2">
                    {m.grade} · {seen(m.lastActiveAt)}
                  </div>
                  <p className="font-body text-[13px] flex-1">{m.pitch ? `« ${m.pitch} »` : <span className="text-slate2">Pas de présentation.</span>}</p>
                  <div className="font-body text-[12px] text-slate2">
                    {m.apprentices}/{rules.maxApprentices} apprentis · {m.graduates} diplômé{m.graduates > 1 ? "s" : ""}
                  </div>
                  <button
                    onClick={() => act(`choose-${m.id}`, () => api.post("/mentor/choose", { mentorId: m.id }), `${m.name} est votre tuteur`)}
                    disabled={busy === `choose-${m.id}`}
                    className="self-start mt-1 bg-cobalt text-onaccent text-[13px] font-semibold font-body px-3.5 py-1.5 disabled:opacity-50 rounded-control"
                  >
                    Choisir ce tuteur
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---------------- côté tuteur ---------------- */}
      {data.me.canMentor ? (
        <section>
          <h3 className="font-display text-[20px]">Vos apprentis</h3>
          <div className="border border-line bg-navy-900/40 rounded-card px-4 py-3 mt-2 mb-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 font-body text-[13.5px]">
              <input
                type="checkbox"
                checked={data.me.open}
                onChange={(e) => act("open", () => api.post("/mentor/open", { open: e.target.checked, pitch }), e.target.checked ? "Vous accueillez des apprentis" : "Vous n'accueillez plus d'apprentis")}
              />
              Accueillir des apprentis ({data.apprentices.length}/{rules.maxApprentices})
            </label>
            <input
              value={pitch}
              onChange={(e) => setPitch(e.target.value.slice(0, 140))}
              onBlur={() => pitch !== (data.me.pitch ?? "") && act("pitch", () => api.post("/mentor/open", { open: data.me.open, pitch }), "Présentation enregistrée")}
              placeholder="Votre présentation (ex. : spécialiste du fret, dispo le soir sur Discord)"
              className="flex-1 min-w-[14rem] bg-navy-950/60 border border-line px-3 py-1.5 text-[13px] font-body rounded-control focus:outline-none focus:border-cobalt"
            />
            <span className="font-body text-[12px] text-slate2">
              {data.me.graduates} diplômé{data.me.graduates > 1 ? "s" : ""}
            </span>
          </div>
          {data.apprentices.length === 0 ? (
            <p className="font-body text-[13.5px] text-slate2">
              {data.me.open ? "Aucun apprenti pour l'instant : les nouvelles compagnies vous verront dans leur liste." : "Cochez la case pour apparaître dans la liste des nouveaux venus."}
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.apprentices.map((a) => (
                <div key={a.mentorshipId} className="border border-line border-t-[3px] bg-navy-900/40 rounded-card px-4 py-3" style={{ borderTopColor: a.livery }}>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-display text-lg leading-tight" style={{ color: a.livery }}>{a.name}</div>
                    <div className="font-body text-[12px] text-slate2 shrink-0">{seen(a.lastActiveAt)}</div>
                  </div>
                  <div className="font-body text-[12.5px] text-slate2">
                    {a.grade} · {fmt(a.balance)} pi. · {a.lines} ligne{a.lines > 1 ? "s" : ""} · {a.trains} rame{a.trains > 1 ? "s" : ""}
                  </div>
                  {(a.broken > 0 || a.fuelBlocked) && (
                    <div className="font-body text-[12.5px] text-[#fca5a5] mt-1">
                      {a.broken > 0 && `${a.broken} rame${a.broken > 1 ? "s" : ""} en panne`}
                      {a.broken > 0 && a.fuelBlocked && " · "}
                      {a.fuelBlocked && "facture de gazole impayée"}
                    </div>
                  )}
                  {a.next && (
                    <div className="mt-2">
                      <div className="font-body text-[12px] text-slate2">
                        Vers {a.next.name}
                        {a.nextReward && <span className="text-rail-green"> · +{fmt(a.nextReward[1])} pi. pour vous</span>}
                      </div>
                      <ul className="mt-1 space-y-0.5">
                        {a.next.requirements.map((r) => (
                          <li key={r.label} className={`font-body text-[12.5px] flex justify-between gap-2 ${r.met ? "text-rail-green" : "text-offwhite"}`}>
                            <span>{r.met ? "✓ " : ""}{r.label}</span>
                            <span className="tabular-nums text-slate2">{fmt(r.current)} / {fmt(r.target)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Notes notes={a.notes} other={a.name} onSend={(t) => act("note", () => api.post(`/mentor/${a.mentorshipId}/note`, { text: t }))} />
                  <button onClick={() => act(`end-${a.mentorshipId}`, () => api.post(`/mentor/${a.mentorshipId}/end`), "Compagnonnage terminé")} className="mt-2 text-[12px] text-slate2 hover:text-rail-red">
                    Mettre fin
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        !data.mentor &&
        !data.canBeApprentice && (
          <p className="font-body text-[13.5px] text-slate2 border border-line rounded-card px-4 py-3">
            {data.hadMentor
              ? "Votre compagnonnage est terminé. "
              : `Le choix d'un tuteur est réservé aux compagnies de moins de ${rules.apprenticeMaxDays} jours. `}
            Vous pourrez devenir tuteur à votre tour au grade {rules.mentorMinGrade}, après {rules.mentorMinDays} jours de jeu.
          </p>
        )
      )}
    </div>
  );
}
