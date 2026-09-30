import { useEffect, useState } from "react";

/* ============================================================
   Nouvelle version en ligne (1.6).

   Le jeu est une seule page : un onglet ouvert reste sur la version
   chargée, parfois des jours. On relit /version.json toutes les cinq
   minutes et au retour sur l'onglet ; s'il a changé, un bandeau
   propose de recharger. Rien d'automatique : on ne recharge pas sous
   les doigts de quelqu'un qui est en train de tracer une ligne.
   ============================================================ */

export function UpdateBanner() {
  const [outdated, setOutdated] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    let stop = false;
    async function check() {
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const { build } = await r.json();
        if (!stop && build && build !== __BUILD_ID__) setOutdated(true);
      } catch {
        // hors ligne ou fichier absent : on retentera
      }
    }
    check();
    const t = setInterval(check, 5 * 60_000);
    const onVis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (!outdated) return null;
  return (
    <div role="status" className="fixed top-3 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 bg-navy-900 border border-amber/60 border-t-[3px] border-t-amber px-4 py-2.5 shadow-2xl max-w-[calc(100%-24px)]">
      <span className="font-body text-[13px] text-offwhite">Une nouvelle version de Réseau est en ligne.</span>
      <button onClick={() => window.location.reload()} className="shrink-0 bg-amber text-onaccent font-mono2 text-[11px] uppercase tracking-wide px-3 py-1.5 hover:bg-amber/90">
        Recharger
      </button>
    </div>
  );
}
