import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import { canShareFiles } from "./PosterArt";
import { drawPioneerMap, drawPioneerTicket, MAP_H, MAP_W, PioneerMapData, PioneerTicketData, TICKET_H, TICKET_W } from "./PioneerArt";

/* ============================================================
   2.1.2 : les 200 pionniers, dans l'interface.

   Un bandeau sur la flotte (qu'on peut fermer), et une fenêtre avec deux
   onglets : le billet du joueur et la grande carte. Chacun se télécharge en
   PNG ou part dans la feuille de partage du téléphone.
   ============================================================ */

const SEEN_KEY = "pioneers200Closed";

interface Mine {
  number: number | null;
  total: number;
  company: string;
  livery: string;
  foundedAt: string;
}

function safeGet(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function safeSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* navigation privée : le bandeau reviendra, sans gravité */
  }
}

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "reseau";
}

async function deliver(canvas: HTMLCanvasElement | null, fileName: string, share: boolean, text?: string) {
  if (!canvas) return;
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) return;
  if (share) {
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
      } catch {
        // partage annulé
      }
      return;
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function PioneersBanner({ onOpen }: { onOpen: () => void }) {
  const [closed, setClosed] = useState(() => safeGet(SEEN_KEY) === "1");
  if (closed) return null;
  return (
    <div className="border border-amber/50 bg-amber/5 p-4 mb-6 flex items-center gap-4 flex-wrap rounded-card">
      <span className="font-display text-[28px] leading-none text-amber" aria-hidden="true">200</span>
      <div className="flex-1 min-w-[200px]">
        <div className="font-display text-[17px]">200 compagnies sur le réseau. Merci !</div>
        <div className="font-body text-[13px] text-slate2">Votre billet de pionnier numéroté et la grande carte des 200 vous attendent.</div>
      </div>
      <button onClick={onOpen} className="px-4 py-2 bg-amber text-onaccent font-body text-[12px] font-medium rounded-control">
        Voir mon billet
      </button>
      <button
        onClick={() => {
          safeSet(SEEN_KEY, "1");
          setClosed(true);
        }}
        aria-label="Fermer le bandeau"
        className="text-slate2 hover:text-offwhite px-1 text-[18px]"
      >
        ×
      </button>
    </div>
  );
}

export function PioneersModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"billet" | "carte">("billet");
  const [mine, setMine] = useState<Mine | null>(null);
  const [map, setMap] = useState<PioneerMapData | null>(null);
  const [error, setError] = useState(false);
  const ticketRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const [shareable] = useState(canShareFiles);

  useEffect(() => {
    let alive = true;
    Promise.all([api.get("/pioneers/mine"), api.get("/pioneers/map")])
      .then(([a, b]) => {
        if (!alive) return;
        setMine(a.data);
        setMap({ ...b.data, me: a.data?.number ?? null });
        // le joueur l'a vu : le bandeau peut partir
        safeSet(SEEN_KEY, "1");
      })
      .catch(() => alive && setError(true));
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      alive = false;
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  // un pionnier voit son billet en premier ; sinon, la carte
  useEffect(() => {
    if (mine && !mine.number) setTab("carte");
  }, [mine]);

  useEffect(() => {
    const paint = () => {
      const t = ticketRef.current?.getContext("2d");
      if (t && mine?.number) drawPioneerTicket(t, mine as PioneerTicketData & { number: number });
      const m = mapRef.current?.getContext("2d");
      if (m && map) drawPioneerMap(m, map);
    };
    paint();
    document.fonts?.ready.then(paint).catch(() => {});
  }, [mine, map, tab]);

  const isTicket = tab === "billet" && !!mine?.number;
  const file = isTicket ? `billet-pionnier-${mine!.number}-${slug(mine!.company)}.png` : "les-200-pionniers-reseau.png";
  const shareText = isTicket ? `Pionnier n° ${mine!.number} sur ${mine!.total} sur Réseau 🚆` : "Les 200 pionniers de Réseau 🚆";

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-3" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Les 200 pionniers"
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-navy-950 border border-line rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
          <h2 className="font-display text-[19px] flex-1">Les 200 pionniers</h2>
          <button onClick={onClose} aria-label="Fermer" className="text-slate2 hover:text-offwhite text-[20px] px-2">
            ×
          </button>
        </div>

        {error ? (
          <p className="p-6 font-body text-[14px] text-slate2">Impossible de charger les pionniers pour l'instant. Réessayez dans un moment.</p>
        ) : !mine || !map ? (
          <div className="p-6 space-y-3">
            <div className="h-6 w-1/2 bg-navy-900 animate-skeleton" />
            <div className="aspect-[16/9] bg-navy-900 animate-skeleton" />
          </div>
        ) : (
          <div className="p-4">
            <div className="flex gap-1.5 mb-3" role="tablist">
              {mine.number && (
                <button
                  role="tab"
                  aria-selected={tab === "billet"}
                  onClick={() => setTab("billet")}
                  className={`px-3 py-1.5 border font-body text-[13px] rounded-control ${tab === "billet" ? "border-white text-white" : "border-line text-slate2"}`}
                >
                  Mon billet
                </button>
              )}
              <button
                role="tab"
                aria-selected={tab === "carte"}
                onClick={() => setTab("carte")}
                className={`px-3 py-1.5 border font-body text-[13px] rounded-control ${tab === "carte" ? "border-white text-white" : "border-line text-slate2"}`}
              >
                La grande carte
              </button>
            </div>

            <p className="font-body text-[13.5px] text-slate2 mb-3">
              {isTicket
                ? `Votre compagnie est la ${mine.number === 1 ? "1re" : `${mine.number}e`} fondée sur Réseau. Ce numéro ne changera plus.`
                : mine.number
                ? "Les réseaux des 200 premières compagnies, chacun à sa livrée. Le vôtre est en gras, et votre nom est surligné."
                : `Les réseaux des ${map.total} premières compagnies, chacun à sa livrée. Les places de pionniers étaient prises avant votre arrivée, mais la carte est à tout le monde.`}
            </p>

            <div className={isTicket ? "" : "max-w-md mx-auto"}>
              <canvas
                ref={ticketRef}
                width={TICKET_W}
                height={TICKET_H}
                className={`w-full h-auto ${isTicket ? "block" : "hidden"}`}
                role="img"
                aria-label={mine.number ? `Billet de pionnier n° ${mine.number} sur ${mine.total}, ${mine.company}` : undefined}
              />
              <canvas
                ref={mapRef}
                width={MAP_W}
                height={MAP_H}
                className={`w-full h-auto ${isTicket ? "hidden" : "block"}`}
                role="img"
                aria-label={`Carte des réseaux des ${map.companies.length} premières compagnies`}
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 mt-4">
              {shareable && (
                <button
                  onClick={() => void deliver(isTicket ? ticketRef.current : mapRef.current, file, true, shareText)}
                  className="px-4 py-2 border border-cobalt text-cobalt font-body text-[12px] font-medium rounded-control"
                >
                  Partager
                </button>
              )}
              <button
                onClick={() => void deliver(isTicket ? ticketRef.current : mapRef.current, file, false)}
                className="px-4 py-2 bg-cobalt text-onaccent font-body text-[12px] font-medium rounded-control"
              >
                Télécharger
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
