import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { ComposterOverlay } from "../components/ComposterOverlay";
import { NotifGlyph, JournalDrawer } from "../components/Journal";

/* ============================================================
   Annonces et journal de bord (2.0.3).

   Deux familles :
   - les nouvelles du réseau (une rame arrive, une panne, un ordre de fret,
     une candidature…) : notify(). Elles s'annoncent ET entrent au journal
     de bord, derrière la cloche ;
   - la réponse à une action du joueur (« Ligne créée », « Solde
     insuffisant ») : showToast(), comme avant. Annonce seule, pas de journal.

   Les annonces d'un même genre arrivées à quelques secondes d'écart se
   regroupent (« 5 arrivées en gare »), trois au plus à l'écran : la suite
   attend dans le journal. Le journal est gardé sept jours sur l'appareil.
   ============================================================ */

export type NotifKind = "rames" | "incident" | "fret" | "argent" | "equipe" | "alliance" | "saison" | "progression";
type ToastKind = NotifKind | "ok" | "refus" | "info";

/* Où mène le lien d'une nouvelle : une rubrique du tableau de bord, et
   éventuellement la fiche d'une rame. Gardé tel quel dans le journal. */
export interface NotifLink {
  label: string;
  view: string;
  trainId?: string;
}

export const KINDS: Record<ToastKind, { label: string; color: string; glyph: string; group?: (n: number) => string }> = {
  rames: { label: "Rames", color: "rgb(var(--c-cobalt))", glyph: "train", group: (n) => `${n} arrivées en gare` },
  incident: { label: "Incident", color: "rgb(var(--c-rail-red))", glyph: "signal", group: (n) => `${n} incidents sur le réseau` },
  fret: { label: "Fret", color: "rgb(var(--c-amber))", glyph: "box", group: (n) => `${n} nouvelles du fret` },
  argent: { label: "Argent", color: "rgb(var(--c-rail-green))", glyph: "coin", group: (n) => `${n} rentrées d'argent` },
  equipe: { label: "Équipe", color: "rgb(var(--c-violet))", glyph: "cap", group: (n) => `${n} nouvelles de l'équipe` },
  alliance: { label: "Alliance", color: "rgb(var(--c-cobalt))", glyph: "diamond", group: (n) => `${n} nouvelles de l'alliance` },
  saison: { label: "Saison", color: "rgb(var(--c-amber))", glyph: "flag", group: (n) => `${n} nouvelles de la saison` },
  progression: { label: "Progression", color: "rgb(var(--c-amber))", glyph: "medal", group: (n) => `${n} étapes franchies` },
  ok: { label: "Réseau", color: "rgb(var(--c-rail-green))", glyph: "check" },
  refus: { label: "Action impossible", color: "rgb(var(--c-rail-red))", glyph: "stop" },
  info: { label: "Info", color: "rgb(var(--c-cobalt))", glyph: "info" },
};

export interface JournalEntry {
  id: string;
  kind: NotifKind;
  text: string;
  link?: NotifLink;
  at: number;
  read: boolean;
}

interface Toast {
  id: number;
  kind: ToastKind;
  items: { text: string; link?: NotifLink }[];
  at: number;
  leaving?: boolean;
  bump: number;
}

interface ToastContextValue {
  showToast: (message: string, variant?: "success" | "error" | "info") => void;
  showComposter: (label: string) => void;
  /** Une nouvelle du réseau : annonce + journal. `silent` : journal seulement (le composteur l'a déjà fêtée). */
  notify: (kind: NotifKind, text: string, link?: NotifLink, opts?: { silent?: boolean }) => void;
  journal: JournalEntry[];
  unread: number;
  journalOpen: boolean;
  openJournal: (open: boolean) => void;
  markAllRead: () => void;
  /** La compagnie dont on tient le journal (une clé de stockage par compagnie). */
  setJournalOwner: (id: string | null) => void;
  /** Ce que fait un lien : posé par le tableau de bord. */
  setNavigator: (fn: ((link: NotifLink) => void) | null) => void;
  bellPulse: number;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;
const GROUP_MS = 8000;
const MAX_VISIBLE = 3;
const KEEP_DAYS = 7;
const KEEP_MAX = 150;
const EXIT_MS = 200;
const durationOf = (k: ToastKind) => (k === "incident" || k === "refus" ? 7000 : 4500);
const storageKey = (owner: string) => `reseau.journal.${owner}`;

function readJournal(owner: string): JournalEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(owner));
    const list = raw ? (JSON.parse(raw) as JournalEntry[]) : [];
    const since = Date.now() - KEEP_DAYS * 86_400_000;
    return Array.isArray(list) ? list.filter((e) => e && e.at > since && KINDS[e.kind]) : [];
  } catch {
    return [];
  }
}

export const hhmm = (t: number) => new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [overflow, setOverflow] = useState(0);
  const [composterLabel, setComposterLabel] = useState<string | null>(null);
  const [composterKey, setComposterKey] = useState(0);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [journalOpen, setJournalOpen] = useState(false);
  const [bellPulse, setBellPulse] = useState(0);
  const ownerRef = useRef<string | null>(null);
  const navRef = useRef<((link: NotifLink) => void) | null>(null);
  const timers = useRef(new Map<number, number>());
  const overflowTimer = useRef<number>();

  // le journal suit la compagnie connectée et se garde sur l'appareil
  const setJournalOwner = useCallback((id: string | null) => {
    if (ownerRef.current === id) return;
    ownerRef.current = id;
    setJournal(id ? readJournal(id) : []);
  }, []);
  useEffect(() => {
    if (!ownerRef.current) return;
    try {
      localStorage.setItem(storageKey(ownerRef.current), JSON.stringify(journal.slice(-KEEP_MAX)));
    } catch {
      /* stockage plein ou bloqué : le journal vit le temps de la session */
    }
  }, [journal]);

  const setNavigator = useCallback((fn: ((link: NotifLink) => void) | null) => {
    navRef.current = fn;
  }, []);

  const leave = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), EXIT_MS);
  }, []);

  const arm = useCallback(
    (id: number, kind: ToastKind, ms?: number) => {
      window.clearTimeout(timers.current.get(id));
      timers.current.set(id, window.setTimeout(() => leave(id), ms ?? durationOf(kind)));
    },
    [leave]
  );

  const push = useCallback(
    (kind: ToastKind, text: string, link?: NotifLink) => {
      const now = Date.now();
      setToasts((prev) => {
        // une annonce du même genre est encore là : on la complète
        const canGroup = !!KINDS[kind].group;
        const open = canGroup ? prev.find((t) => t.kind === kind && !t.leaving && now - t.at < GROUP_MS) : undefined;
        if (open) {
          arm(open.id, kind);
          return prev.map((t) => (t === open ? { ...t, items: [...t.items, { text, link }], at: now, bump: t.bump + 1 } : t));
        }
        const id = ++idCounter;
        arm(id, kind);
        const next = [...prev, { id, kind, items: [{ text, link }], at: now, bump: 0 }];
        const live = next.filter((t) => !t.leaving);
        if (live.length > MAX_VISIBLE) {
          const extra = live.slice(0, live.length - MAX_VISIBLE);
          window.setTimeout(() => extra.forEach((t) => leave(t.id)), 0);
          const journaled = extra.filter((t) => KINDS[t.kind].group).reduce((n, t) => n + t.items.length, 0);
          if (journaled) {
            setOverflow((o) => o + journaled);
            window.clearTimeout(overflowTimer.current);
            overflowTimer.current = window.setTimeout(() => setOverflow(0), 6000);
          }
        }
        return next;
      });
    },
    [arm, leave]
  );

  const showToast = useCallback(
    (message: string, variant: "success" | "error" | "info" = "success") => {
      push(variant === "error" ? "refus" : variant === "info" ? "info" : "ok", message);
    },
    [push]
  );

  const notify = useCallback(
    (kind: NotifKind, text: string, link?: NotifLink, opts?: { silent?: boolean }) => {
      setJournal((prev) => [...prev, { id: `${Date.now().toString(36)}-${++idCounter}`, kind, text, link, at: Date.now(), read: false }].slice(-KEEP_MAX));
      setBellPulse((n) => n + 1);
      if (!opts?.silent) push(kind, text, link);
    },
    [push]
  );

  const showComposter = useCallback((label: string) => {
    setComposterKey((k) => k + 1);
    setComposterLabel(label);
  }, []);

  const markAllRead = useCallback(() => setJournal((prev) => (prev.some((e) => !e.read) ? prev.map((e) => (e.read ? e : { ...e, read: true })) : prev)), []);
  const openJournal = useCallback(
    (open: boolean) => {
      setJournalOpen(open);
      // ce qu'on a vu en ouvrant le journal est lu en le refermant
      if (!open) markAllRead();
      if (open) setOverflow(0);
    },
    [markAllRead]
  );

  const go = useCallback(
    (link: NotifLink) => {
      navRef.current?.(link);
      setJournalOpen(false);
      markAllRead();
    },
    [markAllRead]
  );

  const unread = journal.reduce((n, e) => n + (e.read ? 0 : 1), 0);

  return (
    <ToastContext.Provider
      value={{ showToast, showComposter, notify, journal, unread, journalOpen, openJournal, markAllRead, setJournalOwner, setNavigator, bellPulse }}
    >
      {children}
      <div className="notif-stack" aria-live="polite">
        {toasts.map((t) => (
          <ToastCard
            key={t.id}
            toast={t}
            onDismiss={() => leave(t.id)}
            onPause={() => window.clearTimeout(timers.current.get(t.id))}
            onResume={() => arm(t.id, t.kind, 2000)}
            onLink={(link) => {
              leave(t.id);
              go(link);
            }}
            onOpenJournal={() => {
              leave(t.id);
              openJournal(true);
            }}
          />
        ))}
        {overflow > 0 && (
          <button
            onClick={() => openJournal(true)}
            className="self-end text-[12px] font-body text-slate2 hover:text-offwhite border border-line bg-navy-900 px-2.5 py-1 rounded-control"
          >
            +{overflow} dans le journal
          </button>
        )}
      </div>
      <JournalDrawer onLink={go} />
      {composterLabel && <ComposterOverlay key={composterKey} label={composterLabel} onDone={() => setComposterLabel(null)} />}
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
  onPause,
  onResume,
  onLink,
  onOpenJournal,
}: {
  toast: Toast;
  onDismiss: () => void;
  onPause: () => void;
  onResume: () => void;
  onLink: (l: NotifLink) => void;
  onOpenJournal: () => void;
}) {
  const K = KINDS[toast.kind];
  const n = toast.items.length;
  const last = toast.items[n - 1];
  const alert = toast.kind === "incident" || toast.kind === "refus";
  return (
    <div
      className={`notif ${toast.leaving ? "out" : ""} ${toast.bump ? "bump" : ""}`}
      style={{ ["--k" as string]: K.color }}
      role={alert ? "alert" : "status"}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
    >
      <div key={toast.bump} className="notif-when">
        <NotifGlyph name={K.glyph} size={20} />
        <time>{hhmm(toast.at)}</time>
      </div>
      <div className="py-2.5 pl-3 pr-1 min-w-0">
        <div className="text-[12px] font-medium font-body flex items-center gap-1.5" style={{ color: K.color }}>
          {K.label}
          {n > 1 && <span className="font-mono2 text-[11px] text-slate2">×{n}</span>}
        </div>
        {n > 1 ? (
          <>
            <div className="text-[14px] font-body text-offwhite leading-snug mt-0.5">{K.group?.(n)}</div>
            <ul className="mt-1 grid gap-0.5">
              {toast.items
                .slice(-2)
                .reverse()
                .map((i, k) => (
                  <li key={k} className="notif-dot text-[13px] font-body text-slate2 break-words">
                    {i.text}
                  </li>
                ))}
              {n > 2 && <li className="notif-dot text-[13px] font-body text-slate2">et {n - 2} autre{n - 2 > 1 ? "s" : ""}</li>}
            </ul>
            <button onClick={onOpenJournal} className="mt-1.5 text-[12.5px] font-body text-cobalt underline underline-offset-[3px]">
              Voir dans le journal
            </button>
          </>
        ) : (
          <>
            <div className="text-[14px] font-body text-offwhite leading-snug mt-0.5 break-words">{last.text}</div>
            {last.link && (
              <button onClick={() => onLink(last.link!)} className="mt-1.5 text-[12.5px] font-body text-cobalt underline underline-offset-[3px]">
                {last.link.label}
              </button>
            )}
          </>
        )}
      </div>
      <button onClick={onDismiss} className="self-start h-[30px] text-slate2 hover:text-offwhite text-[13px]" aria-label="Fermer la notification">
        ✕
      </button>
      <span className="notif-fuse" style={{ animationDuration: `${durationOf(toast.kind)}ms` }} />
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans un ToastProvider");
  return ctx;
}
