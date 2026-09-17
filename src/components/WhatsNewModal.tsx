import { CHANGELOG, ChangeType } from "../changelog";
import { AnnounceMark } from "./TrainMark";

const TYPE_LABEL: Record<ChangeType, string> = {
  nouveau: "Nouveau",
  ameliore: "Amélioré",
  corrige: "Corrigé",
};

const TYPE_COLOR: Record<ChangeType, string> = {
  nouveau: "text-cobalt border-cobalt/40",
  ameliore: "text-amber border-amber/40",
  corrige: "text-rail-green border-rail-green/40",
};

export function WhatsNewModal({ onClose }: { onClose: () => void }) {
  const latest = CHANGELOG[0];
  if (!latest) return null;

  // regroupe les changements par type, pour n'afficher chaque étiquette qu'une seule fois
  const groups: { type: ChangeType; items: string[] }[] = [];
  for (const change of latest.changes) {
    const group = groups.find((g) => g.type === change.type);
    if (group) group.items.push(change.text);
    else groups.push({ type: change.type, items: [change.text] });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 px-6">
      <div className="w-full max-w-md bg-navy-900 border border-line border-t-[3px] border-t-cobalt tutorial-step-enter">
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-1">
            <AnnounceMark size={19} className="text-cobalt shrink-0" />
            <h2 className="font-display text-2xl flex-1">Nouveautés</h2>
            <span className="font-mono2 text-xs text-amber border border-amber/40 px-2 py-0.5 shrink-0">
              v{latest.version}
            </span>
          </div>
          <p className="text-xs text-slate2 font-mono2 mb-6 pl-[27px]">{latest.date}</p>

          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
            {groups.map((group) => (
              <div key={group.type}>
                <span className={`inline-block text-[10px] font-mono2 uppercase tracking-wide border px-1.5 py-0.5 mb-2 ${TYPE_COLOR[group.type]}`}>
                  {TYPE_LABEL[group.type]}
                </span>
                <ul className="space-y-1.5">
                  {group.items.map((text, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm font-body text-offwhite leading-snug">
                      <span className="text-slate2 shrink-0">—</span>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
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
