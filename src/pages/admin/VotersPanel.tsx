import { useState } from "react";
import { api } from "../../api/client";
import { Btn, Panel, Pill, dateTime, useAction, useAdminData, useConfirm } from "./ui";

/* Voteurs du mois : le podium du mois dernier à vérifier (multi-comptes)
   avant de verser les lots, et le classement du mois en cours. */

type Row = { rank: number; companyId: string; name: string; liveryColor: string; votes: number };
type Data = {
  winners: number;
  prizes?: number[];
  current: { month: string; top: Row[] };
  previous: { month: string; top: Row[]; paid: { rank: number; companyId: string; votes: number; createdAt: string }[] };
};

const monthLabel = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

function List({ rows, winners, excluded, onToggle }: { rows: Row[]; winners: number; excluded?: Set<string>; onToggle?: (id: string) => void }) {
  if (!rows.length) return <p className="font-body text-[13px] text-slate2">Aucun vote.</p>;
  // places recalculées sans les compagnies écartées
  let place = 0;
  return (
    <ol className="font-body text-[13.5px] divide-y divide-line">
      {rows.map((r) => {
        const out = excluded?.has(r.companyId);
        if (!out) place++;
        const podium = !out && place <= winners;
        return (
          <li key={r.companyId} className={`flex items-center gap-2 py-1.5 ${out ? "opacity-40 line-through" : ""}`}>
            <span className="font-mono2 w-5 text-right text-slate2">{out ? "–" : place}</span>
            <span className="w-2 h-2 rounded-full" style={{ background: r.liveryColor }} />
            <span className={`flex-1 truncate ${podium ? "text-amber" : "text-offwhite"}`}>{r.name}</span>
            <span className="font-mono2 tabular-nums text-slate2">{r.votes}</span>
            {onToggle && (
              <button onClick={() => onToggle(r.companyId)} className="text-[12px] text-slate2 hover:text-offwhite underline underline-offset-2 ml-2">
                {out ? "réintégrer" : "écarter"}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function VotersPanel() {
  const { data, reload } = useAdminData<Data>("/voters");
  const { run, busy } = useAction();
  const confirm = useConfirm();
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  if (!data) return null;
  const { previous, current, winners } = data;
  const prize = (i: number) => (data.prizes?.[i] ?? 0).toLocaleString("fr-FR");
  const paid = previous.paid.length > 0;
  const toggle = (id: string) =>
    setExcluded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const podium = previous.top.filter((r) => !excluded.has(r.companyId)).slice(0, winners);

  async function pay() {
    const r = await confirm({
      title: `Verser les lots de ${monthLabel(previous.month)} ?`,
      body: `${podium.map((p, i) => `${i + 1}. ${p.name} (${p.votes} votes) : ${prize(i)} pi.`).join("\n")}\n\nPlus l'emblème « Tampon de contrôle », le rôle Discord jusqu'à la fin du mois, une notification et l'annonce dans #classements.`,
      confirm: "Verser les lots",
    });
    if (!r.ok) return;
    await run(() => api.post(`/admin/voters/${previous.month}/pay`, { exclude: [...excluded] }), "Lots versés", reload);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 mb-6">
      <Panel title={`Voteurs de ${monthLabel(previous.month)}`} aside={paid ? <Pill tone="green">Lots versés</Pill> : previous.top.length ? <Pill tone="amber">À verser</Pill> : undefined}>
        {paid ? (
          <ol className="font-body text-[13.5px] space-y-1">
            {previous.paid.map((p) => {
              const row = previous.top.find((r) => r.companyId === p.companyId);
              return (
                <li key={p.rank} className="flex gap-2">
                  <span className="font-mono2 w-5 text-right text-slate2">{p.rank}</span>
                  <span className="flex-1 text-amber">{row?.name ?? p.companyId}</span>
                  <span className="font-mono2 text-slate2">{p.votes}</span>
                </li>
              );
            })}
            <li className="text-[12px] text-slate2 pt-1">Versés le {dateTime(previous.paid[0].createdAt)}.</li>
          </ol>
        ) : (
          <>
            <p className="font-body text-[13px] text-slate2 mb-3">
              Vérifiez le podium avant de verser : une compagnie écartée laisse sa place à la suivante.
            </p>
            <List rows={previous.top} winners={winners} excluded={excluded} onToggle={toggle} />
            {previous.top.length > 0 && (
              <Btn tone="primary" className="mt-3" disabled={busy || !podium.length} onClick={pay}>
                Verser les lots
              </Btn>
            )}
          </>
        )}
      </Panel>
      <Panel title={`Voteurs de ${monthLabel(current.month)}`} aside="en cours">
        <List rows={current.top} winners={winners} />
      </Panel>
    </div>
  );
}
