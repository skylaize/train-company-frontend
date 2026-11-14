import { useMemo, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { Btn, Empty, Loading, PageHead, Pill, dateTime, errorText, inputCls, useAdminData } from "./ui";

/* ============================================================
   2.8 : les posts de 🐛・bugs et 💡・suggestions, sans ouvrir Discord.
   Le serveur les lit à la demande (gardés 3 minutes). « Copier » met la
   liste en texte simple, prête à coller dans une conversation.
   ============================================================ */

type Kind = "BUGS" | "SUGGESTIONS";
type Status = "nouveau" | "etude" | "accepte" | "prevu" | "fait" | "refuse";
type Post = {
  id: string; title: string; url: string; createdAt: string; author: string; company: string | null;
  status: Status; statusLabel: string; tags: string[]; archived: boolean; replies: number; up: number; down: number; text: string; images: string[];
};
type Msg = { id: string; at: string; author: string; company: string | null; text: string; images: string[] };

const OPEN = new Set<Status>(["nouveau", "etude", "accepte", "prevu"]);
const TONE: Record<Status, "slate" | "amber" | "green" | "red" | "cobalt"> = { nouveau: "amber", etude: "cobalt", accepte: "cobalt", prevu: "cobalt", fait: "green", refuse: "red" };

const who = (author: string, company: string | null) => (company ? `${author} (${company})` : author);

function postText(p: Post, kind: Kind, thread?: Msg[]) {
  const head = [`## ${p.title}`, `${who(p.author, p.company)} · ${dateTime(p.createdAt)} · ${p.statusLabel}${p.tags.length ? ` · ${p.tags.join(", ")}` : ""}${kind === "SUGGESTIONS" ? ` · 👍 ${p.up} 👎 ${p.down}` : ""}`];
  const body = thread?.length
    ? thread.map((m, i) => `${i === 0 ? "" : `> ${who(m.author, m.company)} : `}${m.text}${m.images.length ? `\n${m.images.map((u) => `[image] ${u}`).join("\n")}` : ""}`)
    : [p.text, ...p.images.map((u) => `[image] ${u}`)];
  return [...head, ...body.filter(Boolean), p.url].join("\n");
}

/* Le presse-papiers refuse souvent une copie lancée après un chargement
   (Safari surtout) : on tente l'API, puis l'ancienne méthode. */
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DiscordForum() {
  const { showToast } = useToast();
  const [kind, setKind] = useState<Kind>("BUGS");
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [q, setQ] = useState("");
  const [fresh, setFresh] = useState(0);
  const { data, error, loading, reload } = useAdminData<{ posts: Post[]; at: number; error?: string }>(`/discord-forum?kind=${kind}${fresh ? `&fresh=1&n=${fresh}` : ""}`);
  const [open, setOpen] = useState<Record<string, Msg[] | "loading" | "error">>({});

  const posts = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.posts ?? [])
      .filter((p) => !onlyOpen || OPEN.has(p.status))
      .filter((p) => !needle || `${p.title} ${p.text} ${p.author} ${p.company ?? ""}`.toLowerCase().includes(needle))
      .sort((a, b) => (kind === "SUGGESTIONS" && onlyOpen ? b.up - b.down - (a.up - a.down) : 0) || b.createdAt.localeCompare(a.createdAt));
  }, [data, onlyOpen, q, kind]);

  async function toggle(p: Post) {
    if (open[p.id]) {
      setOpen((o) => {
        const n = { ...o };
        delete n[p.id];
        return n;
      });
      return;
    }
    setOpen((o) => ({ ...o, [p.id]: "loading" }));
    try {
      const { data } = await api.get<{ messages: Msg[] }>(`/admin/discord-forum/${p.id}`);
      setOpen((o) => ({ ...o, [p.id]: data.messages }));
    } catch (err) {
      showToast(errorText(err), "error");
      setOpen((o) => ({ ...o, [p.id]: "error" }));
    }
  }

  // la liste copiée contient toute la discussion de chaque post (lue au besoin, trois à la fois)
  const [copying, setCopying] = useState(false);
  // le texte prêt : affiché dans un cadre, à copier d'un clic (le clic garde le droit de copier) ou à télécharger
  const [ready, setReady] = useState<string | null>(null);
  // le .zip : liste.txt et les captures, téléchargées par le serveur
  const [zipping, setZipping] = useState(false);
  async function downloadZip() {
    setZipping(true);
    try {
      const { data } = await api.get(`/admin/discord-forum-export?kind=${kind}${onlyOpen ? "&open=1" : ""}`, { responseType: "blob", timeout: 180_000 });
      const url = URL.createObjectURL(data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kind === "BUGS" ? "bugs" : "suggestions"}-discord.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      showToast(errorText(err), "error");
    } finally {
      setZipping(false);
    }
  }
  async function copyAll() {
    setCopying(true);
    const threads = new Map<string, Msg[]>();
    for (const p of posts) if (Array.isArray(open[p.id])) threads.set(p.id, open[p.id] as Msg[]);
    const todo = posts.filter((p) => !threads.has(p.id) && p.replies > 0);
    let next = 0;
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        while (next < todo.length) {
          const p = todo[next++];
          const r = await api.get<{ messages: Msg[] }>(`/admin/discord-forum/${p.id}`).catch(() => null);
          if (r) threads.set(p.id, r.data.messages);
        }
      })
    );
    const text = [`# ${kind === "BUGS" ? "Bugs" : "Suggestions"} Discord (${posts.length})`, ...posts.map((p) => postText(p, kind, threads.get(p.id)))].join("\n\n");
    setCopying(false);
    setReady(text);
  }

  return (
    <>
      <PageHead
        title="Bugs et suggestions"
        intro="Les posts des forums Discord, lus par le bot. Ouvrez un post pour voir toute la discussion. « Télécharger avec les photos » donne un .zip (la liste en texte et toutes les captures) à joindre tel quel dans une conversation."
        actions={
          <>
            <Btn onClick={() => setFresh((n) => n + 1)} disabled={loading}>
              {loading ? "Lecture…" : "Relire Discord"}
            </Btn>
            <Btn tone="primary" onClick={downloadZip} disabled={!posts.length || zipping} title="liste.txt et les captures, dans un .zip à m'envoyer">
              {zipping ? "Préparation du .zip…" : "Télécharger avec les photos"}
            </Btn>
            <Btn onClick={copyAll} disabled={!posts.length || copying}>
              {copying ? "Lecture des discussions…" : "Préparer la liste"}
            </Btn>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["BUGS", "SUGGESTIONS"] as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => {
              setKind(k);
              setOpen({});
            }}
            className={`px-3 py-1.5 border font-body text-[13.5px] ${kind === k ? "border-amber text-offwhite" : "border-line text-slate2 hover:text-offwhite"}`}
          >
            {k === "BUGS" ? "🐛 Bugs" : "💡 Suggestions"}
          </button>
        ))}
        <label className="flex items-center gap-2 font-body text-[13.5px] text-slate2 ml-2">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
          À traiter seulement
        </label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher…" className={`${inputCls} max-w-[220px] ml-auto`} />
      </div>

      {ready != null && (
        <div className="border border-amber/50 bg-navy-900/60 p-3 mb-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-body text-[13.5px] text-offwhite mr-auto">Liste prête ({ready.length.toLocaleString("fr-FR")} caractères)</span>
            <Btn tone="primary" onClick={async () => {
                const ok = await copy(ready);
                showToast(ok ? "Liste copiée" : "Copie refusée : sélectionnez le texte ci-dessous, ou téléchargez-le", ok ? "success" : "error");
              }}>
              Copier
            </Btn>
            <Btn onClick={() => download(ready, `${kind === "BUGS" ? "bugs" : "suggestions"}-discord.txt`)}>Télécharger .txt</Btn>
            <Btn onClick={() => setReady(null)}>Fermer</Btn>
          </div>
          <textarea readOnly value={ready} onFocus={(e) => e.currentTarget.select()} className={`${inputCls} w-full h-48 font-mono2 text-[12px]`} />
        </div>
      )}

      {!data ? (
        <Loading error={error} onRetry={reload} />
      ) : data.error ? (
        <Empty>{data.error}</Empty>
      ) : posts.length === 0 ? (
        <Empty>{onlyOpen ? "Rien à traiter." : "Aucun post."}</Empty>
      ) : (
        <>
          <p className="font-body text-[12.5px] text-slate2 mb-2">
            {posts.length} posts · lu à {new Date(data.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <ul className="space-y-2">
            {posts.map((p) => {
              const t = open[p.id];
              return (
                <li key={p.id} className="border border-line bg-navy-900/40">
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3">
                    <button onClick={() => toggle(p)} className="flex-1 min-w-[240px] text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={TONE[p.status]}>{p.statusLabel}</Pill>
                        {p.tags.map((tag) => (
                          <Pill key={tag}>{tag}</Pill>
                        ))}
                        <span className="font-body text-[14.5px] text-offwhite font-medium">{p.title}</span>
                      </div>
                      <div className="mt-1 font-body text-[12.5px] text-slate2">
                        {who(p.author, p.company)} · {dateTime(p.createdAt)} · {p.replies} réponse{p.replies > 1 ? "s" : ""}
                        {kind === "SUGGESTIONS" && ` · 👍 ${p.up} 👎 ${p.down}`}
                        {p.archived && " · archivé"}
                      </div>
                      {!t && p.text && <p className="mt-1.5 font-body text-[13px] text-offwhite/85 line-clamp-2 whitespace-pre-line">{p.text}</p>}
                    </button>
                    <div className="flex items-center gap-2">
                      <Btn
                        onClick={async () => showToast((await copy(postText(p, kind, Array.isArray(t) ? t : undefined))) ? "Post copié" : "Copie refusée par le navigateur")}
                      >
                        Copier
                      </Btn>
                      <a href={p.url} target="_blank" rel="noreferrer" className="px-3 py-2 border border-line font-body text-[13.5px] text-slate2 hover:text-offwhite">
                        Discord ↗
                      </a>
                    </div>
                  </div>
                  {!t && p.images.length > 0 && (
                    <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
                      {p.images.map((u) => (
                        <a key={u} href={u} target="_blank" rel="noreferrer">
                          <img src={u} alt="" loading="lazy" className="h-20 border border-line object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  {t === "loading" && <p className="px-4 pb-3 font-body text-[13px] text-slate2">Lecture du post…</p>}
                  {Array.isArray(t) && (
                    <ol className="border-t border-line divide-y divide-line">
                      {t.map((m) => (
                        <li key={m.id} className="px-4 py-2.5">
                          <div className="font-body text-[12px] text-slate2">
                            {who(m.author, m.company)} · {dateTime(m.at)}
                          </div>
                          {m.text && <p className="mt-1 font-body text-[13.5px] whitespace-pre-line">{m.text}</p>}
                          {m.images.length > 0 && (
                            <div className="flex gap-2 mt-2 overflow-x-auto">
                              {m.images.map((u) => (
                                <a key={u} href={u} target="_blank" rel="noreferrer">
                                  <img src={u} alt="" loading="lazy" className="h-28 border border-line object-cover" />
                                </a>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
