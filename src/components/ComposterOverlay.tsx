import { useEffect } from "react";

export function ComposterOverlay({ label, onDone }: { label: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1650);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-24 right-5 z-[80] pointer-events-none flex flex-col items-center">
      <svg viewBox="0 0 100 90" width="88" height="80">
        {/* socle de la machine */}
        <rect x="15" y="55" width="70" height="24" rx="3" fill="#221c15" stroke="#4a3f2e" strokeWidth="2" />
        {/* fente d'insertion du ticket */}
        <rect x="24" y="49" width="52" height="8" rx="2" fill="#18140f" stroke="#4a3f2e" strokeWidth="1.5" />
        {/* bras articulé qui s'abat */}
        <g className="composter-arm" style={{ transformOrigin: "78px 56px" }}>
          <rect x="72" y="18" width="8" height="40" rx="2" fill="#4f7fa3" />
          <circle cx="76" cy="18" r="6" fill="#4f7fa3" />
        </g>
        {/* tampon qui apparaît à l'impact */}
        <g className="composter-stamp" style={{ transformOrigin: "50px 53px" }}>
          <circle cx="50" cy="53" r="15" fill="none" stroke="#c99a3e" strokeWidth="2" strokeDasharray="3 2" />
          <text x="50" y="56" textAnchor="middle" fontSize="7" fontFamily="'Space Mono', monospace" fill="#c99a3e" fontWeight="700">
            OK
          </text>
        </g>
      </svg>
      <div className="bg-navy-900 border border-line px-3 py-2 -mt-2 text-[11px] font-body text-offwhite composter-label max-w-[190px] text-center leading-snug">
        {label}
      </div>
    </div>
  );
}
