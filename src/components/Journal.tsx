import { useEffect, useRef, useState } from "react";
import { useToast, KINDS, hhmm, JournalEntry, NotifKind, NotifLink } from "../context/ToastContext";

/* ============================================================
   Journal de bord (2.0.3) : la cloche et le tiroir qui garde les
   nouvelles du réseau des sept derniers jours, par jour et par genre.
   ============================================================ */

const GLYPHS: Record<string, JSX.Element> = {
  train: (
    <>
      <path d="M7 4h10a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 11h16" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="14" r="1" fill="currentColor" />
      <circle cx="16" cy="14" r="1" fill="currentColor" />
      <path d="M8 17l-2 3M16 17l2 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  signal: (
    <>
      <rect x="8" y="2.5" width="8" height="13" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="6.5" r="1.6" fill="currentColor" />
      <circle cx="12" cy="11.5" r="1.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 15.5V21M8.5 21h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  box: (
    <>
      <path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3.5 8 12 12l8.5-4M12 12v8" stroke="currentColor" strokeWidth="1.4" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.1" strokeDasharray="2 1.6" />
      <path d="M12 9.5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  cap: (
    <>
      <path d="M5 11a7 4 0 0 1 14 0" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 11h16l-1.5 2.5h-13L4 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="17.5" r="3" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  diamond: (
    <>
      <path d="M12 3.5 20.5 12 12 20.5 3.5 12 12 3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 8.5 15.5 12 12 15.5 8.5 12Z" fill="currentColor" />
    </>
  ),
  flag: (
    <>
      <path d="M6 21V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 4.5h11l-2.5 3.5L17 11.5H6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
  medal: (
    <>
      <path d="M9 3l1.5 6M15 3l-1.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="15" r="6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="15" r="2" fill="currentColor" />
    </>
  ),
  stop: (
    <>
      <path d="M8.5 3.5h7l5 5v7l-5 5h-7l-5-5v-7l5-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.1" fill="currentColor" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 1.8" />
      <path d="M8 12.5l2.6 2.6L16.2 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="1.1" fill="currentColor" />
    </>
  ),
};

export function NotifGlyph({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {GLYPHS[name] ?? GLYPHS.info}
    </svg>
  );
}

/* La cloche : nombre de nouvelles non lues, et un petit tintement à chaque nouvelle. */
export function JournalBell({ className = "" }: { className?: string }) {
  const { unread, journalOpen, openJournal, bellPulse } = useToast();
  const [ring, setRing] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setRing(false);
    const a = window.requestAnimationFrame(() => setRing(true));
    const b = window.setTimeout(() => setRing(false), 700);
    return () => {
      window.cancelAnimationFrame(a);
      window.clearTimeout(b);
    };
  }, [bellPulse]);
  return (
    <button
      onClick={() => openJournal(!journalOpen)}
      aria-expanded={journalOpen}
      aria-label={unread ? `Journal de bord, ${unread} nouvelle${unread > 1 ? "s" : ""} non lue${unread > 1 ? "s" : ""}` : "Journal de bord"}
      title="Journal de bord"
      className={`relative w-9 h-9 grid place-items-center border border-line text-offwhite hover:border-slate2 shrink-0 ${ring ? "bell-ring" : ""} ${className}`}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M10 20.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      {unread > 0 && (
        <span className="absolute -top-[7px] -right-[7px] min-w-[19px] h-[19px] px-1 bg-amber text-navy-950 font-mono2 text-[11px] leading-[19px] text-center tabular-nums">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

function dayLabel(t: number) {
  const d = new Date(t);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  const s = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function JournalDrawer({ onLink }: { onLink: (l: NotifLink) => void }) {
  const { journal, unread, journalOpen, openJournal, markAllRead } = useToast();
  const [filter, setFilter] = useState<NotifKind | "tout">("tout");
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  // fermé, le tiroir sort de l'ordre de tabulation
  useEffect(() => {
    drawerRef.current?.toggleAttribute("inert", !journalOpen);
  }, [journalOpen]);

  useEffect(() => {
    if (!journalOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && openJournal(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [journalOpen, openJournal]);

  const kinds = (Object.keys(KINDS) as NotifKind[]).filter((k) => journal.some((e) => e.kind === k));
  const active = filter !== "tout" && !kinds.includes(filter) ? "tout" : filter;
  const rows = journal.filter((e) => active === "tout" || e.kind === active).sort((a, b) => b.at - a.at);
  const groups: { day: string; rows: JournalEntry[] }[] = [];
  for (const e of rows) {
    const day = dayLabel(e.at);
    if (groups[groups.length - 1]?.day !== day) groups.push({ day, rows: [] });
    groups[groups.length - 1].rows.push(e);
  }

  return (
    <>
      {journalOpen && <div data-modal className="fixed inset-0 z-[90] bg-navy-950/55" onClick={() => openJournal(false)} />}
      <aside
        className={`journal-drawer ${journalOpen ? "open" : ""} fixed z-[95] top-0 right-0 bottom-0 w-[420px] max-w-full bg-navy-900 border-l border-line shadow-[-16px_0_40px_-20px_rgba(0,0,0,0.6)] flex flex-col`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        ref={drawerRef}
        aria-label="Journal de bord"
        aria-hidden={!journalOpen}
      >
        <div className="px-[18px] pt-[18px] pb-3 border-b border-line grid gap-3">
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-display text-[21px]">Journal de bord</h2>
            <span className="text-[12.5px] text-slate2 font-body">{unread ? `${unread} non lue${unread > 1 ? "s" : ""}` : "tout est lu"}</span>
            <button ref={closeRef} onClick={() => openJournal(false)} className="ml-auto w-[30px] h-[30px] text-slate2 hover:text-offwhite" aria-label="Fermer le journal">
              ✕
            </button>
          </div>
          {kinds.length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par genre">
              {(["tout", ...kinds] as (NotifKind | "tout")[]).map((k) => {
                const n = k === "tout" ? journal.length : journal.filter((e) => e.kind === k).length;
                const on = active === k;
                return (
                  <button
                    key={k}
                    aria-pressed={on}
                    onClick={() => setFilter(k)}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 border text-[12.5px] font-body ${on ? "border-offwhite text-offwhite" : "border-line text-slate2 hover:text-offwhite"}`}
                  >
                    {k === "tout" ? "Tout" : KINDS[k].label}
                    <span className="font-mono2 text-[11px]">{n}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-slate2 font-body">Gardé 7 jours, sur cet appareil</span>
            <button onClick={markAllRead} disabled={!unread} className="text-[12.5px] font-body text-cobalt hover:underline underline-offset-[3px] disabled:text-slate2 disabled:no-underline">
              Tout marquer comme lu
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pb-6">
          {groups.length === 0 ? (
            <p className="px-[18px] py-10 text-center text-[13.5px] text-slate2 font-body leading-relaxed">
              Rien dans le journal pour l'instant.
              <br />
              Les arrivées, les incidents et les nouvelles de vos lignes s'afficheront ici.
            </p>
          ) : (
            groups.map((g) => (
              <section key={g.day}>
                <h3 className="font-display text-[14px] text-slate2 px-[18px] pt-3.5 pb-1.5">{g.day}</h3>
                {g.rows.map((e) => {
                  const K = KINDS[e.kind];
                  return (
                    <div key={e.id} className={`journal-entry ${e.read ? "" : "unread"} relative grid grid-cols-[44px_20px_minmax(0,1fr)] gap-2.5 px-[18px] py-2.5 items-start hover:bg-offwhite/[0.04]`}>
                      <time className="font-mono2 text-[12px] text-slate2 pt-0.5 tabular-nums">{hhmm(e.at)}</time>
                      <span style={{ color: K.color }} className="pt-px">
                        <NotifGlyph name={K.glyph} />
                      </span>
                      <div className={`text-[13.5px] font-body leading-snug break-words ${e.read ? "text-slate2" : "text-offwhite"}`}>
                        {e.text}
                        {e.link && (
                          <>
                            <br />
                            <button onClick={() => onLink(e.link!)} className="mt-1 text-[12.5px] text-cobalt hover:underline underline-offset-[3px]">
                              {e.link.label}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
