import { useEffect, useState } from "react";
import { TrainMark } from "./TrainMark";

type DashboardView = "trains" | "lignes" | "fret" | "missions" | "classement" | "historique" | "succes" | "carte" | "personnel" | "parametres" | "carriere" | "cours";

/* État de jeu que le tutoriel observe pour savoir si l'étape est accomplie. */
export interface TutorialState {
  lineCount: number;
  trainCount: number;
  assignedCount: number; // rames affectées à une ligne
}

interface Step {
  view: DashboardView | null;
  target: string | null; // sélecteur data-tutorial de l'élément à mettre en surbrillance
  modalOpen: boolean; // faut-il forcer l'ouverture du catalogue de trains pour cette étape
  title: string;
  body: string;
  /* Étape d'action : tant que la condition n'est pas remplie, il n'y a pas de
     bouton « Suivant ». C'est ce qui change tout — avant, on pouvait cliquer
     neuf fois et arriver sur un tableau de bord vide sans rien avoir fait. */
  awaits?: (s: TutorialState) => boolean;
  waitingLabel?: string;
}

const STEPS: Step[] = [
  {
    view: null,
    target: null,
    modalOpen: false,
    title: "Bienvenue à bord",
    body: "Vous dirigez une compagnie ferroviaire. Trois gestes suffisent pour qu'elle commence à gagner de l'argent — on les fait ensemble maintenant.",
  },
  {
    view: "lignes",
    target: "btn-new-line",
    modalOpen: false,
    title: "Tracez votre première ligne",
    body: "Une ligne relie deux gares. Choisissez-les : la distance et la durée du trajet se calculent toutes seules. Une ligne longue paie mieux à la minute, et une grande gare attire plus de voyageurs — mais si une autre compagnie roule déjà sur la liaison, il faudra les lui disputer.",
    awaits: (s) => s.lineCount >= 1,
    waitingLabel: "En attente de votre première ligne",
  },
  {
    view: "trains",
    target: "btn-commander",
    modalOpen: true,
    title: "Achetez une rame",
    body: "Le modèle Standard coûte 200 pi. et suffit largement pour démarrer. Votre dépôt a deux places au départ ; vous pourrez l'agrandir plus tard, chaque place coûtant plus cher que la précédente.",
    awaits: (s) => s.trainCount >= 1,
    waitingLabel: "En attente de votre première rame",
  },
  {
    view: "trains",
    target: "trains-table",
    modalOpen: false,
    title: "Mettez-la en service",
    body: "Une rame à quai ne rapporte rien. Affectez-la à votre ligne : elle fera l'aller-retour en continu, même quand vous aurez fermé le jeu.",
    awaits: (s) => s.assignedCount >= 1,
    waitingLabel: "En attente d'une rame affectée",
  },
  {
    view: "fret",
    target: "freight-market",
    modalOpen: false,
    title: "Le fret, quand vous aurez une rame libre",
    body: "Une rame qui n'est pas sur une ligne peut livrer des marchandises. C'est plus rentable qu'une ligne, mais chaque offre expire au bout de quelques minutes — et une cargaison fragile peut être abîmée en route.",
  },
  {
    view: "cours",
    target: "cours-table",
    modalOpen: false,
    title: "Le cours des marchandises",
    body: "Chaque marchandise vaut plus ou moins cher selon le moment. Livrer ce que le marché recherche paie jusqu'à un quart de plus — et avec un entrepôt, vous pouvez acheter bas, garder, revendre haut. Garder coûte des frais de garde : attendre a un prix.",
  },
  {
    view: "cours",
    target: "chantiers",
    modalOpen: false,
    title: "Les chantiers",
    body: "Entrepôt et places de dépôt passent par un chantier : on paie à la commande, la livraison vient quelques dizaines de minutes plus tard, et on n'en mène qu'un à la fois. L'argent ne suffit donc pas — il faut choisir par quoi commencer.",
  },
  {
    view: null,
    target: null,
    modalOpen: false,
    title: "Votre compagnie tourne",
    body: "Le reste se découvre en jouant : les donneurs d'ordre vous confient des contrats datés, le classement vous compare aux autres réseaux, et les Paramètres permettent de basculer l'interface entre Nuit et Papier. Le bouton Aide rouvre ce guide quand vous voulez.",
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
  state,
}: {
  onClose: () => void;
  setView: (view: DashboardView) => void;
  onOpenCatalog: () => void;
  onCloseCatalog: () => void;
  state: TutorialState;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const rect = useTargetRect(step.target);

  const satisfied = step.awaits ? step.awaits(state) : true;

  /* Si la condition était DÉJÀ remplie en arrivant sur l'étape — typiquement
     quand le joueur rouvre le guide depuis Aide —, on ne la fait pas attendre :
     on lui rend un bouton « Suivant » normal au lieu de sauter l'étape sous
     ses yeux. L'avancement automatique ne sert qu'au franchissement réel. */
  const [wasDoneOnEntry, setWasDoneOnEntry] = useState(satisfied);
  useEffect(() => {
    setWasDoneOnEntry(step.awaits ? step.awaits(state) : true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  const waiting = !!step.awaits && !satisfied && !wasDoneOnEntry;

  // l'action vient d'être accomplie : on enchaîne, après un instant pour la voir
  useEffect(() => {
    if (!step.awaits || wasDoneOnEntry || !satisfied) return;
    const t = setTimeout(() => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1)), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satisfied, stepIndex]);

  useEffect(() => {
    if (step.view) setView(step.view);
    /* Le catalogue ne s'ouvre d'office que si la rame n'est pas encore achetée :
       le rouvrir alors que c'est fait masquerait la flotte pour rien. */
    if (step.modalOpen && !satisfied) {
      onOpenCatalog();
    } else {
      onCloseCatalog();
    }
    return () => {
      if (step.modalOpen) onCloseCatalog();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, satisfied]);

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

  /* Étape d'action : aucun voile, aucune découpe, et la carte se range en bas à
     droite. Pendant qu'on attend un geste du joueur, l'interface doit rester
     entièrement visible et cliquable — un repli centré la bloquerait, et une
     carte accrochée à la cible recouvrirait le formulaire qui vient de s'ouvrir. */
  if (waiting) {
    return (
      <div className="fixed inset-0 z-[60] pointer-events-none">
        {rect && (
          <div
            className="absolute border-2 border-cobalt spotlight-glow transition-all duration-300 ease-out"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: "0 0 16px 3px rgba(56,189,248,0.45)",
            }}
          />
        )}
        <div className="absolute bottom-4 right-4 left-4 sm:left-auto sm:w-80 pointer-events-auto">
          <TutorialCard
            key={stepIndex}
            step={step}
            stepIndex={stepIndex}
            total={STEPS.length}
            onNext={next}
            onSkip={skip}
            isLast={isLast}
            waiting
            justDone={false}
          />
        </div>
      </div>
    );
  }

  // Pas de cible sur cette étape : modale centrée classique
  if (!step.target || !rect) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/80 px-6">
        <TutorialCard key={stepIndex} step={step} stepIndex={stepIndex} total={STEPS.length} onNext={next} onSkip={skip} isLast={isLast} waiting={waiting} justDone={!!step.awaits && satisfied && !wasDoneOnEntry} />
      </div>
    );
  }

  const spaceBelow = window.innerHeight - rect.bottom;
  const placeBelow = spaceBelow > 220;
  const padding = 6;

  // si la cible est déjà dans une fenêtre modale ouverte (ex. le catalogue), celle-ci a
  // déjà son propre voile sombre — en ajouter un second empêcherait le bouton ciblé
  // de vraiment ressortir, puisque le premier voile resterait entre lui et l'utilisateur
  const dimOverlay = step.modalOpen ? "none" : "0 0 0 9999px rgba(8,13,23,0.82)";

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {/* voile sombre avec découpe lumineuse autour de la cible (sauf si déjà dans une modale) */}
      <div
        className="absolute border-2 border-cobalt transition-all duration-300 ease-out pointer-events-none"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          boxShadow: dimOverlay,
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
          left: Math.min(Math.max(rect.left, 16), window.innerWidth - 336),
        }}
      >
        <TutorialCard key={stepIndex} step={step} stepIndex={stepIndex} total={STEPS.length} onNext={next} onSkip={skip} isLast={isLast} waiting={waiting} justDone={!!step.awaits && satisfied && !wasDoneOnEntry} compact />
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
  waiting,
  justDone,
  compact,
}: {
  step: Step;
  stepIndex: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
  isLast: boolean;
  waiting: boolean;
  justDone: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`bg-navy-900 border border-line border-t-[3px] border-t-cobalt tutorial-step-enter ${compact ? "w-80" : "w-full max-w-md"}`}>
      <div className="p-6">
        <h2 className="font-display text-2xl mb-2">{step.title}</h2>
        <p className="text-sm text-slate2 font-body leading-relaxed">{step.body}</p>
      </div>

      <div className="px-6 pt-1 pb-3">
        <StepTrack stepIndex={stepIndex} total={total} />
      </div>

      {/* En attente, le libellé prend toute la largeur : dans une carte de 320 px
          il ne tient pas à côté du compteur d'étape et du bouton Passer. */}
      {waiting ? (
        <div className="border-t border-line">
          <div className="flex items-center gap-2 px-6 pt-3.5 text-[11px] font-mono2 uppercase tracking-wide text-cobalt">
            <span className="w-1.5 h-1.5 rounded-full bg-cobalt blink-dot shrink-0" />
            {step.waitingLabel ?? "À vous de jouer"}
          </div>
          <div className="flex items-center justify-between px-6 pb-3.5 pt-2">
            <span className="text-[11px] font-mono2 text-slate2 uppercase tracking-wide">
              Étape {stepIndex + 1}/{total}
            </span>
            <button onClick={onSkip} className="text-xs text-slate2 hover:text-offwhite font-body uppercase tracking-wide transition-colors">
              Passer
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-6 py-4 border-t border-line">
          <span className="text-[11px] font-mono2 text-slate2 uppercase tracking-wide">
            Étape {stepIndex + 1}/{total}
          </span>
          <div className="flex items-center gap-4">
            <button onClick={onSkip} className="text-xs text-slate2 hover:text-offwhite font-body uppercase tracking-wide transition-colors">
              Passer
            </button>
            {justDone ? (
              <span className="text-xs font-semibold uppercase tracking-wide text-rail-green">C'est fait</span>
            ) : (
              <button
                onClick={onNext}
                className="bg-cobalt text-onaccent text-xs font-semibold uppercase tracking-wide px-4 py-2 hover:bg-cobalt/90 active:scale-[0.97] transition-transform"
              >
                {isLast ? "C'est parti" : "Suivant"}
              </button>
            )}
          </div>
        </div>
      )}
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
