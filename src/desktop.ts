/* ============================================================
   Réseau pour Windows (2.4).

   Dans l'application Windows (Tauri), la page peut demander deux choses à
   l'application : afficher le statut Discord, et ouvrir un lien dans le
   navigateur du joueur. Rien d'autre n'est permis (voir desktop/).
   Dans un navigateur, tout ce module ne fait rien.
   ============================================================ */

export const DESKTOP_DOWNLOAD_URL = "https://github.com/skylaize/train-company-frontend/releases/latest/download/Reseau-Setup.exe";

type TauriGlobal = { core?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> } };

function tauri(): TauriGlobal["core"] | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__?.core) ?? null;
}

/* Ouvert dans l'application Windows ? */
export function isDesktopApp() {
  return tauri() !== null;
}

/* Un PC sous Windows, dans un navigateur : on lui propose l'application. */
export function isWindowsBrowser() {
  if (typeof navigator === "undefined" || isDesktopApp()) return false;
  return /Windows NT/.test(navigator.userAgent) && !/Mobile|Xbox/.test(navigator.userAgent);
}

export function openExternal(url: string) {
  const t = tauri();
  if (!t) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  void t.invoke("open_external", { url }).catch(() => undefined);
}

/* Statut Discord : envoyé seulement quand il change. */
const startedAt = Math.floor(Date.now() / 1000);
let lastPresence = "";
export function setPresence(p: { details?: string; state?: string }) {
  const t = tauri();
  if (!t) return;
  const key = JSON.stringify(p);
  if (key === lastPresence) return;
  lastPresence = key;
  void t.invoke("set_presence", { presence: { ...p, startedAt } }).catch(() => undefined);
}

/* Dans l'application, les liens vers d'autres sites (et les nouveaux
   onglets) s'ouvrent dans le navigateur du joueur au lieu d'une fenêtre
   sans barre d'adresse. Appelé une fois au démarrage. */
export function installDesktopLinks() {
  const t = tauri();
  if (!t) return;
  const nativeOpen = window.open.bind(window);
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || e.defaultPrevented) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.protocol !== "https:" && url.protocol !== "http:") return;
      if (url.origin === window.location.origin && a.target !== "_blank") return;
      e.preventDefault();
      openExternal(url.href);
    },
    true
  );
  window.open = ((u?: string | URL, target?: string, features?: string) => {
    if (!u) return nativeOpen(u, target, features);
    try {
      openExternal(new URL(String(u), window.location.href).href);
    } catch {
      // adresse invalide : rien
    }
    return null;
  }) as typeof window.open;
}
