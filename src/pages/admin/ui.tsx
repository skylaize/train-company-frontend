import { ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";

/* ============================================================
   Panneau d'administration (2.2) : briques communes.
   Mêmes couleurs, mêmes polices que le jeu (variables de index.css),
   donc il suit aussi le thème choisi par le joueur.
   ============================================================ */

export const nf = (n: number | null | undefined) => (n == null ? "—" : new Intl.NumberFormat("fr-FR").format(Math.round(n)));
export const euros = (cents: number | null | undefined) =>
  cents == null ? "—" : `${(cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
export const dateTime = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
export const dateOnly = (d: string | Date | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");

export function since(d: string | Date | null | undefined) {
  if (!d) return "jamais";
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60_000);
  if (min < 2) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

export function errorText(err: unknown) {
  const e = err as { response?: { data?: { error?: string }; status?: number }; message?: string };
  return e?.response?.data?.error ?? (e?.response?.status ? `Erreur ${e.response.status}` : "Le serveur ne répond pas");
}

/* Charge une adresse de l'API, avec rechargement à la demande. */
export function useAdminData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      const { data } = await api.get<T>(`/admin${path}`);
      setData(data);
      setError(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload, setData };
}

/* Une action : appel, message de réussite ou d'échec, puis rechargement. */
export function useAction() {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn: () => Promise<unknown>, ok: string, after?: () => unknown) => {
      setBusy(true);
      try {
        await fn();
        showToast(ok, "success");
        await after?.();
        return true;
      } catch (err) {
        showToast(errorText(err), "error");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [showToast]
  );
  return { run, busy };
}

/* ---------------- mise en page ---------------- */

export function PageHead({ title, intro, actions }: { title: string; intro?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end gap-x-6 gap-y-3 mb-6">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[28px] leading-tight text-offwhite">{title}</h1>
        {intro && <p className="mt-1 max-w-[62ch] font-body text-[14px] text-slate2">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, aside, children, className = "" }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`border border-line bg-navy-900 ${className}`}>
      {(title || aside) && (
        <div className="flex items-baseline gap-3 px-4 pt-3.5 pb-2">
          {title && <h2 className="font-display text-[17px] text-offwhite">{title}</h2>}
          {aside && <div className="ml-auto font-body text-[12.5px] text-slate2">{aside}</div>}
        </div>
      )}
      <div className="px-4 pb-4 pt-1">{children}</div>
    </section>
  );
}

/* Un chiffre et ce qu'il compte. Le détail dit d'où il vient. */
export function Figure({ value, label, detail, tone }: { value: ReactNode; label: string; detail?: ReactNode; tone?: "amber" | "green" | "red" | "cobalt" }) {
  const color = tone === "amber" ? "text-amber" : tone === "green" ? "text-rail-green" : tone === "red" ? "text-rail-red" : tone === "cobalt" ? "text-cobalt" : "text-offwhite";
  return (
    <div className="min-w-0">
      <div className={`font-mono2 text-[24px] leading-none ${color}`}>{value}</div>
      <div className="mt-1.5 font-body text-[13px] text-offwhite/90">{label}</div>
      {detail && <div className="mt-0.5 font-body text-[12px] text-slate2">{detail}</div>}
    </div>
  );
}

type BtnTone = "primary" | "quiet" | "danger";
export function Btn({
  children, onClick, tone = "quiet", disabled, type = "button", className = "", title,
}: { children: ReactNode; onClick?: () => void; tone?: BtnTone; disabled?: boolean; type?: "button" | "submit"; className?: string; title?: string }) {
  const tones: Record<BtnTone, string> = {
    primary: "bg-amber text-navy-950 border-amber hover:bg-amber/90",
    quiet: "border-line text-offwhite hover:border-slate2",
    danger: "border-rail-red/60 text-rail-red hover:bg-rail-red/10",
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-3.5 py-2 border font-body text-[13.5px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block font-body text-[13px] text-offwhite/90 mb-1">{label}</span>
      {children}
      {hint && <span className="block mt-1 font-body text-[12px] text-slate2">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full bg-navy-950 border border-line px-3 py-2 font-body text-[14px] text-offwhite placeholder:text-slate2/60 focus:outline-none focus:border-cobalt";

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center font-body text-[14px] text-slate2">{children}</p>;
}

export function Loading({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  if (error)
    return (
      <div className="py-10 text-center font-body text-[14px]">
        <p className="text-rail-red">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-3 underline text-slate2 hover:text-offwhite">
            Réessayer
          </button>
        )}
      </div>
    );
  return <div className="py-10 text-center font-body text-[14px] text-slate2">Chargement…</div>;
}

export function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "amber" | "green" | "red" | "cobalt" }) {
  const t = {
    slate: "border-line text-slate2",
    amber: "border-amber/50 text-amber",
    green: "border-rail-green/50 text-rail-green",
    red: "border-rail-red/60 text-rail-red",
    cobalt: "border-cobalt/50 text-cobalt",
  }[tone];
  return <span className={`inline-block px-1.5 py-px border rounded-sm font-body text-[11.5px] leading-[1.5] whitespace-nowrap ${t}`}>{children}</span>;
}

/* Barres verticales simples (30 jours, 24 heures). */
export function Bars({ values, labels, format = nf, height = 96 }: { values: number[]; labels: string[]; format?: (n: number) => string; height?: number }) {
  const max = Math.max(1, ...values);
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? values.length - 1;
  return (
    <div>
      <div className="flex items-baseline justify-between font-body text-[12px] text-slate2 mb-1.5">
        <span>{labels[shown]}</span>
        <span className="font-mono2 text-offwhite">{format(values[shown] ?? 0)}</span>
      </div>
      <div className="flex items-end gap-[2px]" style={{ height }} onMouseLeave={() => setHover(null)}>
        {values.map((v, i) => (
          <div
            key={i}
            onMouseEnter={() => setHover(i)}
            className="flex-1 flex items-end h-full cursor-default"
            aria-label={`${labels[i]} : ${format(v)}`}
          >
            <div
              className={`w-full ${i === shown ? "bg-amber" : "bg-amber/45"}`}
              style={{ height: `${Math.max(v > 0 ? 3 : 1, (v / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- confirmation ---------------- */

type Ask = { title: string; body?: string; confirm: string; danger?: boolean; input?: { label: string; placeholder?: string; required?: boolean } };
type AskResult = { ok: boolean; value: string };
const ConfirmCtx = createContext<(a: Ask) => Promise<AskResult>>(async () => ({ ok: false, value: "" }));
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [ask, setAsk] = useState<(Ask & { resolve: (r: AskResult) => void }) | null>(null);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const open = useCallback(
    (a: Ask) =>
      new Promise<AskResult>((resolve) => {
        setValue("");
        setAsk({ ...a, resolve });
      }),
    []
  );
  useEffect(() => {
    if (!ask) return;
    (ask.input ? inputRef.current : confirmRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  function close(ok: boolean) {
    ask?.resolve({ ok, value: value.trim() });
    setAsk(null);
  }
  const blocked = Boolean(ask?.input?.required && !value.trim());
  return (
    <ConfirmCtx.Provider value={open}>
      {children}
      {ask && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-navy-950/70 backdrop-blur-sm p-4" onClick={() => close(false)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-label={ask.title}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              if (!blocked) close(true);
            }}
            className="w-full max-w-md border border-line bg-navy-900 p-5"
          >
            <h2 className="font-display text-[19px] text-offwhite">{ask.title}</h2>
            {ask.body && <p className="mt-2 font-body text-[14px] text-slate2 whitespace-pre-line">{ask.body}</p>}
            {ask.input && (
              <div className="mt-4">
                <Field label={ask.input.label}>
                  <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)} placeholder={ask.input.placeholder} className={inputCls} maxLength={200} />
                </Field>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Btn onClick={() => close(false)}>Annuler</Btn>
              <button
                ref={confirmRef}
                type="submit"
                disabled={blocked}
                className={`px-3.5 py-2 border font-body text-[13.5px] font-medium disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt ${
                  ask.danger ? "bg-rail-red border-rail-red text-onaccent" : "bg-amber border-amber text-navy-950"
                }`}
              >
                {ask.confirm}
              </button>
            </div>
          </form>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
