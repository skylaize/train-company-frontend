import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

/* Bouton Premium, partout le même : placé là où le joueur voit ce qui lui
   manque (événements annoncés, détail des concurrents, rentabilité, bilan). */

export interface PremiumInfo {
  isPremium: boolean;
}

/* 1.7 : prix affichés, lus une fois sur le serveur. Ils suivent les réglages
   Stripe : minimum du prix libre et montant conseillé (pré-rempli au paiement).
   Un joueur qui a le billet sans pub passe au Premium à partir d'un minimum plus bas. */
export interface BillingInfo {
  enabled: boolean;
  upgrade: boolean;
  minCents: number;
  suggestedCents: number;
  adFreeCents: number;
}
let billingCache: Promise<BillingInfo | null> | null = null;
export function resetBilling() {
  billingCache = null;
}
export function useBilling() {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  useEffect(() => {
    billingCache ??= api.get("/billing/status").then(({ data }) => data as BillingInfo).catch(() => null);
    let alive = true;
    billingCache.then((d) => alive && setInfo(d));
    return () => {
      alive = false;
    };
  }, []);
  return info;
}
export const euros = (c: number) => `${(c / 100).toLocaleString("fr-FR", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })} €`;

export function PremiumCTA({ company, compact = false }: { company: PremiumInfo; onChange?: () => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const billing = useBilling();

  async function buy() {
    setBusy(true);
    try {
      const { data } = await api.post("/billing/checkout");
      if (data?.url) window.location.href = data.url;
      else showToast("Impossible d'ouvrir la page de paiement", "error");
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Impossible d'ouvrir la page de paiement", "error");
    } finally {
      setBusy(false);
    }
  }

  if (company.isPremium) return null;
  const min = billing?.minCents ?? 599;
  const suggested = billing?.suggestedCents ?? null;

  const button = (
    <button
      onClick={buy}
      disabled={busy}
      className={`${compact ? "px-3 py-1.5" : "px-4 py-2"} text-[11px] bg-amber text-onaccent font-mono2 uppercase tracking-wide disabled:opacity-50`}
    >
      {busy ? "Ouverture…" : `Passer Premium · dès ${euros(min)}`}
    </button>
  );
  if (compact || !suggested || suggested <= min) return button;
  return (
    <span className="inline-flex items-center gap-2.5 flex-wrap">
      {button}
      <span className="font-mono2 text-[10.5px] text-slate2">
        prix conseillé <span className="text-amber">{euros(suggested)}</span>
        {billing?.upgrade ? " · votre billet sans pub est déduit" : ""}
      </span>
    </span>
  );
}
