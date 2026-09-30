import { useState } from "react";
import { useInstall } from "../install";
import { LogoMark } from "./Logo";

/* ============================================================
   Installer Réseau (1.6) : le bouton, et le guide pour Safari.
   ============================================================ */

function ShareGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="inline-block align-[-3px]">
      <path d="M12 3v12M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function InstallGuide({ onClose }: { onClose: () => void }) {
  const { ios } = useInstall();
  const steps = ios
    ? [
        <>Touchez <b className="text-offwhite">Partager</b> <ShareGlyph /> en bas de Safari (en haut sur iPad).</>,
        <>Faites défiler et choisissez <b className="text-offwhite">Sur l'écran d'accueil</b>, puis <b className="text-offwhite">Ajouter</b>.</>,
        <>Ouvrez Réseau depuis sa nouvelle icône : c'est aussi ce qui permet de recevoir les notifications sur iPhone.</>,
      ]
    : [
        <>Dans Chrome ou Edge, ouvrez le menu <b className="text-offwhite">⋮</b> en haut à droite.</>,
        <>Choisissez <b className="text-offwhite">Installer Réseau…</b> (ou « Ajouter à l'écran d'accueil » sur Android).</>,
        <>Réseau s'ouvre alors dans sa propre fenêtre, avec son icône. Firefox ne sait pas installer les sites : passez par Chrome ou Edge.</>,
      ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 px-4" role="dialog" aria-modal="true" aria-labelledby="install-title">
      <div className="w-full max-w-md bg-navy-900 border border-line border-t-[3px] border-t-amber tutorial-step-enter">
        <div className="px-6 py-5 border-b border-line flex items-center gap-3">
          <LogoMark size={40} />
          <div>
            <h2 id="install-title" className="font-display text-2xl leading-tight">Installer Réseau</h2>
            <p className="text-[12.5px] text-slate2 font-body">Gratuit, sans passer par un store.</p>
          </div>
        </div>
        <ol className="px-6 py-5 space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 font-body text-[13.5px] text-slate2 leading-snug">
              <span className="font-mono2 text-amber text-sm w-5 shrink-0">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <div className="px-6 py-4 border-t border-line flex justify-end">
          <button onClick={onClose} className="bg-cobalt text-onaccent text-xs font-semibold uppercase tracking-wide px-5 py-2.5 hover:bg-cobalt/90">
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}

/* Le bloc des paramètres. Rien à montrer si l'app est déjà ouverte en tant qu'app. */
export function InstallPanel() {
  const install = useInstall();
  const [guide, setGuide] = useState(false);
  if (install.installed) {
    return (
      <div className="border-t border-line pt-6">
        <h2 className="font-display text-xl mb-2">Application</h2>
        <p className="text-sm text-slate2 font-body">Réseau est installé sur cet appareil. Bonne route.</p>
      </div>
    );
  }
  return (
    <div className="border-t border-line pt-6">
      <h2 className="font-display text-xl mb-2">Installer l'application</h2>
      <p className="text-sm text-slate2 font-body mb-4">
        Réseau sur votre écran d'accueil : son icône, sa propre fenêtre, et les notifications, y compris sur iPhone. Gratuit, sans passer par un store.
      </p>
      <InstallButton onGuide={() => setGuide(true)} />
      {guide && <InstallGuide onClose={() => setGuide(false)} />}
    </div>
  );
}

export function InstallButton({ onGuide, compact = false }: { onGuide: () => void; compact?: boolean }) {
  const install = useInstall();
  if (install.installed) return null;
  async function go() {
    if (install.canPrompt) await install.prompt();
    else onGuide();
  }
  return (
    <button
      onClick={go}
      className={`${compact ? "px-3 py-1.5" : "px-4 py-2"} text-[11px] bg-amber text-onaccent font-mono2 uppercase tracking-wide hover:bg-amber/90`}
    >
      Installer Réseau
    </button>
  );
}
