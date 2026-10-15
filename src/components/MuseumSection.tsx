import { useEffect, useState } from "react";
import { api } from "../api/client";
import { MuseumHall } from "./PrestigeArt";
import { TrainPicture } from "./TrainPicture";

/* ============================================================
   2.1 : le Musée de la compagnie.

   Les épaves restaurées, sous les projecteurs : les trois dernières dans la
   salle, puis le cartel de chaque pièce — son numéro, ses années, la gare
   où on l'a trouvée, le jour de sa remise en service et la rame qu'elle est
   devenue. On visite aussi le musée de ses alliés.
   ============================================================ */

const PIECES: Record<string, { label: string; skin: string; livery: string }> = {
  MICHELINE: { label: "Autorail Micheline", skin: "micheline", livery: "#b8322a" },
  DUPLEX: { label: "Rame à deux niveaux", skin: "duplex", livery: "#3c6e9e" },
  TRAIN_BLEU: { label: "Voitures-lits du Train bleu", skin: "train-bleu", livery: "#1d2f5c" },
  ORANGE: { label: "Rame orange de 1981", skin: "grande-vitesse", livery: "#e36a12" },
  VAPEUR_141R: { label: "Locomotive 141 R", skin: "vapeur", livery: "#1f1f1f" },
};

interface Piece {
  id: string;
  kind: string;
  serial: string;
  year: number;
  station: string;
  restoredAt: string | null;
  train: { id: string; name: string } | null;
}
interface Museum {
  open: boolean;
  owner: { id: string; name: string; liveryColor: string } | null;
  pieces: Piece[];
}

export function MuseumSection({ onGoShop }: { onGoShop: () => void }) {
  const [target, setTarget] = useState<string | null>(null);
  const [m, setM] = useState<Museum | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allies, setAllies] = useState<{ companyId: string; name: string; isMe: boolean }[]>([]);

  useEffect(() => {
    setM(null);
    setError(null);
    api
      .get(target ? `/museum/${target}` : "/museum")
      .then(({ data }) => setM(data))
      .catch((err) => setError(err?.response?.data?.error ?? "Le musée est fermé pour le moment"));
  }, [target]);
  useEffect(() => {
    api
      .get("/alliance")
      .then(({ data }) => setAllies(data?.members ?? []))
      .catch(() => setAllies([]));
  }, []);

  const others = allies.filter((a) => !a.isMe);
  const mine = !target;

  return (
    <div className="space-y-6">
      {others.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Musées de l'alliance">
          <button onClick={() => setTarget(null)} aria-pressed={mine} className={`px-3 py-1.5 border font-body text-[13px] ${mine ? "border-cobalt text-cobalt" : "border-line text-slate2"}`}>
            Mon musée
          </button>
          {others.map((a) => (
            <button key={a.companyId} onClick={() => setTarget(a.companyId)} aria-pressed={target === a.companyId} className={`px-3 py-1.5 border font-body text-[13px] ${target === a.companyId ? "border-cobalt text-cobalt" : "border-line text-slate2"}`}>
              {a.name}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-[14px] font-body text-slate2">{error}</p>}
      {!m && !error && <div className="h-64 bg-navy-900 animate-skeleton" />}

      {m && !m.open && (
        <div className="border border-line p-5">
          <p className="font-body text-[14.5px]">{mine ? "Votre compagnie n'a pas encore de musée." : `${m.owner?.name ?? "Cette compagnie"} n'a pas encore de musée.`}</p>
          {mine && (
            <button onClick={onGoShop} className="mt-3 text-[13.5px] font-body text-amber border border-amber/40 px-3.5 py-2 hover:bg-amber/10">
              Voir le Musée en boutique
            </button>
          )}
        </div>
      )}

      {m && m.open && (
        <>
          <div className="border border-line aspect-[16/6] max-md:aspect-[4/3]">
            <MuseumHall
              pieces={
                m.pieces.length
                  ? m.pieces.slice(-3).map((p) => ({ skin: PIECES[p.kind]?.skin ?? "vapeur", livery: PIECES[p.kind]?.livery ?? "#333", label: p.serial }))
                  : undefined
              }
            />
          </div>
          {m.pieces.length === 0 ? (
            <p className="text-[14px] font-body text-slate2 max-w-[62ch]">
              La salle attend sa première pièce. Rachetez une épave près d'une gare, restaurez-la au dépôt : une fois remise en service, elle entre au musée avec son cartel.
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {m.pieces.map((p) => {
                const def = PIECES[p.kind];
                return (
                  <li key={p.id} className="border border-line bg-[#efe6d2] text-[#2a2119] p-4">
                    <div className="-mx-1 h-[44px]">
                      <TrainPicture skin={def?.skin ?? null} livery={def?.livery ?? "#333"} height={44} label={def?.label ?? p.kind} />
                    </div>
                    <div className="mt-2 font-display text-[18px] leading-tight">
                      {def?.label ?? p.kind} <span className="font-mono2 text-[14px]">{p.serial}</span>
                    </div>
                    <p className="text-[13px] font-body mt-1 text-[#4a3f33]">
                      Mise en service en {p.year}. Retrouvée près de {p.station}
                      {p.restoredAt ? `, restaurée le ${new Date(p.restoredAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` : ""}.
                      {p.train ? ` Elle roule aujourd'hui sous le nom de « ${p.train.name} ».` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
