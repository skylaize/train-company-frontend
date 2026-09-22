import { api } from "./api/client";

/* ============================================================
   Abonnement aux notifications.

   Le navigateur ne laisse pas un site s'abonner tout seul : il faut un service
   worker enregistré, puis une autorisation donnée par le joueur, et seulement
   ensuite un abonnement chiffré. Les trois étapes sont ici.

   Une autorisation refusée est DÉFINITIVE tant que le joueur ne la rouvre pas
   lui-même dans les réglages du navigateur — on ne peut pas redemander. D'où la
   règle : ne jamais déclencher la demande au chargement de la page, seulement
   sur un clic explicite.
   ============================================================ */

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/* iPhone et iPad : les notifications n'existent que dans le jeu ouvert depuis
   l'écran d'accueil. Dans Safari, l'API est simplement absente — d'où le
   message dédié plutôt qu'un « navigateur non compatible » qui ne dit pas quoi
   faire. */
export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function pushPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

/* La clé publique VAPID voyage en base64url ; l'API du navigateur attend des
   octets bruts. */
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalised);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function enablePush(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!pushSupported()) {
    return { ok: false, reason: "Votre navigateur ne gère pas les notifications" };
  }

  const { data } = await api.get("/push/key");
  if (!data?.enabled || !data?.publicKey) {
    return { ok: false, reason: "Les notifications ne sont pas encore activées sur le serveur" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      reason:
        permission === "denied"
          ? "Notifications refusées. Pour les réactiver, passez par les réglages du site dans votre navigateur."
          : "Autorisation non accordée",
    };
  }

  const reg = await registration();
  // on attend que le service worker soit réellement actif : s'abonner trop tôt échoue
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      // obligatoire sur Chrome : toute notification poussée doit être visible
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    }));

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: "Abonnement incomplet renvoyé par le navigateur" };
  }

  await api.post("/push/subscribe", { endpoint: json.endpoint, keys: json.keys });
  return { ok: true };
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => undefined);
  await api.post("/push/unsubscribe", { endpoint }).catch(() => undefined);
}

/* Resynchronisation silencieuse, au chargement du jeu. Un appareil peut se
   croire abonné alors que le serveur l'a oublié (base remise à zéro, clés
   VAPID changées, abonnement expiré puis renouvelé par le navigateur) : les
   notifications cessent alors sans que personne ne sache pourquoi. On renvoie
   donc l'abonnement courant au serveur, qui l'enregistre sans doublon — et si
   les clés ont changé, on le recrée avec les nouvelles. */
export async function resyncPush() {
  try {
    if (!pushSupported() || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (!reg) return;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    const { data } = await api.get("/push/key");
    if (!data?.enabled || !data?.publicKey) return;

    // abonnement créé avec une ancienne clé : il ne recevra plus rien, on le refait
    const key = sub.options?.applicationServerKey;
    if (key) {
      const current = new Uint8Array(key);
      const expected = urlBase64ToUint8Array(data.publicKey);
      const same = current.length === expected.length && current.every((b, i) => b === expected[i]);
      if (!same) {
        await sub.unsubscribe().catch(() => undefined);
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: expected });
      }
    }

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
      await api.post("/push/subscribe", { endpoint: json.endpoint, keys: json.keys });
    }
  } catch {
    // silencieux : c'est un filet de sécurité, pas une action du joueur
  }
}

export async function pushServerEnabled(): Promise<boolean> {
  try {
    const { data } = await api.get("/push/key");
    return Boolean(data?.enabled && data?.publicKey);
  } catch {
    return false;
  }
}

export async function sendTestPush(): Promise<{ ok: true; delivered: number } | { ok: false; reason: string }> {
  try {
    const { data } = await api.post("/push/test");
    return { ok: true, delivered: Number(data?.delivered ?? 1) };
  } catch (e: any) {
    return { ok: false, reason: e?.response?.data?.error ?? "Envoi impossible" };
  }
}
