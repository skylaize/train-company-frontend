import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { TrainMark, StampMark } from "../components/TrainMark";
import { ComposterOverlay } from "../components/ComposterOverlay";

interface Toast {
  id: number;
  message: string;
  variant: "success" | "error" | "info";
  leaving?: boolean;
}

interface ToastContextValue {
  showToast: (message: string, variant?: "success" | "error" | "info") => void;
  showComposter: (label: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;
const DURATION = 3600;
const EXIT_DURATION = 220;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [composterLabel, setComposterLabel] = useState<string | null>(null);
  const [composterKey, setComposterKey] = useState(0);

  const showToast = useCallback((message: string, variant: "success" | "error" | "info" = "success") => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => startLeaving(id), DURATION);
  }, []);

  const showComposter = useCallback((label: string) => {
    setComposterKey((k) => k + 1);
    setComposterLabel(label);
  }, []);

  function startLeaving(id: number) {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_DURATION);
  }

  return (
    <ToastContext.Provider value={{ showToast, showComposter }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col-reverse gap-2.5 w-80 max-w-[calc(100vw-2.5rem)]">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => startLeaving(t.id)} />
        ))}
      </div>
      {composterLabel && (
        <ComposterOverlay key={composterKey} label={composterLabel} onDone={() => setComposterLabel(null)} />
      )}
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const palette = {
    success: { bar: "bg-rail-green", text: "text-rail-green", label: "Réseau" },
    error: { bar: "bg-rail-red", text: "text-rail-red", label: "Incident" },
    info: { bar: "bg-cobalt", text: "text-cobalt", label: "Info" },
  }[toast.variant];

  return (
    <div
      className={`relative bg-navy-900 border border-line shadow-[0_8px_20px_-6px_rgba(0,0,0,0.5)] overflow-hidden ${
        toast.leaving ? "animate-toast-out" : "animate-toast-in"
      }`}
      role="status"
    >
      <div className="flex gap-3 px-3.5 py-3">
        {toast.variant === "success" ? (
          <StampMark size={30} className={`${palette.text} shrink-0 -mt-1 -ml-1`} />
        ) : (
          <TrainMark size={16} className={`${palette.text} shrink-0 mt-0.5`} />
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-[10px] uppercase tracking-wider font-mono2 ${palette.text} mb-0.5`}>
            {palette.label}
          </div>
          <div className="text-sm text-offwhite leading-snug">{toast.message}</div>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate2 hover:text-offwhite text-xs shrink-0 leading-none mt-0.5"
          aria-label="Fermer la notification"
        >
          ✕
        </button>
      </div>
      <div className="h-0.5 bg-navy-950">
        <div className={`h-full ${palette.bar} animate-toast-shrink`} />
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans un ToastProvider");
  return ctx;
}
