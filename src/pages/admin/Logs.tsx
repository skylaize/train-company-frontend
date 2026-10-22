import { useState } from "react";
import { Link } from "react-router-dom";
import { Btn, Empty, Loading, PageHead, dateTime, useAdminData } from "./ui";

type Log = { id: string; adminName: string; action: string; targetId: string | null; target: string | null; details: string; createdAt: string };

const ACTIONS: { id: string; label: string }[] = [
  { id: "", label: "Tout" },
  { id: "ARGENT", label: "Pièces" },
  { id: "PREMIUM", label: "Premium" },
  { id: "OBJET", label: "Objets" },
  { id: "RAME", label: "Rames" },
  { id: "BAN", label: "Suspensions" },
  { id: "RENOMMER", label: "Noms" },
  { id: "SAISON", label: "Saison" },
  { id: "CHANTIER", label: "Chantier" },
  { id: "ALLIANCE", label: "Alliances" },
  { id: "GIVEAWAY", label: "Giveaways" },
  { id: "ANNONCE", label: "Annonces" },
];
const LABEL = Object.fromEntries(ACTIONS.map((a) => [a.id, a.label]));
const PLAYER_ACTIONS = new Set(["ARGENT", "PREMIUM", "OBJET", "BAN", "RENOMMER", "RAME"]);

export default function Logs() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(0);
  const { data, error, reload } = useAdminData<{ total: number; pageSize: number; logs: Log[] }>(`/logs?action=${action}&page=${page}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHead title="Journal" intro="Tout ce que l'équipe a fait depuis ce panneau. Chaque ligne est aussi recopiée dans #logs sur Discord." />
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-1 [scrollbar-width:none]" role="group" aria-label="Filtrer">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              setAction(a.id);
              setPage(0);
            }}
            aria-pressed={action === a.id}
            className={`shrink-0 px-3 py-1.5 border font-body text-[13px] ${action === a.id ? "border-amber text-amber" : "border-line text-slate2 hover:text-offwhite"}`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {!data ? (
        <Loading error={error} onRetry={reload} />
      ) : data.logs.length === 0 ? (
        <Empty>Rien dans le journal pour ce filtre.</Empty>
      ) : (
        <ul className="border border-line bg-navy-900 divide-y divide-line">
          {data.logs.map((l) => (
            <li key={l.id} className="grid sm:grid-cols-[130px_110px_1fr] gap-x-4 gap-y-0.5 px-4 py-2.5 font-body text-[13.5px]">
              <span className="text-[12.5px] text-slate2">{dateTime(l.createdAt)}</span>
              <span className="text-[12.5px] text-amber">{LABEL[l.action] ?? l.action}</span>
              <span className="min-w-0">
                <span className="text-slate2">{l.adminName} · </span>
                {l.target &&
                  (l.targetId && PLAYER_ACTIONS.has(l.action) ? (
                    <Link to={`/admin/joueurs/${l.targetId}`} className="hover:text-amber">
                      {l.target}
                    </Link>
                  ) : (
                    <span>{l.target}</span>
                  ))}
                {l.details && <span className="text-slate2"> — {l.details}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {data && pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 font-body text-[13px]">
          <Btn onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
            Précédente
          </Btn>
          <span className="text-slate2">
            Page {page + 1} sur {pages}
          </span>
          <Btn onClick={() => setPage((p) => p + 1)} disabled={page >= pages - 1}>
            Suivante
          </Btn>
        </div>
      )}
    </>
  );
}
