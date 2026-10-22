import { useState } from "react";
import { InstagramMark } from "./InstagramMark";
import { INSTAGRAM, DISCORD } from "../social";
import { DiscordMark } from "./DiscordMark";
import { CHANGELOG, ChangeType } from "../changelog";

/* ============================================================
   Bulletin de service — les notes de version.

   Refonte : l'ancien bulletin déversait trente lignes numérotées à la suite,
   nouveautés et corrections de bugs mélangées, et ne montrait que la dernière
   version. Trois changements :

   - toutes les versions sont consultables, par la colonne de gauche ;
   - les lignes sont regroupées par nature (ajouts, améliorations, corrections),
     parce qu'on ne lit pas une nouveauté comme on lit un correctif ;
   - plus de numérotation ni d'étiquette par ligne : le groupe porte déjà
     l'information, la répéter à chaque ligne faisait du bruit.
   ============================================================ */

const GROUPS: { type: ChangeType; title: string; accent: string }[] = [
  { type: "nouveau", title: "Ajouts", accent: "text-cobalt" },
  { type: "ameliore", title: "Améliorations", accent: "text-amber" },
  { type: "corrige", title: "Corrections", accent: "text-rail-green" },
];

export function WhatsNewModal({ onClose }: { onClose: () => void }) {
  const [versionIndex, setVersionIndex] = useState(0);
  const entry = CHANGELOG[versionIndex];
  if (!entry) return null;

  const groups = GROUPS.map((g) => ({
    ...g,
    items: entry.changes.filter((c) => c.type === g.type),
  })).filter((g) => g.items.length > 0);

  return (
    <div data-modal className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 px-4 py-6">
      <div className="w-full max-w-3xl bg-navy-900 border border-line tutorial-step-enter flex flex-col max-h-[88vh] rounded-card">
        {/* bande perforée : le bulletin reste un imprimé détachable */}
        <div
          className="h-2 bg-cobalt shrink-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(11,15,25,0.85) 2.5px, transparent 2.5px)",
            backgroundSize: "14px 8px",
            backgroundPosition: "7px 0",
          }}
        />

        <div className="px-6 pt-4 pb-3 border-b border-line shrink-0">
          <span className="font-body text-[12px] text-slate2 font-medium">
            Réseau national — bulletin de service
          </span>
          <div className="flex items-baseline justify-between gap-4 mt-2">
            <h2 className="font-display text-xl">Nouveautés</h2>
            <span className="font-mono2 text-[11px] text-slate2 shrink-0">
              version {entry.version} — {entry.date}
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row min-h-0 flex-1">
          {/* colonne des versions : horizontale sur téléphone, verticale au-delà */}
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto md:w-36 shrink-0 border-b md:border-b-0 md:border-r border-line p-2">
            {CHANGELOG.map((v, i) => {
              const active = i === versionIndex;
              return (
                <button
                  key={v.version}
                  onClick={() => setVersionIndex(i)}
                  className={`text-left whitespace-nowrap px-3 py-2 font-body text-[12px] transition-colors font-medium rounded-control ${
                    active
                      ? "bg-cobalt/15 text-cobalt"
                      : "text-slate2 hover:text-offwhite hover:bg-offwhite/[0.05]"
                  }`}
                >
                  v{v.version}
                  {i === 0 && <span className="block text-[11px] opacity-70">actuelle</span>}
                </button>
              );
            })}
          </nav>

          <div className="overflow-y-auto px-6 py-4 flex-1">
            {groups.map((g) => (
              <section key={g.type} className="mb-6 last:mb-1">
                <h3
                  className={`font-body text-[12px] font-medium ${g.accent} pb-2 mb-3 border-b border-line`}
                >
                  {g.title}
                  <span className="text-slate2 ml-2">{g.items.length}</span>
                </h3>
                <ul className="space-y-2.5">
                  {g.items.map((c, i) => (
                    <li key={i} className="flex gap-2.5 text-[13.5px] text-offwhite font-body leading-snug">
                      <span className="text-slate2 shrink-0 select-none">—</span>
                      <span>{c.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-line shrink-0">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[12px] text-slate2 font-medium">
            <span>{CHANGELOG.length} bulletin{CHANGELOG.length > 1 ? "s" : ""} au registre</span>
            <a href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 normal-case tracking-normal hover:text-offwhite">
              <InstagramMark size={13} /> Les nouveautés en avant-première sur Instagram
            </a>
            <a href={DISCORD.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 normal-case tracking-normal text-offwhite hover:text-cobalt">
              <DiscordMark size={13} /> Rejoindre le Discord
            </a>
          </span>
          <button
            onClick={onClose}
            className="bg-cobalt text-onaccent text-xs font-semibold px-5 py-2.5 hover:bg-cobalt/90 active:scale-[0.97] transition-transform shrink-0 rounded-control"
          >
            Pris connaissance
          </button>
        </div>
      </div>
    </div>
  );
}
