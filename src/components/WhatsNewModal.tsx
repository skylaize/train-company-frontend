import { CHANGELOG } from "../changelog";

const TYPE_LABEL: Record<string, string> = {
  nouveau: "Nouveau",
  ameliore: "Amélioré",
  corrige: "Corrigé",
};

const TYPE_COLOR: Record<string, string> = {
  nouveau: "text-cobalt",
  ameliore: "text-amber",
  corrige: "text-rail-green",
};

export function WhatsNewModal({ onClose }: { onClose: () => void }) {
  const latest = CHANGELOG[0];
  if (!latest) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 px-6">
      <div className="w-full max-w-md bg-navy-900 border border-line border-t-[3px] border-t-cobalt tutorial-step-enter">
        <div className="p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-2xl">Nouveautés</h2>
            <span className="font-mono2 text-xs text-amber border border-amber/40 px-2 py-0.5 shrink-0">
              v{latest.version}
            </span>
          </div>
          <p className="text-xs text-slate2 font-mono2 mb-5">{latest.date}</p>

          <ul className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {latest.changes.map((c, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm font-body">
                <span className={`text-[10px] font-mono2 uppercase shrink-0 mt-0.5 border px-1.5 py-0.5 ${TYPE_COLOR[c.type]} border-current`}>
                  {TYPE_LABEL[c.type]}
                </span>
                <span className="text-offwhite leading-snug">{c.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-line">
          <button
            onClick={onClose}
            className="bg-cobalt text-offwhite text-xs font-semibold uppercase tracking-wide px-4 py-2 hover:bg-cobalt/90 active:scale-[0.97] transition-transform"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}
