/* 1.7 — Plaques d'honneur : le nom d'une compagnie encadré au classement,
   comme les plaques des locomotives. Trois matières, vues par tous. */

export const PLATE_LABELS: Record<string, string> = {
  laiton: "Laiton gravé",
  email: "Émail bleu",
  or: "Or fin",
};

const STYLE: Record<string, React.CSSProperties> = {
  laiton: {
    background: "linear-gradient(180deg, #e3c27a 0%, #b88a35 55%, #9c7128 100%)",
    color: "#2a1d08",
    border: "1px solid #6f5019",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.45), 0 1px 0 rgba(0,0,0,.4)",
    letterSpacing: "0.04em",
  },
  email: {
    background: "#0e3466",
    color: "#ffffff",
    border: "2px solid #e8edf5",
    outline: "1px solid #0e3466",
    letterSpacing: "0.05em",
  },
  or: {
    background: "#15110a",
    color: "#f4d06f",
    border: "1px solid #e8c45a",
    boxShadow: "0 0 0 1px #15110a, 0 0 0 2px #8a6a1e",
    letterSpacing: "0.06em",
  },
};

export function Plate({ plate, children, className = "" }: { plate?: string | null; children: React.ReactNode; className?: string }) {
  if (!plate || !STYLE[plate]) return <>{children}</>;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-[1px] leading-snug ${className}`} style={STYLE[plate]} title={PLATE_LABELS[plate]}>
      {/* deux rivets, comme sur une vraie plaque */}
      <span aria-hidden className="w-[3px] h-[3px] rounded-full opacity-70" style={{ background: "currentColor" }} />
      {children}
      <span aria-hidden className="w-[3px] h-[3px] rounded-full opacity-70" style={{ background: "currentColor" }} />
    </span>
  );
}
