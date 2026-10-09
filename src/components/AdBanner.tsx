import { useEffect, useRef, useState } from "react";
import { adsEnabled, loadAds } from "../ads";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { useBilling, euros } from "./PremiumCTA";

/* ============================================================
   Bannière discrète (1.7, Google AdSense).

   Une seule, en bas de quelques pages de consultation (classement, comptes,
   progression…), après le contenu : on ne la croise qu'en ayant fini de lire.
   Jamais sur la carte, la vue cabine, les fenêtres, ni pendant les premiers
   pas. Hauteur réservée d'avance pour que la page ne saute pas au chargement,
   et rien du tout pour les abonnés Premium.
   ============================================================ */

const SLOT = (import.meta.env.VITE_ADSENSE_SLOT_BANNER as string | undefined)?.trim() || "";
const CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined)?.trim() || "";
export const bannersEnabled = adsEnabled && /^\d+$/.test(SLOT);

export function AdBanner({ placement }: { placement: string }) {
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!bannersEnabled) return;
    let cancelled = false;
    loadAds().then((ok) => {
      if (!ok || cancelled || !ref.current || ref.current.dataset.adsbygoogleStatus) return;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // bloqueur ou emplacement déjà rempli : on laisse l'espace vide
      }
    });
    return () => {
      cancelled = true;
    };
  }, [placement]);

  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const billing = useBilling();

  // 1.7 : le billet sans pub, même circuit de paiement que la boutique
  async function removeAds() {
    setBusy(true);
    try {
      const { data } = await api.post("/shop/checkout", { itemId: "sans-pub" });
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Impossible d'ouvrir la page de paiement", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!bannersEnabled) return null;
  return (
    <aside className="mt-12 pt-3 border-t border-line" aria-label="Publicité">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="font-mono2 text-[9.5px] uppercase tracking-[0.18em] text-slate2/60">Publicité</span>
        {billing?.enabled && (
          <button onClick={removeAds} disabled={busy} className="font-mono2 text-[10px] uppercase tracking-wide text-slate2 hover:text-cobalt disabled:opacity-50">
            {busy ? "Ouverture…" : `Retirer les pubs · ${euros(billing.adFreeCents)}`}
          </button>
        )}
      </div>
      <div className="min-h-[90px] max-h-[120px] overflow-hidden">
        <ins
          key={placement}
          ref={ref}
          className="adsbygoogle"
          style={{ display: "block", width: "100%", height: 90 }}
          data-ad-client={CLIENT}
          data-ad-slot={SLOT}
          data-ad-format="horizontal"
          data-full-width-responsive="false"
        />
      </div>
    </aside>
  );
}
