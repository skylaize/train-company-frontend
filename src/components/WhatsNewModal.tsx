import { CHANGELOG, ChangeType } from "../changelog";

const TYPE_LABEL: Record<ChangeType, string> = {
  nouveau: "Nouveau",
  ameliore: "Amélioré",
  corrige: "Corrigé",
};

const TYPE_COLOR: Record<ChangeType, string> = {
  nouveau: "text-cobalt",
  ameliore: "text-amber",
  corrige: "text-rail-green",
};

export function WhatsNewModal({ onClose }: { onClose: () => void }) {
  const latest = CHANGELOG[0];
  if (!latest) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 px-6">
      <div className="w-full max-w-lg bg-navy-900 border border-line tutorial-step-enter">
        {/* ticket perforé, comme un bulletin détachable */}
        <div
          className="h-2 bg-cobalt"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(11,15,25,0.85) 2.5px, transparent 2.5px)",
            backgroundSize: "14px 8px",
            backgroundPosition: "7px 0",
          }}
        />

        {/* en-tête façon bulletin de service SNCF */}
        <div className="px-6 pt-4 pb-3 border-b border-line">
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-mono2 text-[11px] text-slate2 uppercase tracking-[0.14em]">
              Réseau national — bulletin de service
            </span>
            <span className="font-mono2 text-[11px] text-amber shrink-0">N° {latest.version}</span>
          </div>
          <h2 className="font-display text-xl mb-1">Nouveautés</h2>
          <p className="font-mono2 text-[11px] text-slate2">Diffusion générale — {latest.date}</p>
        </div>

        {/* articles numérotés, séparés par des pointillés comme un vrai formulaire */}
        <div className="px-6 max-h-[50vh] overflow-y-auto">
          {latest.changes.map((change, i) => (
            <div key={i} className="flex items-start gap-3 py-3 border-b border-dashed border-line last:border-0">
              <span className="font-display text-base font-bold text-cobalt shrink-0 w-5">{i + 1}</span>
              <p className="text-sm text-offwhite leading-snug">
                {change.text}
                <span className={`font-mono2 text-[10px] uppercase tracking-wide ml-2 ${TYPE_COLOR[change.type]}`}>
                  {TYPE_LABEL[change.type]}
                </span>
              </p>
            </div>
          ))}
        </div>

        {/* pied avec tampon officiel circulaire */}
        <div className="flex items-center justify-between px-6 py-5 gap-4">
          <svg viewBox="0 0 80 80" className="w-16 h-16 shrink-0">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#c99a3e" strokeWidth="1.5" opacity="0.85" />
            <circle cx="40" cy="40" r="27" fill="none" stroke="#c99a3e" strokeWidth="1" strokeDasharray="2 3" opacity="0.85" />
            <path id="wn-arc-top" d="M 15 40 A 25 25 0 0 1 65 40" fill="none" />
            <text fontFamily="'Space Mono', monospace" fontSize="7.5" fill="#c99a3e" letterSpacing="1.5">
              <textPath href="#wn-arc-top" startOffset="50%" textAnchor="middle">RESEAU NATIONAL</textPath>
            </text>
            <path id="wn-arc-bottom" d="M 15 42 A 25 25 0 0 0 65 42" fill="none" />
            <text fontFamily="'Space Mono', monospace" fontSize="7.5" fill="#c99a3e" letterSpacing="1.5">
              <textPath href="#wn-arc-bottom" startOffset="50%" textAnchor="middle">SERVICE ACTIF</textPath>
            </text>
            <g transform="translate(28, 27)" stroke="#c99a3e" fill="none">
              <rect x="5" y="3" width="14" height="13" rx="2" strokeWidth="1.6" />
              <line x1="5" y1="9" x2="19" y2="9" strokeWidth="1.6" />
              <line x1="9" y1="3" x2="9" y2="16" strokeWidth="1.6" />
              <circle cx="8.5" cy="19" r="1.4" fill="#c99a3e" />
              <circle cx="15.5" cy="19" r="1.4" fill="#c99a3e" />
              <line x1="7" y1="16" x2="5" y2="19" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="17" y1="16" x2="19" y2="19" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          </svg>

          <button
            onClick={onClose}
            className="bg-cobalt text-offwhite text-xs font-semibold uppercase tracking-wide px-5 py-2.5 hover:bg-cobalt/90 active:scale-[0.97] transition-transform shrink-0"
          >
            Pris connaissance
          </button>
        </div>
      </div>
    </div>
  );
}
