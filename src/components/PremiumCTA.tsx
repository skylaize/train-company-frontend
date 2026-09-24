import { useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

/* Bouton Premium, partout le même : placé là où le joueur voit ce qui lui
   manque (événements annoncés, détail des concurrents, rentabilité, bilan). */

export interface PremiumInfo {
  isPremium: boolean;
}

export function PremiumCTA({ company, compact = false }: { company: PremiumInfo; onChange?: () => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

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

  return (
    <button
      onClick={buy}
      disabled={busy}
      className={`${compact ? "px-3 py-1.5" : "px-4 py-2"} text-[11px] bg-amber text-onaccent font-mono2 uppercase tracking-wide disabled:opacity-50`}
    >
      {busy ? "Ouverture…" : "Passer Premium · dès 5,99 €"}
    </button>
  );
}
