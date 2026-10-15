import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

/* ============================================================
   Offrir (2.0) : un objet de la boutique, une extension, le Pass de saison
   ou le Premium, payé par vous pour une autre compagnie. On la désigne par
   son nom, tel qu'il apparaît au classement.
   ============================================================ */

export function GiftDialog({
  itemName,
  priceLabel,
  itemId,
  premium,
  onClose,
}: {
  itemName: string;
  priceLabel: string;
  itemId?: string; // objet de boutique ; sans : le Premium
  premium?: boolean;
  onClose: () => void;
}) {
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim()) return;
    setBusy(true);
    try {
      const { data } = premium ? await api.post("/billing/checkout", { giftTo: to.trim() }) : await api.post("/shop/checkout", { itemId, giftTo: to.trim() });
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      showToast(err?.response?.data?.error ?? "Impossible d'ouvrir la page de paiement", "error");
      setBusy(false);
    }
  }

  return createPortal(
    <div data-modal className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={send} className="w-full max-w-md bg-navy-900 border border-line" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Offrir ${itemName}`}>
        <div className="px-5 pt-4 pb-3 border-b border-line flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-[21px] leading-tight">Offrir {itemName}</h3>
            <p className="text-[13px] text-slate2 font-body mt-1">Vous payez, l'autre compagnie le reçoit dès le paiement, avec votre nom.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate2 hover:text-offwhite text-xl leading-none px-1" aria-label="Fermer">×</button>
        </div>
        <div className="px-5 py-4">
          <label className="block text-[13px] font-body text-slate2 mb-1.5" htmlFor="gift-to">
            Nom de la compagnie, comme au classement
          </label>
          <input
            id="gift-to"
            autoFocus
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Compagnie Rhône-Méditerranée"
            className="w-full bg-navy-950 border border-line px-3 py-2.5 text-[15px] font-body focus:outline-none focus:border-cobalt"
          />
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 border border-line text-slate2 px-3 py-2.5 text-[14px] font-body">
            Annuler
          </button>
          <button type="submit" disabled={busy || !to.trim()} className="flex-1 bg-amber text-onaccent px-3 py-2.5 text-[14px] font-body font-semibold disabled:opacity-50">
            {busy ? "Ouverture…" : `Offrir, ${priceLabel}`}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

/* Le petit lien « Offrir », à côté d'un bouton d'achat. */
export function GiftButton({ itemName, priceLabel, itemId, premium, className = "" }: { itemName: string; priceLabel: string; itemId?: string; premium?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`inline-flex items-center gap-1.5 text-[13.5px] font-body text-slate2 hover:text-amber ${className}`}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <rect x="2" y="6" width="12" height="8" />
          <path d="M1.5 4h13v2h-13zM8 4v10M8 4C6.5 1.5 4 2 4.6 3.4 5 4 8 4 8 4zM8 4c1.5-2.5 4-2 3.4-.6C11 4 8 4 8 4z" />
        </svg>
        Offrir
      </button>
      {open && <GiftDialog itemName={itemName} priceLabel={priceLabel} itemId={itemId} premium={premium} onClose={() => setOpen(false)} />}
    </>
  );
}
