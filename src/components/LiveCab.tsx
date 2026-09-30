import { useEffect, useRef, useState } from "react";
import { CabTrain, useCabScene } from "./CabView";
import { PremiumCTA } from "./PremiumCTA";
import { api } from "../api/client";

/* ============================================================
   « En direct » (1.6, Premium).

   La vue cabine n'était qu'un bouton dans le tableau : on l'ouvrait une
   fois, par curiosité. Elle devient une fenêtre sur le réseau en tête de
   la flotte : une de vos rames en route, filmée de profil, qui change
   toutes les vingt secondes comme une chaîne d'info. On passe à la
   suivante d'une flèche, et « Agrandir » ouvre la grande vue cabine.

   Joueur gratuit : la même fenêtre, floutée, avec l'invitation au
   Premium. Il peut la masquer pour de bon.
   ============================================================ */

const ROTATE_MS = 20_000;
export const LIVE_TEASER_HINT = "direct-premium";

export function LiveCab({
  trains,
  isPremium,
  livery,
  skin,
  weatherType,
  hintsSeen,
  onOpen,
  onSeen,
}: {
  trains: CabTrain[];
  isPremium: boolean;
  livery: string;
  skin: string | null;
  weatherType?: string;
  hintsSeen: string;
  onOpen: (id: string) => void;
  onSeen: () => void;
}) {
  const running = trains.filter((t) => t.status === "EN_ROUTE" && t.line);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (paused || running.length < 2) return;
    const t = setInterval(() => setIndex((i) => i + 1), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, running.length]);

  if (running.length === 0 || hidden) return null;
  if (!isPremium && (hintsSeen || "").split(",").includes(LIVE_TEASER_HINT)) return null;

  const train = running[((index % running.length) + running.length) % running.length];

  async function hideTeaser() {
    setHidden(true);
    try {
      await api.patch("/company", { seenHint: LIVE_TEASER_HINT });
      onSeen();
    } catch {
      // réapparaîtra au prochain chargement : sans gravité
    }
  }

  return (
    <section
      className="relative border border-line bg-black mb-6 overflow-hidden"
      aria-label="En direct depuis vos rames"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <LiveCanvas key={train.id} train={train} livery={livery} skin={skin} weatherType={weatherType} blurred={!isPremium}>
        {(hud) => (
          <>
            {/* bandeau du haut, façon incrustation de chaîne d'info */}
            <div className="absolute top-0 inset-x-0 flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-navy-950/85 to-transparent">
              <span className="font-mono2 text-[10.5px] uppercase tracking-[0.16em] text-offwhite flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rail-red blink-dot" /> En direct
              </span>
              <span className="font-display text-[15px] text-offwhite truncate">{train.name}</span>
              <span className="font-mono2 text-[11.5px] text-slate2 truncate hidden sm:inline">
                {train.line?.departureStation} → {train.line?.arrivalStation}
              </span>
              {isPremium && running.length > 1 && (
                <span className="ml-auto font-mono2 text-[10.5px] text-slate2 shrink-0">
                  {(((index % running.length) + running.length) % running.length) + 1}/{running.length}
                </span>
              )}
            </div>

            {isPremium && (
              <>
                <div className="absolute bottom-0 inset-x-0 px-3 pb-2 pt-6 bg-gradient-to-t from-navy-950/90 to-transparent">
                  <div className="flex items-end gap-4 font-mono2">
                    <span className="text-offwhite text-lg tabular-nums leading-none">
                      {hud.kmh}
                      <span className="text-[10px] text-slate2 ml-1">km/h</span>
                    </span>
                    <span className="text-[11px] text-slate2">
                      {hud.phase} · arrivée {hud.left === "à quai" ? "à quai" : `dans ${hud.left}`}
                    </span>
                    <div className="ml-auto flex items-center gap-1.5">
                      {running.length > 1 && (
                        <>
                          <button onClick={() => setIndex((i) => i - 1)} className="w-7 h-7 border border-line bg-navy-950/70 text-offwhite hover:border-slate2" aria-label="Rame précédente">‹</button>
                          <button onClick={() => setIndex((i) => i + 1)} className="w-7 h-7 border border-line bg-navy-950/70 text-offwhite hover:border-slate2" aria-label="Rame suivante">›</button>
                        </>
                      )}
                      <button onClick={() => onOpen(train.id)} className="h-7 px-2.5 border border-cobalt/60 bg-navy-950/70 text-cobalt text-[10.5px] uppercase tracking-wide hover:bg-cobalt/10">
                        Agrandir
                      </button>
                    </div>
                  </div>
                  <div className="h-[3px] bg-line/70 mt-2">
                    <div className="h-full bg-cobalt" style={{ width: `${hud.pct}%` }} />
                  </div>
                </div>
              </>
            )}

            {!isPremium && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="bg-navy-900/95 border border-line border-t-[3px] border-t-amber max-w-md p-4 flex flex-col gap-3">
                  <div>
                    <div className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-amber mb-1">Premium</div>
                    <h3 className="font-display text-lg leading-tight">Vos rames en direct, depuis la cabine</h3>
                    <p className="text-[12.5px] text-slate2 font-body mt-1">
                      Chacune de vos rames filmée pendant son trajet, avec votre livrée et la météo du réseau, en tête de votre flotte.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <PremiumCTA company={{ isPremium }} compact />
                    <button onClick={hideTeaser} className="font-mono2 text-[10.5px] uppercase tracking-wide text-slate2 hover:text-offwhite">
                      Masquer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </LiveCanvas>
    </section>
  );
}

function LiveCanvas({
  train,
  livery,
  skin,
  weatherType,
  blurred,
  children,
}: {
  train: CabTrain;
  livery: string;
  skin: string | null;
  weatherType?: string;
  blurred: boolean;
  children: (hud: { kmh: number; left: string; phase: string; pct: number }) => React.ReactNode;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hud = useCabScene(ref, train, { weatherType, livery, skin });
  return (
    <div className="relative">
      <canvas
        ref={ref}
        className={`block w-full h-[190px] md:h-[210px] tutorial-step-enter ${blurred ? "blur-[3px] scale-[1.03] opacity-80" : ""}`}
        aria-label={`${train.name} en route, vue de profil`}
      />
      {children(hud)}
    </div>
  );
}
