/* Où est gardé le jeton de session (1.6).
   « Rester connecté » coché : dans le navigateur, pour 30 jours.
   Décoché : pour la session seulement, il disparaît à la fermeture du navigateur. */

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function getToken(): string | null {
  return safe(() => localStorage.getItem("token"), null) ?? safe(() => sessionStorage.getItem("token"), null);
}

export function setToken(token: string, remember: boolean) {
  clearToken();
  safe(() => (remember ? localStorage : sessionStorage).setItem("token", token), undefined);
}

export function clearToken() {
  safe(() => localStorage.removeItem("token"), undefined);
  safe(() => sessionStorage.removeItem("token"), undefined);
}
