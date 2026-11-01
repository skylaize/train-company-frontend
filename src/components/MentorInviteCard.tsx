import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

/* ============================================================
   2.5 : l'invitation à devenir tuteur.

   Sans elle, le compagnonnage aurait démarré avec une liste de tuteurs vide :
   il fallait penser à aller cocher une case dans Progression. La carte
   s'affiche une fois sur le tableau de bord des compagnies éligibles, jusqu'à
   ce qu'elles s'inscrivent ou la ferment.
   ============================================================ */

const fmt = (n: number) => n.toLocaleString("fr-FR");
const HINT = "tuteur-invite";

export function MentorInviteCard({ onOpen, onChange }: { onOpen: () => void; onChange: () => void }) {
  const { showToast } = useToast();
  const [data, setData] = useState<{ show: boolean; perGraduate?: number; maxApprentices?: number; masterTitle?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get("/mentor/invite").then((r) => setData(r.data)).catch(() => undefined);
  }, []);
  if (!data?.show) return null;

  const hide = () => {
    setData({ show: false });
    api.patch("/company", { seenHint: HINT }).then(onChange).catch(() => undefined);
  };
  async function join() {
    setBusy(true);
    try {
      await api.post("/mentor/open", { open: true, pitch: null });
      showToast("Vous accueillez des apprentis : ajoutez une présentation dans Compagnonnage");
      setData({ show: false });
      onChange();
      onOpen();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Impossible pour le moment", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-line border-l-[3px] border-l-amber bg-navy-900/60 rounded-card px-5 py-4 mb-6 flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[16rem]">
        <div className="text-[12px] font-body text-amber font-medium">Nouveau · compagnonnage</div>
        <h2 className="font-display text-xl leading-tight">Devenez tuteur d'un nouveau venu</h2>
        <p className="font-body text-[13.5px] text-slate2 mt-1 max-w-[64ch]">
          Accompagnez une compagnie qui démarre : vous voyez où elle en est et lui laissez des conseils. Jusqu'à {fmt(data.perGraduate ?? 0)} pi. par apprenti mené au
          diplôme, {data.maxApprentices} apprentis à la fois, et le titre « {data.masterTitle} » au troisième.
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={hide} className="text-[12.5px] font-body text-slate2 hover:text-offwhite">
          Plus tard
        </button>
        <button onClick={join} disabled={busy} className="bg-amber text-onaccent text-[13.5px] font-semibold font-body px-4 py-2 disabled:opacity-50 rounded-control">
          Accueillir des apprentis
        </button>
      </div>
    </section>
  );
}
