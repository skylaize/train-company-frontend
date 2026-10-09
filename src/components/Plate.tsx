/* 1.7 — Plaques d'honneur : le nom d'une compagnie encadré au classement,
   comme les plaques des locomotives. Trois matières, vues par tous. */

export const PLATE_LABELS: Record<string, string> = {
  laiton: "Laiton gravé",
  email: "Émail bleu",
  or: "Or fin",
  cuivre: "Cuivre martelé",
  argent: "Argent poli",
  legende: "Plaque de légende",
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
  cuivre: {
    background: "radial-gradient(circle at 30% 30%, #e3a06a 0%, #b4632f 45%, #7a3d18 100%)",
    color: "#fff3e4",
    border: "1px solid #5a2c10",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 1px 0 rgba(0,0,0,.4)",
    letterSpacing: "0.05em",
  },
  argent: {
    background: "linear-gradient(180deg, #f3f5f8 0%, #c3cad3 50%, #9aa4b0 100%)",
    color: "#1b2330",
    border: "1px solid #6b7480",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.7), 0 1px 0 rgba(0,0,0,.4)",
    letterSpacing: "0.05em",
  },
  legende: {
    background: "linear-gradient(180deg, #1c1408 0%, #2d1f0a 100%)",
    color: "#f6d47a",
    border: "1px solid #f6d47a",
    boxShadow: "0 0 0 2px #1c1408, 0 0 0 3px #b8892a, 0 0 10px rgba(246,212,122,.35)",
    letterSpacing: "0.08em",
    fontWeight: 600,
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
