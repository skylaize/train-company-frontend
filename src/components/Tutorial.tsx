import { useEffect, useState } from "react";
import { TrainMark } from "./TrainMark";

type DashboardView = "trains" | "lignes" | "fret" | "classement" | "historique" | "succes" | "carte" | "personnel" | "parametres";

interface Step {
  view: DashboardView | null;
  target: string | null; // sélecteur data-tutorial de l'élément à mettre en surbrillance
  modalOpen: boolean; // faut-il forcer l'ouverture du catalogue de trains pour cette étape
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    view: null,
    target: null,
    modalOpen: false,
    title: "Bienvenue à bord",
    body: "Vous dirigez désormais votre propre compagnie ferroviaire. On fait le tour des pages ensemble — ça prend une minute.",
  },
  {
    view: "lignes",
    target: "btn-new-line",
    modalOpen: false,
    title: "Créez une ligne",
    body: "Commencez ici : renseignez une gare de départ, une gare d'arrivée et une durée de trajet.",
  },
  {
    view: "trains",
    target: "btn-commander",
    modalOpen: true,
    title: "Achetez un train",
    body: "Le modèle Standard est disponible tout de suite. Les autres arriveront plus tard, une fois en développement.",
  },
  {
    view: "trains",
    target: "trains-table",
    modalOpen: false,
    title: "Affectez vos rames",
    body: "Une fois qu'une ligne et un train existent, affectez-les l'un à l'autre juste ici. Le train circule ensuite tout seul, même hors ligne.",
  },
  {
    view: "fret",
    target: "freight-market",
    modalOpen: false,
    title: "Le fret rapporte gros",
    body: "Un train libre (pas affecté à une ligne) peut livrer des marchandises depuis cette page. Attention, chaque offre expire au bout de quelques minutes.",
  },
  {
    view: "classement",
    target: "nav-classement",
    modalOpen: false,
    title: "Grimpez au classement",
    body: "Votre trésorerie détermine votre rang face aux autres exploitants du réseau.",
  },
  {
    view: null,
    target: null,
    modalOpen: false,
    title: "Bon voyage !",
    body: "Vous savez l'essentiel. Le bouton Aide en bas de la console vous permet de rouvrir ce guide à tout moment.",
  },
];

function useTargetRect(selector: string | null) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    function update() {
      const el = document.querySelector(`[data-tutorial="${selector}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    }
    update();

    // sondage de secours, au cas où rien ne déclenche l'observateur (ex. resize interne)
    const interval = setInterval(update, 150);

    // détecte immédiatement l'apparition/disparition de la cible (ex. ouverture du catalogue),
    // au lieu d'attendre jusqu'à 150ms et de laisser transparaître un flash de la modale de repli
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    window.addEventListener("resize", update);
    return () => {
      clearInterval(interval);
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [selector]);

  return rect;
}

export function Tutorial({
  onClose,
  setView,
  onOpenCatalog,
  onCloseCatalog,
}: {
  onClose: () => void;
  setView: (view: DashboardView) => void;
  onOpenCatalog: () => void;
  onCloseCatalog: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const rect = useTargetRect(step.target);

  useEffect(() => {
    if (step.view) setView(step.view);
    if (step.modalOpen) {
      onOpenCatalog();
    } else {
      onCloseCatalog();
    }
    return () => {
      if (step.modalOpen) onCloseCatalog();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  function next() {
    if (isLast) {
      onCloseCatalog();
      onClose();
    } else {
      setStepIndex((s) => s + 1);
    }
  }

  function skip() {
    onCloseCatalog();
    onClose();
  }

  // Pas de cible sur cette étape : modale centrée classique
  if (!step.target || !rect) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/80 px-6">
        <TutorialCard key={stepIndex} step={step} stepIndex={stepIndex} total={STEPS.length} onNext={next} onSkip={skip} isLast={isLast} />
      </div>
    );
  }

  const spaceBelow = window.innerHeight - rect.bottom;
  const placeBelow = spaceBelow > 220;
  const padding = 6;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {/* voile sombre avec découpe lumineuse autour de la cible */}
      <div
        className="absolute border-2 border-cobalt transition-all duration-300 ease-out pointer-events-none"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          boxShadow: "0 0 0 9999px rgba(8,13,23,0.82)",
        }}
      />
      <div
        className="absolute pointer-events-none spotlight-glow"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          boxShadow: "0 0 16px 3px rgba(79,127,163,0.6)",
        }}
      />

      <div
        className="absolute pointer-events-auto transition-all duration-300 ease-out"
        style={{
          top: placeBelow ? rect.bottom + padding + 10 : undefined,
          bottom: !placeBelow ? window.innerHeight - rect.top + padding + 10 : undefined,
          left: Math.min(Math.max(rect.left, 16), window.innerWidth - 304),
        }}
      >
        <TutorialCard key={stepIndex} step={step} stepIndex={stepIndex} total={STEPS.length} onNext={next} onSkip={skip} isLast={isLast} compact />
      </div>
    </div>
  );
}

function TutorialCard({
  step,
  stepIndex,
  total,
  onNext,
  onSkip,
  isLast,
  compact,
}: {
  step: Step;
  stepIndex: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
  isLast: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`bg-navy-900 border border-line border-t-[3px] border-t-cobalt tutorial-step-enter ${compact ? "w-72" : "w-full max-w-md"}`}>
      <div className="p-6">
        <h2 className="font-display text-2xl mb-2">{step.title}</h2>
        <p className="text-sm text-slate2 font-body leading-relaxed">{step.body}</p>
      </div>

      <div className="px-6 pt-1 pb-3">
        <StepTrack stepIndex={stepIndex} total={total} />
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t border-line">
        <span className="text-[11px] font-mono2 text-slate2 uppercase tracking-wide">
          Étape {stepIndex + 1}/{total}
        </span>
        <div className="flex items-center gap-4">
          <button onClick={onSkip} className="text-xs text-slate2 hover:text-offwhite font-body uppercase tracking-wide transition-colors">
            Passer
          </button>
          <button
            onClick={onNext}
            className="bg-cobalt text-offwhite text-xs font-semibold uppercase tracking-wide px-4 py-2 hover:bg-cobalt/90 active:scale-[0.97] transition-transform"
          >
            {isLast ? "C'est parti" : "Suivant"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepTrack({ stepIndex, total }: { stepIndex: number; total: number }) {
  const percent = total > 1 ? (stepIndex / (total - 1)) * 100 : 0;

  return (
    <div className="relative h-4">
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-line" />
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-cobalt transition-all duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
      {Array.from({ length: total }).map((_, i) => {
        const p = total > 1 ? (i / (total - 1)) * 100 : 0;
        return (
          <span
            key={i}
            className={`absolute top-1/2 w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 transition-colors duration-300 ${
              i <= stepIndex ? "bg-cobalt" : "bg-line"
            }`}
            style={{ left: `${p}%` }}
          />
        );
      })}
      <TrainMark
        size={14}
        className="absolute top-1/2 text-cobalt transition-all duration-500 ease-out"
        style={{ left: `${percent}%`, transform: "translate(-50%, -50%)" }}
      />
    </div>
  );
}
