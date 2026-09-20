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

export async function sendTestPush() {
  await api.post("/push/test");
}
