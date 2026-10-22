import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

/* 2.1 : lier son compte au serveur Discord officiel. Le joueur y reçoit ses
   rôles (Joueur, Premium, Chef d'alliance, Champion de saison) et /profil
   affiche sa compagnie. Caché tant que le serveur n'a pas ses clés Discord. */
export function DiscordPanel() {
  const [status, setStatus] = useState<{ enabled: boolean; linked: boolean; name: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  function refresh() {
    return api
      .get("/discord/status")
      .then(({ data }) => setStatus(data))
      .catch(() => setStatus({ enabled: false, linked: false, name: null }));
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function link() {
    setBusy(true);
    try {
      const { data } = await api.post("/discord/link");
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Liaison impossible pour le moment", "error");
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    try {
      await api.delete("/discord/link");
      showToast("Compte Discord délié, vos rôles du jeu ont été retirés");
      await refresh();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Erreur", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!status?.enabled) return null;

  return (
    <div className="border border-line p-4 mb-6 rounded-card bg-navy-900/40">
      <h3 className="font-display text-lg mb-1">Discord</h3>
      <p className="text-[12.5px] text-slate2 font-body max-w-[62ch] mb-3">
        Liez votre compte pour rejoindre le serveur Discord de Réseau et y recevoir vos rôles : Joueur, Premium,
        Chef d'alliance et Champion de saison. Les autres joueurs pourront voir votre compagnie avec /profil.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {status.linked ? (
          <>
            <span className="font-body text-[12px] text-rail-green border border-line px-2 py-1 font-medium rounded-control">
              Lié{status.name ? ` à ${status.name}` : ""}
            </span>
            <button
              onClick={unlink}
              disabled={busy}
              className="px-3 py-1.5 border border-line font-body text-[12px] hover:border-rail-red disabled:opacity-40 font-medium rounded-control"
            >
              Délier
            </button>
          </>
        ) : (
          <button
            onClick={link}
            disabled={busy}
            className="px-3 py-1.5 bg-[#5865F2] text-white font-body text-[12px] hover:bg-[#4752c4] disabled:opacity-40 font-medium"
          >
            {busy ? "Ouverture…" : "Lier mon Discord"}
          </button>
        )}
      </div>
    </div>
  );
}
