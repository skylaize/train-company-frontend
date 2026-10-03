import { RELEASE_171 } from "./release";
/* ============================================================
   Vidéos récompensées — Google AdSense, Ad Placement API (1.7).

   Le script AdSense n'est chargé que si VITE_ADSENSE_CLIENT est renseigné
   (ca-pub-…), et jamais pour un abonné Premium tant qu'il ne demande pas
   lui-même une vidéo. Le reste du jeu ne contient aucune publicité.

   VITE_ADSENSE_TEST=true active le mode test de Google (fausses publicités,
   aucun revenu) : à utiliser tant que le compte n'est pas validé.
   ============================================================ */

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    adBreak?: (o: Record<string, unknown>) => void;
    adConfig?: (o: Record<string, unknown>) => void;
  }
}

const CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined)?.trim() || "";
const TEST = import.meta.env.VITE_ADSENSE_TEST === "true";

// 1.7.1 : aucune publicité avant la sortie de la 1.7.1 (src/release.ts)
export const adsEnabled = RELEASE_171 && /^ca-pub-\d+$/.test(CLIENT);

let loading: Promise<boolean> | null = null;

export function loadAds(): Promise<boolean> {
  if (!adsEnabled) return Promise.resolve(false);
  if (loading) return loading;
  loading = new Promise<boolean>((resolve) => {
    window.adsbygoogle = window.adsbygoogle || [];
    // l'amorce officielle : adBreak et adConfig poussent leurs ordres dans la file d'AdSense
    window.adBreak = window.adConfig = (o: Record<string, unknown>) => {
      (window.adsbygoogle as unknown[]).push(o);
    };
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
    s.setAttribute("data-ad-client", CLIENT);
    s.setAttribute("data-ad-frequency-hint", "30s");
    if (TEST) s.setAttribute("data-adbreak-test", "on");
    s.onload = () => resolve(true);
    // bloqueur de publicité, réseau coupé : le jeu continue sans vidéo
    s.onerror = () => {
      loading = null;
      resolve(false);
    };
    document.head.appendChild(s);
    window.adConfig({ preloadAdBreaks: "on", sound: "on" });
  });
  return loading;
}

export type RewardOutcome = "viewed" | "dismissed" | "unavailable" | "blocked";

/* Une vidéo récompensée, demandée par le joueur. Résout « viewed » seulement
   quand Google confirme qu'elle a été regardée jusqu'au bout. */
export async function showRewardedAd(onStart?: () => void): Promise<RewardOutcome> {
  const ok = await loadAds();
  if (!ok || !window.adBreak) return "blocked";
  return new Promise<RewardOutcome>((resolve) => {
    let outcome: RewardOutcome = "unavailable";
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };
    // filet : si Google ne répond pas du tout, on ne bloque pas le bouton
    const guard = window.setTimeout(done, 8000);
    window.adBreak!({
      type: "reward",
      name: "piece-bonus",
      beforeAd: () => window.clearTimeout(guard),
      // une vidéo est prête : le joueur l'a déjà demandée, on la lance
      beforeReward: (showAdFn: () => void) => {
        window.clearTimeout(guard);
        onStart?.();
        showAdFn();
      },
      adViewed: () => {
        outcome = "viewed";
      },
      adDismissed: () => {
        outcome = "dismissed";
      },
      adBreakDone: (info: { breakStatus?: string }) => {
        window.clearTimeout(guard);
        if (info?.breakStatus === "viewed") outcome = "viewed";
        else if (info?.breakStatus === "dismissed") outcome = "dismissed";
        done();
      },
    });
  });
}
