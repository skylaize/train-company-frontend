/* 2.1.x : le code de parrainage d'un lien partagé (?ref=CODE, QR de l'affiche).

   Le lien arrive sur la page d'accueil, puis le joueur passe par l'inscription
   avant de fonder sa compagnie : la query string se perdait en route et le
   code n'arrivait jamais au formulaire. On le garde de côté dès l'arrivée. */

const KEY = "pendingReferral";

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function captureReferral() {
  const code = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
  if (code && /^[A-Z0-9-]{3,32}$/.test(code)) safe(() => localStorage.setItem(KEY, code), undefined);
}

export function pendingReferral(): string {
  const fromUrl = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
  return fromUrl || safe(() => localStorage.getItem(KEY), null) || "";
}

export function clearReferral() {
  safe(() => localStorage.removeItem(KEY), undefined);
}

export function referralLink(code: string) {
  return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
}
