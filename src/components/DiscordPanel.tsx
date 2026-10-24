import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { BoosterGem, NITRO } from "./BoosterBadge";
import { Emblem } from "./Emblem";

/* 2.3 : où en est le boost Nitro du serveur */
interface Boost {
  boosting: boolean;
  since: string | null;
  days: number;
  keepAt: number;
  titleAt: number;
  kept: boolean;
  title: boolean;
  livery: string;
  emblem: string;
  titleName: string;
}

/* 2.1 : lier son compte au serveur Discord officiel. Le joueur y reçoit ses
   rôles (Joueur, Premium, Chef d'alliance, Champion de saison) et /profil
   affiche sa compagnie. Caché tant que le serveur n'a pas ses clés Discord. */
export function DiscordPanel({ onChange }: { onChange?: () => void } = {}) {
  const [status, setStatus] = useState<{ enabled: boolean; linked: boolean; name: string | null; boost?: Boost | null } | null>(null);
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

  async function wear(patch: Record<string, string>, message: string) {
    try {
      await api.patch("/company", patch);
      showToast(message);
      onChange?.();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Erreur", "error");
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
      <BoostBlock boost={status.linked ? status.boost ?? null : null} linked={status.linked} onWear={wear} />
    </div>
  );
}

/* 2.3 : les boosters du serveur. Tout est cosmétique, et tout arrive tout seul
   dès que Discord signale le boost (compte lié obligatoire). */
function BoostBlock({ boost, linked, onWear }: { boost: Boost | null; linked: boolean; onWear: (patch: Record<string, string>, message: string) => void }) {
  const perks = "le badge Booster à côté de votre nom, la livrée Nitro et l'emblème du cristal";
  if (!linked || !boost) {
    return (
      <p className="mt-4 pt-3 border-t border-line text-[12.5px] text-slate2 font-body max-w-[62ch] flex gap-2">
        <BoosterGem size={14} className="shrink-0 mt-0.5" />
        <span>Vous boostez le serveur avec Nitro ? Liez votre compte : {perks} arrivent tout seuls.</span>
      </p>
    );
  }
  const goal = boost.kept ? boost.titleAt : boost.keepAt;
  const pct = Math.min(100, Math.round((boost.days / goal) * 100));
  const next = boost.title
    ? `Tout est acquis, titre « ${boost.titleName} » compris. Merci !`
    : boost.kept
      ? `Livrée et emblème sont à vous pour toujours. Le titre « ${boost.titleName} » arrive à ${boost.titleAt} jours.`
      : `À ${boost.keepAt} jours de boost (cumulés), la livrée et l'emblème restent à vous pour toujours.`;
  return (
    <div className="mt-4 pt-3 border-t border-line font-body">
      <div className="flex items-center gap-2 text-[13.5px]">
        <BoosterGem size={16} />
        {boost.boosting ? (
          <span>
            <span className="font-semibold" style={{ color: "#d98ce8" }}>Vous boostez le serveur</span>
            <span className="text-slate2">, depuis {boost.days} jour{boost.days > 1 ? "s" : ""} au total. Merci !</span>
          </span>
        ) : boost.days > 0 ? (
          <span className="text-slate2">{boost.days} jour{boost.days > 1 ? "s" : ""} de boost au compteur. Reprenez quand vous voulez, le compte continue.</span>
        ) : (
          <span className="text-slate2">Boostez le serveur avec Nitro : {perks}, tant que le boost dure.</span>
        )}
      </div>
      {(boost.boosting || boost.days > 0) && (
        <>
          <div className="mt-2.5 h-1.5 rounded-full bg-line/70 overflow-hidden max-w-[420px]" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={boost.days}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, #f47fff, ${NITRO})` }} />
          </div>
          <p className="text-[12px] text-slate2 mt-1.5 max-w-[62ch]">{next}</p>
        </>
      )}
      {(boost.boosting || boost.kept) && (
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => onWear({ liveryColor: boost.livery }, "Vos rames roulent aux couleurs Nitro")}
            className="inline-flex items-center gap-2 rounded-control border border-line hover:border-[#c04fd6]/60 px-3 py-1.5 text-[12.5px] transition-colors"
          >
            <span className="w-3.5 h-3.5 rounded-[4px]" style={{ background: boost.livery }} aria-hidden="true" />
            Porter la livrée Nitro
          </button>
          <button
            onClick={() => onWear({ emblem: boost.emblem }, "Le cristal orne votre compagnie")}
            className="inline-flex items-center gap-2 rounded-control border border-line hover:border-[#c04fd6]/60 px-3 py-1.5 text-[12.5px] transition-colors"
          >
            <Emblem id={boost.emblem} size={14} className="text-[#d98ce8]" />
            Porter le cristal
          </button>
          {boost.title && (
            <button
              onClick={() => onWear({ title: boost.titleName }, `Titre « ${boost.titleName} » affiché`)}
              className="rounded-control border border-line hover:border-[#c04fd6]/60 px-3 py-1.5 text-[12.5px] transition-colors"
            >
              Afficher « {boost.titleName} »
            </button>
          )}
        </div>
      )}
      {boost.boosting && !boost.kept && (
        <p className="text-[11.5px] text-slate2 mt-2">Si le boost s'arrête avant {boost.keepAt} jours, la livrée et le cristal sont rangés ; vos jours restent comptés.</p>
      )}
    </div>
  );
}
