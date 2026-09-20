import { useState } from "react";
import { api } from "../api/client";

/* Explication contextuelle, montrée la première fois qu'un joueur ouvre une page.

   Pourquoi pas dans le tutoriel d'accueil : un joueur qui vient de créer son
   compte n'a pas de rame. Les donneurs d'ordre lui sont inaccessibles, le
   classement ne le concerne pas encore. Lui expliquer tout ça à la minute zéro,
   c'est reconstituer le mur de texte qu'on vient de retirer. Ici, l'explication
   arrive quand elle devient utile.

   L'état est mémorisé sur le compte — pas dans le navigateur — pour ne pas
   réapparaître dès qu'on change d'appareil. */

export interface HintProps {
  id: string;
  title: string;
  body: string;
  points?: string[];
  seen: string;
  onSeen: () => void;
}

export function FirstVisitHint({ id, title, body, points, seen, onSeen }: HintProps) {
  const alreadySeen = (seen || "").split(",").includes(id);
  const [closed, setClosed] = useState(false);

  if (alreadySeen || closed) return null;

  async function dismiss() {
    setClosed(true);
    try {
      await api.patch("/company", { seenHint: id });
      onSeen();
    } catch {
      // l'explication réapparaîtra à la prochaine visite : sans gravité
    }
  }

  return (
    <div className="relative border border-cobalt/40 bg-cobalt/5 p-4 mb-6">
      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-cobalt" />

      <div className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mono2 uppercase tracking-[0.2em] text-cobalt mb-1.5">
            Nouveau dans cette version
          </div>
          <h3 className="font-display text-lg leading-tight mb-1.5">{title}</h3>
          <p className="text-sm font-body text-slate2 leading-relaxed max-w-[68ch]">{body}</p>

          {points && points.length > 0 && (
            <ul className="mt-2.5 flex flex-col gap-1">
              {points.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] font-body text-slate2">
                  <span className="mt-[7px] w-1 h-1 rounded-full bg-cobalt shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={dismiss}
          className="shrink-0 text-[11px] font-mono2 uppercase tracking-[0.14em] text-cobalt border border-cobalt/40 px-3 py-1.5 hover:bg-cobalt/10 transition-colors"
        >
          Compris
        </button>
      </div>
    </div>
  );
}
