import { useEffect, useState } from "react";
import { useToast } from "../context/ToastContext";
import {
  pushSupported,
  pushPermission,
  currentSubscription,
  enablePush,
  disablePush,
  sendTestPush,
} from "../push";

/* Réglage des notifications. Placé dans les Paramètres et non dans le bloc
   Premium : la fin d'un chantier concerne tout le monde. Seules les alertes de
   cours restent réservées aux abonnés, parce que ce sont elles qui demandent
   de la surveillance. */
export function NotificationsPanel() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const supported = pushSupported();
  const permission = pushPermission();

  async function refresh() {
    if (!supported) {
      setSubscribed(false);
      return;
    }
    const sub = await currentSubscription();
    setSubscribed(Boolean(sub));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function activate() {
    setBusy(true);
    try {
      const result = await enablePush();
      if (result.ok) {
        showToast("Notifications activées sur cet appareil");
        await refresh();
      } else {
        showToast(result.reason, "error");
      }
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Activation impossible", "error");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    setBusy(true);
    try {
      await disablePush();
      showToast("Notifications désactivées sur cet appareil");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-line p-4 mb-6">
      <h3 className="font-display text-lg mb-1">Notifications</h3>
      <p className="text-[12.5px] text-slate2 font-body max-w-[62ch] mb-3">
        Être prévenu quand un chantier se termine, quand un ordre permanent s'exécute, ou quand un
        cours franchit un seuil que vous surveillez. Les notifications arrivent même jeu fermé.
        L'autorisation vaut pour cet appareil seulement.
      </p>

      {!supported ? (
        <p className="text-[12.5px] text-slate2 font-body">
          Votre navigateur ne gère pas les notifications. Sur iPhone, il faut d'abord ajouter le jeu
          à l'écran d'accueil depuis Safari.
        </p>
      ) : permission === "denied" ? (
        <p className="text-[12.5px] text-rail-red font-body max-w-[62ch]">
          Les notifications sont bloquées pour ce site. Un navigateur ne permet pas de redemander :
          il faut les réautoriser à la main, via l'icône à gauche de l'adresse du site.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {subscribed ? (
            <>
              <span className="font-mono2 text-[11px] text-rail-green uppercase tracking-wide border border-line px-2 py-1">
                Activées sur cet appareil
              </span>
              <button
                onClick={() => sendTestPush().then(() => showToast("Notification d'essai envoyée"))}
                disabled={busy}
                className="px-3 py-1.5 border border-line font-mono2 text-[11px] uppercase tracking-wide hover:border-amber disabled:opacity-40"
              >
                Envoyer un essai
              </button>
              <button
                onClick={deactivate}
                disabled={busy}
                className="px-3 py-1.5 font-mono2 text-[11px] uppercase tracking-wide text-slate2 hover:text-rail-red disabled:opacity-40"
              >
                Désactiver
              </button>
            </>
          ) : (
            <button
              onClick={activate}
              disabled={busy || subscribed === null}
              className="px-3 py-1.5 bg-cobalt text-onaccent font-mono2 text-[11px] uppercase tracking-wide disabled:opacity-40"
            >
              {busy ? "Activation…" : "Activer les notifications"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
