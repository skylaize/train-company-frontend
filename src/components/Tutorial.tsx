import { useEffect, useState } from "react";
import { TrainMark } from "./TrainMark";
import { LogoMark } from "./Logo";

type DashboardView = "trains" | "lignes" | "fret" | "missions" | "classement" | "historique" | "succes" | "carte" | "personnel" | "parametres" | "carriere" | "cours";

/* État de jeu que le tutoriel observe pour savoir si l'étape est accomplie. */
export interface TutorialState {
  lineCount: number;
  trainCount: number;
  assignedCount: number; // rames affectées à une ligne
  mapSeen: boolean; // 2.0.3 : la carte ouverte avec une rame en route
  priceSet: boolean; // 2.0.3 : un prix réglé (ou déjà au prix conseillé)
}

interface Step {
  id: string;
  /* 2.0.3 : le nom court de la gare sur la petite ligne du guide, et la prime
     versée quand le geste est fait (vérifiée et versée une fois par le serveur) */
  gare?: string;
  reward?: number;
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
  note?: string; // 2.4.2 : un encadré « à retenir » sous le texte
}

/* 1.6 : cinq étapes au lieu de huit. Le fret, le cours des marchandises et les
   chantiers s'expliquaient ici d'une traite, avant même la première rame : ils
   ont maintenant leur « Bon à savoir » à la première visite de leur rubrique, et
   la liste « Premiers pas » prend le relais à la fin du guide. */
const STEPS: Step[] = [
  {
    id: "accueil",
    view: null,
    target: null,
    modalOpen: false,
    title: "Bienvenue à bord",
    body: "Cinq gestes pour que votre compagnie gagne de l'argent toute seule, même jeu fermé. Chaque gare franchie de ce stage vous verse une prime. Comptez trois minutes.",
  },
  {
    id: "ligne",
    gare: "Ligne",
    reward: 100,
    view: "lignes",
    target: "first-line-ideas",
    modalOpen: false,
    title: "Tracez votre première ligne",
    body: "Une ligne relie deux gares, et vos rames y font l'aller-retour. Prenez une des idées proposées, ou choisissez vos gares avec « + Ligne » : la durée du trajet se calcule toute seule.",
    awaits: (s) => s.lineCount >= 1,
    waitingLabel: "En attente de votre première ligne",
  },
  {
    id: "rame",
    gare: "Rame",
    view: "trains",
    target: "btn-commander",
    modalOpen: true,
    title: "Achetez une rame",
    body: "La Standard coûte 200 pi. et suffit largement pour démarrer. Votre dépôt a deux places ; vous pourrez l'agrandir plus tard.",
    awaits: (s) => s.trainCount >= 1,
    waitingLabel: "En attente de votre première rame",
  },
  {
    id: "service",
    gare: "Service",
    reward: 100,
    view: "trains",
    target: "btn-assign",
    modalOpen: false,
    title: "Mettez-la en service",
    body: "Une rame à quai ne rapporte rien. Affectez-la à votre ligne : elle fera l'aller-retour en continu, même quand vous aurez fermé le jeu.",
    awaits: (s) => s.assignedCount >= 1,
    waitingLabel: "En attente d'une rame affectée",
  },
  {
    id: "carte",
    gare: "Carte",
    reward: 50,
    view: null,
    target: "nav-carte",
    modalOpen: false,
    title: "Regardez-la partir",
    body: "Sur la carte, chaque rame avance en direct jusqu'à sa prochaine gare. Elle encaisse les billets à chaque arrivée.",
    awaits: (s) => s.mapSeen,
    waitingLabel: "Ouvrez la carte",
  },
  {
    id: "prix",
    gare: "Prix",
    reward: 100,
    view: "lignes",
    target: "line-price",
    modalOpen: false,
    title: "Réglez le prix du billet",
    body: "Plus cher, chaque voyageur rapporte plus mais il en vient moins. Le jeu calcule le prix qui remplit juste vos rames : appliquez-le d'un clic, ou réglez le vôtre.",
    awaits: (s) => s.priceSet,
    waitingLabel: "Réglez le prix de votre ligne",
  },
  {
    id: "brevet",
    view: "trains",
    target: null,
    modalOpen: false,
    title: "Votre compagnie roule",
    body: "Elle gagne de l'argent à chaque trajet, même jeu fermé. Revenez ce soir : votre rame aura fait plusieurs allers-retours. La suite est dans « Premiers pas », et le bouton Aide rouvre ce guide.",
    // 2.4.2 : depuis la fin de l'essai gratuit, l'énergie se paie dès la première heure
    note: "Une seule règle à retenir : l'énergie (gazole ou courant) se règle à la fin de chaque heure. Gardez un peu de trésorerie, sinon vos rames thermiques attendent au dépôt l'heure suivante.",
  },
];

/* les gares du stage, dans l'ordre, et le total des primes */
const GARES = STEPS.filter((s) => s.gare);
const TOTAL_REWARD = STEPS.reduce((n, s) => n + (s.reward ?? 0), 0);


function useTargetRect(selector: string | null) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    function update() {
      // la même cible peut exister deux fois (menu d'ordinateur, onglets de téléphone) : on prend celle qui se voit
      const el = Array.from(document.querySelectorAll(`[data-tutorial="${selector}"]`)).find((n) => {
        const r = n.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
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
  onReward,
}: {
  onClose: () => void;
  setView: (view: DashboardView) => void;
  onOpenCatalog: () => void;
  onCloseCatalog: () => void;
  state: TutorialState;
  /** 2.0.3 : une étape à prime vient d'être faite */
  onReward?: (step: string) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const rect = useTargetRect(step.target);
  /* 2.0.3 : la cible hors de l'écran (la liste des rames, sous l'annonce du
     jour) est amenée sous les yeux du joueur au début de l'étape */
  useEffect(() => {
    if (!step.target) return;
    const t = window.setTimeout(() => {
      const el = Array.from(document.querySelectorAll(`[data-tutorial="${step.target}"]`)).find((n) => {
        const r = n.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight - 120) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 450);
    return () => window.clearTimeout(t);
  }, [stepIndex, step.target]);

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
  // la prime part dès que le geste est fait (le serveur ne la verse qu'une fois)
  useEffect(() => {
    if (step.reward && satisfied) onReward?.(step.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, satisfied]);

  // l'action vient d'être accomplie : on enchaîne, après un instant pour la voir
  useEffect(() => {
    if (!step.awaits || wasDoneOnEntry || !satisfied) return;
    const t = setTimeout(() => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1)), 1400);
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
            className="absolute border-2 border-cobalt spotlight-glow transition-all duration-300 ease-out rounded-card"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: "0 0 16px 3px rgba(56,189,248,0.45)",
            }}
          />
        )}
        {/* 2.4.2 : sur téléphone, la cible peut être dans la barre d'onglets du bas
            (la Carte) : la carte du guide passe alors en haut pour ne pas la cacher */}
        <div className={`absolute right-4 left-4 sm:left-auto sm:w-[340px] pointer-events-auto ${rect && rect.top > window.innerHeight * 0.55 ? "top-4 sm:top-auto sm:bottom-4" : "bottom-4"}`}>
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
      <div data-modal className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/80 px-6">
        <TutorialCard key={stepIndex} step={step} stepIndex={stepIndex} total={STEPS.length} onNext={next} onSkip={skip} isLast={isLast} waiting={waiting} justDone={!!step.awaits && satisfied && !wasDoneOnEntry} />
      </div>
    );
  }

  const spaceBelow = window.innerHeight - rect.bottom;
  const CARD_H = 300; // hauteur prudente de la carte compacte
  const placeBelow = spaceBelow > CARD_H;
  const placeAbove = !placeBelow && rect.top > CARD_H;
  // 1.6 : cible trop haute pour loger la carte dessus ou dessous (la liste
  // « Premiers pas ») : la carte se range en bas à droite, toujours visible
  const docked = !placeBelow && !placeAbove;
  const padding = 6;

  // si la cible est déjà dans une fenêtre modale ouverte (ex. le catalogue), celle-ci a
  // déjà son propre voile sombre — en ajouter un second empêcherait le bouton ciblé
  // de vraiment ressortir, puisque le premier voile resterait entre lui et l'utilisateur
  const dimOverlay = step.modalOpen ? "none" : "0 0 0 9999px rgba(8,13,23,0.82)";

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {/* voile sombre avec découpe lumineuse autour de la cible (sauf si déjà dans une modale) */}
      <div
        className="absolute border-2 border-cobalt transition-all duration-300 ease-out pointer-events-none rounded-card"
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
        style={
          docked
            ? { bottom: 16, right: 16 }
            : {
                top: placeBelow ? rect.bottom + padding + 10 : undefined,
                bottom: placeAbove ? window.innerHeight - rect.top + padding + 10 : undefined,
                left: Math.min(Math.max(rect.left, 16), window.innerWidth - 356),
              }
        }
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
  void total;
  const gareNo = GARES.findIndex((g) => g.id === step.id) + 1;
  const first = stepIndex === 0;
  /* 2.4.2 : « Passer le guide » d'un clic faisait perdre de vue les primes
     restantes. On demande une fois, en rappelant ce qui reste à gagner. */
  const [confirmSkip, setConfirmSkip] = useState(false);
  const left = STEPS.slice(stepIndex).reduce((n, st) => n + (st.reward ?? 0), 0) - (justDone ? step.reward ?? 0 : 0);
  return (
    <div className={`bg-navy-900 border border-line border-t-[3px] border-t-cobalt tutorial-step-enter rounded-control ${compact ? "w-[340px] max-w-[calc(100vw-32px)]" : "w-full max-w-md"}`}>
      {/* 2.0.3 : la petite ligne du stage, une gare par geste */}
      <div className="px-5 pt-4 pb-1">
        <GareTrack stepIndex={stepIndex} doneNow={justDone} />
      </div>
      <div className={compact ? "px-5 pt-3 pb-4" : "px-6 pt-4 pb-5"}>
        {first && <LogoMark size={40} className="mb-3" />}
        <h2 className={`font-display mb-2 ${compact ? "text-xl" : "text-2xl"}`}>{justDone ? "Bien joué" : step.title}</h2>
        <p className="text-sm text-slate2 font-body leading-relaxed">
          {justDone ? (step.reward ? `Prime de stage versée : +${step.reward} pi. En route pour la gare suivante.` : "C'est fait. En route pour la gare suivante.") : step.body}
        </p>
        {step.note && !justDone && (
          <p className="mt-3 border-l-2 border-amber pl-3 text-[13px] text-offwhite/90 font-body leading-relaxed">{step.note}</p>
        )}
        {first && (
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
            <span className="text-[13px] text-slate2 font-body">Primes à gagner pendant le stage</span>
            <span className="font-mono2 text-rail-green text-[17px] tabular-nums">+{TOTAL_REWARD} pi.</span>
          </div>
        )}
        {isLast && (
          <>
            <div className="mt-4 grid grid-cols-5 gap-1.5" aria-label="Gares du stage, toutes compostées">
              {GARES.map((g, i) => (
                <span
                  key={g.id}
                  className="tutorial-stamp aspect-square grid place-items-center border-[1.5px] border-rail-green text-rail-green font-mono2 text-[10px]"
                  style={{ animationDelay: `${i * 110}ms` }}
                >
                  {g.gare}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-[13px] text-slate2 font-body">Primes de stage</span>
              <span className="font-mono2 text-rail-green text-[17px] tabular-nums">+{TOTAL_REWARD} pi.</span>
            </div>
          </>
        )}
      </div>

      {waiting && (
        <div className={`flex items-center gap-2 border-t border-line ${compact ? "px-5" : "px-6"} pt-3 text-[12.5px] font-body text-cobalt`}>
          <span className="w-1.5 h-1.5 bg-cobalt blink-dot shrink-0" />
          {step.waitingLabel ?? "À vous de jouer"}
        </div>
      )}
      {confirmSkip && (
        <div className={`border-t border-line ${compact ? "px-5" : "px-6"} py-3 font-body text-[13px]`}>
          <p className="text-slate2 leading-snug">
            Il reste <span className="text-rail-green font-mono2">+{left} pi.</span> de primes à gagner. Vous pourrez reprendre le guide plus tard avec le bouton <span className="text-offwhite">Aide</span>, primes comprises.
          </p>
          <div className="flex gap-4 justify-end mt-2.5">
            <button onClick={() => setConfirmSkip(false)} className="text-[12.5px] text-cobalt font-medium">
              Continuer le guide
            </button>
            <button onClick={onSkip} className="text-[12.5px] text-slate2 hover:text-offwhite">
              Passer quand même
            </button>
          </div>
        </div>
      )}
      <div className={`flex items-center gap-3 ${waiting || confirmSkip ? "" : "border-t border-line"} ${compact ? "px-5" : "px-6"} py-3 ${confirmSkip ? "hidden" : ""}`}>
        {step.reward ? (
          <span className={`font-mono2 text-[12px] px-1.5 py-0.5 border whitespace-nowrap tabular-nums rounded-control ${justDone ? "text-rail-green border-rail-green/50" : "text-amber border-amber/50"}`}>
            {justDone ? "✓ " : ""}+{step.reward} pi.
          </span>
        ) : gareNo > 0 ? (
          <span className="font-mono2 text-[11.5px] text-slate2 whitespace-nowrap">gare {gareNo} sur {GARES.length}</span>
        ) : null}
        <span className="ml-auto flex items-center gap-4 shrink-0">
          {!isLast && !confirmSkip && (
            <button onClick={() => (left > 0 ? setConfirmSkip(true) : onSkip())} className="text-[12.5px] text-slate2 hover:text-offwhite font-body transition-colors">
              Passer le guide
            </button>
          )}
          {!waiting && !justDone && (
            <button
              onClick={onNext}
              className="bg-cobalt text-onaccent text-[13px] font-semibold font-body px-4 py-2 hover:bg-cobalt/90 active:scale-[0.97] transition-transform rounded-control"
            >
              {first ? "C'est parti" : isLast ? "Prendre les commandes" : "Suivant"}
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

/* Les gares du stage sur une ligne : franchies en vert, celle en cours cerclée,
   la rame posée dessus. */
function GareTrack({ stepIndex, doneNow }: { stepIndex: number; doneNow: boolean }) {
  const n = GARES.length;
  const at = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 0);
  const idxOf = (g: Step) => STEPS.indexOf(g);
  const done = (g: Step) => idxOf(g) < stepIndex || (idxOf(g) === stepIndex && doneNow);
  const reached = GARES.filter(done).length;
  const current = GARES.findIndex((g) => idxOf(g) >= stepIndex);
  const trainAt = current < 0 ? 100 : at(Math.max(0, doneNow ? current : current));
  return (
    <div className="relative h-9 mx-3">
      <div className="absolute left-0 right-0 top-[7px] h-[3px] bg-line" />
      <div className="absolute left-0 top-[7px] h-[3px] bg-rail-green transition-all duration-500 ease-out" style={{ width: `${reached > 0 ? at(reached - 1) : 0}%` }} />
      {GARES.map((g, i) => {
        const d = done(g);
        const here = i === current && !d;
        return (
          <span key={g.id} className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: `${at(i)}%` }}>
            <span
              className={`block rounded-full border-2 transition-colors duration-300 ${here ? "w-[17px] h-[17px] -mt-[2px] border-cobalt bg-navy-900" : d ? "w-[13px] h-[13px] border-rail-green bg-rail-green" : "w-[13px] h-[13px] border-slate2/60 bg-navy-900"}`}
            />
            <span className={`mt-1 font-mono2 text-[10px] whitespace-nowrap ${here ? "text-offwhite" : "text-slate2"}`}>{g.gare}</span>
          </span>
        );
      })}
      {stepIndex > 0 && current >= 0 && (
        <TrainMark size={13} className="absolute -top-[12px] text-cobalt transition-all duration-500 ease-out" style={{ left: `${trainAt}%`, transform: "translateX(-50%)" }} />
      )}
    </div>
  );
}
