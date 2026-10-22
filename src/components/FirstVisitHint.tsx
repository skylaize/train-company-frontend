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
  /* « Nouveau dans cette version » annonce un changement aux joueurs installés ;
     « Bon à savoir » explique une rubrique à celui qui la découvre (1.6). */
  tag?: string;
  /* un lien mis en avant à côté de « Compris » (ex. rejoindre le Discord) */
  action?: { label: string; href?: string; onClick?: () => void };
}

export function FirstVisitHint({ id, title, body, points, seen, onSeen, tag = "Nouveau dans cette version", action }: HintProps) {
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
    <div className="relative border border-cobalt/40 bg-cobalt/5 p-4 mb-6 rounded-card">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-body text-cobalt mb-1.5 font-medium">
            {tag}
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

        <div className="shrink-0 flex items-center gap-2">
          {action?.onClick && (
            <button
              onClick={action.onClick}
              className="text-[12px] font-body bg-cobalt text-onaccent px-3 py-1.5 hover:bg-cobalt/90 transition-colors font-medium rounded-control"
            >
              {action.label}
            </button>
          )}
          {action?.href && (
            <a
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-body bg-cobalt text-onaccent px-3 py-1.5 hover:bg-cobalt/90 transition-colors font-medium rounded-control"
            >
              {action.label}
            </a>
          )}
          <button
            onClick={dismiss}
            className="text-[12px] font-body text-cobalt border border-cobalt/40 px-3 py-1.5 hover:bg-cobalt/10 transition-colors font-medium rounded-control"
          >
            {action ? "Fermer" : "Compris"}
          </button>
        </div>
      </div>
    </div>
  );
}
