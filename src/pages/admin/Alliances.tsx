import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { Btn, Empty, Field, Loading, PageHead, Pill, dateOnly, inputCls, nf, useAction, useAdminData, useConfirm } from "./ui";

type Alliance = {
  id: string; name: string; color: string; pitch: string | null; recruiting: boolean; discordUrl: string | null; createdAt: string;
  rank: number | null; points: number;
  members: { companyId: string; name: string; founder: boolean; joinedAt: string }[];
};

export default function Alliances() {
  const { data, error, reload } = useAdminData<{ alliances: Alliance[] }>("/alliances");
  const [open, setOpen] = useState<string | null>(null);
  if (!data) return <Loading error={error} onRetry={reload} />;
  const list = [...data.alliances].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  return (
    <>
      <PageHead title="Alliances" intro="Classées par points de saison. Ouvre une alliance pour la modérer : nom, présentation, membres." />
      {list.length === 0 ? (
        <Empty>Aucune alliance pour l'instant.</Empty>
      ) : (
        <ul className="border border-line bg-navy-900 divide-y divide-line">
          {list.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => setOpen(open === a.id ? null : a.id)}
                aria-expanded={open === a.id}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-navy-800/50"
              >
                <span className="w-6 text-right font-mono2 text-[12px] text-slate2">{a.rank ?? "—"}</span>
                <span className="h-3.5 w-3.5 shrink-0 rotate-45" style={{ background: a.color }} />
                <span className="flex-1 min-w-0 truncate font-body text-[14.5px]">{a.name}</span>
                {!a.recruiting && <Pill>Fermée</Pill>}
                <span className="font-body text-[12.5px] text-slate2">
                  {a.members.length} membre{a.members.length > 1 ? "s" : ""}
                </span>
                <span className="w-20 text-right font-mono2 text-[13px]">{nf(a.points)}</span>
              </button>
              {open === a.id && <AllianceEditor a={a} onChanged={reload} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function AllianceEditor({ a, onChanged }: { a: Alliance; onChanged: () => Promise<void> }) {
  const { run, busy } = useAction();
  const confirm = useConfirm();
  const [name, setName] = useState(a.name);
  const [pitch, setPitch] = useState(a.pitch ?? "");
  const [discordUrl, setDiscordUrl] = useState(a.discordUrl ?? "");
  const [recruiting, setRecruiting] = useState(a.recruiting);

  return (
    <div className="px-4 pb-5 pt-1 grid gap-6 lg:grid-cols-2 bg-navy-950/40">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => api.patch(`/admin/alliances/${a.id}`, { name, pitch, discordUrl, recruiting }), "Alliance modifiée", onChanged);
        }}
      >
        <Field label="Nom">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={32} />
        </Field>
        <Field label="Présentation" hint="Vide pour l'effacer.">
          <textarea value={pitch} onChange={(e) => setPitch(e.target.value)} rows={2} className={inputCls} maxLength={200} />
        </Field>
        <Field label="Lien Discord de l'alliance">
          <input value={discordUrl} onChange={(e) => setDiscordUrl(e.target.value)} className={inputCls} maxLength={200} />
        </Field>
        <label className="flex items-center gap-2 font-body text-[13.5px]">
          <input type="checkbox" checked={recruiting} onChange={(e) => setRecruiting(e.target.checked)} className="accent-amber" />
          Accepte les candidatures
        </label>
        <div className="flex flex-wrap gap-2">
          <Btn type="submit" tone="primary" disabled={busy}>
            Enregistrer
          </Btn>
          <Btn
            tone="danger"
            disabled={busy}
            onClick={async () => {
              const r = await confirm({
                title: `Dissoudre ${a.name} ?`,
                body: `Les ${a.members.length} membres quittent l'alliance, son tableau d'affichage et ses candidatures sont effacés. Impossible à annuler.`,
                confirm: "Dissoudre",
                danger: true,
              });
              if (r.ok) await run(() => api.delete(`/admin/alliances/${a.id}`), "Alliance dissoute", onChanged);
            }}
          >
            Dissoudre
          </Btn>
        </div>
        <p className="font-body text-[12px] text-slate2">Fondée le {dateOnly(a.createdAt)}</p>
      </form>

      <div>
        <h3 className="font-display text-[15px] mb-1.5">Membres</h3>
        <ul className="divide-y divide-line border-y border-line">
          {a.members.map((m) => (
            <li key={m.companyId} className="flex items-center gap-3 py-2 font-body text-[13.5px]">
              <Link to={`/admin/joueurs/${m.companyId}`} className="flex-1 truncate hover:text-amber">
                {m.name}
              </Link>
              {m.founder && <Pill tone="amber">Fondateur</Pill>}
              <button
                className="text-[12.5px] text-slate2 hover:text-rail-red"
                onClick={async () => {
                  const r = await confirm({
                    title: `Exclure ${m.name} de ${a.name} ?`,
                    body: m.founder ? "C'est le fondateur : le plus ancien membre reprendra la main." : undefined,
                    confirm: "Exclure",
                    danger: true,
                  });
                  if (r.ok) await run(() => api.delete(`/admin/alliances/${a.id}/members/${m.companyId}`), "Membre exclu", onChanged);
                }}
              >
                Exclure
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
