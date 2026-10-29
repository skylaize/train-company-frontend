import { useState } from "react";
import { api } from "../api/client";

/* ============================================================
   Premiers pas (1.6).

   Les retours des premiers joueurs : « l'interface au début fait brute, et
   ce n'est pas très expliqué ». Le guide d'accueil montre les trois gestes,
   puis on se retrouvait devant onze rubriques sans savoir quoi faire ensuite.
   Cette liste reste en tête de la flotte jusqu'à ce que la compagnie tourne
   vraiment : chaque étape dit pourquoi elle compte, et mène au bon endroit.

   Les étapes s'appuient sur les succès déjà acquis quand il y en a : une
   étape franchie le reste, même si la rame a été vendue depuis.
   ============================================================ */

export const FIRST_STEPS_HINT = "premiers-pas";

type Go = "lignes" | "catalogue" | "trains" | "fret" | "energie";

interface StepDef {
  id: string;
  title: string;
  why: string;
  action: string;
  go: Go;
}

const STEPS: StepDef[] = [
  { id: "ligne", title: "Tracer une première ligne", why: "Deux gares, et la durée du trajet se calcule toute seule. Une grande ville attire plus de voyageurs.", action: "Tracer", go: "lignes" },
  { id: "rame", title: "Acheter une rame", why: "La Standard, à 200 pi., suffit largement pour démarrer.", action: "Catalogue", go: "catalogue" },
  { id: "service", title: "La mettre en service", why: "Affectée à une ligne, elle fait l'aller-retour et rapporte, même jeu fermé.", action: "Affecter", go: "trains" },
  { id: "fret", title: "Livrer un contrat de fret", why: "Achetez un Locotracteur (300 pi.), acceptez une offre du marché, attelez le wagon demandé : la locomotive part seule et revient payée. Les offres expirent vite.", action: "Voir le fret", go: "fret" },
  { id: "correspondance", title: "Ouvrir une correspondance", why: "Une deuxième ligne qui part d'une gare de la première : chaque trajet qui y passe rapporte plus.", action: "Tracer", go: "lignes" },
];

export interface FirstStepsInput {
  lineCount: number;
  // 2.4.2 : pour personnaliser les conseils (facultatif : l'ancien appel marche encore)
  balance?: number;
  stations?: string[]; // les gares de la première ligne
  idleCount?: number; // rames au dépôt, sans ligne ni tournée
  trainCount: number;
  assignedCount: number;
  unlocked: Set<string>; // ids des succès acquis
  hintsSeen: string;
}

export function firstStepsDone(i: FirstStepsInput): Record<string, boolean> {
  const u = (id: string) => i.unlocked.has(id);
  const service = i.assignedCount >= 1 || u("sur-les-rails");
  return {
    ligne: i.lineCount >= 1 || u("premier-trace"),
    rame: i.trainCount >= 1 || service,
    service,
    fret: u("entrepreneur-fret"),
    correspondance: u("premiere-correspondance"),
  };
}

/* La liste est-elle encore d'actualité ? Masquée une fois lue ou fermée. */
export function firstStepsActive(i: FirstStepsInput) {
  return !(i.hintsSeen || "").split(",").includes(FIRST_STEPS_HINT);
}

export function firstStepsProgress(i: FirstStepsInput) {
  const d = firstStepsDone(i);
  return { done: STEPS.filter((s) => d[s.id]).length, total: STEPS.length };
}

/* 2.4.2 : un conseil sous la liste, choisi selon l'étape en cours. Ce sont les
   pièges où tombent les nouveaux venus d'après les messages reçus : l'énergie
   facturée chaque heure (une facture impayée arrête les rames thermiques), les
   pannes qui font baisser la réputation (et bloquent les grades), et les
   arrêts intermédiaires que personne ne remarque. */
const TIPS: { id: string; text: string; go?: Go; action?: string }[] = [
  { id: "energie", text: "Vos rames consomment du gazole (ou du courant sur ligne électrifiée), réglé à la fin de chaque heure. Gardez toujours un peu de trésorerie : une facture impayée laisse les rames thermiques au dépôt jusqu'à l'heure suivante.", go: "energie", action: "Mon énergie" },
  { id: "arrets", text: "Un arrêt intermédiaire sur une ligne amène 20 % de voyageurs en plus, pour une minute à quai. Modifiez votre ligne pour en ajouter.", go: "lignes", action: "Mes lignes" },
  { id: "revision", text: "Une rame trop usée tombe en panne, et chaque incident fait baisser votre réputation, que les grades demandent. Dans la fiche de la rame, réglez une révision automatique (par exemple à 60 %).", go: "trains", action: "Ma flotte" },
];

function hintFor(id: string, i: FirstStepsInput): string | null {
  if (id === "service" && (i.idleCount ?? 0) > 0) return `${i.idleCount} rame${(i.idleCount ?? 0) > 1 ? "s attendent" : " attend"} au dépôt : affectez-la à une ligne depuis la flotte.`;
  if (id === "fret" && i.balance !== undefined && i.balance < 300) return `Il vous manque ${300 - Math.floor(i.balance)} pi. pour le Locotracteur : votre ligne les gagnera vite.`;
  if (id === "correspondance" && i.stations?.length) {
    const list = i.stations.slice(0, 3);
    return `Partez par exemple de ${list.length > 1 ? `${list.slice(0, -1).join(", ")} ou ${list[list.length - 1]}` : list[0]}.`;
  }
  return null;
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 6.2 5 8.6 9.5 3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FirstSteps({
  input,
  onGo,
  onSeen,
}: {
  input: FirstStepsInput;
  onGo: (go: Go) => void;
  onSeen: () => void;
}) {
  const [closed, setClosed] = useState(false);
  if (closed || !firstStepsActive(input)) return null;

  const done = firstStepsDone(input);
  const count = STEPS.filter((s) => done[s.id]).length;
  const current = STEPS.findIndex((s) => !done[s.id]);
  const finished = current === -1;
  /* 2.4.2 : les trois premières étapes se font pendant le guide. Une fois
     faites, elles tiennent sur une ligne : la liste montre ce qui reste. */
  const GUIDE = ["ligne", "rame", "service"];
  const guideDone = GUIDE.every((id) => done[id]);
  const shown = STEPS.filter((st) => !(guideDone && GUIDE.includes(st.id)));
  // l'énergie d'abord (le piège des premières heures), puis la révision avec le fret, puis les arrêts
  const tip = TIPS[current <= 2 ? 0 : current === 3 ? 2 : 1];

  async function close() {
    setClosed(true);
    try {
      await api.patch("/company", { seenHint: FIRST_STEPS_HINT });
      onSeen();
    } catch {
      // elle reviendra à la prochaine visite : sans gravité
    }
  }

  return (
    <section className="border border-line bg-navy-900/60 mb-8 rounded-card" aria-labelledby="first-steps-title" data-tutorial="first-steps">
      <div className="flex items-start gap-4 px-5 pt-4 pb-3 border-b border-line">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-body text-amber mb-1 font-medium">Premiers pas</div>
          <h2 id="first-steps-title" className="font-display text-xl leading-tight">
            {finished ? "Votre compagnie est lancée" : "Lancez votre compagnie"}
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono2 text-sm text-offwhite">
            {count}<span className="text-slate2"> / {STEPS.length}</span>
          </div>
          {!finished && (
            <button onClick={close} className="text-[12px] font-body text-slate2 hover:text-offwhite mt-1 font-medium">
              Masquer
            </button>
          )}
        </div>
      </div>

      {/* la voie : une traverse par étape, le tronçon parcouru en ambre */}
      <div className="px-5 pt-3">
        <div className="relative h-3">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-line" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-amber transition-all duration-700 ease-out" style={{ width: `${(count / STEPS.length) * 100}%` }} />
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`absolute top-1/2 w-2 h-2 -translate-y-1/2 -translate-x-1/2 rounded-full ${done[s.id] ? "bg-amber" : i === current ? "bg-offwhite" : "bg-line"}`}
              style={{ left: `${((i + 1) / STEPS.length) * 100}%` }}
            />
          ))}
        </div>
      </div>

      {finished ? (
        <div className="px-5 py-5 flex items-center gap-4 flex-wrap">
          <p className="text-sm font-body text-slate2 leading-relaxed flex-1 min-w-[16rem]">
            Ligne, rame, fret, correspondance : tout y est, et le succès <span className="text-offwhite">« Premiers pas »</span> est à vous.
            La suite se joue dans <span className="text-offwhite">Progression</span> : chaque grade débloque de nouvelles rames, et la licence internationale attend les meilleurs.
          </p>
          <button onClick={close} className="bg-amber text-onaccent text-xs font-semibold px-5 py-2.5 hover:bg-amber/90 rounded-control">
            Fermer
          </button>
        </div>
      ) : (
        <>
        <ol className="p-2">
          {guideDone && (
            <li className="flex items-center gap-3.5 px-3 py-2">
              <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full border border-rail-green/50 text-rail-green bg-rail-green/10">
                <Check />
              </span>
              <span className="font-body text-[13.5px] text-slate2">Ligne tracée, rame achetée et mise en service : votre compagnie gagne déjà de l'argent.</span>
            </li>
          )}
          {shown.map((s) => {
            const i = STEPS.indexOf(s);
            const isDone = done[s.id];
            const isCurrent = i === current;
            const hint = isCurrent ? hintFor(s.id, input) : null;
            return (
              <li
                key={s.id}
                className={`relative flex items-center gap-3.5 px-3 py-2.5 rounded-control ${isCurrent ? "bg-cobalt/[0.08]" : ""}`}
              >
                <span
                  className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-[12px] font-medium border ${
                    isDone ? "border-rail-green/50 text-rail-green bg-rail-green/10" : isCurrent ? "border-cobalt text-cobalt" : "border-line text-slate2"
                  }`}
                >
                  {isDone ? <Check /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`font-body text-[14px] leading-snug ${isDone ? "text-slate2 line-through decoration-slate2/40" : "text-offwhite"}`}>{s.title}</div>
                  {!isDone && <div className={`font-body text-[12.5px] leading-snug mt-0.5 ${isCurrent ? "text-slate2" : "text-slate2/70"}`}>{s.why}</div>}
                  {hint && <div className="font-body text-[12.5px] leading-snug mt-1 text-amber">{hint}</div>}
                </div>
                {!isDone && (
                  <button
                    onClick={() => onGo(s.go)}
                    className={`shrink-0 text-[12px] font-body px-3 py-1.5 transition-colors font-medium rounded-control ${
                      isCurrent ? "bg-cobalt text-onaccent hover:bg-cobalt/90" : "border border-line text-slate2 hover:text-offwhite hover:border-slate2"
                    }`}
                  >
                    {s.action}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
        {/* 2.4.2 : bon à savoir */}
        <div className="mx-4 mb-4 border-t border-line pt-3 flex items-start gap-3">
          <span className="shrink-0 mt-0.5 text-[11px] font-body font-semibold text-cobalt uppercase tracking-[0.08em]">Bon à savoir</span>
          <p className="flex-1 font-body text-[12.5px] text-slate2 leading-snug">{tip.text}</p>
          {tip.go && (
            <button onClick={() => onGo(tip.go!)} className="shrink-0 text-[12px] font-body text-cobalt hover:underline">
              {tip.action}
            </button>
          )}
        </div>
        </>
      )}
    </section>
  );
}
