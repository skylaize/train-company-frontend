import { useEffect, useState } from "react";

/* ============================================================
   Application installable (1.6).

   Chrome, Edge et Android proposent l'installation par un événement
   (beforeinstallprompt) qu'il faut attraper dès le chargement, avant même
   que React ne soit monté : ce module est importé tout en haut de main.tsx.
   Safari (iPhone, iPad) n'a pas cet événement : on y explique le geste
   « Partager › Sur l'écran d'accueil ».
   ============================================================ */

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: PromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // on garde l'invitation pour notre propre bouton
    deferred = e as PromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

/* Ouvert depuis l'icône de l'écran d'accueil ? */
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS se présente comme un Mac : on le reconnaît à l'écran tactile
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  }, []);
  return {
    installed: isStandalone(),
    canPrompt: deferred !== null,
    ios: isIOS(),
    async prompt() {
      if (!deferred) return false;
      const e = deferred;
      await e.prompt();
      const choice = await e.userChoice;
      deferred = null;
      notify();
      return choice.outcome === "accepted";
    },
  };
}
